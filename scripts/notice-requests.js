// READ-ONLY. Turns a notice spec (which live notification to replace or remove, found by state and part of its
// title) into a request file for scripts/apply-direct.js, with the right target IDs for the database you point it at.
//
// Usage (PowerShell):
//   $env:PROD_DATABASE_URL = '<connection string>'      (dev or production; IDs differ, so run it for each)
//   node scripts/notice-requests.js requests/d1-notices-spec.json
// Output: requests/<spec name>-request.json
const fs = require('fs');
const path = require('path');

async function main() {
  const specFile = process.argv[2];
  if (!specFile) throw new Error('Usage: node scripts/notice-requests.js <spec.json>');
  if (!process.env.PROD_DATABASE_URL) throw new Error("Set $env:PROD_DATABASE_URL = '<connection string>' first.");
  process.env.DATABASE_URL = process.env.PROD_DATABASE_URL;
  let host = ''; try { host = new URL(process.env.PROD_DATABASE_URL).hostname; } catch (_) {}
  console.log('Database: ' + (host.includes('spring-poetry') ? 'PRODUCTION' : host.includes('sparkling-salad') ? 'DEV' : '') + ' (' + host.split('.')[0] + ')\n');
  const db = require(path.join(process.cwd(), 'src', 'lib', 'updates', 'db'));
  const spec = JSON.parse(fs.readFileSync(specFile, 'utf8'));
  const out = [];
  for (const s of spec) {
    const rows = await db.query(
      `SELECT id, title FROM notifications WHERE removed_at IS NULL AND state IS NOT DISTINCT FROM $1 AND title ILIKE '%' || $2 || '%'`,
      [s.match.state || null, s.match.title_contains]);
    if (rows.length !== 1) throw new Error(`"${s.match.title_contains}" (${s.match.state}): expected one live notice, found ${rows.length}. Nothing was written.`);
    console.log(`${s.action.padEnd(7)} ${rows[0].title}`);
    out.push(s.action === 'REMOVE'
      ? { action: 'REMOVE', kind: 'notification', target_id: rows[0].id }
      : { action: s.action, kind: 'notification', target_id: rows[0].id, payload: s.payload });
  }
  const file = path.join('requests', path.basename(specFile).replace(/-spec\.json$/, '').replace(/\.json$/, '') + '-request.json');
  fs.writeFileSync(file, JSON.stringify(out, null, 2) + '\n');
  console.log(`\nSaved ${file} (${out.length} requests). Nothing was changed in the database.`);
}
main().then(() => process.exit(0)).catch((e) => { console.error('Stopped: ' + e.message); process.exit(1); });
