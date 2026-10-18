// Sends the approval email. Production: any SMTP account (set SMTP_URL). Tests inject a transport.
const nodemailer = require('nodemailer');
let transport = null;
function setTransport(t) { transport = t; }
function getTransport() {
  if (!transport) transport = nodemailer.createTransport(process.env.SMTP_URL);
  return transport;
}
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

async function sendApprovalEmail({ request, approveUrl, rejectUrl, preview }) {
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
  return getTransport().sendMail({ from: process.env.MAIL_FROM, to: process.env.ADMIN_EMAIL, subject, text: lines.join('\n'), html });
}
module.exports = { setTransport, sendApprovalEmail };
