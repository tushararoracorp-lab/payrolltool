import crypto from 'crypto';
import { SignJWT } from 'jose';

function parseCookies(req) {
  const header = req.headers.cookie || '';
  return Object.fromEntries(header.split(';').filter(Boolean).map(c => {
    const [k, ...v] = c.trim().split('=');
    return [k, v.join('=')];
  }));
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { email, otp } = req.body;

  const cookies = parseCookies(req);
  const raw = cookies.otp_data;
  if (!raw) {
    return res.status(401).json({ error: 'No OTP requested for this email' });
  }

  const [b64, sig] = raw.split('.');
  const payload = Buffer.from(b64, 'base64').toString('utf8');
  const expectedSig = crypto.createHmac('sha256', process.env.OTP_SECRET)
    .update(payload).digest('hex');

  if (sig !== expectedSig) {
    return res.status(401).json({ error: 'Invalid session. Please request a new OTP.' });
  }

  const record = JSON.parse(payload);

  if (record.email !== email) {
    return res.status(401).json({ error: 'No OTP requested for this email' });
  }
  if (Date.now() > record.expiry) {
    return res.status(401).json({ error: 'OTP expired. Please request a new one.' });
  }
  if (record.attempts >= 5) {
    return res.status(429).json({ error: 'Too many attempts. Please request a new OTP.' });
  }

  const hashed = crypto.createHmac('sha256', process.env.OTP_SECRET)
    .update(otp + email).digest('hex');

  const valid = crypto.timingSafeEqual(
    Buffer.from(hashed),
    Buffer.from(record.hashed)
  );

  if (!valid) {
    record.attempts += 1;
    const newPayload = JSON.stringify(record);
    const newSig = crypto.createHmac('sha256', process.env.OTP_SECRET)
      .update(newPayload).digest('hex');
    const newCookieValue = Buffer.from(newPayload).toString('base64') + '.' + newSig;
    res.setHeader('Set-Cookie',
      `otp_data=${newCookieValue}; HttpOnly; Path=/; Max-Age=600; SameSite=Strict${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`
    );
    return res.status(401).json({ error: `Invalid OTP. ${5 - record.attempts} attempts remaining.` });
  }

  const secret = new TextEncoder().encode(process.env.ADMIN_SESSION_SECRET);
  const token = await new SignJWT({ email })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(secret);

  res.setHeader('Set-Cookie', [
    `admin_session=${token}; HttpOnly; Path=/; Max-Age=86400; SameSite=Strict${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`,
    `otp_data=; HttpOnly; Path=/; Max-Age=0; SameSite=Strict${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`
  ]);

  return res.status(200).json({ ok: true });
}