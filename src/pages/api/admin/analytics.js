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

  const period = req.query.period || '7daysAgo';
  const validPeriods = ['today', '7daysAgo', '30daysAgo', '90daysAgo', '365daysAgo'];
  const startDate = validPeriods.includes(period) ? period : '7daysAgo';

  const credentials = JSON.parse(process.env.GOOGLE_SA_KEY);
  const analyticsClient = new BetaAnalyticsDataClient({ credentials });
  const property = process.env.GA4_PROPERTY_ID;

  try {
    const [summaryRes, channelsRes, devicesRes, pagesRes, countriesRes, browsersRes, osRes] =
      await Promise.all([
        // Summary
        analyticsClient.runReport({
          property,
          dateRanges: [{ startDate, endDate: 'today' }],
          metrics: [
            { name: 'activeUsers' }, { name: 'sessions' },
            { name: 'bounceRate' }, { name: 'averageSessionDuration' },
            { name: 'screenPageViews' }, { name: 'newUsers' },
            { name: 'engagementRate' }, { name: 'engagedSessions' },
          ],
        }),
        // Channels
        analyticsClient.runReport({
          property,
          dateRanges: [{ startDate, endDate: 'today' }],
          dimensions: [{ name: 'sessionDefaultChannelGroup' }],
          metrics: [{ name: 'sessions' }, { name: 'activeUsers' }],
          orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
          limit: 8,
        }),
        // Devices
        analyticsClient.runReport({
          property,
          dateRanges: [{ startDate, endDate: 'today' }],
          dimensions: [{ name: 'deviceCategory' }],
          metrics: [{ name: 'sessions' }, { name: 'activeUsers' }],
        }),
        // Top pages
        analyticsClient.runReport({
          property,
          dateRanges: [{ startDate, endDate: 'today' }],
          dimensions: [{ name: 'pagePath' }],
          metrics: [
            { name: 'screenPageViews' }, { name: 'averageSessionDuration' },
            { name: 'bounceRate' }, { name: 'activeUsers' },
            { name: 'engagementRate' },
          ],
          orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
          limit: 10,
        }),
        // Countries
        analyticsClient.runReport({
          property,
          dateRanges: [{ startDate, endDate: 'today' }],
          dimensions: [{ name: 'country' }],
          metrics: [{ name: 'activeUsers' }, { name: 'sessions' }, { name: 'engagementRate' }],
          orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
          limit: 8,
        }),
        // Browsers
        analyticsClient.runReport({
          property,
          dateRanges: [{ startDate, endDate: 'today' }],
          dimensions: [{ name: 'browser' }],
          metrics: [{ name: 'activeUsers' }, { name: 'sessions' }, { name: 'engagementRate' }],
          orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
          limit: 6,
        }),
        // Operating systems
        analyticsClient.runReport({
          property,
          dateRanges: [{ startDate, endDate: 'today' }],
          dimensions: [{ name: 'operatingSystem' }],
          metrics: [{ name: 'activeUsers' }],
          orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
          limit: 6,
        }),
      ]);

    const s = summaryRes[0].rows?.[0]?.metricValues;

    return res.status(200).json({
      period: startDate,
      summary: {
        activeUsers: parseInt(s?.[0]?.value || 0),
        sessions: parseInt(s?.[1]?.value || 0),
        bounceRate: parseFloat(s?.[2]?.value || 0).toFixed(1),
        avgSessionDuration: parseFloat(s?.[3]?.value || 0).toFixed(0),
        pageViews: parseInt(s?.[4]?.value || 0),
        newUsers: parseInt(s?.[5]?.value || 0),
        engagementRate: (parseFloat(s?.[6]?.value || 0) * 100).toFixed(1),
        engagedSessions: parseInt(s?.[7]?.value || 0),
      },
      channels: channelsRes[0].rows?.map(r => ({
        name: r.dimensionValues[0].value,
        sessions: parseInt(r.metricValues[0].value),
        users: parseInt(r.metricValues[1].value),
      })) || [],
      devices: devicesRes[0].rows?.map(r => ({
        name: r.dimensionValues[0].value,
        sessions: parseInt(r.metricValues[0].value),
        users: parseInt(r.metricValues[1].value),
      })) || [],
      topPages: pagesRes[0].rows?.map(r => ({
        path: r.dimensionValues[0].value,
        views: parseInt(r.metricValues[0].value),
        avgTime: parseFloat(r.metricValues[1].value).toFixed(0),
        bounceRate: parseFloat(r.metricValues[2].value).toFixed(1),
        users: parseInt(r.metricValues[3].value),
        engagementRate: (parseFloat(r.metricValues[4].value) * 100).toFixed(1),
      })) || [],
      countries: countriesRes[0].rows?.map(r => ({
        name: r.dimensionValues[0].value,
        users: parseInt(r.metricValues[0].value),
        sessions: parseInt(r.metricValues[1].value),
        engagementRate: (parseFloat(r.metricValues[2].value) * 100).toFixed(1),
      })) || [],
      browsers: browsersRes[0].rows?.map(r => ({
        name: r.dimensionValues[0].value,
        users: parseInt(r.metricValues[0].value),
        sessions: parseInt(r.metricValues[1].value),
        engagementRate: (parseFloat(r.metricValues[2].value) * 100).toFixed(1),
      })) || [],
      os: osRes[0].rows?.map(r => ({
        name: r.dimensionValues[0].value,
        users: parseInt(r.metricValues[0].value),
      })) || [],
    });

  } catch (error) {
    console.error('GA4 error:', error);
    return res.status(500).json({ error: 'Failed to fetch analytics data' });
  }
}