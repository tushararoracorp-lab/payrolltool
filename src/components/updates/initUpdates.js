// Browser behaviour for /updates: filters, search and tabs. Receives the data and the page root.
import { esc, label, cardHtml, jlistsHtml, mwCardHtml } from './render';

export default function initUpdates(DATA, root) {
  const $ = (s) => root.querySelector(s);
let PAGE=12;

// ---------- analytics: Google Analytics 4 events. Silently does nothing when gtag is not on the page. ----------
const track=(name,params)=>{try{if(typeof window==='undefined') return; if(typeof window.gtag==='function'){window.gtag('event',name,params||{});} else if(Array.isArray(window.dataLayer)){(function(){window.dataLayer.push(arguments);})('event',name,params||{});}}catch(e){/* never break the page for analytics */}};
const cut=(s,n)=>String(s==null?'':s).slice(0,n||90);
const TAB_NAMES={feed:'notifications',rates:'minimum_wages',ptp:'professional_tax',lwfp:'labour_welfare_fund'};
const ac=new AbortController();   // removes the page-wide listeners when the page is left or re-initialised

root.querySelectorAll('.tab').forEach(b=>b.onclick=()=>{
  root.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));
  root.querySelectorAll('.panel').forEach(x=>x.classList.remove('on'));
  b.classList.add('active'); $('#'+b.dataset.panel).classList.add('on');
  track('updates_tab_view',{tab:TAB_NAMES[b.dataset.panel]||b.dataset.panel});
});

// ---------- notifications feed ----------
const uniq=a=>[...new Set(a.filter(Boolean))].sort();
const yearOf=f=>(f.eff||f.pub||'').slice(0,4);
uniq(DATA.feed.map(f=>f.cat)).forEach(c=>$('#fcat').insertAdjacentHTML('beforeend',`<option>${esc(c)}</option>`));
uniq(DATA.feed.map(f=>f.state)).forEach(s=>$('#fstate').insertAdjacentHTML('beforeend',`<option>${esc(s)}</option>`));
uniq(DATA.feed.map(f=>f.status)).forEach(s=>$('#fstatus').insertAdjacentHTML('beforeend',`<option value="${esc(s)}">${esc(label(s))}</option>`));
uniq(DATA.feed.map(yearOf)).reverse().forEach(y=>$('#fyear').insertAdjacentHTML('beforeend',`<option>${esc(y)}</option>`));

(function(){
  const yrs=DATA.feed.map(yearOf).filter(Boolean).sort();
  $('#fstats').innerHTML=[
    ['Notifications',DATA.feed.length],
    ['Categories',uniq(DATA.feed.map(f=>f.cat)).length],
    ['States &amp; UTs',uniq(DATA.feed.map(f=>f.state)).length],
    ['Years covered',yrs[0]+'\u2013'+yrs[yrs.length-1]]
  ].map(([k,v])=>`<div class="stat"><b>${v}</b>${k}</div>`).join('');
})();

// ---------- search: every word must match, in any order; short forms and one-letter slips are allowed ----------
const ALIAS={
  'PT':'professional tax ptax profession tax','LWF':'labour labor welfare fund','Min Wages':'minimum wage wages mw',
  'EPF':'provident fund pf epfo','ESI':'esic employees state insurance','TDS':'income tax','NPS':'national pension system',
  'Wage Codes':'labour labor codes code on wages social security'};
const STOP=new Set(['in','of','the','for','and','to','a','an','on','by','with']);
const words=(t)=>String(t==null?'':t).toLowerCase().replace(/[^a-z0-9ऀ-ॿ]+/g,' ').split(' ').filter(Boolean);
// at most one letter added, dropped, changed or two neighbours swapped
function near(a,b){
  if(a===b) return true; const la=a.length, lb=b.length; if(Math.abs(la-lb)>1) return false;
  let i=0; while(i<la&&i<lb&&a[i]===b[i]) i++;
  if(la===lb){ if(a.slice(i+1)===b.slice(i+1)) return true; return a[i]===b[i+1]&&a[i+1]===b[i]&&a.slice(i+2)===b.slice(i+2); }
  return la>lb ? a.slice(i+1)===b.slice(i) : a.slice(i)===b.slice(i+1);
}
const tokenHits=(tok,hay)=>hay.some(w=>w.startsWith(tok)||(tok.length>=5&&(near(tok,w)||(w.length>tok.length&&near(tok,w.slice(0,tok.length))))));
function matcher(q){
  const toks=words(q).filter(t=>!STOP.has(t));
  if(!toks.length) return null;
  return (text)=>{const hay=words(text); return toks.every(t=>tokenHits(t,hay));};
}
const HAY=new Map();
const feedText=(f)=>{ if(!HAY.has(f)) HAY.set(f,[f.title,f.short,f.ref,f.state,f.cat,ALIAS[f.cat]||'',f.src].join(' ')); return HAY.get(f); };

function filtered(){
  const m=matcher($('#q').value),c=$('#fcat').value,s=$('#fstate').value,st=$('#fstatus').value,y=$('#fyear').value;
  return DATA.feed.filter(f=>{
    if(c&&f.cat!==c) return false;
    if(s&&f.state!==s) return false;
    if(st&&f.status!==st) return false;
    if(y&&yearOf(f)!==y) return false;
    if(m&&!m(feedText(f))) return false;
    return true;});
}
function renderFeed(){
  const rows=filtered(), show=rows.slice(0,PAGE);
  $('#fcount').textContent=`showing ${show.length} of ${rows.length}`;
  $('#more').style.display=rows.length>PAGE?'block':'none';
  if(!rows.length){
    $('#cards').innerHTML=`<div class="jcard off" style="text-align:center;padding:32px 16px">
      <h4 style="justify-content:center">No notifications match these filters</h4>
      <div class="l1">Try widening the category, state, status or year filter, or clear the search box.</div></div>`;
    return;}
  $('#cards').innerHTML=show.map(cardHtml).join('');
}
['q','fcat','fstate','fstatus','fyear'].forEach(id=>$('#'+id).addEventListener('input',()=>{PAGE=12;renderFeed();}));
let qTimer=null;
$('#q').addEventListener('input',()=>{clearTimeout(qTimer);qTimer=setTimeout(()=>{const t=$('#q').value.trim(); if(t.length>=3) track('search',{search_term:cut(t.toLowerCase(),60),search_area:'updates'});},900);});
[['fcat','category'],['fstate','state'],['fstatus','status'],['fyear','year']].forEach(([id,kind])=>$('#'+id).addEventListener('change',()=>{const v=$('#'+id).value; if(v) track('updates_filter',{filter_type:kind,filter_value:cut(v,60)});}));
$('#more').onclick=()=>{PAGE+=12;renderFeed();track('updates_show_more',{shown:PAGE});};

// ---------- minimum wages ----------
(function(){
  const cyc=DATA.mw.reduce((a,m)=>a+m.hist.length,0);
  const yrs=DATA.mw.flatMap(m=>m.hist.map(h=>(h.eff||'').slice(0,4))).filter(Boolean).sort();
  $('#rstats').innerHTML=[
    ['Jurisdictions',DATA.mw.length],
    ['Current',DATA.mw.filter(m=>m.flag==='current').length],
    ['Dormant',DATA.mw.filter(m=>m.flag==='dormant').length],
    ['Revision cycles',cyc]
  ].map(([k,v])=>`<div class="stat"><b>${v}</b>${k}</div>`).join('');
  $('#mwbanner').innerHTML=`<b>Tap any jurisdiction</b> for its full revision timeline - ${cyc} cycles are recorded across ${DATA.mw.length} jurisdictions, back to ${yrs[0]}.`;
})();
const MWSEG={v:'all'};
function renderRates(){
  const m=matcher($('#rq').value), seg=MWSEG.v;
  const rows=DATA.mw.filter(r=>{
    if(seg==='current'&&r.flag!=='current') return false;
    if(seg==='attn'&&!['dormant','sub_judice'].includes(r.flag)) return false;
    if(m&&!m(r.name+' '+(r.notes||''))) return false;
    return true;});
  $('#rcount').textContent=`${rows.length} of ${DATA.mw.length} jurisdictions`;
  $('#rgrid').innerHTML=rows.map(mwCardHtml).join('');
}
['rq'].forEach(id=>$('#'+id).addEventListener('input',renderRates));
root.querySelectorAll('#mwseg button').forEach(b=>b.onclick=()=>{
  root.querySelectorAll('#mwseg button').forEach(x=>x.classList.remove('on'));
  b.classList.add('on'); MWSEG.v=b.dataset.v; renderRates();});
// ---------- PT / LWF: two lists ----------
function renderLists(kind){$('#'+kind+'lists').innerHTML=jlistsHtml(kind,DATA[kind]);}
['pt','lwf'].forEach(renderLists);

// official-source links on the cards
root.addEventListener('click',e=>{
  const a=e.target.closest('a[href^="http"]'); if(!a) return;
  let host=''; try{host=new URL(a.href).hostname;}catch(err){return;}
  if(host===window.location.hostname) return;
  const card=a.closest('.card');
  track('updates_source_click',{link_domain:cut(host,60),from:'card',topic:'notifications',item_id:cut(card?card.dataset.id:'',40)});
},{signal:ac.signal});

renderFeed(); renderRates();
return () => { ac.abort(); clearTimeout(qTimer); };

}
