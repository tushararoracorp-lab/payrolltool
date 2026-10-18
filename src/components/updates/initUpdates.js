// Browser behaviour for /updates: filters, search, tabs, popups, language toggle. Receives the data and the page root.
import { esc, fmt, dt, label, hasRates, pcls, cardHtml } from './render';

export default function initUpdates(DATA, root) {
  const $ = (s) => root.querySelector(s);
let FULLOPEN=false, PAGE=12, curId=null, curLang='en', curTab='explainer', curName=null, mode='feed';

root.querySelectorAll('.tab').forEach(b=>b.onclick=()=>{
  root.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));
  root.querySelectorAll('.panel').forEach(x=>x.classList.remove('on'));
  b.classList.add('active'); $('#'+b.dataset.panel).classList.add('on');
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

function filtered(){
  const q=$('#q').value.toLowerCase(),c=$('#fcat').value,s=$('#fstate').value,st=$('#fstatus').value,y=$('#fyear').value;
  return DATA.feed.filter(f=>{
    if(c&&f.cat!==c) return false;
    if(s&&f.state!==s) return false;
    if(st&&f.status!==st) return false;
    if(y&&yearOf(f)!==y) return false;
    if(q&&![f.title,f.short,f.ref,f.state,f.cat,f.src].join(' ').toLowerCase().includes(q)) return false;
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
$('#more').onclick=()=>{PAGE+=12;renderFeed();};
$('#cards').addEventListener('click',e=>{const b=e.target.closest('[data-open]'); if(b) openM(b.dataset.open);});

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
  const q=$('#rq').value.toLowerCase(), seg=MWSEG.v;
  const rows=DATA.mw.filter(r=>{
    if(seg==='current'&&r.flag!=='current') return false;
    if(seg==='attn'&&!['dormant','sub_judice'].includes(r.flag)) return false;
    if(q&&!(r.name+' '+(r.notes||'')).toLowerCase().includes(q)) return false;
    return true;});
  $('#rcount').textContent=`${rows.length} of ${DATA.mw.length} jurisdictions`;
  $('#rgrid').innerHTML=rows.map(r=>{
    const dot=r.flag==='current'?'y':(r.flag==='verify'?'n':'r');
    const line=hasRates(r)?`Unskilled ${fmt(r.uns)}${r.sk?' &middot; Skilled '+fmt(r.sk):''}`:'Rates by area - tap for history';
    return `<div class="jcard" role="button" tabindex="0" data-mw="${esc(r.name)}">
      <h4><span class="dot ${dot}"></span>${esc(r.name)}</h4>
      <div class="l1">${line}</div>
      <div class="l2">Effective ${dt(r.eff)}${r.prevEff?' (was '+dt(r.prevEff)+')':''}${r.cad?' &middot; '+esc(r.cad):''}</div>
      <div style="margin-top:9px">${r.flag!=='verify'?`<span class="pill ${pcls(r.flag)}">${esc(label(r.flag))}</span> `:''}
        ${r.hist&&r.hist.length?`<span class="pill brand">${r.hist.length} cycles</span>`:''}</div>
    </div>`;}).join('');
}
['rq'].forEach(id=>$('#'+id).addEventListener('input',renderRates));
root.querySelectorAll('#mwseg button').forEach(b=>b.onclick=()=>{
  root.querySelectorAll('#mwseg button').forEach(x=>x.classList.remove('on'));
  b.classList.add('on'); MWSEG.v=b.dataset.v; renderRates();});
function activate(e,attr,fn){
  const c=e.target.closest('['+attr+']'); if(!c) return;
  if(e.type==='keydown'&&e.key!=='Enter'&&e.key!==' ') return;
  e.preventDefault(); fn(c.getAttribute(attr));
}
$('#rgrid').addEventListener('click',e=>activate(e,'data-mw',openMW));
$('#rgrid').addEventListener('keydown',e=>activate(e,'data-mw',openMW));

// ---------- PT / LWF: two lists ----------
const JCFG={
  pt:{yes:'Levies professional tax',no:'Does not levy professional tax',title:'professional tax'},
  lwf:{yes:'Operates a labour welfare fund',no:'No labour welfare fund',title:'labour welfare fund'}
};
function renderLists(kind){
  const D=DATA[kind], cfg=JCFG[kind];
  const rows=new Set(D.rows.map(r=>r.name));
  const yes=D.applicable.map(n=>rows.has(n)
    ?`<li><button class="jrow link" data-kind="${kind}" data-name="${esc(n)}">${esc(n)}</button></li>`
    :`<li class="jrow off"><span>${esc(n)}</span></li>`).join('');
  const no=D.notApplicable.map(n=>`<li class="jrow off"><span>${esc(n)}</span>${D.tags&&D.tags[n]?`<span class="jtag">${esc(D.tags[n])}</span>`:''}</li>`).join('');
  $('#'+kind+'lists').innerHTML=`
    <section class="jcol"><h3 class="jcol-h">${cfg.yes}<span class="jn">${D.applicable.length}</span></h3><ul class="jlist">${yes}</ul></section>
    <section class="jcol"><h3 class="jcol-h">${cfg.no}<span class="jn">${D.notApplicable.length}</span></h3><ul class="jlist">${no}</ul></section>`;
}
['pt','lwf'].forEach(k=>{
  renderLists(k);
  $('#'+k+'lists').addEventListener('click',e=>{const b=e.target.closest('.jrow[data-name]'); if(b) openJ(b.dataset.kind,b.dataset.name);});
});

// ---------- modal ----------
function show(){$('#modal').classList.add('on');document.body.style.overflow='hidden';}
function hide(){$('#modal').classList.remove('on');document.body.style.overflow='';}
function setTabs(html){const t=$('#mTabs'); t.innerHTML=html; t.style.display=html?'':'none'; if(html) bindTabs();}
function bindTabs(){root.querySelectorAll('.st').forEach(b=>b.onclick=()=>{
  root.querySelectorAll('.st').forEach(x=>x.classList.remove('on'));
  b.classList.add('on'); curTab=b.dataset.st; paint();});}

function openM(id){mode='feed';curId=id;curLang='en';curTab='explainer';
  const f=DATA.feed.find(x=>x.id===id); $('#mTitle').textContent=f.title;
  setTabs(`<button class="st on" data-st="explainer">Plain-language explainer</button><button class="st" data-st="details">Notification details</button>`);
  paint(); show();}
function openMW(name){mode='mw';curName=name;curTab='history';
  const m=DATA.mw.find(x=>x.name===name); $('#mTitle').textContent=m.name+' - minimum wages';
  setTabs(`<button class="st on" data-st="history">Rate history</button><button class="st" data-st="details">Schedule detail</button>`);
  paint(); show();}
function openJ(kind,name){mode=kind;curName=name;
  $('#mTitle').textContent=name+' - '+JCFG[kind].title;
  setTabs(''); paint(); show();}

function latestRec(cat,state){
  const r=DATA.feed.filter(f=>f.cat===cat&&f.state===state);
  return r.sort((a,b)=>(b.eff||b.pub||'').localeCompare(a.eff||a.pub||''))[0];
}
function kf(l,v,wide){return `<div class="kf${wide?' wide':''}"><span class="kf-l">${l}</span><span class="kf-v">${esc(v||'-')}</span></div>`;}
function slabHtml(tables){
  return (tables||[]).map(t=>`<div class="slab">
    ${t.title?`<h4 class="slab-t">${esc(t.title)}</h4>`:''}
    <div class="scroller"><table><thead><tr><th>${esc(t.unit||'Salary')}</th><th class="num">Tax</th></tr></thead><tbody>
    ${t.rows.map(r=>`<tr style="cursor:default"><td>${esc(r.band)}</td><td class="num">${esc(r.amt)}</td></tr>`).join('')}
    </tbody></table></div></div>`).join('');
}
function paintJ(){
  const isPT=mode==='pt', D=isPT?DATA.pt:DATA.lwf;
  const r=D.rows.find(x=>x.name===curName);
  const rec=latestRec(isPT?'PT':'LWF',curName);
  const facts=isPT
    ?kf('Cycle',r.cycle,(r.cycle||'').length>28)+kf('Basis',r.basis,(r.basis||'').length>28)+kf('Due',r.due,true)
    :kf('Employee',r.emp)+kf('Employer',r.empr)+kf('Frequency',r.freq)+kf('Due',r.due,true);
  const more=isPT
    ?[['Governing instrument',r.act],['Annual ceiling',r.cap]]
    :[['Ratio (employee : employer)',r.ratio],['Governing instrument',r.act]];
  const strong=/Widest ratio/.test(r.notes||'');
  $('#mBody').innerHTML=`<div class="keyfacts">${facts}</div>
    ${isPT?slabHtml(r.tables):''}
    <dl class="dl">${more.map(([k,v])=>`<dt>${k}</dt><dd>${esc(v||'-')}</dd>`).join('')}</dl>
    ${r.notes?`<div class="${strong?'pend':'srcbox'}" style="margin-top:16px"><h4 style="font-size:.74rem;text-transform:uppercase;letter-spacing:.6px;color:var(--ink-soft);margin-bottom:7px">What to watch</h4>
      <div style="font-size:.9rem;line-height:1.7;color:var(--ink)">${esc(r.notes)}</div></div>`:''}
    ${rec?`<div style="margin-top:14px"><button class="btn" data-open="${esc(rec.id)}">Read the full explainer &rarr;</button></div>`:''}`;
  const b=$('#mBody').querySelector('[data-open]'); if(b) b.onclick=()=>openM(b.dataset.open);
}
function paintMW(){
  const m=DATA.mw.find(x=>x.name===curName);
  if(curTab==='details'){
    $('#mBody').innerHTML=`<dl class="dl">
      <dt>Effective from</dt><dd>${dt(m.eff)}</dd>
      <dt>Notification</dt><dd>${esc(m.ref||'-')}</dd>
      <dt>Zone structure</dt><dd>${esc(m.zones||'-')}</dd>
      <dt>Wage structure</dt><dd>${esc(m.struct||'-')}</dd>
      <dt>Revision cadence</dt><dd>${esc(m.cad||'-')}</dd>
      <dt>Authority</dt><dd>${esc(m.auth||'-')}</dd>
      ${m.flag!=='verify'?`<dt>Status</dt><dd><span class="pill ${pcls(m.flag)}">${esc(label(m.flag))}</span></dd>`:''}
    </dl>${m.notes?`<p style="margin-top:14px;font-size:.9rem;line-height:1.7">${esc(m.notes)}</p>`:''}
    ${m.url?`<div class="srcbox"><h4>Official source</h4><a href="${esc(m.url)}" target="_blank" rel="noopener">${esc(m.url)}</a></div>`:''}`;
    return;}
  const cats = m.categories || [['Unskilled',m.uns],['Semi-skilled',m.semi],['Skilled',m.sk],['Highly skilled',m.hs]]
    .filter(x=>x[1]).map(x=>({name:x[0],month:x[1],day:null}));
  const cur=cats.length?`<div class="rate-box">
    <div class="rate-h">In force from ${dt(m.eff)}${m.struct?' <span class="rate-s">('+esc(m.struct)+')</span>':''}</div>
    ${cats.map(c=>`<div class="rate-row"><span class="rate-name">${esc(c.name)}</span>
      <span class="rate-val">Rs. ${fmt(c.month)} <small>per month</small>${c.day?` <span class="rate-day">(Rs. ${fmt(c.day)} per day)</span>`:''}</span></div>`).join('')}
    ${m.ref?`<div class="rate-ref">${esc(m.ref)}</div>`:''}</div>`:'';
  const prior=m.hist.map(h=>{
    const bad=/FORGED|STRUCK DOWN|SET ASIDE|SUB JUDICE/.test(h.label||'');
    const rates=hasRates(h)
      ?`<div style="margin-top:7px;font-size:.87rem;color:var(--ink-soft)">Unskilled ${fmt(h.uns)} &middot; Semi ${fmt(h.semi)} &middot; Skilled ${fmt(h.sk)} &middot; Highly skilled ${fmt(h.hs)}</div>`
      :`<div style="margin-top:7px;font-size:.85rem;color:var(--ink-soft);font-style:italic">Revision recorded - refer to the official notification for the figures.</div>`;
    return `<div class="hist-r ${bad?'bad':(h.gap?'gapr':'')}">
    <b>${h.eff?dt(h.eff):'Date not established'} - ${esc(h.label)}</b>
    ${rates}
    ${h.ref?`<div style="margin-top:5px;font-size:.79rem;color:var(--ink-soft)"><b>${esc(h.ref)}</b></div>`:''}
    ${h.note?`<div style="margin-top:5px;font-size:.8rem;color:var(--ink-soft);line-height:1.55">${esc(h.note)}</div>`:''}</div>`}).join('');
  $('#mBody').innerHTML=`${cur}<div class="hist"><div class="hist-h">Rate history - ${esc(m.name)} &middot; ${m.hist.length} cycle${m.hist.length===1?'':'s'}</div>${prior}</div>
    ${/Code on Wages/.test(m.notes||'')||/re-basing/i.test(JSON.stringify(m.hist))?`<div class="banner" style="margin-top:14px"><b>Watch the basis change.</b> A 2026 revision under the Code on Wages replaced a Basic-plus-VDA schedule with a single consolidated wage. Figures either side of that boundary are on different accounting bases and should not be compared directly, or used to compute arrears across it.</div>`:''}`;
}
function paint(){
  if(mode==='pt'||mode==='lwf'){paintJ();return;}
  if(mode==='mw'){paintMW();return;}
  const f=DATA.feed.find(x=>x.id===curId);
  if(curTab==='details'){
    $('#mBody').innerHTML=`<dl class="dl">
      <dt>Category</dt><dd>${esc(f.cat)}</dd>
      <dt>Jurisdiction</dt><dd>${esc(f.state||'All India')}</dd>
      <dt>Notification reference</dt><dd>${esc(f.ref||'-')}</dd>
      <dt>Published</dt><dd>${dt(f.pub)}</dd>
      <dt>Effective from</dt><dd>${dt(f.eff)}</dd>
      <dt>Issued by</dt><dd>${esc(f.src||'-')}</dd>
      <dt>Status</dt><dd><span class="pill ${pcls(f.flag)}">${esc(label(f.flag))}</span></dd>
    </dl>${f.url?`<div class="srcbox" style="margin-top:16px"><h4>Official source</h4>
    <a href="${esc(f.url)}" target="_blank" rel="noopener">${esc(f.url)}</a>
    <p style="font-size:.8rem;color:var(--ink-soft);margin-top:7px;line-height:1.55">We summarise; we never replace. Always confirm against the issuing authority before a figure feeds a payroll run.</p></div>`:''}`;
    return;}
  const txt=curLang==='en'?f.en:f.hi;
  const paras=txt.split(/\n\n+/);
  const lead=paras[0];
  $('#mBody').innerHTML=`
    <div class="glance">
      <h5>At a glance</h5>
      <p>${esc(f.short||lead)}</p>
      <dl>
        ${f.ref?`<dt>Reference</dt><dd>${esc(f.ref)}</dd>`:''}
        <dt>Effective</dt><dd>${dt(f.eff)}</dd>
        ${f.src?`<dt>Issued by</dt><dd>${esc(f.src)}</dd>`:''}
      </dl>
    </div>
    <button class="disclose" id="discBtn">Read the full explanation &darr;</button>
    <div class="full" id="fullTxt">
      <div class="langbar">
        <button class="lang ${curLang==='en'?'on':''}" data-l="en">English</button>
        <button class="lang ${curLang==='hi'?'on':''}" data-l="hi">\u0939\u093f\u0902\u0926\u0940</button>
      </div>
      ${paras.map(x=>`<p>${esc(x)}</p>`).join('')}
      ${f.url?`<div class="srcbox"><h4>Official source</h4><a href="${esc(f.url)}" target="_blank" rel="noopener">${esc(f.url)}</a></div>`:''}
    </div>`;
  const db=$('#discBtn'), ft=$('#fullTxt');
  const open=()=>{ft.classList.add('on'); db.innerHTML='Hide the full explanation &uarr;';};
  if(FULLOPEN) open();
  db.onclick=()=>{FULLOPEN=!FULLOPEN; ft.classList.toggle('on',FULLOPEN);
    db.innerHTML=FULLOPEN?'Hide the full explanation &uarr;':'Read the full explanation &darr;';};
  root.querySelectorAll('.lang').forEach(b=>b.onclick=()=>{curLang=b.dataset.l;FULLOPEN=true;paint();});
}
$('#mClose').onclick=hide;
$('#modal').onclick=e=>{if(e.target.id==='modal') hide();};
const onKey=e=>{if(e.key==='Escape'&&$('#modal').classList.contains('on')) hide();};
document.addEventListener('keydown',onKey);

renderFeed(); renderRates();
return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };

}
