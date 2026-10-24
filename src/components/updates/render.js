// Shared by the server (first paint, so Google and AdSense see real content) and the browser script.
export const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const fmt = (n) => (n == null ? '-' : Number(n).toLocaleString('en-IN'));
export const dt = (s) => (s ? new Date(s).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }) : '-');
export const label = (s) => String(s == null ? '' : s).replace(/_/g, ' ');
export const hasRates = (x) => !!(x && (x.uns || x.semi || x.sk || x.hs));
export function pcls(f) {
  const v = String(f || '').toLowerCase();
  if (['current', 'in_force'].includes(v)) return 'ok';
  if (['pending', 'draft', 'notified_not_commenced'].includes(v)) return 'warn';
  if (['dormant', 'alert', 'sub_judice', 'sub judice', 'repealed'].includes(v)) return 'bad';
  return '';
}
export function cardHtml(f) {
  return `<div class="card" data-id="${esc(f.key)}">
    <div class="card-top">
      <span class="pill brand">${esc(f.cat)}</span>
      <span class="pill">${esc(f.state||'All India')}</span>
      <span class="pill ${pcls(f.flag)}">${esc(label(f.flag))}</span>
    </div>
    <h3><a class="card-link" href="/updates/notifications/${notifSlug(f)}">${esc(f.title)}</a></h3>
    ${f.note?`<div class="rnote"><b>Note:</b> ${esc(f.note)}</div>`:''}
    <p class="short">${esc(f.short)}</p>
    <div class="meta">${f.ref?`<span><b>Reference:</b> ${esc(f.ref)}</span>`:''}
      ${f.eff?`<span><b>Effective:</b> ${dt(f.eff)}</span>`:''}${f.src?`<span><b>Issued by:</b> ${esc(f.src)}</span>`:''}</div>
    <div class="actions">
      <a class="btn" href="/updates/notifications/${notifSlug(f)}">Read the full explainer</a>
      ${f.url?`<a class="btn ghost" href="${esc(f.url)}" target="_blank" rel="noopener">Official source &rarr;</a>`:''}
    </div>
  </div>`;
}

// ---- state links (used by the server for the first paint, and by the browser script) ----
export const slugOf = (s) => String(s == null ? '' : s).toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
export const TOPIC_SLUG = { pt: 'professional-tax', lwf: 'labour-welfare-fund', mw: 'minimum-wages' };
const JCFG = {
  pt: { yes: 'Levies professional tax', no: 'Does not levy professional tax' },
  lwf: { yes: 'Operates a labour welfare fund', no: 'No labour welfare fund' },
};
export function jlistsHtml(kind, D) {
  const cfg = JCFG[kind];
  const rows = new Set(D.rows.map((x) => x.name));
  const yes = D.applicable.map((n) => (rows.has(n)
    ? `<li><a class="jrow link" href="/updates/${TOPIC_SLUG[kind]}/${slugOf(n)}">${esc(n)}</a></li>`
    : `<li class="jrow off"><span>${esc(n)}</span></li>`)).join('');
  const no = D.notApplicable.map((n) => `<li class="jrow off"><span>${esc(n)}</span>${D.tags && D.tags[n] ? `<span class="jtag">${esc(D.tags[n])}</span>` : ''}</li>`).join('');
  return `<section class="jcol"><h3 class="jcol-h">${cfg.yes}<span class="jn">${D.applicable.length}</span></h3><ul class="jlist">${yes}</ul></section>
    <section class="jcol"><h3 class="jcol-h">${cfg.no}<span class="jn">${D.notApplicable.length}</span></h3><ul class="jlist">${no}</ul></section>`;
}
export function mwCardHtml(m) {
  const dot = m.flag === 'current' ? 'y' : (m.flag === 'verify' ? 'n' : 'r');
  const line = hasRates(m) ? `Unskilled ${fmt(m.uns)}${m.sk ? ' &middot; Skilled ' + fmt(m.sk) : ''}` : 'Rates by area - open for details';
  return `<a class="jcard" href="/updates/${TOPIC_SLUG.mw}/${slugOf(m.name)}">
      <h4><span class="dot ${dot}"></span>${esc(m.name)}</h4>
      <div class="l1">${line}</div>
      <div class="l2">Effective ${dt(m.eff)}${m.prevEff ? ' (was ' + dt(m.prevEff) + ')' : ''}${m.cad ? ' &middot; ' + esc(m.cad) : ''}</div>
      <div style="margin-top:9px">${m.flag !== 'verify' ? `<span class="pill ${pcls(m.flag)}">${esc(label(m.flag))}</span> ` : ''}
        ${m.hist && m.hist.length ? `<span class="pill brand">${m.hist.length} cycles</span>` : ''}</div>
    </a>`;
}

// stable address of one notification page: readable title + 8 characters of the notification's content fingerprint (the same in every database, so the address never changes)
export const notifSlug = (f) => slugOf(f.title).slice(0, 70).replace(/-+$/, '') + '-' + String(f.key).slice(0, 8);
