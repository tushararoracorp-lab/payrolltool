import crypto from 'crypto';
import { SignJWT } from 'jose';
import otpStore from './otp-store';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { email, otp } = req.body;
  const record = otpStore.get(email);

  if (!record) {
    return res.status(401).json({ error: 'No OTP requested for this email' });
  }

  if (Date.now() > record.expiry) {
    otpStore.delete(email);
    return res.status(401).json({ error: 'OTP expired. Please request a new one.' });
  }

  if (record.attempts >= 5) {
    otpStore.delete(email);
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
    return res.status(401).json({ error: `Invalid OTP. ${5 - record.attempts} attempts remaining.` });
  }

  otpStore.delete(email);

  const secret = new TextEncoder().encode(process.env.ADMIN_SESSION_SECRET);
  const token = await new SignJWT({ email })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(secret);

  res.setHeader('Set-Cookie', 
    `admin_session=${token}; HttpOnly; Path=/; Max-Age=86400; SameSite=Strict${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`
  );

  return res.status(200).json({ ok: true });
}