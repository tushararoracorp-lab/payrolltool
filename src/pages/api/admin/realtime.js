import { BetaAnalyticsDataClient } from '@google-analytics/data';
import { jwtVerify } from 'jose';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const token = req.cookies?.admin_session;
  if (!token) return res.status(401).json({ error: 'Not authenticated' });

  try {
    const secret = new TextEncoder().encode(process.env.ADMIN_SESSION_SECRET);
    await jwtVerify(token, secret);
  } catch {
    return res.status(401).json({ error: 'Invalid session' });
  }

  const credentials = JSON.parse(process.env.GOOGLE_SA_KEY);
  const analyticsClient = new BetaAnalyticsDataClient({ credentials });
  const property = process.env.GA4_PROPERTY_ID;

  try {
    const [activeUsersRes, pagesRes, countriesRes] = await Promise.all([
      // Active users right now
      analyticsClient.runRealtimeReport({
        property,
        metrics: [{ name: 'activeUsers' }],
      }),
      // Pages being viewed now
      analyticsClient.runRealtimeReport({
        property,
        dimensions: [{ name: 'unifiedScreenName' }],
        metrics: [{ name: 'activeUsers' }],
        orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
        limit: 5,
      }),
      // Countries active now
      analyticsClient.runRealtimeReport({
        property,
        dimensions: [{ name: 'countryId' }],
        metrics: [{ name: 'activeUsers' }],
        orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
        limit: 5,
      }),
    ]);

    return res.status(200).json({
      activeUsers: parseInt(activeUsersRes[0].rows?.[0]?.metricValues?.[0]?.value || 0),
      pages: pagesRes[0].rows?.map(r => ({
        page: r.dimensionValues[0].value,
        users: parseInt(r.metricValues[0].value),
      })) || [],
      countries: countriesRes[0].rows?.map(r => ({
        code: r.dimensionValues[0].value,
        users: parseInt(r.metricValues[0].value),
      })) || [],
      updatedAt: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Realtime error:', error);
    return res.status(500).json({ error: 'Failed to fetch realtime data' });
  }
}