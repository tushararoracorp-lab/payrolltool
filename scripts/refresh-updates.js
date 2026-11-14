// Forces the live /updates pages to rebuild now (instead of waiting for the 10-minute refresh), then checks
// whether the live site shows the same number of notifications as the database in .env.local.
//   node --env-file=.env.local scripts/refresh-updates.js
// Uses your existing /api/revalidate endpoint and SUBMIT_API_KEY. Changes no data.
const fs = require('fs');
const { buildPublicData } = require('../src/lib/updates/publicData');

const SITE = 'https://www.payrolltool.in';
const slugify = (s) => String(s == null ? '' : s).toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const notifSlug = (f) => slugify(f.title).slice(0, 70).replace(/-+$/, '') + '-' + String(f.key).slice(0, 8);

async function liveCount() {
  const html = await (await fetch(SITE + '/updates?t=' + Date.now(), { cache: 'no-store' })).text();
  const m = html.match(/showing\s*(?:<!-- -->)?\s*\d+\s*(?:<!-- -->)?\s*of\s*(?:<!-- -->)?\s*(\d+)/i) || html.match(/(\d+)<\/[^>]+>\s*<[^>]+>\s*Notifications/i);
  return m ? Number(m[1]) : null;
}

(async () => {
  if (!process.env.SUBMIT_API_KEY) { console.log('SUBMIT_API_KEY is not in .env.local. Copy it from Vercel > Settings > Environment Variables.'); process.exit(1); }
  const now = await buildPublicData();                                   // the database .env.local points to
  const old = fs.existsSync('updates-export.json') ? JSON.parse(fs.readFileSync('updates-export.json', 'utf8')) : { feed: [] };

  const paths = new Set(['/updates', '/updates/notifications', '/updates/minimum-wages', '/updates/professional-tax', '/updates/labour-welfare-fund']);
  [...old.feed, ...now.feed].forEach((f) => paths.add('/updates/notifications/' + notifSlug(f)));   // old ones too, so hidden pages turn into "not found"
  (now.pt.rows || []).forEach((r) => paths.add('/updates/professional-tax/' + slugify(r.name)));
  (now.lwf.rows || []).forEach((r) => paths.add('/updates/labour-welfare-fund/' + slugify(r.name)));
  (now.mw || []).forEach((r) => paths.add('/updates/minimum-wages/' + slugify(r.name)));
  const list = [...paths].filter((p) => /^\/updates(\/[a-z0-9-]+){0,2}$/.test(p)).slice(0, 300);

  console.log(`Database in .env.local: ${now.feed.length} notifications`);
  console.log(`Live site before refresh: ${await liveCount() ?? 'could not read'} notifications`);
  console.log(`Asking the live site to rebuild ${list.length} pages...`);

  const res = await fetch(SITE + '/api/revalidate', {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': process.env.SUBMIT_API_KEY },
    body: JSON.stringify({ paths: list }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) { console.log(`Refresh refused (${res.status}): ${body.error || 'no message'}`); process.exit(1); }
  console.log(`Rebuilt: ${body.refreshed} | Could not rebuild: ${(body.failed || []).length}`);
  (body.failed || []).slice(0, 10).forEach((p) => console.log('   ' + p));

  const after = await liveCount();
  console.log(`Live site after refresh: ${after ?? 'could not read'} notifications`);
  if (after === now.feed.length) console.log('\nRESULT: fixed. The live site now matches the database.');
  else if (after != null) console.log('\nRESULT: the live site still differs, so Vercel reads a DIFFERENT database than .env.local.\nCompare DATABASE_URL in Vercel (Settings > Environment Variables > Production) with the one in .env.local, and tell Claude. Do not change anything yet.');
  process.exit(0);
})().catch((e) => { console.error('Failed:', e.message); process.exit(1); });
