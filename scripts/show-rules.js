// Read-only: prints the database rules (check constraints and triggers) on the notifications table.
//   node --env-file=.env.local scripts/show-rules.js
const db = require('../src/lib/updates/db');

(async () => {
  const checks = await db.query(
    "SELECT conname AS name, pg_get_constraintdef(oid) AS rule FROM pg_constraint WHERE conrelid = 'notifications'::regclass AND contype IN ('c','u','f','x')");
  const triggers = await db.query(
    "SELECT tgname AS name, pg_get_triggerdef(oid) AS rule FROM pg_trigger WHERE tgrelid = 'notifications'::regclass AND NOT tgisinternal");
  const cols = await db.query(
    "SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_name = 'notifications' ORDER BY ordinal_position");
  console.log('--- Checks'); checks.forEach((c) => console.log(c.name + ': ' + c.rule));
  console.log('--- Triggers'); triggers.forEach((t) => console.log(t.name + ': ' + t.rule));
  console.log('--- Columns'); cols.forEach((c) => console.log(`${c.column_name} ${c.data_type} null=${c.is_nullable} default=${c.column_default || ''}`));
  process.exit(0);
})().catch((e) => { console.error(e.message); process.exit(1); });
