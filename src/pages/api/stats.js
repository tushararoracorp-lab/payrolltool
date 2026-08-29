// pages/api/stats.js
//
// Serves live homepage stats (active users, countries, India users, and the
// per-country breakdown for the map) from GA4's Data API.
//
// This makes TWO separate GA4 queries with different date ranges, on
// purpose - "Countries with active users" and "Users from India" are
// cumulative reach metrics (since launch, June 13 2026), while
// "Active users (30-day)" is a recency signal (strictly the last 30 days).
// These answer genuinely different questions and sharing one date range
// between them would misrepresent one or the other - a site with steady
// long-term growth would show a much bigger "countries" number if it
// reflected all-time reach than if it only counted the last 30 days, and
// conversely a 30-day active-users count means something different than an
// all-time one for judging whether the site is currently getting used.
//
// This calls Google's API server-side using a service account - never do
// this from the browser, since it needs a private key that must not be
// exposed to the client. The frontend just calls GET /api/stats and gets
// back plain JSON.
//
// ---------------------------------------------------------------------------
// CREDENTIALS: this reuses the SAME service account already configured for
// the admin dashboard (pages/api/admin/analytics.js and realtime.js) -
// GOOGLE_SA_KEY (the entire service account JSON as one stringified env
// var) and GA4_PROPERTY_ID. Both are already set in Vercel and already
// proven working, since the admin dashboard is live. This route does NOT
// need a new service account or new environment variables - it was
// originally written expecting three separate vars (GA4_CLIENT_EMAIL,
// GA4_PRIVATE_KEY) that were never actually what got configured, which is
// why it was returning static fallback numbers instead of real data.
//
// GA4_PROPERTY_ID should be formatted as properties/XXXXXXXXX (with the
// "properties/" prefix) - same format the admin dashboard's routes expect,
// since that's what the Data API's runReport/runRealtimeReport calls
// require in the `property` field.
//
// This route is unauthenticated (unlike the admin routes, which require an
// admin session cookie) since it's meant to be called from the public
// homepage - it only exposes aggregate, non-sensitive counts.
// ---------------------------------------------------------------------------

import { BetaAnalyticsDataClient } from "@google-analytics/data";

// ISO-3166 numeric country codes, keyed by the exact country name string
// GA4's `country` dimension returns. This used to be a hand-picked list of
// ~13 countries and silently dropped anything outside it - which is exactly
// what happened to France (a real top-8 country in production traffic) even
// though it's a completely unremarkable country to have visitors from. A
// short hardcoded list will always eventually miss something real, so this
// is the full set instead - covers every country GA4 could plausibly report,
// not just the ones seen so far.
const COUNTRY_ISO_MAP = {
  Afghanistan: 4, "Åland Islands": 248, Albania: 8, Algeria: 12, "American Samoa": 16,
  Andorra: 20, Angola: 24, Anguilla: 660, Antarctica: 10, "Antigua & Barbuda": 28,
  Argentina: 32, Armenia: 51, Aruba: 533, Australia: 36, Austria: 40, Azerbaijan: 31,
  Bahamas: 44, Bahrain: 48, Bangladesh: 50, Barbados: 52, Belarus: 112, Belgium: 56,
  Belize: 84, Benin: 204, Bermuda: 60, Bhutan: 64, Bolivia: 68,
  "Bosnia & Herzegovina": 70, Botswana: 72, "Bouvet Island": 74, Brazil: 76,
  "British Indian Ocean Territory": 86, "British Virgin Islands": 92, Brunei: 96,
  Bulgaria: 100, "Burkina Faso": 854, Burundi: 108, "Cabo Verde": 132, Cambodia: 116,
  Cameroon: 120, Canada: 124, "Caribbean Netherlands": 535, "Cayman Islands": 136,
  "Central African Republic": 140, Chad: 148, Chile: 152, China: 156,
  "Christmas Island": 162, "Cocos (Keeling) Islands": 166, Colombia: 170, Comoros: 174,
  "Congo - Brazzaville": 178, "Congo - Kinshasa": 180, "Cook Islands": 184,
  "Costa Rica": 188, "Côte d'Ivoire": 384, Croatia: 191, Cuba: 192, Curaçao: 531,
  Cyprus: 196, Czechia: 203, Denmark: 208, Djibouti: 262, Dominica: 212,
  "Dominican Republic": 214, Ecuador: 218, Egypt: 818, "El Salvador": 222,
  "Equatorial Guinea": 226, Eritrea: 232, Estonia: 233, Eswatini: 748, Ethiopia: 231,
  "Falkland Islands": 238, "Faroe Islands": 234, Fiji: 242, Finland: 246, France: 250,
  "French Guiana": 254, "French Polynesia": 258,
  "French Southern Territories": 260, Gabon: 266, Gambia: 270, Georgia: 268,
  Germany: 276, Ghana: 288, Gibraltar: 292, Greece: 300, Greenland: 304,
  Grenada: 308, Guadeloupe: 312, Guam: 316, Guatemala: 320, Guernsey: 831,
  Guinea: 324, "Guinea-Bissau": 624, Guyana: 328, Haiti: 332,
  "Heard & McDonald Islands": 334, Honduras: 340, "Hong Kong SAR China": 344,
  Hungary: 348, Iceland: 352, India: 356, Indonesia: 360, Iran: 364, Iraq: 368,
  Ireland: 372, "Isle of Man": 833, Israel: 376, Italy: 380, Jamaica: 388,
  Japan: 392, Jersey: 832, Jordan: 400, Kazakhstan: 398, Kenya: 404, Kiribati: 296,
  Kosovo: 383, Kuwait: 414, Kyrgyzstan: 417, Laos: 418, Latvia: 428, Lebanon: 422,
  Lesotho: 426, Liberia: 430, Libya: 434, Liechtenstein: 438, Lithuania: 440,
  Luxembourg: 442, "Macao SAR China": 446, Madagascar: 450, Malawi: 454,
  Malaysia: 458, Maldives: 462, Mali: 466, Malta: 470, "Marshall Islands": 584,
  Martinique: 474, Mauritania: 478, Mauritius: 480, Mayotte: 175, Mexico: 484,
  Micronesia: 583, Moldova: 498, Monaco: 492, Mongolia: 496, Montenegro: 499,
  Montserrat: 500, Morocco: 504, Mozambique: 508, Myanmar: 104, Namibia: 516,
  Nauru: 520, Nepal: 524, Netherlands: 528, "New Caledonia": 540,
  "New Zealand": 554, Nicaragua: 558, Niger: 562, Nigeria: 566, Niue: 570,
  "Norfolk Island": 574, "North Korea": 408, "North Macedonia": 807,
  "Northern Mariana Islands": 580, Norway: 578, Oman: 512, Pakistan: 586,
  Palau: 585, "Palestinian Territories": 275, Panama: 591, "Papua New Guinea": 598,
  Paraguay: 600, Peru: 604, Philippines: 608, "Pitcairn Islands": 612,
  Poland: 616, Portugal: 620, "Puerto Rico": 630, Qatar: 634, Réunion: 638,
  Romania: 642, Russia: 643, Rwanda: 646, "Samoa": 882, "San Marino": 674,
  "São Tomé & Príncipe": 678, "Saudi Arabia": 682, Senegal: 686, Serbia: 688,
  Seychelles: 690, "Sierra Leone": 694, Singapore: 702,
  "Sint Maarten": 534, Slovakia: 703, Slovenia: 705, "Solomon Islands": 90,
  Somalia: 706, "South Africa": 710,
  "South Georgia & South Sandwich Islands": 239, "South Korea": 410,
  "South Sudan": 728, Spain: 724, "Sri Lanka": 144, "St. Barthélemy": 652,
  "St. Helena": 654, "St. Kitts & Nevis": 659, "St. Lucia": 662,
  "St. Martin": 663, "St. Pierre & Miquelon": 666, "St. Vincent & Grenadines": 670,
  Sudan: 729, Suriname: 740, "Svalbard & Jan Mayen": 744, Sweden: 752,
  Switzerland: 756, Syria: 760, Taiwan: 158, Tajikistan: 762, Tanzania: 834,
  Thailand: 764, "Timor-Leste": 626, Togo: 768, Tokelau: 772, Tonga: 776,
  "Trinidad & Tobago": 780, Tunisia: 788, Turkey: 792, Turkmenistan: 795,
  "Turks & Caicos Islands": 796, Tuvalu: 798, Uganda: 800, Ukraine: 804,
  "United Arab Emirates": 784, "United Kingdom": 826,
  "United States": 840, "U.S. Outlying Islands": 581, "U.S. Virgin Islands": 850,
  Uruguay: 858, Uzbekistan: 860, Vanuatu: 548, "Vatican City": 336,
  Venezuela: 862, Vietnam: 704, "Wallis & Futuna": 876, "Western Sahara": 732,
  Yemen: 887, Zambia: 894, Zimbabwe: 716,
};

let analyticsClient = null;
function getClient() {
  if (analyticsClient) return analyticsClient;
  if (!process.env.GOOGLE_SA_KEY) return null;

  let credentials;
  try {
    credentials = JSON.parse(process.env.GOOGLE_SA_KEY);
  } catch (err) {
    console.error("GOOGLE_SA_KEY is set but not valid JSON:", err.message);
    return null;
  }

  analyticsClient = new BetaAnalyticsDataClient({ credentials });
  return analyticsClient;
}

export default async function handler(req, res) {
  const property = process.env.GA4_PROPERTY_ID;
  const client = getClient();

  if (!property || !client) {
    // Not configured - see the notes above. Should not actually happen
    // given this reuses the same credentials as the (working) admin
    // dashboard, but fails gracefully rather than crashing if it's ever
    // missing in a given environment (e.g. Preview vs Production having
    // different env vars set).
    res.status(503).json({
      error: "GA4 credentials not configured",
      hint: "GOOGLE_SA_KEY and GA4_PROPERTY_ID should already be set (same ones the admin dashboard uses) - check they're present in this environment specifically.",
    });
    return;
  }

  try {
    // Two deliberately different date ranges, answering two different
    // questions: "how far has this spread, ever" (countries + India users,
    // since launch) vs "is this actively being used right now" (30-day
    // active users). Sharing one date range for both would conflate a
    // cumulative-reach metric with a recency metric - they're not the
    // same question and shouldn't use the same window.
    const [sinceLaunchReport, last30Report] = await Promise.all([
      client.runReport({
        property,
        dateRanges: [{ startDate: "2026-06-13", endDate: "today" }], // PayrollTool.in's actual launch date
        dimensions: [{ name: "country" }],
        metrics: [{ name: "activeUsers" }],
        orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }],
        limit: 100,
      }),
      client.runReport({
        property,
        dateRanges: [{ startDate: "30daysAgo", endDate: "today" }],
        metrics: [{ name: "activeUsers" }],
      }),
    ]);

    const sinceLaunchRows = sinceLaunchReport[0].rows || [];
    let indiaUsers = 0;
    const byCountry = [];

    sinceLaunchRows.forEach((row) => {
      const countryName = row.dimensionValues[0].value;
      const users = parseInt(row.metricValues[0].value, 10) || 0;
      if (countryName === "India") indiaUsers = users;

      const iso = COUNTRY_ISO_MAP[countryName];
      if (iso) {
        byCountry.push({ name: countryName, iso, users });
      }
    });

    byCountry.sort((a, b) => b.users - a.users);

    const activeUsers = parseInt(
      last30Report[0].rows?.[0]?.metricValues?.[0]?.value || "0",
      10
    );

    res.status(200).json({
      countries: sinceLaunchRows.length, // since launch - cumulative reach
      activeUsers,                        // strictly last 30 days - recency signal
      indiaUsers,                         // since launch - cumulative reach
      byCountry: byCountry.slice(0, 7),   // top 7, since launch, matching "Top 7 of N countries shown" on the page
    });
  } catch (err) {
    console.error("GA4 Data API request failed:", err);
    res.status(502).json({ error: "Failed to fetch GA4 data", detail: err.message });
  }
}
