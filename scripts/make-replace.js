// READ-ONLY (SELECT statements only). Builds a REPLACE request for one live Professional Tax, Labour Welfare Fund or minimum wage rule,
// taken from the PRODUCTION database, with your corrections applied. Nothing is written to the database.
//
// Usage (PowerShell, one session only - the connection string is not saved anywhere):
//   $env:PROD_DATABASE_URL = "<production connection string from Neon or Vercel>"
//   node scripts/make-replace.js pt_rule Assam requests/assam-pt-patch.json
//
// Output: requests/<state>-<kind>-request.json, ready for scripts/submit-batch.js
const fs = require('fs');
const path = require('path');

const KINDS = {
  pt_rule: { view: 'v_pt_current', table: 'pt_rules',
    fields: ['state', 'effective_from', 'frequency', 'cycle_text', 'basis', 'due_text', 'act', 'annual_cap', 'slab_tables', 'notes', 'official_url', 'explainer_en', 'explainer_hi'] },
  lwf_rule: { view: 'v_lwf_current', table: 'lwf_rules',
    fields: ['state', 'effective_from', 'employee_amount', 'employer_amount', 'ratio', 'frequency', 'due_text', 'act', 'notes', 'official_url', 'explainer_en', 'explainer_hi'] },
  // minimum wages have no "current" view: the live row with the latest effective date is the current one
  mw_rate: { current: `SELECT id FROM mw_rates WHERE state = $1 AND removed_at IS NULL ORDER BY effective_from DESC LIMIT 1`, table: 'mw_rates',
    fields: ['state', 'effective_from', 'structure', 'flag', 'cadence', 'zones', 'authority', 'label', 'categories', 'reference', 'note', 'official_url', 'explainer_en', 'explainer_hi'] },
};

async function main() {
  const [kind, stateName, patchFile] = process.argv.slice(2);
  const k = KINDS[kind];
  if (!k || !stateName || !patchFile) throw new Error('Usage: node scripts/make-replace.js <pt_rule|lwf_rule|mw_rate> "<State name>" <patch.json>');
  if (!process.env.PROD_DATABASE_URL) throw new Error('Set $env:PROD_DATABASE_URL to the production connection string first.');
  const patch = JSON.parse(fs.readFileSync(patchFile, 'utf8'));
  const bad = Object.keys(patch).filter((f) => !k.fields.includes(f));
  if (bad.length) throw new Error('Patch has fields this kind does not take: ' + bad.join(', '));

  // Uses the site's own database module, pointed at production for this run only.
  // The script runs SELECT statements and nothing else.
  process.env.DATABASE_URL = process.env.PROD_DATABASE_URL;
  let host = ''; try { host = new URL(process.env.PROD_DATABASE_URL).hostname; } catch (_) {}
  console.log('Database: ' + (host.includes('spring-poetry') ? 'PRODUCTION' : host.includes('sparkling-salad') ? 'DEV' : '') + ' (' + host.split('.')[0] + ')\n');
  const db = require(path.join(process.cwd(), 'src', 'lib', 'updates', 'db'));
  const rowsOf = (r) => (Array.isArray(r) ? r : (r && r.rows) || []);
  {
    const cur = rowsOf(await db.query(k.current || `SELECT id FROM ${k.view} WHERE state = $1`, [stateName]));
    if (cur.length !== 1) throw new Error(`Expected exactly one live ${kind} for "${stateName}", found ${cur.length}.`);
    const id = cur[0].id;
    const row = rowsOf(await db.query(`SELECT *, effective_from::text AS effective_from_text FROM ${k.table} WHERE id = $1`, [id]))[0];

    const payload = {};
    k.fields.forEach((f) => { payload[f] = f === 'effective_from' ? row.effective_from_text : row[f]; });
    Object.keys(patch).forEach((f) => { payload[f] = patch[f]; });

    const request = { action: 'REPLACE', kind, target_id: id, payload };
    const slug = stateName.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    const out = path.join('requests', `${slug}-${kind}-request.json`);
    fs.mkdirSync('requests', { recursive: true });
    fs.writeFileSync(out, JSON.stringify(request, null, 2) + '\n');

    console.log(`Live ${kind} for ${stateName}: ${id} (effective ${payload.effective_from})`);
    Object.keys(patch).forEach((f) => {
      console.log(`\n${f}\n  now: ${JSON.stringify(row[f])}\n  new: ${JSON.stringify(patch[f])}`);
    });
    console.log(`\nSaved ${out}. Nothing was changed in the database. Read it, then send it with scripts/submit-batch.js.`);
  }
  if (typeof db.end === 'function') await db.end().catch(() => {});
}
main().catch((e) => { console.error('Stopped: ' + e.message); process.exit(1); });
