// POST /api/revalidate   header: x-api-key: <SUBMIT_API_KEY>   body: { paths: ['/updates', '/updates/professional-tax/kerala', ...] }
// Used by the direct-update tool (npm run import) so a change shows on the site in seconds instead of within 10 minutes.
const { safeEqual } = require('../token');

const ALLOWED = /^\/updates(\/[a-z0-9-]+){0,2}$/;     // only /updates pages can be refreshed

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  if (!process.env.SUBMIT_API_KEY || !safeEqual(req.headers['x-api-key'], process.env.SUBMIT_API_KEY)) return res.status(401).json({ error: 'Invalid API key' });
  if (typeof res.revalidate !== 'function') return res.status(501).json({ error: 'Not running on Next.js' });
  const paths = (Array.isArray(req.body && req.body.paths) ? req.body.paths : []).filter((p) => typeof p === 'string' && ALLOWED.test(p)).slice(0, 300);
  // four pages at a time, so a big update cannot flood the database
  const out = []; let next = 0;
  const worker = async () => { while (next < paths.length) { const p = paths[next++]; try { await res.revalidate(p); out.push([p, true]); } catch (e) { out.push([p, false]); } } };
  await Promise.all(Array.from({ length: Math.min(4, paths.length) }, worker));
  return res.status(200).json({ refreshed: out.filter((o) => o[1]).length, failed: out.filter((o) => !o[1]).map((o) => o[0]).sort() });
};
