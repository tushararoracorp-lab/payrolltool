// pages/api/stats.js
//
// Serves live homepage stats (active users, countries, India users, and the
// per-country breakdown for the map) from GA4's Data API.
//
// This calls Google's API server-side using a service account — never do
// this from the browser, since it needs a private key that must not be
// exposed to the client. The frontend just calls GET /api/stats and gets
// back plain JSON.
//
// ---------------------------------------------------------------------------
// SETUP (one-time, needed before this endpoint returns real data):
//
// 1. In Google Cloud Console, create a service account and enable the
//    "Google Analytics Data API" for its project.
// 2. In GA4 Admin → Property Access Management, add that service account's
//    email as a Viewer on this GA4 property.
// 3. Download the service account's JSON key.
// 4. Add these to your .env.local (and your hosting provider's env vars):
//      GA4_PROPERTY_ID=properties/XXXXXXXXX   (your numeric GA4 property ID)
//      GA4_CLIENT_EMAIL=xxxx@xxxx.iam.gserviceaccount.com
//      GA4_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
//    (Keep the \n literal in GA4_PRIVATE_KEY — it gets unescaped below.)
// 5. npm install @google-analytics/data
//
// Until those env vars are set, this endpoint returns a 503 and the
// frontend's fetch('/api/stats') will fail silently and fall back to the
// interim hardcoded numbers already in index.js — that's expected, not a bug.
// ---------------------------------------------------------------------------

import { BetaAnalyticsDataClient } from "@google-analytics/data";

// ISO-3166 numeric country codes for the countries we expect to see.
// Extend this if a new country starts showing up in GA4 that isn't listed —
// unmapped countries are simply dropped from the map (not shown), so the
// number of dots on the map may run slightly behind the raw country list
// until this mapping is updated.
const COUNTRY_ISO_MAP = {
  India: 356,
  "United States": 840,
  Canada: 124,
  Germany: 276,
  Estonia: 233,
  Hungary: 348,
  Lithuania: 440,
  "United Kingdom": 826,
  Australia: 36,
  Singapore: 702,
  "United Arab Emirates": 784,
  Bangladesh: 50,
  Thailand: 764,
};

let client = null;
function getClient() {
  if (client) return client;
  const { GA4_CLIENT_EMAIL, GA4_PRIVATE_KEY } = process.env;
  if (!GA4_CLIENT_EMAIL || !GA4_PRIVATE_KEY) return null;
  client = new BetaAnalyticsDataClient({
    credentials: {
      client_email: GA4_CLIENT_EMAIL,
      private_key: GA4_PRIVATE_KEY.replace(/\\n/g, "\n"),
    },
  });
  return client;
}

export default async function handler(req, res) {
  const propertyId = process.env.GA4_PROPERTY_ID;
  const analyticsClient = getClient();

  if (!propertyId || !analyticsClient) {
    // Not configured yet - see setup notes above. This is a normal state
    // during development, not an error to alarm over.
    res.status(503).json({
      error: "GA4 credentials not configured",
      hint: "Set GA4_PROPERTY_ID, GA4_CLIENT_EMAIL, and GA4_PRIVATE_KEY in your environment. See comments at the top of pages/api/stats.js.",
    });
    return;
  }

  try {
    // Query 1: total active users in the last 30 days + users from India,
    // plus a country count.
    const [summaryReport] = await analyticsClient.runReport({
      property: propertyId,
      dateRanges: [{ startDate: "30daysAgo", endDate: "today" }],
      dimensions: [{ name: "country" }],
      metrics: [{ name: "activeUsers" }],
      orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }],
      limit: 50,
    });

    const rows = summaryReport.rows || [];
    let activeUsers = 0;
    let indiaUsers = 0;
    const byCountry = [];

    rows.forEach((row) => {
      const countryName = row.dimensionValues[0].value;
      const users = parseInt(row.metricValues[0].value, 10) || 0;
      activeUsers += users;
      if (countryName === "India") indiaUsers = users;

      const iso = COUNTRY_ISO_MAP[countryName];
      if (iso) {
        byCountry.push({ name: countryName, iso, users });
      }
    });

    byCountry.sort((a, b) => b.users - a.users);

    res.status(200).json({
      countries: rows.length,
      activeUsers,
      indiaUsers,
      byCountry: byCountry.slice(0, 7), // top 7, matching "Top 7 of N countries shown" on the page
    });
  } catch (err) {
    console.error("GA4 Data API request failed:", err);
    res.status(502).json({ error: "Failed to fetch GA4 data", detail: err.message });
  }
}
