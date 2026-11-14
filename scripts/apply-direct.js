// Applies changes you have checked yourself, straight to the PRODUCTION /updates database, without the approval email.
// Use it only for changes you validated personally. Automated submissions keep using /api/submit and the email approval.
//
// It uses the site's own rules and code: sanitize.js checks the content, apply.js (the same decide() that an email
// approval runs) makes the change in one transaction, and the audit log records that it was applied from this script.
//
// Usage (PowerShell, one session; the connection string is not saved anywhere):
//   $env:PROD_DATABASE_URL = '<production connection string>'
//   $env:SUBMITTED_BY = '<your email address>'
//   $env:SUBMIT_API_KEY = '<production SUBMIT_API_KEY>'   (optional: refreshes the changed pages straight away)
//   node scripts/apply-direct.js requests/assam-pt_rule-request.json [more files]
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const readline = require('readline');

const lib = (m) => require(path.join(process.cwd(), 'src', 'lib', 'updates', m));
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX = 20;
const TOPIC_OF_KIND = { pt_rule: 'professional-tax', lwf_rule: 'labour-welfare-fund', mw_rate: 'minimum-wages' };
const TOPIC_OF_CAT = { PT: 'professional-tax', LWF: 'labour-welfare-fund', 'Min Wages': 'minimum-wages' };

// Which database a connection string points at, so the run can never be mistaken.
function dbLabel(url) {
  let host = '';
  try { host = new URL(url).hostname; } catch (_) { return 'unknown database'; }
  if (host.includes('spring-poetry')) return `PRODUCTION (${host.split('.')[0]})`;
  if (host.includes('sparkling-salad')) return `DEV (${host.split('.')[0]})`;
  return host.split('.')[0];
}
// Same value, any key order: so a JSON column that only changed its key order does not show as a change.
function canon(v) {
  if (Array.isArray(v)) return v.map(canon);
  if (v && typeof v === 'object') return Object.keys(v).sort().reduce((o, k) => { o[k] = canon(v[k]); return o; }, {});
  return v;
}

function ask(q) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(q, (a) => { rl.close(); resolve(a.trim()); }));
}

async function main() {
  const files = process.argv.slice(2);
  if (!files.length) throw new Error('Usage: node scripts/apply-direct.js <request.json> [more files]');
  if (!process.env.PROD_DATABASE_URL) throw new Error("Set $env:PROD_DATABASE_URL = '<production connection string>' first.");
  const by = process.env.SUBMITTED_BY || '';
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(by)) throw new Error("Set $env:SUBMITTED_BY = '<your email address>' first.");
  process.env.DATABASE_URL = process.env.PROD_DATABASE_URL;   // this run only
  const label = dbLabel(process.env.PROD_DATABASE_URL);
  const isProd = label.startsWith('PRODUCTION');
  console.log(`Database: ${label}\n`);

  const db = lib('db');
  const { sanitize, summarise, Rejection, TABLE, KINDS } = lib('sanitize');
  const { decide } = lib('apply');
  const { slugify, notifSlug } = lib('pageData');

  const requests = files.flatMap((f) => { const j = JSON.parse(fs.readFileSync(f, 'utf8')); return Array.isArray(j) ? j : [j]; });
  if (requests.length > MAX) throw new Error(`${requests.length} requests given; apply at most ${MAX} per run.`);

  // 1. Check everything first. Nothing is written unless every request passes.
  const today = new Date().toISOString().slice(0, 10);
  const ready = [];
  for (const [i, r] of requests.entries()) {
    const label = `${i + 1}/${requests.length} ${r.action} ${r.kind}${r.payload && r.payload.state ? ' ' + r.payload.state : ''}`;
    const problems = [];
    if (!['ADD', 'REMOVE', 'REPLACE'].includes(r.action)) problems.push('action must be ADD, REMOVE or REPLACE');
    if (!KINDS.includes(r.kind)) problems.push(`kind must be one of ${KINDS.join(', ')}`);
    if (r.action !== 'ADD' && !UUID.test(r.target_id || '')) problems.push('target_id (uuid) is required for REMOVE and REPLACE');
    let clean = null;
    if (!problems.length && r.action !== 'REMOVE') {
      try { clean = sanitize(r.kind, r.payload); } catch (e) { if (e instanceof Rejection) problems.push(...e.errors); else throw e; }
    }
    let current = null;
    if (!problems.length && r.action !== 'ADD') {
      current = (await db.query(`SELECT *, ${r.kind === 'notification' ? 'NULL' : 'effective_from::text'} AS eff_text FROM ${TABLE[r.kind]} WHERE id = $1 AND removed_at IS NULL`, [r.target_id]))[0];
      if (!current) problems.push('target_id does not match a live entry');
    }
    if (!problems.length && r.action === 'REPLACE' && r.kind !== 'notification' && clean.effective_from > today && current.eff_text <= today)
      problems.push('A change that starts in the future must be an ADD, so the current rule stays live until the new date.');
    if (!problems.length && clean && r.kind === 'notification' && r.action === 'ADD') {
      const dupe = await db.query('SELECT 1 FROM notifications WHERE dedupe_key = $1 AND removed_at IS NULL', [clean.dedupe_key]);
      if (dupe.length) problems.push('This notification already exists (same URL, title and date).');
    }
    if (problems.length) { console.log(`${label}: will NOT be applied\n  - ${problems.join('\n  - ')}`); continue; }

    const summary = r.action === 'REMOVE' ? `Remove ${r.kind} ${r.target_id}` : summarise(r.kind, clean);
    console.log(`${label}: ${summary}`);
    if (r.action === 'REPLACE' && current) {
      Object.keys(clean).forEach((f) => {
        const before = JSON.stringify(canon(f === 'effective_from' ? current.eff_text : current[f]));
        const after = JSON.stringify(canon(clean[f]));
        if (f in current && before !== after) console.log(`    ${f}\n      now: ${before}\n      new: ${after}`);
      });
    }
    ready.push({ r, clean, summary, label });
  }
  if (ready.length !== requests.length) throw new Error('Fix the requests above and run again. Nothing was changed.');

  // 2. Your confirmation replaces the approval email.
  const answer = await ask(`\nType APPLY to apply ${ready.length} change(s) to the ${label} database: `);
  if (answer !== 'APPLY') { console.log('Not applied. Nothing was changed.'); return; }

  // 3. Each change: recorded as a request, then approved with the same decide() an email approval runs, in one transaction.
  const pages = new Set(['/updates']);
  for (const { r, clean, summary, label } of ready) {
    const out = await db.tx(async (tx) => {
      const nonce = crypto.randomBytes(16).toString('hex');
      const [row] = await tx.query(
        `INSERT INTO change_requests (action, kind, target_id, payload, summary, submitted_by, nonce, expires_at)
         VALUES ($1,$2,$3,$4::jsonb,$5,$6,$7, now() + interval '1 hour') RETURNING id`,
        [r.action, r.kind, r.target_id || null, clean ? JSON.stringify(clean) : null, summary, by, nonce]);
      await tx.query('INSERT INTO audit_log (request_id, event, kind, target_id, detail) VALUES ($1,$2,$3,$4,$5::jsonb)',
        [row.id, 'submitted', r.kind, r.target_id || null, JSON.stringify({ action: r.action, by, via: 'apply-direct (owner-validated, no email approval)' })]);
      const res = await decide(tx, row.id, nonce, 'approve', null);
      if (res.status !== 'approved') throw new Error(res.message);
      return res;
    });
    console.log(`${label}: applied (new entry ${out.added || '-'}, removed ${out.removed || '-'})`);
    const a = out.affected || {};
    const topics = new Set(); if (TOPIC_OF_KIND[a.kind]) topics.add(TOPIC_OF_KIND[a.kind]);
    (a.categories || []).forEach((c) => { if (TOPIC_OF_CAT[c]) topics.add(TOPIC_OF_CAT[c]); });
    (a.notifications || []).forEach((n) => pages.add('/updates/notifications/' + notifSlug(n)));
    topics.forEach((t) => { pages.add('/updates/' + t); (a.states || []).forEach((st) => pages.add('/updates/' + t + '/' + slugify(st))); });
  }
  const list = [...pages];
  console.log('\nPages that show these changes:\n  ' + list.join('\n  '));
  fs.writeFileSync(path.join('requests', 'last-applied-pages.json'), JSON.stringify(list, null, 2) + '\n');

  // 4. Refresh those pages on the live site straight away (production only; uses the same key as /api/submit).
  if (!isProd) { console.log('\nDev database: no live pages to refresh.'); return; }
  if (!process.env.SUBMIT_API_KEY) { console.log('\nSUBMIT_API_KEY is not set, so the pages refresh on their own within a day.'); return; }
  const base = (process.env.SUBMIT_BASE_URL || 'https://www.payrolltool.in').replace(/\/$/, '');
  try {
    const res = await fetch(base + '/api/revalidate', { method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': process.env.SUBMIT_API_KEY }, body: JSON.stringify({ paths: list }) });
    const body = await res.json().catch(() => ({}));
    if (res.ok) console.log(`\nRefreshed ${body.refreshed} page(s) on ${base}.${body.failed && body.failed.length ? ' Not refreshed: ' + body.failed.join(', ') : ''}`);
    else console.log(`\nPages not refreshed (${res.status} ${body.error || ''}). They refresh on their own within a day.`);
  } catch (e) { console.log(`\nPages not refreshed (${e.message}). They refresh on their own within a day.`); }
}
main().catch((e) => { console.error('Stopped: ' + e.message); process.exit(1); });
