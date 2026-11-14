// Read-only: checks which database this window is connected to and how many live notifications it has.
//   node --env-file=.env.local scripts/db-check.js
let answered = false;
process.on('exit', () => { if (!answered) console.log('RESULT: the connection closed without an answer. The DATABASE_URL in this window is not usable - check it was pasted whole, between plain double quotes, starting with postgresql://'); });

const raw = process.env.DATABASE_URL || '';
let host = '(not set)';
try { const u = new URL(raw); host = u.hostname; console.log('Branch: ' + host.split('.')[0]); console.log('Starts with postgres: ' + /^postgres(ql)?:\/\//.test(raw) + ' | Has a password: ' + Boolean(u.password)); }
catch (e) { console.log('DATABASE_URL is not a valid URL in this window (' + (raw ? raw.slice(0, 12) + '...' : 'empty') + ')'); answered = true; process.exit(1); }

const db = require('../src/lib/updates/db');
const timer = setTimeout(() => { console.log('RESULT: no answer from the database after 20 seconds.'); answered = true; process.exit(1); }, 20000);

db.query("SELECT count(*)::int AS live FROM notifications WHERE removed_at IS NULL")
  .then((r) => { answered = true; clearTimeout(timer); console.log('RESULT: connected. Live notifications: ' + r[0].live); process.exit(0); })
  .catch((e) => { answered = true; clearTimeout(timer); console.log('RESULT: connection failed: ' + e.message); process.exit(1); });
