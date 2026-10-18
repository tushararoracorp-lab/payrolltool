// Signed, expiring, single-purpose links for the approval email.
const crypto = require('crypto');
const b64 = (b) => Buffer.from(b).toString('base64url');

function sign(data, secret) {
  const body = b64(JSON.stringify(data));
  const mac = crypto.createHmac('sha256', secret).update(body).digest('base64url');
  return `${body}.${mac}`;
}
function verify(token, secret, now = Date.now()) {
  if (typeof token !== 'string' || !token.includes('.')) return null;
  const [body, mac] = token.split('.');
  const good = crypto.createHmac('sha256', secret).update(body).digest('base64url');
  const a = Buffer.from(mac || ''), b = Buffer.from(good);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  let data; try { data = JSON.parse(Buffer.from(body, 'base64url').toString()); } catch (_) { return null; }
  if (!data.exp || data.exp < now) return null;
  return data;
}
const nonce = () => crypto.randomBytes(18).toString('base64url');
function safeEqual(a, b) {
  const x = Buffer.from(String(a || '')), y = Buffer.from(String(b || ''));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}
module.exports = { sign, verify, nonce, safeEqual };
