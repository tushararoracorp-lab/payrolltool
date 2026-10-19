// GET /api/public-data : everything the public page needs, from the live tables. Cached at the edge for 10 minutes.
const { buildPublicData } = require('../publicData');
module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });
  res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=3600');
  return res.status(200).json(await buildPublicData());
};
