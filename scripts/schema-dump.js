// READ-ONLY. Prints the structure of the rule tables (columns, checks, triggers), the "current" views and the
// append-only trigger function, so a schema change can be written to fit them exactly. Changes nothing.
// Usage (PowerShell): load .env.local (dev), then  node scripts/schema-dump.js > schema-dump.txt
const path = require('path');
const db = require(path.join(process.cwd(), 'src', 'lib', 'updates', 'db'));

async function main() {
  for (const t of ['pt_rules', 'lwf_rules', 'mw_rates', 'change_requests', 'audit_log']) {
    console.log(`\n=== ${t}`);
    const cols = await db.query(`SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1 ORDER BY ordinal_position`, [t]);
    cols.forEach((c) => console.log(`col ${c.column_name} ${c.data_type} null=${c.is_nullable} default=${c.column_default || ''}`));
    const cons = await db.query(`SELECT conname, pg_get_constraintdef(oid) AS def FROM pg_constraint
      WHERE conrelid = ('public.' || $1)::regclass ORDER BY conname`, [t]);
    cons.forEach((c) => console.log(`con ${c.conname}: ${c.def}`));
    const trg = await db.query(`SELECT tgname, pg_get_triggerdef(oid) AS def FROM pg_trigger
      WHERE tgrelid = ('public.' || $1)::regclass AND NOT tgisinternal ORDER BY tgname`, [t]);
    trg.forEach((r) => console.log(`trg ${r.tgname}: ${r.def}`));
    const idx = await db.query(`SELECT indexname, indexdef FROM pg_indexes WHERE schemaname = 'public' AND tablename = $1`, [t]);
    idx.forEach((r) => console.log(`idx ${r.indexname}: ${r.indexdef}`));
  }
  console.log('\n=== views');
  const views = await db.query(`SELECT viewname, definition FROM pg_views WHERE schemaname = 'public' ORDER BY viewname`);
  views.forEach((v) => console.log(`view ${v.viewname}:\n${v.definition}\n`));
  console.log('=== functions');
  const fns = await db.query(`SELECT p.proname, pg_get_functiondef(p.oid) AS def FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prokind = 'f' ORDER BY p.proname`);
  fns.forEach((f) => console.log(`fn ${f.proname}:\n${f.def}\n`));
}
main().then(() => process.exit(0)).catch((e) => { console.error('Stopped: ' + e.message); process.exit(1); });
