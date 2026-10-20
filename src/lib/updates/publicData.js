// Builds the exact JSON shape the public /updates page uses, from the live (non-removed) rows.
const db = require('./db');
const toPage = (cats) => (cats || []).map((c) => ({ name: c.name, month: c.per_month, day: c.per_day }));
const KEY = { Unskilled: 'uns', 'Semi-skilled': 'semi', Skilled: 'sk', 'Highly skilled': 'hs' };
const rates = (cats) => { const o = { uns: null, semi: null, sk: null, hs: null }; (cats || []).forEach((c) => { if (KEY[c.name]) o[KEY[c.name]] = c.per_month; }); return o; };
const d = (v) => (v ? new Date(v).toISOString().slice(0, 10) : null);

async function buildPublicData() {
  const notif = await db.query(`SELECT * FROM notifications WHERE removed_at IS NULL ORDER BY COALESCE(effective_date, published_date) DESC NULLS LAST, title`);
  const pt = await db.query('SELECT * FROM v_pt_current ORDER BY state');
  const ptFull = await db.query('SELECT * FROM pt_rules WHERE id = ANY($1::uuid[])', [pt.map((r) => r.id)]);
  const lw = await db.query('SELECT * FROM v_lwf_current ORDER BY state');
  const lwFull = await db.query('SELECT * FROM lwf_rules WHERE id = ANY($1::uuid[])', [lw.map((r) => r.id)]);
  const mwAll = await db.query('SELECT * FROM mw_rates WHERE removed_at IS NULL ORDER BY state, effective_from DESC');
  const app = await db.query('SELECT scheme, state, applies FROM applicability ORDER BY state');

  const split = (scheme, rows) => ({
    applicable: app.filter((a) => a.scheme === scheme && a.applies).map((a) => a.state).sort(),
    notApplicable: app.filter((a) => a.scheme === scheme && !a.applies).map((a) => a.state).sort(), rows });
  const byState = {}; mwAll.forEach((r) => { (byState[r.state] = byState[r.state] || []).push(r); });

  return {
    feed: notif.map((n) => ({ id: n.id, key: String(n.dedupe_key).slice(0, 8), cat: n.category, state: n.state, title: n.title, short: n.short_summary, ref: n.reference,
      eff: d(n.effective_date), pub: d(n.published_date), flag: n.flag, status: n.status, src: n.issued_by, url: n.official_url,
      en: n.explainer_en, hi: n.explainer_hi, note: n.note || '' })),
    mw: Object.entries(byState).map(([name, rows]) => {
      const top = rows[0];
      return { name, eff: d(top.effective_from), prevEff: rows[1] ? d(rows[1].effective_from) : null, flag: top.flag, cad: top.cadence, zones: top.zones,
        struct: top.structure, auth: top.authority, ref: top.reference, url: top.official_url, notes: top.note || '',
        categories: toPage(top.categories), ...rates(top.categories),
        hist: rows.map((r) => ({ eff: d(r.effective_from), label: r.label || '', ...rates(r.categories), ref: r.reference, note: r.note || '', gap: false })) };
    }),
    pt: { ...split('PT', ptFull.map((r) => ({ name: r.state, basis: r.basis, cycle: r.cycle_text, due: r.due_text, act: r.act, cap: r.annual_cap, tables: r.slab_tables, notes: r.notes || '' })).sort((a, b) => a.name.localeCompare(b.name))), tags: {} },
    lwf: { ...split('LWF', lwFull.map((r) => ({ name: r.state, emp: r.employee_amount, empr: r.employer_amount, ratio: r.ratio, freq: r.frequency, due: r.due_text, act: r.act, notes: r.notes || '' })).sort((a, b) => a.name.localeCompare(b.name))), tags: {} },
  };
}
module.exports = { buildPublicData };
