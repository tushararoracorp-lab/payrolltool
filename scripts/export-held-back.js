// READ-ONLY. Exports the notifications held back on 30 October 2026 (hidden, not deleted), with their full
// English and Hindi text and source links, so Batch A can be rewritten from them.
//
// Usage (PowerShell): load .env.local first (it points at the dev copy, which holds the same entries), then
//   node scripts/export-held-back.js
// Output: held-back-export.json in the project folder (ignored by git like the other exports).
const fs = require('fs');
const path = require('path');

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set. Load .env.local into this window first.');
  const db = require(path.join(process.cwd(), 'src', 'lib', 'updates', 'db'));
  const rows = await db.query(
    `SELECT id, category, state, title, short_summary, reference, effective_date::text AS effective_date,
            published_date::text AS published_date, flag, status, issued_by, official_url, note,
            explainer_en, explainer_hi, words_en, words_hi, removed_at::text AS removed_at
       FROM notifications
      WHERE removed_at IS NOT NULL AND removed_by_request IS NULL
        AND removed_at >= TIMESTAMPTZ '2026-10-29' AND removed_at < TIMESTAMPTZ '2026-11-01'
      ORDER BY category, state NULLS FIRST, title`);
  fs.writeFileSync('held-back-export.json', JSON.stringify(rows, null, 2) + '\n');
  console.log(`Saved held-back-export.json: ${rows.length} held-back notifications. Nothing was changed.`);
}
main().catch((e) => { console.error('Stopped: ' + e.message); process.exit(1); });
