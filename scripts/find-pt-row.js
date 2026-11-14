// Read-only: prints the live Professional Tax rule row(s) for one state, with their IDs.
// Changes nothing. Use in a PowerShell window where DATABASE_URL points at the database you want.
//   node --env-file=.env.local scripts/find-pt-row.js Assam
const db = require('../src/lib/updates/db');

const state = process.argv.slice(2).join(' ') || 'Assam';
let host = '(not set)';
try { host = new URL(process.env.DATABASE_URL).hostname.split('.')[0]; } catch (_) { /* shown below */ }
console.log('Database: ' + host);

db.query("SELECT * FROM pt_rules WHERE state = $1 ORDER BY removed_at NULLS FIRST", [state])
  .then((rows) => {
    if (!rows.length) { console.log(`No pt_rules rows for "${state}". Check the spelling (as on the site, e.g. "Tamil Nadu").`); process.exit(0); }
    for (const r of rows) {
      console.log('------');
      console.log('id:         ' + r.id);
      console.log('live:       ' + (r.removed_at ? 'no (removed ' + new Date(r.removed_at).toISOString().slice(0, 10) + ')' : 'YES'));
      for (const [k, v] of Object.entries(r)) {
        if (['id', 'removed_at'].includes(k)) continue;
        const s = v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v);
        if (s) console.log(`${(k + ':').padEnd(12)}${s.length > 90 ? s.slice(0, 90) + '…' : s}`);
      }
    }
    process.exit(0);
  })
  .catch((e) => { console.error('Failed: ' + e.message); process.exit(1); });
