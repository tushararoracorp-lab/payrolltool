// Data for /updates/<topic> and /updates/<topic>/<state>. Built from the same live rows as /updates.
const { buildPublicData } = require('./publicData');

const TOPICS = {
  'professional-tax': { key: 'pt', label: 'Professional Tax', cat: 'PT' },
  'labour-welfare-fund': { key: 'lwf', label: 'Labour Welfare Fund', cat: 'LWF' },
  'minimum-wages': { key: 'mw', label: 'Minimum Wages', cat: 'Min Wages' },
};
// must stay identical to slugOf() in components/updates/render.js (a test checks they agree)
const slugify = (s) => String(s == null ? '' : s).toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

// must stay identical to notifSlug() in components/updates/render.js (a test checks they agree)
const notifSlug = (f) => slugify(f.title).slice(0, 70).replace(/-+$/, '') + '-' + String(f.id).slice(0, 8);

let memo = null;                                   // one database read serves many pages during a build
async function loadAll() {
  if (memo && Date.now() - memo.t < 30000) return memo.d;
  const d = await buildPublicData(); memo = { t: Date.now(), d }; return d;
}
const rowsOf = (data, key) => (key === 'mw' ? data.mw : data[key].rows);
const plain = (o) => JSON.parse(JSON.stringify(o));
const newestFirst = (a, b) => (b.eff || b.pub || '').localeCompare(a.eff || a.pub || '');
const byName = (a, b) => a.name.localeCompare(b.name);
const inr = (n) => Number(n).toLocaleString('en-IN');
const when = (s) => (s ? new Date(s).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }) : '');

function summaryLine(key, r) {
  if (key === 'pt') return `${r.cycle}. Ceiling ${r.cap}.`;
  if (key === 'lwf') return `Employee ${r.emp}, employer ${r.empr}. ${r.freq}.`;
  return r.uns ? `Unskilled Rs. ${inr(r.uns)} a month, effective ${when(r.eff)}.` : `Rates by area, effective ${when(r.eff)}.`;
}

async function listStatePaths() {
  const d = await loadAll(); const out = [];
  Object.entries(TOPICS).forEach(([topic, t]) => rowsOf(d, t.key).forEach((r) => out.push({ topic, state: slugify(r.name) })));
  return out;
}

async function getHub(topicSlug) {
  const t = TOPICS[topicSlug]; if (!t) return null;
  const d = await loadAll();
  const items = rowsOf(d, t.key).map((r) => ({ name: r.name, slug: slugify(r.name), line: summaryLine(t.key, r) })).sort(byName);
  const notApplicable = t.key === 'mw' ? [] : d[t.key].notApplicable;
  const topics = Object.entries(TOPICS).map(([s, o]) => ({ slug: s, label: o.label, available: true }));
  return plain({ topic: { slug: topicSlug, key: t.key, label: t.label }, items, notApplicable, topics, options: items.map((i) => ({ name: i.name, slug: i.slug })) });
}

async function getStatePage(topicSlug, stateSlug) {
  const t = TOPICS[topicSlug]; if (!t) return null;
  const d = await loadAll();
  const row = rowsOf(d, t.key).find((r) => slugify(r.name) === stateSlug); if (!row) return null;
  const notifications = d.feed.filter((f) => f.cat === t.cat && f.state === row.name).sort(newestFirst).map((f) => ({ ...f, slug: notifSlug(f) }));
  const siblings = Object.entries(TOPICS).filter(([s]) => s !== topicSlug)
    .filter(([, o]) => rowsOf(d, o.key).some((r) => r.name === row.name)).map(([s, o]) => ({ slug: s, label: o.label }));
  const others = rowsOf(d, t.key).filter((r) => r.name !== row.name).map((r) => ({ name: r.name, slug: slugify(r.name) })).sort(byName);
  const topics = Object.entries(TOPICS).map(([s, o]) => ({ slug: s, label: o.label, available: rowsOf(d, o.key).some((r) => r.name === row.name) }));
  const options = rowsOf(d, t.key).map((r) => ({ name: r.name, slug: slugify(r.name) })).sort(byName);   // every state of this topic, for the dropdown
  return plain({ topic: { slug: topicSlug, key: t.key, label: t.label }, state: { name: row.name, slug: stateSlug }, row, notifications, siblings, others, topics, options });
}

async function listNotificationPaths() {
  const d = await loadAll(); return d.feed.map((f) => ({ slug: notifSlug(f) }));
}

// Found by the id at the end of the address, so a page keeps working if its title text is ever corrected (the caller redirects to the canonical address).
async function getNotification(slug) {
  const d = await loadAll(); const id8 = String(slug).slice(-8);
  const n = d.feed.find((f) => String(f.id).slice(0, 8) === id8); if (!n) return null;
  const related = d.feed.filter((f) => f.cat === n.cat && f.id !== n.id).sort(newestFirst).slice(0, 5)
    .map((f) => ({ title: f.title, slug: notifSlug(f), state: f.state || 'All India', eff: f.eff }));
  const entry = Object.entries(TOPICS).find(([, t]) => t.cat === n.cat);
  let stateLink = null;
  if (entry && n.state) { const [ts, t] = entry; if (rowsOf(d, t.key).some((r) => r.name === n.state)) stateLink = { href: '/updates/' + ts + '/' + slugify(n.state), label: n.state + ' ' + t.label }; }
  return plain({ n, canonical: notifSlug(n), related, stateLink });
}

module.exports = { TOPICS, slugify, notifSlug, listStatePaths, listNotificationPaths, getHub, getStatePage, getNotification };
