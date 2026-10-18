// One-off import of the existing, already reviewed public dataset. Bypasses the sanitizer on purpose
// (these rows were reviewed by hand); every NEW change goes through /api/submit and email approval.
const crypto = require('crypto');
const SENTINEL = '1970-01-01';   // "in force at import; original start date not recorded"
const PT_FROM  = { Karnataka: '2025-04-01', 'West Bengal': '2026-10-01', Kerala: '2024-10-01', 'Tamil Nadu': '2024-10-01', Assam: '2025-04-01', Maharashtra: '2026-03-01', Mizoram: '2023-04-01' };
const LWF_FROM = { Karnataka: '2025-12-01', Maharashtra: '2024-06-01', 'West Bengal': '2024-01-01', Haryana: '2026-01-01', 'Tamil Nadu': '2022-12-02', 'Madhya Pradesh': '2025-01-28' };
const freqOf = (t) => (/half/i.test(t) ? 'Half-yearly' : /quarter/i.test(t) ? 'Quarterly' : /annual|year/i.test(t) && !/monthly$/i.test(t.trim()) ? 'Annual' : 'Monthly');
const wc = (s) => (s || '').trim().split(/\s+/).filter(Boolean).length;
const FALLBACK_URL = 'https://labour.gov.in/';
// State pages on .gov.in / .nic.in domains. States not listed use FALLBACK_URL until someone replaces the row (REPLACE) with the exact page.
const PT_URL = { Karnataka: 'https://ptax.karnataka.gov.in/', Maharashtra: 'https://mahagst.gov.in/en', 'West Bengal': 'https://comtax.wb.gov.in/',
  'Andhra Pradesh': 'https://apct.gov.in/', Gujarat: 'https://commercialtax.gujarat.gov.in/', Jharkhand: 'https://ctax.jharkhand.gov.in/',
  'Madhya Pradesh': 'https://mptax.mp.gov.in/', Meghalaya: 'https://meglaw.gov.in/', Mizoram: 'https://zotax.nic.in/', Punjab: 'https://psdt.punjab.gov.in/',
  Telangana: 'https://www.tgct.gov.in/', Tripura: 'https://taxes.tripura.gov.in/', 'Tamil Nadu': 'https://www.tn.gov.in/dtp/professional-tax.htm' };
const LWF_URL = { Karnataka: 'https://klwb.kar.nic.in/' };

async function seed(tx, data) {
  const stats = { notifications: 0, pt: 0, lwf: 0, mw: 0, mwFallbackUrl: [] };
  for (const f of data.feed) {
    const we = wc(f.en), wh = wc(f.hi);
    await tx.query(`INSERT INTO notifications (category,state,title,short_summary,reference,effective_date,published_date,flag,status,issued_by,official_url,note,explainer_en,explainer_hi,words_en,words_hi,legacy,dedupe_key)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)`,
      [f.cat, f.state || null, f.title, f.short, f.ref || null, f.eff || null, f.pub || null, f.flag || 'current', f.status || 'in_force', f.src || null,
       f.url || FALLBACK_URL, f.note || null, f.en, f.hi, we, wh, we < 250 || wh < 250,
       crypto.createHash('sha256').update([f.url, f.title, f.eff || f.pub].join('|')).digest('hex').slice(0, 32)]);
    stats.notifications++;
  }
  for (const r of data.pt.rows) {
    await tx.query(`INSERT INTO pt_rules (state,effective_from,frequency,cycle_text,basis,due_text,act,annual_cap,slab_tables,notes,official_url) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,$11)`,
      [r.name, PT_FROM[r.name] || SENTINEL, freqOf(r.cycle.replace(/^Deducted monthly, paid /i, '')), r.cycle, r.basis, r.due, r.act, r.cap, JSON.stringify(r.tables), r.notes || null, PT_URL[r.name] || FALLBACK_URL]);
    stats.pt++;
  }
  for (const r of data.lwf.rows) {
    await tx.query(`INSERT INTO lwf_rules (state,effective_from,employee_amount,employer_amount,ratio,frequency,due_text,act,notes,official_url) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [r.name, LWF_FROM[r.name] || SENTINEL, r.emp, r.empr, r.ratio, r.freq, r.due, r.act, r.notes || null, LWF_URL[r.name] || FALLBACK_URL]);
    stats.lwf++;
  }
  const cats = (x) => x.categories ? x.categories.map((c) => ({ name: c.name, per_month: c.month, per_day: c.day ?? null })) : [['Unskilled', x.uns], ['Semi-skilled', x.semi], ['Skilled', x.sk], ['Highly skilled', x.hs]]
    .filter((c) => c[1]).map((c) => ({ name: c[0], per_month: c[1], per_day: null }));
  for (const m of data.mw) {
    const seen = new Set(); const rows = [];
    const top = { eff: m.eff, categories: cats(m), ref: m.ref, note: m.notes || '', label: 'In force' };
    // forged, struck-down, set-aside or sub-judice historical orders are NOT rates and must never become 'current'
    const NOT_A_RATE = /FORGED|STRUCK DOWN|SET ASIDE|SUB JUDICE|NOT OFFICIAL/i;
    const hist = m.hist.filter((h) => h.eff && !h.gap && !NOT_A_RATE.test(h.label || '')).map((h) => ({ eff: h.eff, categories: cats(h), ref: h.ref, note: h.note, label: h.label }));
    [top, ...hist].forEach((r) => { if (r.eff && r.categories.length && !seen.has(r.eff)) { seen.add(r.eff); rows.push(r); } });
    if (!m.url) stats.mwFallbackUrl.push(m.name);
    for (const [i, r] of rows.entries()) {
      await tx.query(`INSERT INTO mw_rates (state,effective_from,structure,flag,cadence,zones,authority,label,categories,reference,note,official_url) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,$11,$12)`,
        [m.name, r.eff, m.struct || null, i === 0 ? m.flag : 'current', m.cad || null, m.zones || null, m.auth || null, r.label || null,
         JSON.stringify(r.categories), r.ref || null, r.note || null, m.url || FALLBACK_URL]);
      stats.mw++;
    }
  }
  for (const scheme of [['PT', data.pt], ['LWF', data.lwf]]) {
    for (const s of scheme[1].applicable) await tx.query('INSERT INTO applicability (scheme,state,applies) VALUES ($1,$2,true)', [scheme[0], s]);
    for (const s of scheme[1].notApplicable) await tx.query('INSERT INTO applicability (scheme,state,applies) VALUES ($1,$2,false)', [scheme[0], s]);
  }
  await tx.query("INSERT INTO audit_log (event, detail) VALUES ('seeded', $1::jsonb)", [JSON.stringify(stats)]);
  return stats;
}
module.exports = { seed };
