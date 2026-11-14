// Applies the reviewed /updates corrections in scripts/updates-fixes.json, in ONE transaction (all or nothing).
//   Preview (changes nothing):  node --env-file=.env.local scripts/fix-updates.js
//   Apply:                      node --env-file=.env.local scripts/fix-updates.js --apply
// Safety: every entry is checked against the export it was prepared from. If an entry was changed or removed since,
// the whole run stops and nothing is written.
const crypto = require('crypto');
const db = require('../src/lib/updates/db');
const { sanitize } = require('../src/lib/updates/sanitize');
const { COLUMNS } = require('../src/lib/updates/apply');
const fx = require('./updates-fixes.json');

const APPLY = process.argv.includes('--apply');
let finished = false;
process.on('exit', (code) => { if (!finished) console.log('\nSTOPPED: the database connection closed before the run finished. Nothing was written (the changes are one transaction). Run the same command again.'); });
setTimeout(() => { if (!finished) { console.log('\nSTOPPED: no answer from the database for 3 minutes. Run the same command again.'); (finished = true, process.exit)(1); } }, 180000).unref();
const sha = (s) => crypto.createHash('sha256').update(s || '', 'utf8').digest('hex');
const words = (s) => (s.trim() ? s.trim().split(/\s+/).length : 0);

async function main() {
  try { console.log('Database: ' + new URL(process.env.DATABASE_URL).hostname.split('.')[0] + '\n'); } catch (_) { console.log('Database: DATABASE_URL is not set\n'); (finished = true, process.exit)(1); }
  // Entries are found by their content key (the 8 characters at the end of the page address) and title, which are the
  // same on every database branch; internal ids are not. The text fingerprint then proves it is the same entry.
  const all = [...fx.remove, ...fx.edit, ...fx.flag];
  const rows = await db.query('SELECT id, title, left(dedupe_key, 8) AS k, explainer_en, explainer_hi, removed_at FROM notifications WHERE left(dedupe_key, 8) = ANY($1::text[])', [all.map((x) => x.key)]);
  const problems = [];
  for (const x of all) {
    const live = rows.filter((r) => r.k === x.key && r.title === x.title && !r.removed_at);
    if (live.length > 1) { problems.push(`more than one live match: ${x.title}`); continue; }
    const r = live[0] || rows.find((q) => q.k === x.key && q.title === x.title);
    if (r) x.id = r.id;
    if (!r) problems.push(`not found: ${x.title}`);
    else if (r.removed_at) problems.push(`already removed: ${x.title}`);
    else if (x.old_en_sha256 && sha(r.explainer_en) !== x.old_en_sha256) problems.push(`changed since the export (English): ${x.title}`);
    else if (x.old_hi_sha256 && sha(r.explainer_hi) !== x.old_hi_sha256) problems.push(`changed since the export (Hindi): ${x.title}`);
  }
  const adds = fx.add.map((p) => sanitize('notification', p));       // throws if the new entry breaks a rule
  for (const c of adds) {
    const d = await db.query('SELECT 1 FROM notifications WHERE dedupe_key = $1 AND removed_at IS NULL', [c.dedupe_key]);
    if (d.length) problems.push(`already exists: ${c.title}`);
  }
  console.log(`Take offline: ${fx.remove.length} | Clean up text: ${fx.edit.length} | Mark superseded: ${fx.flag.length} | Add: ${adds.length} | Remove from state lists: ${fx.applicability_remove.length}`);
  fx.remove.forEach((x) => console.log('  offline  -', x.title));
  adds.forEach((c) => console.log('  add      -', c.title));
  fx.applicability_remove.forEach((a) => console.log(`  list     - ${a.scheme}: ${a.state}`));
  const listLocked = (await db.query("SELECT 1 FROM pg_trigger WHERE tgrelid = 'applicability'::regclass AND NOT tgisinternal")).length > 0;
  if (listLocked) problems.push('the state lists (applicability table) are protected by a trigger, so the 2 list fixes cannot be made this way. Tell Claude.');
  const shortCount = fx.edit.filter((x) => words(x.en) < 250 || words(x.hi) < 250).length;
  console.log(`  note     - ${shortCount} of the ${fx.edit.length} cleaned entries fall under 250 words and will be marked legacy (database rule).`);
  if (problems.length) { console.log('\nSTOPPED, nothing written:'); problems.forEach((p) => console.log('  ' + p)); (finished = true, process.exit)(1); }
  if (!APPLY) { console.log('\nPreview only. Run again with --apply to write these changes.'); (finished = true, process.exit)(0); }

  await db.tx(async (tx) => {
    // Rows cannot be edited in place (database rule), so a change is made the way a REPLACE works:
    // hide the old row, then insert a copy with the corrected fields. The copy is made inside the database,
    // so dates and every other column are carried over exactly; it keeps the same dedupe key, so the page address stays the same.
    const hasLegacy = (await tx.query("SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'legacy'")).length > 0;
    const cols = [...COLUMNS.notifications, ...(hasLegacy ? ['legacy'] : [])];
    async function replaceRow(id, overrides) {
      const hidden = await tx.query('UPDATE notifications SET removed_at = now() WHERE id = $1 AND removed_at IS NULL RETURNING id', [id]);
      if (!hidden.length) throw new Error('entry vanished during the run: ' + id);
      const params = [id], sel = cols.map((c) => (c in overrides ? (params.push(overrides[c]), '$' + params.length) : c));
      await tx.query(`INSERT INTO notifications (${cols.join(',')}) SELECT ${sel.join(',')} FROM notifications WHERE id = $1`, params);
    }
    for (const x of fx.remove) await tx.query('UPDATE notifications SET removed_at = now() WHERE id = $1 AND removed_at IS NULL', [x.id]);
    // Database rule: legacy OR (words_en >= 250 AND words_hi >= 250). A cleaned copy that falls under 250 words is the same
    // existing content made shorter, so it is marked legacy, as the original import did for its short explainers.
    for (const x of fx.edit) {
      const we = words(x.en), wh = words(x.hi), o = { explainer_en: x.en, explainer_hi: x.hi, words_en: we, words_hi: wh };
      if (we < 250 || wh < 250) o.legacy = true;
      await replaceRow(x.id, o);
    }
    for (const x of fx.flag) await replaceRow(x.id, { flag: x.flag, status: x.status });
    for (const c of adds) {
      const ac = COLUMNS.notifications;
      await tx.query(`INSERT INTO notifications (${ac.join(',')}) VALUES (${ac.map((_, i) => '$' + (i + 1)).join(',')})`, ac.map((k) => c[k] ?? null));
    }
    for (const a of fx.applicability_remove) await tx.query('DELETE FROM applicability WHERE scheme = $1 AND state = $2 AND applies = false', [a.scheme, a.state]);
  });
  console.log('\nDone. The /updates pages refresh within 10 minutes.');
  (finished = true, process.exit)(0);
}
main().catch((e) => { console.error('Failed, nothing written:', e.message); (finished = true, process.exit)(1); });
