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
  return `<div class="card">
    <div class="card-top">
      <span class="pill brand">${esc(f.cat)}</span>
      <span class="pill">${esc(f.state||'All India')}</span>
      <span class="pill ${pcls(f.flag)}">${esc(label(f.flag))}</span>
    </div>
    <h3>${esc(f.title)}</h3>
    ${f.note?`<div class="rnote"><b>Note:</b> ${esc(f.note)}</div>`:''}
    <p class="short">${esc(f.short)}</p>
    <div class="meta">${f.ref?`<span><b>Reference:</b> ${esc(f.ref)}</span>`:''}
      <span><b>Effective:</b> ${dt(f.eff)}</span>${f.src?`<span><b>Issued by:</b> ${esc(f.src)}</span>`:''}</div>
    <div class="actions">
      <button class="btn" data-open="${esc(f.id)}">Read the full explainer</button>
      ${f.url?`<a class="btn ghost" href="${esc(f.url)}" target="_blank" rel="noopener">Official source &rarr;</a>`:''}
    </div>
  </div>`;
}
