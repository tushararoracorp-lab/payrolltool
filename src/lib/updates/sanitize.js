// Everything that enters the database passes through here first.
// Goal: data arrives clean, complete and in both languages, so no one has to fix it afterwards.
const crypto = require('crypto');

const STATES = [
 'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand',
 'Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan',
 'Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal','Andaman and Nicobar Islands','Chandigarh',
 'Dadra and Nagar Haveli and Daman and Diu','Delhi','Jammu and Kashmir','Ladakh','Lakshadweep','Puducherry','Central Sphere','Dadra and Nagar Haveli','Daman and Diu'];
const CATEGORIES = ['Wage Codes','EPF','ESI','PT','LWF','NPS','TDS','Min Wages'];
const FREQUENCIES = ['Monthly','Quarterly','Half-yearly','Annual'];
const FLAGS = ['current','superseded','repealed','draft','pending','reference','alert','sub judice'];
const STATUSES = ['in_force','superseded','repealed','draft','notified_not_commenced','reference'];

// Only official sources may be linked. Add a domain here once you have checked it is genuine.
const ALLOWED_HOST_SUFFIXES = ['.gov.in', '.nic.in', 'pfrda.org.in', 'epfindia.gov.in', 'esic.gov.in', 'esic.in'];

// Words that mean "we have not filled this in" or are internal research commentary.
const VAGUE = /\b(as notified|as per notification|as applicable|to be notified|tbd|tba|n\/a|not available|not yet|pending|unknown)\b/i;
// Short fields (titles, notes, slab cells): strict. Long explainers: only unmistakable internal wording, because
// normal advice such as "verify against the notification" is legitimate there.
const INTERNAL = /simpliance|tracker|cross-?check|screenshot|\bour (record|research|own)\b|placeholder|not retrieved|haven't retrieved|not verified|unverified|\bverify\b|coverage gap|record created|evidence level|secondary source|primary source/i;
const INTERNAL_LONG = /simpliance|screenshot|\bour (record|research)\b|not retrieved|haven't (yet )?retrieved|coverage gap|record created|placeholder|honest gap|in the dataset/i;

const MONTHS = ['january','february','march','april','may','june','july','august','september','october','november','december'];

class Rejection extends Error { constructor(errors) { super(errors.join('; ')); this.errors = errors; } }

function text(v, { min = 1, max = 400, multiline = false, field = 'field' } = {}, errors) {
  if (typeof v !== 'string') { errors.push(`${field}: required text`); return ''; }
  let s = v.normalize('NFC').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
  s = s.replace(/<[^>]*>/g, '');                                  // no markup
  s = s.replace(/[\u2014]/g, '-').replace(/\u00A0/g, ' ');        // house rule: no em dashes
  s = multiline ? s.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').replace(/ ?\n ?/g, '\n') : s.replace(/\s+/g, ' ');
  s = s.trim();
  if (s.length < min) errors.push(`${field}: too short (min ${min} characters)`);
  if (s.length > max) errors.push(`${field}: too long (max ${max} characters)`);
  const rx = multiline && max > 2000 ? INTERNAL_LONG : INTERNAL;
  if (rx.test(s)) errors.push(`${field}: contains internal research wording ("${s.match(rx)[0]}") - public text must state facts only`);
  return s;
}
function plain(v, opts, errors) {                                 // like text() but vague placeholders are rejected too
  const s = text(v, opts, errors);
  if (VAGUE.test(s)) errors.push(`${opts.field}: "${s.match(VAGUE)[0]}" is not allowed - state the actual value`);
  return s;
}
function oneOf(v, list, field, errors) { if (!list.includes(v)) errors.push(`${field}: must be one of ${list.join(' | ')}`); return v; }
function isoDate(v, field, errors, required = true) {
  if (v == null || v === '') { if (required) errors.push(`${field}: required date`); return null; }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v) || Number.isNaN(Date.parse(v))) { errors.push(`${field}: use YYYY-MM-DD`); return null; }
  return v;
}
function officialUrl(v, field, errors) {
  try {
    const u = new URL(String(v));
    const ok = u.protocol === 'https:' && ALLOWED_HOST_SUFFIXES.some((s) => u.hostname === s.replace(/^\./, '') || u.hostname.endsWith(s.startsWith('.') ? s : '.' + s) || u.hostname === s);
    if (!ok) errors.push(`${field}: ${u.hostname} is not an approved official domain`);
    return u.toString();
  } catch (_) { errors.push(`${field}: must be a full https URL`); return ''; }
}
const words = (s) => (s.trim() ? s.trim().split(/\s+/).length : 0);
function devanagariShare(s) {
  const letters = s.match(/\p{L}/gu) || []; if (!letters.length) return 0;
  return letters.filter((c) => /[\u0900-\u097F]/.test(c)).length / letters.length;
}
function state(v, field, errors, nullable = false) {
  if ((v == null || v === '') && nullable) return null;
  return oneOf(v, STATES, field, errors);
}
// Due dates must say WHEN, and half-yearly / quarterly entries must say which months.
function dueText(v, frequency, errors) {
  const s = plain(v, { min: 8, max: 300, field: 'due_text' }, errors);
  const months = new Set(MONTHS.filter((m) => new RegExp('\\b' + m.slice(0, 3) + '[a-z]*\\b', 'i').test(s)));
  const hasDay = /\b\d{1,2}(st|nd|rd|th)?\b/.test(s) || /last day|end of/i.test(s);
  const need = { Monthly: 0, Annual: 1, 'Half-yearly': 2, Quarterly: 4 }[frequency] ?? 0;
  if (frequency === 'Monthly' && !hasDay) errors.push('due_text: say which day of the month, e.g. "By the 15th of the following month"');
  if (frequency !== 'Monthly' && months.size < need) errors.push(`due_text: ${frequency} entries must name ${need} month${need > 1 ? 's' : ''}, e.g. "by 15 July and 15 January"`);
  return s;
}
const amount = (v, field, errors) => { const s = text(v, { min: 3, max: 120, field }, errors); if (!/\d/.test(s)) errors.push(`${field}: must contain an amount`); return s; };

// ------------------------------------------------------------------ per-kind sanitizers
const KINDS = {
  notification(p, errors) {
    const category = oneOf(p.category, CATEGORIES, 'category', errors);
    const explainer_en = text(p.explainer_en, { min: 800, max: 9000, multiline: true, field: 'explainer_en' }, errors);
    const explainer_hi = text(p.explainer_hi, { min: 800, max: 14000, multiline: true, field: 'explainer_hi' }, errors);
    const words_en = words(explainer_en), words_hi = words(explainer_hi);
    if (words_en < 250) errors.push(`explainer_en: ${words_en} words, minimum is 250`);
    if (words_hi < 250) errors.push(`explainer_hi: ${words_hi} words, minimum is 250`);
    if (explainer_hi && devanagariShare(explainer_hi) < 0.6) errors.push('explainer_hi: must be written in Hindi (Devanagari)');
    if (explainer_en && devanagariShare(explainer_en) > 0.05) errors.push('explainer_en: must be written in English');
    const c = {
      category, state: state(p.state, 'state', errors, true),
      title: text(p.title, { min: 10, max: 220, field: 'title' }, errors),
      short_summary: text(p.short_summary, { min: 40, max: 500, field: 'short_summary' }, errors),
      reference: p.reference ? text(p.reference, { max: 240, field: 'reference' }, errors) : null,
      effective_date: isoDate(p.effective_date, 'effective_date', errors, false),
      published_date: isoDate(p.published_date, 'published_date', errors, false),
      flag: oneOf(p.flag || 'current', FLAGS, 'flag', errors),
      status: oneOf(p.status || 'in_force', STATUSES, 'status', errors),
      issued_by: text(p.issued_by, { min: 3, max: 200, field: 'issued_by' }, errors),
      official_url: officialUrl(p.official_url, 'official_url', errors),
      note: p.note ? text(p.note, { max: 300, field: 'note' }, errors) : null,
      explainer_en, explainer_hi, words_en, words_hi,
    };
    if (!c.effective_date && !c.published_date) errors.push('effective_date or published_date is required');
    c.dedupe_key = crypto.createHash('sha256').update([c.official_url, c.title, c.effective_date || c.published_date].join('|')).digest('hex').slice(0, 32);
    return c;
  },
  pt_rule(p, errors) {
    const frequency = oneOf(p.frequency, FREQUENCIES, 'frequency', errors);
    if (!Array.isArray(p.slab_tables) || !p.slab_tables.length) errors.push('slab_tables: at least one slab table is required');
    const slab_tables = (Array.isArray(p.slab_tables) ? p.slab_tables : []).map((t, i) => {
      const rows = Array.isArray(t.rows) ? t.rows : [];
      if (rows.length < 2) errors.push(`slab_tables[${i}]: needs at least 2 rows`);
      return { title: t.title ? text(t.title, { max: 80, field: `slab_tables[${i}].title` }, errors) : '',
               unit: text(t.unit, { min: 3, max: 90, field: `slab_tables[${i}].unit` }, errors),
               rows: rows.map((r, j) => ({ band: plain(r.band, { min: 3, max: 90, field: `slab_tables[${i}].rows[${j}].band` }, errors),
                                           amt: plain(r.amt, { min: 3, max: 120, field: `slab_tables[${i}].rows[${j}].amt` }, errors) })) };
    });
    return { state: state(p.state, 'state', errors), effective_from: isoDate(p.effective_from, 'effective_from', errors), frequency,
      cycle_text: plain(p.cycle_text || frequency, { min: 3, max: 120, field: 'cycle_text' }, errors),
      basis: plain(p.basis, { min: 5, max: 160, field: 'basis' }, errors),
      due_text: dueText(p.due_text, frequency, errors),
      act: plain(p.act, { min: 8, max: 260, field: 'act' }, errors),
      annual_cap: plain(p.annual_cap, { min: 5, max: 140, field: 'annual_cap' }, errors),
      slab_tables, notes: p.notes ? text(p.notes, { max: 900, multiline: true, field: 'notes' }, errors) : null,
      official_url: officialUrl(p.official_url, 'official_url', errors) };
  },
  lwf_rule(p, errors) {
    const frequency = oneOf(p.frequency, FREQUENCIES, 'frequency', errors);
    return { state: state(p.state, 'state', errors), effective_from: isoDate(p.effective_from, 'effective_from', errors),
      employee_amount: amount(p.employee_amount, 'employee_amount', errors), employer_amount: amount(p.employer_amount, 'employer_amount', errors),
      ratio: plain(p.ratio, { min: 3, max: 20, field: 'ratio' }, errors), frequency,
      due_text: dueText(p.due_text, frequency, errors),
      act: plain(p.act, { min: 8, max: 260, field: 'act' }, errors),
      notes: p.notes ? text(p.notes, { max: 900, multiline: true, field: 'notes' }, errors) : null,
      official_url: officialUrl(p.official_url, 'official_url', errors) };
  },
  mw_rate(p, errors) {
    const cats = Array.isArray(p.categories) ? p.categories : [];
    if (!cats.length) errors.push('categories: at least one wage category is required');
    const categories = cats.map((c, i) => {
      const month = Number(c.per_month), day = c.per_day == null || c.per_day === '' ? null : Number(c.per_day);
      if (!Number.isFinite(month) || month <= 0) errors.push(`categories[${i}].per_month: must be a positive number`);
      if (day != null && (!Number.isFinite(day) || day <= 0)) errors.push(`categories[${i}].per_day: must be a positive number or empty`);
      return { name: plain(c.name, { min: 3, max: 120, field: `categories[${i}].name` }, errors), per_month: Math.round(month), per_day: day == null ? null : Math.round(day) };
    });
    return { state: state(p.state, 'state', errors), effective_from: isoDate(p.effective_from, 'effective_from', errors),
      structure: p.structure ? text(p.structure, { max: 80, field: 'structure' }, errors) : null,
      flag: oneOf(p.flag || 'current', ['current', 'dormant', 'sub_judice', 'verify'], 'flag', errors),
      cadence: p.cadence ? text(p.cadence, { max: 80, field: 'cadence' }, errors) : null,
      zones: p.zones ? text(p.zones, { max: 160, field: 'zones' }, errors) : null,
      authority: p.authority ? text(p.authority, { max: 160, field: 'authority' }, errors) : null,
      label: p.label ? text(p.label, { max: 100, field: 'label' }, errors) : null, categories,
      reference: p.reference ? text(p.reference, { max: 240, field: 'reference' }, errors) : null,
      note: p.note ? text(p.note, { max: 600, field: 'note' }, errors) : null,
      official_url: officialUrl(p.official_url, 'official_url', errors) };
  },
};

function sanitize(kind, payload) {
  if (!KINDS[kind]) throw new Rejection([`kind: must be one of ${Object.keys(KINDS).join(' | ')}`]);
  if (!payload || typeof payload !== 'object') throw new Rejection(['payload: required object']);
  const errors = [];
  const clean = KINDS[kind](payload, errors);
  if (errors.length) throw new Rejection(errors);
  return clean;
}

const TABLE = { notification: 'notifications', pt_rule: 'pt_rules', lwf_rule: 'lwf_rules', mw_rate: 'mw_rates' };
function summarise(kind, clean) {
  if (kind === 'notification') return `${clean.category} | ${clean.state || 'All India'} | ${clean.title}`;
  if (kind === 'pt_rule') return `Professional Tax | ${clean.state} | effective ${clean.effective_from} | ${clean.frequency}`;
  if (kind === 'lwf_rule') return `Labour Welfare Fund | ${clean.state} | effective ${clean.effective_from} | ${clean.employee_amount} + ${clean.employer_amount}`;
  return `Minimum Wages | ${clean.state} | effective ${clean.effective_from} | ${clean.categories.length} categories`;
}

module.exports = { sanitize, summarise, Rejection, TABLE, STATES, CATEGORIES, KINDS: Object.keys(KINDS), words, devanagariShare };
