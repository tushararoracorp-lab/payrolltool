// pages/api/contact.js
//
// Receives submissions from RequestForm.js (used on the homepage and About
// page) and sends them as an email to support@payrolltool.in, using Gmail's
// SMTP relay authenticated with an app password. No third-party email
// service, no Google Sheet - just a real email landing in a real inbox,
// exactly as requested.
//
// ---------------------------------------------------------------------------
// SETUP:
//
// 1. npm install nodemailer
//
// 2. In your Google account settings, enable 2-Step Verification if it
//    isn't already on (required before app passwords are available).
//
// 3. Go to myaccount.google.com/apppasswords, generate a new app password
//    (name it something like "PayrollTool contact form"). Copy the 16-
//    character password it gives you - you won't be able to see it again.
//
// 4. Confirm support@payrolltool.in is set up as a "Send mail as" alias on
//    this same Google account: Gmail Settings -> Accounts -> "Send mail as"
//    -> support@payrolltool.in should already be listed there, since you
//    said you can already send/receive as that address through this Gmail
//    account. If it's not listed, add it there first - this route sends
//    "from" support@payrolltool.in specifically, which only works if Gmail
//    already recognizes that alias as belonging to the authenticating account.
//
// 5. Add these to your environment (Vercel dashboard, all environments):
//      GMAIL_USER=your-actual-gmail-address@gmail.com
//      GMAIL_APP_PASSWORD=the16charapppassword
//
//    GMAIL_USER is the account you're authenticating as (your real Gmail
//    login), not support@payrolltool.in itself - the "from" address in the
//    email content is set separately below, and only succeeds because of
//    the "Send mail as" alias from step 4.
//
// Until both env vars are set, this returns a 503 and RequestForm.js shows
// its inline error message pointing people to email support@payrolltool.in
// directly - no silent failure like the earlier stats/feedback gaps.
// ---------------------------------------------------------------------------

import nodemailer from "nodemailer";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

let transporter = null;
function getTransporter() {
  if (transporter) return transporter;
  const { GMAIL_USER, GMAIL_APP_PASSWORD } = process.env;
  if (!GMAIL_USER || !GMAIL_APP_PASSWORD) return null;

  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
  });
  return transporter;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const mailer = getTransporter();
  if (!mailer) {
    res.status(503).json({
      error: "Email credentials not configured",
      hint: "Set GMAIL_USER and GMAIL_APP_PASSWORD in your environment. See comments at the top of pages/api/contact.js.",
    });
    return;
  }

  const { name, email, message } = req.body || {};

  if (!email || !message) {
    res.status(400).json({ error: "Missing required fields: email and message" });
    return;
  }

  if (!EMAIL_PATTERN.test(email.trim())) {
    res.status(400).json({ error: "Invalid email address" });
    return;
  }

  try {
    await mailer.sendMail({
      from: '"PayrollTool.in" <support@payrolltool.in>',
      to: "support@payrolltool.in",
      replyTo: email, // hit reply in your inbox and it goes straight to them, not back to yourself
      subject: `Feature request${name ? ` from ${name}` : ""} — PayrollTool.in`,
      text: `From: ${name || "(no name given)"} <${email}>\n\n${message}`,
      html: `<p><strong>From:</strong> ${name || "(no name given)"} &lt;${email}&gt;</p><p>${message.replace(/\n/g, "<br>")}</p>`,
    });

    res.status(200).json({ success: true });
  } catch (err) {
    console.error("Failed to send contact form email:", err);
    res.status(502).json({ error: "Failed to send email", detail: err.message });
  }
}
