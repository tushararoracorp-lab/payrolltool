// Sends prepared requests to /api/submit on the live site. Each request waits for YOUR approval email:
// nothing changes on the site until you press Approve.
//
// Usage (PowerShell):
//   $env:SUBMIT_API_KEY = "<the production SUBMIT_API_KEY from Vercel>"
//   node scripts/submit-batch.js requests/assam-pt_rule-request.json [more files]
//
// A file can hold one request or a list of them. At most 20 are sent per run.
const fs = require('fs');

const BASE = (process.env.SUBMIT_BASE_URL || 'https://www.payrolltool.in').replace(/\/$/, '');
const BY = process.env.SUBMITTED_BY || process.env.GMAIL_USER || '';
const MAX = 20;

async function main() {
  const files = process.argv.slice(2);
  if (!files.length) throw new Error('Usage: node scripts/submit-batch.js <request.json> [more files]');
  if (!process.env.SUBMIT_API_KEY) throw new Error('Set $env:SUBMIT_API_KEY to the production key first.');
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(BY)) throw new Error('Set $env:SUBMITTED_BY to your email address.');
  const requests = files.flatMap((f) => { const j = JSON.parse(fs.readFileSync(f, 'utf8')); return Array.isArray(j) ? j : [j]; });
  if (requests.length > MAX) throw new Error(`${requests.length} requests given; send at most ${MAX} per run.`);

  let ok = 0;
  for (const [i, r] of requests.entries()) {
    const label = `${i + 1}/${requests.length} ${r.action} ${r.kind}${r.payload && r.payload.state ? ' ' + r.payload.state : ''}`;
    const res = await fetch(BASE + '/api/submit', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': process.env.SUBMIT_API_KEY },
      body: JSON.stringify({ ...r, submitted_by: BY }),
    });
    const body = await res.json().catch(() => ({}));
    if (res.status === 202) { ok += 1; console.log(`${label}: waiting for your approval email`); }
    else console.log(`${label}: NOT stored (${res.status}) ${body.error || ''}${body.problems ? '\n  - ' + body.problems.join('\n  - ') : ''}`);
  }
  console.log(`\n${ok} of ${requests.length} sent to ${BASE}. Approve them from the emails.`);
}
main().catch((e) => { console.error('Stopped: ' + e.message); process.exit(1); });
