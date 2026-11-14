// READ-ONLY (SELECT statements only). Builds a REPLACE request for one minimum wage row picked by state AND
// effective date, so an older (history) row can be corrected, not only the latest one.
//
// Usage (PowerShell):
//   $env:PROD_DATABASE_URL = '<connection string>'      (dev or production; IDs differ, so run it for each)
//   node scripts/make-replace-at.js requests/g1-mw-history-spec.json
// Spec: [{ "state": "Sikkim", "effective_from": "2022-07-11", "patch": { "note": "..." } }, ...]
// Output: requests/<spec name>-request.json (one file, all rows), ready for scripts/apply-direct.js
const fs = require('fs');
const path = require('path');
const FIELDS = ['state', 'effective_from', 'structure', 'flag', 'cadence', 'zones', 'authority', 'label', 'categories', 'reference', 'note', 'official_url', 'explainer_en', 'explainer_hi'];

async function main() {
  const specFile = process.argv[2];
  if (!specFile) throw new Error('Usage: node scripts/make-replace-at.js <spec.json>');
  if (!process.env.PROD_DATABASE_URL) throw new Error("Set $env:PROD_DATABASE_URL = '<connection string>' first.");
  process.env.DATABASE_URL = process.env.PROD_DATABASE_URL;
  let host = ''; try { host = new URL(process.env.PROD_DATABASE_URL).hostname; } catch (_) {}
  console.log('Database: ' + (host.includes('spring-poetry') ? 'PRODUCTION' : host.includes('sparkling-salad') ? 'DEV' : '') + ' (' + host.split('.')[0] + ')\n');
  const db = require(path.join(process.cwd(), 'src', 'lib', 'updates', 'db'));
  const rowsOf = (r) => (Array.isArray(r) ? r : (r && r.rows) || []);
  const spec = JSON.parse(fs.readFileSync(specFile, 'utf8'));
  const out = [];
  for (const s of spec) {
    const bad = Object.keys(s.patch).filter((f) => !FIELDS.includes(f));
    if (bad.length) throw new Error(`${s.state} ${s.effective_from}: patch has fields mw_rate does not take: ${bad.join(', ')}`);
    const rows = rowsOf(await db.query(
      `SELECT *, effective_from::text AS effective_from_text FROM mw_rates WHERE state = $1 AND effective_from = $2::date AND removed_at IS NULL`,
      [s.state, s.effective_from]));
    if (rows.length !== 1) throw new Error(`${s.state} ${s.effective_from}: expected one live row, found ${rows.length}. Nothing was written.`);
    const row = rows[0];
    const payload = {};
    FIELDS.forEach((f) => { payload[f] = f === 'effective_from' ? row.effective_from_text : row[f]; });
    Object.keys(s.patch).forEach((f) => { payload[f] = s.patch[f]; });
    out.push({ action: 'REPLACE', kind: 'mw_rate', target_id: row.id, payload });
    console.log(`REPLACE ${s.state} ${s.effective_from}`);
    Object.keys(s.patch).forEach((f) => console.log(`  ${f}\n    now: ${JSON.stringify(row[f])}\n    new: ${JSON.stringify(s.patch[f])}`));
  }
  const file = path.join('requests', path.basename(specFile).replace(/-spec\.json$/, '').replace(/\.json$/, '') + '-request.json');
  fs.writeFileSync(file, JSON.stringify(out, null, 2) + '\n');
  console.log(`\nSaved ${file} (${out.length} requests). Nothing was changed in the database.`);
  if (typeof db.end === 'function') await db.end().catch(() => {});
}
main().then(() => process.exit(0)).catch((e) => { console.error('Stopped: ' + e.message); process.exit(1); });
