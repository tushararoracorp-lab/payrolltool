// GET  /api/decision?t=<token>  -> shows a confirmation page. CHANGES NOTHING (email scanners open links).
// POST /api/decision  (t=<token>) -> applies the approve / reject inside one transaction.
const db = require('../../lib/updates/db');
const { verify } = require('../../lib/updates/token');
const { decide } = require('../../lib/updates/apply');

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const page = (title, body) => `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><body style="font-family:Arial,sans-serif;max-width:560px;margin:40px auto;padding:0 16px;color:#1E1B4B">${body}</body>`;

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'");
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  const token = req.method === 'POST' ? (req.body && req.body.t) : (req.query && req.query.t);
  const data = verify(token, process.env.APPROVAL_SECRET);
  if (!data) return res.status(400).send(page('Invalid link', '<h2>This link is not valid or has expired.</h2><p>Ask the submitter to send the request again.</p>'));

  if (req.method === 'GET') {
    const rows = await db.query('SELECT action, kind, summary, submitted_by, status, expires_at FROM change_requests WHERE id = $1 AND nonce = $2', [data.rid, data.n]);
    const r = rows[0];
    if (!r) return res.status(404).send(page('Not found', '<h2>Request not found.</h2>'));
    if (r.status !== 'pending') return res.status(200).send(page('Already decided', `<h2>This request was already ${esc(r.status)}.</h2>`));
    const verb = data.a === 'approve' ? 'Approve' : 'Reject';
    return res.status(200).send(page(`${verb} request`, `<h2>${verb} this change?</h2>
      <p><b>${esc(r.action)}</b> - ${esc(r.kind)}</p><p>${esc(r.summary)}</p><p style="color:#666">Submitted by ${esc(r.submitted_by)}</p>
      <form method="POST" action="/api/decision"><input type="hidden" name="t" value="${esc(token)}">
      <button style="background:${data.a === 'approve' ? '#7C3AED' : '#B91C1C'};color:#fff;border:0;padding:12px 22px;border-radius:99px;font-size:16px;cursor:pointer">${verb}</button></form>`));
  }
  if (req.method !== 'POST') return res.status(405).send(page('Not allowed', '<h2>Method not allowed.</h2>'));

  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || null;
  const out = await db.tx((tx) => decide(tx, data.rid, data.n, data.a, ip));
  const ok = out.status === 'approved' || out.status === 'rejected';
  // Next.js only: rebuild the public page right away so an approved change shows up without waiting for the 10 minute cache.
  if (out.status === 'approved' && typeof res.revalidate === 'function') { try { await res.revalidate('/updates'); } catch (e) { /* page rebuilds on its own within 10 minutes */ } }
  return res.status(ok ? 200 : 400).send(page('Done', `<h2>${esc(out.message)}</h2>`));
};
