// Tiny database facade so the same code runs on Neon in production and on PGlite in tests.
// A driver is { query(text, params) -> rows[], tx(fn) -> fn({ query }) inside BEGIN/COMMIT }.
let driver = null;

function setDriver(d) { driver = d; }

function neonDriver() {
  const { Pool, neonConfig } = require('@neondatabase/serverless');
  try { neonConfig.webSocketConstructor = require('ws'); } catch (_) { /* Node 22+ has a global WebSocket */ }
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  return {
    async query(text, params = []) { return (await pool.query(text, params)).rows; },
    async exec(sql) { await pool.query(sql); },
    async tx(fn) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const out = await fn({ query: async (t, p = []) => (await client.query(t, p)).rows });
        await client.query('COMMIT');
        return out;
      } catch (e) { try { await client.query('ROLLBACK'); } catch (_) {} throw e; }
      finally { client.release(); }
    },
  };
}

function pgliteDriver(db) {
  return {
    async query(text, params = []) { return (await db.query(text, params)).rows; },
    async exec(sql) { await db.exec(sql); },
    async tx(fn) { return db.transaction(async (t) => fn({ query: async (a, b = []) => (await t.query(a, b)).rows })); },
  };
}

function get() {
  if (!driver) driver = neonDriver();
  return driver;
}

module.exports = { setDriver, pgliteDriver, get, exec: (s) => get().exec(s), query: (t, p) => get().query(t, p), tx: (fn) => get().tx(fn) };
