// POST /api/submit   header: x-api-key: <SUBMIT_API_KEY>
// body: { action: 'ADD'|'REMOVE'|'REPLACE', kind, target_id?, payload?, submitted_by }
// Nothing is applied here. The request is stored as "pending" and an approval email goes to ADMIN_EMAIL.
const db = require('../../lib/updates/db');
const { sanitize, summarise, Rejection, TABLE, KINDS } = require('../../lib/updates/sanitize');
const { sign, nonce, safeEqual } = require('../../lib/updates/token');
const { sendApprovalEmail } = require('../../lib/updates/mail');

const HOURS = 72, MAX_PENDING = 25;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function preview(kind, clean) {
  if (!clean) return '(no new content - this request only removes an entry)';
  const j = JSON.stringify(clean, null, 2);
  return j.length > 3500 ? j.slice(0, 3500) + '\n... (truncated in the email)' : j;
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  if (!safeEqual(req.headers['x-api-key'], process.env.SUBMIT_API_KEY)) return res.status(401).json({ error: 'Invalid API key' });

  const { action, kind, target_id, payload, submitted_by } = req.body || {};
  if (!['ADD', 'REMOVE', 'REPLACE'].includes(action)) return res.status(400).json({ error: 'action must be ADD, REMOVE or REPLACE' });
  if (!KINDS.includes(kind)) return res.status(400).json({ error: `kind must be one of ${KINDS.join(', ')}` });
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(submitted_by || '')) return res.status(400).json({ error: 'submitted_by must be an email address' });
  if (action !== 'ADD' && !UUID.test(target_id || '')) return res.status(400).json({ error: 'target_id (uuid) is required for REMOVE and REPLACE' });

  let clean = null;
  try { if (action !== 'REMOVE') clean = sanitize(kind, payload); }
  catch (e) { if (e instanceof Rejection) return res.status(422).json({ error: 'Rejected by the sanitizer. Nothing was stored.', problems: e.errors }); throw e; }

  const table = TABLE[kind];
  if (action !== 'ADD') {
    const t = await db.query(`SELECT id FROM ${table} WHERE id = $1 AND removed_at IS NULL`, [target_id]);
    if (!t.length) return res.status(404).json({ error: 'target_id does not match a live entry' });
  }
  if (action === 'REPLACE' && kind !== 'notification') {
    const cur = await db.query(`SELECT effective_from::text AS e FROM ${table} WHERE id = $1`, [target_id]);
    const today = new Date().toISOString().slice(0, 10);
    if (clean.effective_from > today && cur[0].e <= today)
      return res.status(422).json({ error: 'A change that starts in the future must be submitted as ADD, so the current rule stays live until the new date. Use REPLACE only to correct an entry.' });
  }
  if (clean && kind === 'notification') {
    const dupe = await db.query('SELECT 1 FROM notifications WHERE dedupe_key = $1 AND removed_at IS NULL', [clean.dedupe_key]);
    if (dupe.length && action === 'ADD') return res.status(409).json({ error: 'This notification already exists (same URL, title and date).' });
  }
  const open = await db.query("SELECT count(*)::int AS n FROM change_requests WHERE status='pending' AND expires_at > now()");
  if (open[0].n >= MAX_PENDING) return res.status(429).json({ error: `Too many requests are waiting for approval (${MAX_PENDING}). Decide some first.` });

  const summary = action === 'REMOVE' ? `Remove ${kind} ${target_id}` : summarise(kind, clean);
  const n = nonce(), exp = Date.now() + HOURS * 3600e3;
  const [row] = await db.query(
    `INSERT INTO change_requests (action, kind, target_id, payload, summary, submitted_by, nonce, expires_at)
     VALUES ($1,$2,$3,$4::jsonb,$5,$6,$7,to_timestamp($8 / 1000.0)) RETURNING id, expires_at`,
    [action, kind, target_id || null, clean ? JSON.stringify(clean) : null, summary, submitted_by, n, exp]);
  await db.query('INSERT INTO audit_log (request_id, event, kind, target_id, detail) VALUES ($1,$2,$3,$4,$5::jsonb)',
    [row.id, 'submitted', kind, target_id || null, JSON.stringify({ action, by: submitted_by })]);

  const base = (process.env.PUBLIC_BASE_URL || '').replace(/\/$/, '');
  const link = (a) => `${base}/api/decision?t=${encodeURIComponent(sign({ rid: row.id, n, a, exp }, process.env.APPROVAL_SECRET))}`;
  await sendApprovalEmail({
    request: { action, kind, summary, submitted_by, expires_at: row.expires_at },
    approveUrl: link('approve'), rejectUrl: link('reject'), preview: preview(kind, clean),
  });
  return res.status(202).json({ id: row.id, status: 'pending', message: 'Stored. Waiting for the admin to approve by email.' });
};
