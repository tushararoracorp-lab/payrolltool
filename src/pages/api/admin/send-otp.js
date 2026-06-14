import crypto from 'crypto';

import otpStore from './otp-store';

export default async function handler(req, res) {
    console.log('RESEND KEY:', process.env.RESEND_API_KEY);
    if (req.method !== 'POST') return res.status(405).end();

  const { email } = req.body;
  const allowedEmails = process.env.ADMIN_EMAILS.split(',').map(e => e.trim());

  if (!allowedEmails.includes(email)) {
    return res.status(200).json({ ok: true });
  }

  const otp = crypto.randomInt(100000, 999999).toString();
  const expiry = Date.now() + 10 * 60 * 1000;
  const hashed = crypto.createHmac('sha256', process.env.OTP_SECRET)
    .update(otp + email).digest('hex');

  otpStore.set(email, { hashed, expiry, attempts: 0 });

  // Initialize Resend inside the handler
  const { Resend } = await import('resend');
  const resend = new Resend(process.env.RESEND_API_KEY);

    const result = await resend.emails.send({
    from: 'PayrollTool Admin <noreply@payrolltool.in>',
    to: email,
    subject: 'Your PayrollTool Admin OTP',
    text: `Your one-time password is: ${otp}\n\nThis code expires in 10 minutes and can only be used once.\n\nIf you didn't request this, ignore this email.`,
    });
    console.log('Resend result:', JSON.stringify(result));

  return res.status(200).json({ ok: true });
}

export { otpStore };