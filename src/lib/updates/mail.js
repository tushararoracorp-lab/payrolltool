// Sends the approval email. Order of preference: SMTP_URL (any SMTP account) > RESEND_API_KEY (Resend) > none.
// Tests and the local rehearsal inject their own transport with setTransport().
let transport = null;
function setTransport(t) { transport = t; }

// Resend over its HTTPS API, no extra package needed. RESEND_API_URL exists only so tests can point at a fake server.
function resendTransport() {
  return {
    sendMail: async (m) => {
      const res = await fetch(process.env.RESEND_API_URL || 'https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: m.from, to: [].concat(m.to), subject: m.subject, html: m.html, text: m.text }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(`Resend rejected the email (${res.status}): ${body.message || body.name || 'unknown error'}`);
      return body;
    },
  };
}
function getTransport() {
  if (transport) return transport;
  if (process.env.SMTP_URL) transport = require('nodemailer').createTransport(process.env.SMTP_URL);
  else if (process.env.RESEND_API_KEY) transport = resendTransport();
  else throw new Error('No email sender is configured. Set RESEND_API_KEY (or SMTP_URL).');
  return transport;
}
// Approvals go to ADMIN_EMAILS (comma separated, the list your admin area already uses) or, failing that, ADMIN_EMAIL.
function recipients() { return (process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || '').split(',').map((s) => s.trim()).filter(Boolean); }
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

async function sendApprovalEmail({ request, approveUrl, rejectUrl, preview }) {
  const to = recipients();
  if (!to.length) throw new Error('No approver address: set ADMIN_EMAILS (or ADMIN_EMAIL).');
  if (!process.env.MAIL_FROM) throw new Error('MAIL_FROM is not set (use an address your email service is allowed to send from).');
  const subject = `[PayrollTool] Approve ${request.action}: ${request.summary}`.slice(0, 180);
  const lines = [
    `Action: ${request.action}`, `Type: ${request.kind}`, `Summary: ${request.summary}`, `Submitted by: ${request.submitted_by}`,
    `Link expires: ${new Date(request.expires_at).toUTCString()}`, '', preview, '',
    `Review and approve: ${approveUrl}`, `Reject: ${rejectUrl}`, '',
    'Opening a link only shows a confirmation page. Nothing changes until you press the button there.'];
  const html = `<div style="font-family:Arial,sans-serif;max-width:640px">
    <h2 style="margin:0 0 8px">${esc(request.action)} request waiting for your approval</h2>
    <p style="margin:0 0 4px"><b>${esc(request.kind)}</b>: ${esc(request.summary)}</p>
    <p style="margin:0 0 12px;color:#555">Submitted by ${esc(request.submitted_by)}. Link expires ${esc(new Date(request.expires_at).toUTCString())}.</p>
    <pre style="background:#f5f3ff;padding:12px;border-radius:8px;white-space:pre-wrap;font-size:13px">${esc(preview)}</pre>
    <p><a href="${esc(approveUrl)}" style="background:#7C3AED;color:#fff;padding:10px 18px;border-radius:99px;text-decoration:none">Review and approve</a>
       &nbsp; <a href="${esc(rejectUrl)}" style="color:#B91C1C">Reject</a></p>
    <p style="color:#666;font-size:12px">Opening a link only shows a confirmation page. Nothing changes until you press the button there.</p></div>`;
  return getTransport().sendMail({ from: process.env.MAIL_FROM, to, subject, text: lines.join('\n'), html });
}
module.exports = { setTransport, sendApprovalEmail, resendTransport, recipients };
