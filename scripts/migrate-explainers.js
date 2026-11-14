// Phase 2, option (a): adds the state-page explainer columns to pt_rules, lwf_rules and mw_rates.
// Adds columns and one check per table; changes no existing data. Safe to run twice (it skips what exists).
// Run on DEV first, test, then on PRODUCTION, and only then deploy the code that writes these columns.
//
// Usage (PowerShell):
//   $env:PROD_DATABASE_URL = '<connection string>'     (dev or production; the script tells you which)
//   node scripts/migrate-explainers.js
const path = require('path');
const readline = require('readline');

const TABLES = ['pt_rules', 'lwf_rules', 'mw_rates'];
const ask = (q) => new Promise((r) => { const rl = readline.createInterface({ input: process.stdin, output: process.stdout }); rl.question(q, (a) => { rl.close(); r(a.trim()); }); });
function dbLabel(url) {
  let host = ''; try { host = new URL(url).hostname; } catch (_) { return 'unknown database'; }
  if (host.includes('spring-poetry')) return `PRODUCTION (${host.split('.')[0]})`;
  if (host.includes('sparkling-salad')) return `DEV (${host.split('.')[0]})`;
  return host.split('.')[0];
}

async function main() {
  if (!process.env.PROD_DATABASE_URL) throw new Error("Set $env:PROD_DATABASE_URL = '<connection string>' first.");
  process.env.DATABASE_URL = process.env.PROD_DATABASE_URL;   // this run only
  const label = dbLabel(process.env.PROD_DATABASE_URL);
  const db = require(path.join(process.cwd(), 'src', 'lib', 'updates', 'db'));
  console.log(`Database: ${label}\n`);

  const plan = [];
  for (const t of TABLES) {
    const have = new Set((await db.query(`SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1`, [t])).map((r) => r.column_name));
    const add = [['explainer_en', 'text'], ['explainer_hi', 'text'], ['words_en', 'integer'], ['words_hi', 'integer']].filter(([c]) => !have.has(c));
    const con = `${t}_explainer_check`;
    const hasCon = (await db.query(`SELECT 1 FROM pg_constraint WHERE conname = $1`, [con])).length > 0;
    add.forEach(([c, type]) => plan.push(`ALTER TABLE ${t} ADD COLUMN ${c} ${type}`));
    // both languages or neither; when present, 250+ words in each (the same rule as notifications)
    if (!hasCon) plan.push(`ALTER TABLE ${t} ADD CONSTRAINT ${con} CHECK ((explainer_en IS NULL AND explainer_hi IS NULL AND words_en IS NULL AND words_hi IS NULL) OR (explainer_en IS NOT NULL AND explainer_hi IS NOT NULL AND words_en >= 250 AND words_hi >= 250))`);
  }
  if (!plan.length) { console.log('Nothing to do: the explainer columns and checks are already in place.'); return; }
  console.log('This will run:\n  ' + plan.join(';\n  ') + ';\n');
  if ((await ask(`Type MIGRATE to change the ${label} database: `)) !== 'MIGRATE') { console.log('Not run. Nothing was changed.'); return; }
  await db.tx(async (tx) => { for (const s of plan) await tx.query(s); });
  console.log('\nDone. Existing rows are unchanged; their explainer columns are empty until a batch fills them.');
}
main().then(() => process.exit(0)).catch((e) => { console.error('Stopped: ' + e.message); process.exit(1); });
