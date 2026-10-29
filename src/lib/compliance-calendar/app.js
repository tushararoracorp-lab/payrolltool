// Payroll compliance calendar: the interactive part. Started by src/pages/compliance-calendar.js
// after the page loads. Everything stays in the visitor's browser (localStorage key "ptcal-v1").
import {DOW,FYM,FY_LABEL,MON3,MONTHS,STATES,TOPICS,buildFor,esc,groupNotes,hasDates,key,mk,noticeFor,pad,parse,slug,userBasis} from './data';

const PAGE_URL='https://www.payrolltool.in/compliance-calendar';
function track(name,params){try{if(typeof window!=='undefined'&&window.gtag)window.gtag('event',name,Object.assign({tool_name:'compliance_calendar'},params||{}))}catch(e){}}

export function startCalendar(){
const docHandlers=[];
const onDoc=(t,f)=>{document.addEventListener(t,f);docHandlers.push([t,f])};
/* ================= STATE ================= */
const params=new URLSearchParams(location.search);
const REVIEW=false;
const TODAY=(()=>{const t=params.get('today');const d=t?parse(t):new Date();return new Date(d.getFullYear(),d.getMonth(),d.getDate())})();
const todayKey=key(TODAY.getFullYear(),TODAY.getMonth(),TODAY.getDate());
const LS='ptcal-v1';
let S={sel:[{topic:'epf',state:'IN'},{topic:'esi',state:'IN'},{topic:'tds',state:'IN'}],view:null,rem:['3','0'],remTime:'09:00',remDays:10,theme:null,custom:[],wkOff:[]};
try{const raw=localStorage.getItem(LS);if(raw)Object.assign(S,JSON.parse(raw))}catch(e){}
if(params.get('reset')){S.sel=[];S.custom=[]}
S.sel=(S.sel||[]).filter(x=>TOPICS[x.topic]&&hasDates(x));
const save=()=>{try{localStorage.setItem(LS,JSON.stringify({sel:S.sel,view:S.view,rem:S.rem,remTime:S.remTime,remDays:S.remDays,custom:S.custom,wkOff:S.wkOff}))}catch(e){}};
let pick=new Set();                 // topics ticked in the dropdown
let showPast=false;                 // earlier months stay collapsed until asked for

/* ================= UI HELPERS ================= */
const $=s=>document.querySelector(s);
const FY_START='2026-04-01',FY_END='2027-03-31';
// one saved event of yours becomes one or more dated entries inside the financial year
function expandCustom(c){
  const out=[],d0=parse(c.date),step=c.repeat==='monthly'?1:c.repeat==='quarterly'?3:c.repeat==='yearly'?12:0;
  if(!step){if(c.date>=FY_START&&c.date<=FY_END)out.push(c.date)}
  else for(let i=0;i<=24;i+=step){
    const y=d0.getFullYear(),m=d0.getMonth()+i,dim=new Date(y,m+1,0).getDate(),dt=new Date(y,m,Math.min(d0.getDate(),dim));
    const k=key(dt.getFullYear(),dt.getMonth(),dt.getDate());
    if(k>FY_END)break; if(k>=FY_START)out.push(k);
  }
  return out.map(date=>mk({id:'u'+c.id+'_'+date,topic:'mine',stateId:'IN',date,title:c.title,detail:c.note||'Your own reminder.',status:'mine',source:'Added by you.',custom:true,cid:c.id,rep:c.repeat,forWho:c.forWho||''}));
}
function allEvents(){
  const seen=new Set(),out=[];
  const add=e=>{const k=e.topic+'|'+e.stateId+'|'+e.date+'|'+e.title+'|'+(e.cid||'');if(!seen.has(k)){seen.add(k);out.push(e)}};
  S.sel.forEach(({topic,state})=>buildFor(topic,state).forEach(add));
  (S.custom||[]).forEach(c=>expandCustom(c).forEach(add));
  return out.sort((a,b)=>a.date<b.date?-1:a.date>b.date?1:a.title<b.title?-1:1);
}
const stateLabel=s=>s==='IN'?'All India':s;
function toast(msg){const t=$('#toast');t.textContent=msg;t.hidden=false;clearTimeout(toast.t);toast.t=setTimeout(()=>t.hidden=true,2600)}

/* ---------- builder ---------- */
let pickSt=new Set();               // states ticked in the dropdown
function ddTop(id,ph){return '<div class="dd-top"><input type="search" class="dd-q" id="'+id+'Q" placeholder="'+ph+'" autocomplete="off" aria-label="'+ph+'"><label class="dd-sa"><input type="checkbox" id="'+id+'All"> <span id="'+id+'AllT">Select all</span></label></div>'}
function ddWire(panel,id,getSet,onChange){
  const q=$('#'+id+'Q'),all=$('#'+id+'All'),opts=[...panel.querySelectorAll('label.opt')];
  const vis=()=>opts.filter(o=>!o.hidden);
  const sync=()=>{const v=vis(),n=v.filter(o=>o.querySelector('input').checked).length;all.checked=v.length>0&&n===v.length;all.indeterminate=n>0&&n<v.length;
    $('#'+id+'AllT').textContent=q.value.trim()?'Select all matching ('+v.length+')':'Select all';
    panel.querySelectorAll('.grp').forEach(g=>{let el=g.nextElementSibling,any=false;while(el&&!el.classList.contains('grp')){if(el.matches('label.opt')&&!el.hidden)any=true;el=el.nextElementSibling}g.hidden=!any});
    let none=panel.querySelector('.dd-none');if(!v.length){if(!none){none=document.createElement('div');none.className='dd-none';none.textContent='No match';panel.appendChild(none)}}else if(none)none.remove()};
  q.addEventListener('input',()=>{const t=q.value.trim().toLowerCase();opts.forEach(o=>o.hidden=!!t&&!o.textContent.toLowerCase().includes(t));sync()});
  q.addEventListener('click',e=>e.stopPropagation());
  all.addEventListener('change',()=>{const set=getSet();vis().forEach(o=>{const i=o.querySelector('input');i.checked=all.checked;all.checked?set.add(i.value):set.delete(i.value)});onChange();sync()});
  opts.forEach(o=>o.querySelector('input').addEventListener('change',()=>{const i=o.querySelector('input'),set=getSet();i.checked?set.add(i.value):set.delete(i.value);onChange();sync()}));
  sync();
}
function renderStates(){
  const p=$('#statePanel');
  p.innerHTML=ddTop('st','Search states')+STATES.map(st=>'<label class="opt st-opt"><input type="checkbox" value="'+esc(st)+'"'+(pickSt.has(st)?' checked':'')+'><span><b>'+esc(st)+'</b></span></label>').join('');
  ddWire(p,'st',()=>pickSt,()=>{renderStateBtn();clearErr()});
}
function renderStateBtn(){
  const el=$('#stateTxt'),n=[...pickSt];
  if(!n.length){el.textContent='Choose states';el.className='ph';return}
  el.className='';el.textContent=n.length===STATES.length?'All states and UTs ('+n.length+')':n.length<=2?n.join(', '):n[0]+', '+n[1]+' +'+(n.length-2);
}
function setStPanel(open){$('#statePanel').hidden=!open;$('#stateBtn').setAttribute('aria-expanded',open?'true':'false')}
function renderTopicPanel(){
  const p=$('#topicPanel');
  const item=t=>'<label class="opt"><input type="checkbox" value="'+t+'"'+(pick.has(t)?' checked':'')+'><span><b><i class="dot '+t+'"></i> '+esc(TOPICS[t].label)+'</b><small>'+esc(TOPICS[t].desc)+'</small></span></label>';
  p.innerHTML=ddTop('tp','Search topics')+'<div class="grp">Same in every state</div>'+['epf','esi','tds'].map(item).join('')+'<div class="grp">Depends on the state</div>'+['pt','lwf'].map(item).join('');
  ddWire(p,'tp',()=>pick,()=>{renderTopicBtn();clearErr()});
}
function renderTopicBtn(){
  const el=$('#topicTxt'),n=[...pick];
  if(!n.length){el.textContent='Choose topics';el.className='ph';return}
  el.className='';el.textContent=n.length===5?'All topics':n.length<=2?n.map(t=>TOPICS[t].label).join(', '):TOPICS[n[0]].label+', '+TOPICS[n[1]].label+' +'+(n.length-2);
}
function setPanel(open){const b=$('#topicBtn'),p=$('#topicPanel');p.hidden=!open;b.setAttribute('aria-expanded',open?'true':'false')}
function showErr(m){const e=$('#err');e.innerHTML=m;e.hidden=false}
function clearErr(){$('#err').hidden=true;$('#stateBtn').classList.remove('need')}
function renderChips(){
  const c=$('#chips');
  if(!S.sel.length){c.innerHTML='';return}
  c.innerHTML='<span class="lbl">In your calendar</span>'+S.sel.map((s,i)=>'<span class="chip">'+'<i class="dot '+s.topic+'"></i>'+esc(TOPICS[s.topic].label)+' - '+esc(stateLabel(s.state))+'<button type="button" data-i="'+i+'" aria-label="Remove '+esc(TOPICS[s.topic].label+' '+stateLabel(s.state))+'"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M6 6l12 12M18 6L6 18"/></svg></button></span>').join('')+'<button type="button" class="link" id="clearAll">Clear all</button>';
  c.querySelectorAll('.chip button').forEach(b=>b.addEventListener('click',()=>{S.sel.splice(+b.dataset.i,1);save();renderAll()}));
  const ca=$('#clearAll');if(ca)ca.addEventListener('click',()=>{S.sel=[];save();renderAll()});
}
function onAdd(){
  clearErr();
  const topics=[...pick],states=[...pickSt],allSt=states.length===STATES.length;   // all states ticked: no remarks
  if(!topics.length){showErr('Choose at least one topic first.');return}
  const empty=[],wait=[];
  let added=0;
  const push=x=>{if(!S.sel.some(y=>y.topic===x.topic&&y.state===x.state)){S.sel.push(x);added++}};
  topics.forEach(t=>{
    if(TOPICS[t].scope==='central'){push({topic:t,state:'IN'});return}
    if(!states.length){wait.push(t);return}
    states.forEach(st=>{const x={topic:t,state:st};if(hasDates(x))push(x);else if(!allSt)empty.push([t,st,noticeFor(t,st)])});
  });
  const notes=groupNotes(empty);
  pick=new Set(wait);renderTopicPanel();renderTopicBtn();setPanel(false);setStPanel(false);
  if(!wait.length){pickSt=new Set();renderStates();renderStateBtn()}
  save();renderAll();
  if(wait.length){notes.unshift('Pick one or more states to add '+wait.map(t=>TOPICS[t].label).join(' and ')+'.');$('#stateBtn').classList.add('need')}
  if(notes.length)showErr(notes.map(n=>'<span class="nl">'+n+'</span>').join(''));
  if(added){toast('Added '+added+(added===1?' item':' items')+' to your calendar');track('tool_calculate_click',{action:'add_to_calendar',items:added})}
  else if(!notes.length)toast('Already in your calendar');
}

/* ---------- summary + months ---------- */
function daysBetween(a,b){return Math.round((b-a)/86400000)}
function fmtLong(k){const d=parse(k);return DOW[d.getDay()]+', '+d.getDate()+' '+MON3[d.getMonth()]+' '+d.getFullYear()}
function renderSummary(ev){
  const el=$('#sum');
  if(!ev.length){el.innerHTML='<b>Nothing here yet.</b> <span class="next">Choose topics above and add them, or add your own event.</span>';$('#schedBtn').disabled=true;$('#imgBtn').disabled=true;$('#pdfBtn').disabled=true;return}
  $('#schedBtn').disabled=false;$('#imgBtn').disabled=false;$('#pdfBtn').disabled=false;
  const next=ev.find(e=>e.date>=todayKey&&e.status!=='verify');
  const unv=ev.filter(e=>e.status==='verify').length;
  let h='<b>'+ev.length+' dates</b> in '+FY_LABEL;
  if(unv)h+=' <span class="next">('+unv+' not verified)</span>';
  if(next){const n=daysBetween(TODAY,parse(next.date));h+='<br><span class="next">Next: '+esc(next.title)+' - '+fmtLong(next.date)+' ('+(n===0?'today':n===1?'tomorrow':'in '+n+' days')+')</span>'}
  el.innerHTML=h;
}
const BADGE={verified:'<span class="badge verified">Verified</span>',secondary:'<span class="badge secondary">Sources agree</span>',verify:'<span class="badge verify">Verify</span>',mine:''};
const badge=e=>REVIEW?BADGE[e.status]:(e.status==='mine'?BADGE.mine:'');
function evRow(e){
  const d=parse(e.date),we=d.getDay()===0||d.getDay()===6,past=e.date<todayKey;
  const gcal='https://calendar.google.com/calendar/render?action=TEMPLATE&text='+encodeURIComponent(evTitle(e))+'&dates='+e.date.replace(/-/g,'')+'/'+nextDay(e.date).replace(/-/g,'')+'&details='+encodeURIComponent(e.detail+' PayrollTool.in compliance calendar: '+PAGE_URL);
  return '<li class="ev'+(past?' past':'')+(e.status==='verify'?' unv':'')+'" id="'+e.id+'" data-date="'+e.date+'" data-open="0">'+
    '<button type="button" class="ev-h" aria-expanded="false"><span class="ev-d"><b>'+d.getDate()+'</b><i class="'+(we?'we':'')+'">'+DOW[d.getDay()]+'</i></span>'+
    '<span><span class="ev-t"><i class="dot '+e.topic+'"></i> '+esc(e.custom?e.title:TOPICS[e.topic].label+(e.stateId==='IN'?'':' - '+stateLabel(e.stateId)))+'</span>'+(e.custom||REVIEW?'<span class="ev-m">'+(e.custom?'<span class="tp">My event'+(e.forWho?' - '+esc(e.forWho):'')+'</span>':'')+badge(e)+'</span>':'')+'</span>'+
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 9l6 6 6-6"/></svg></button>'+
    '<div class="ev-b">'+(e.custom?'':'<p class="ev-full">'+esc(e.title)+'</p>')+'<p>'+esc(e.detail)+'</p>'+(userBasis(e)?'<p class="src">Basis: '+esc(userBasis(e))+'</p>':'')+'<div class="act">'+
    (e.link?'<a class="mini-btn" href="'+esc(e.link.href)+'">'+esc(e.link.label)+'</a>':'')+
    '<a class="mini-btn" href="'+gcal+'" target="_blank" rel="noopener">Add to Google Calendar</a>'+
    '<button type="button" class="mini-btn" data-ics="'+e.id+'">Download this date (.ics)</button>'+(e.custom?'<button type="button" class="mini-btn" data-edit="'+e.cid+'">Edit</button><button type="button" class="mini-btn" data-del="'+e.cid+'">'+(e.rep&&e.rep!=='none'?'Remove all repeats':'Remove')+'</button>':'')+'</div></div></li>';
}

/* ---------- short labels (calendar prints) and weekend notes ---------- */
const SC={'Andaman and Nicobar Islands':'AN','Andhra Pradesh':'AP','Arunachal Pradesh':'AR','Assam':'AS','Bihar':'BR','Chandigarh':'CH','Chhattisgarh':'CG','Dadra and Nagar Haveli and Daman and Diu':'DN','Delhi':'DL','Goa':'GA','Gujarat':'GJ','Haryana':'HR','Himachal Pradesh':'HP','Jammu and Kashmir':'JK','Jharkhand':'JH','Karnataka':'KA','Kerala':'KL','Ladakh':'LA','Lakshadweep':'LD','Madhya Pradesh':'MP','Maharashtra':'MH','Manipur':'MN','Meghalaya':'ML','Mizoram':'MZ','Nagaland':'NL','Odisha':'OD','Puducherry':'PY','Punjab':'PB','Rajasthan':'RJ','Sikkim':'SK','Tamil Nadu':'TN','Telangana':'TS','Tripura':'TR','Uttar Pradesh':'UP','Uttarakhand':'UK','West Bengal':'WB'};
function shortLabel(e){
  const t=e.title.toLowerCase(),ret=/return|statement|form a\b|form 7|annual return|returns/.test(t)&&!/payment and form/.test(t);
  if(e.topic==='mine')return e.title+(e.forWho?' ('+e.forWho+')':'');
  if(e.topic==='epf')return 'PF + ECR';
  if(e.topic==='esi')return 'ESI';
  if(e.topic==='tds')return /form 16|form 130/.test(t)?'Form 16':/deposit/.test(t)?'TDS deposit':/return/.test(t)?'TDS return':'TDS';
  return (e.topic==='pt'?'PT ':'LWF ')+(SC[e.stateId]||e.stateId)+(ret?' rtn':'');
}
const isWE=k=>{const d=parse(k).getDay();return d===0||d===6};
function wkItems(list){                     // statutory dates only; own events are not due dates
  const by={};list.filter(e=>!e.custom&&isWE(e.date)).forEach(e=>{(by[e.date]=by[e.date]||[]).push(shortLabel(e))});
  return Object.keys(by).sort().map(k=>{const d=parse(k);return {k,txt:d.getDate()+' '+MON3[d.getMonth()]+' ('+DOW[d.getDay()]+'): '+[...new Set(by[k])].join(', ')}});
}
const WK_MSG='Complete the payment or filing before the due date to avoid penalty and interest.';
const wkOn=(y,m)=>!(S.wkOff||[]).includes(y+'-'+pad(m+1));
function wkNote(y,m,list){
  const it=wkItems(list);if(!it.length||!wkOn(y,m))return '';
  return '<div class="wkn"><span><b>On a weekend:</b> '+it.map(x=>esc(x.txt)).join('; ')+'. '+WK_MSG+'</span><button type="button" data-wk="'+y+'-'+pad(m+1)+'" aria-label="Hide this note (also hides it in the image and PDF)"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>';
}
const evTitle=e=>e.forWho?e.title+' - '+e.forWho:e.title;
function nextDay(k){const d=parse(k);d.setDate(d.getDate()+1);return key(d.getFullYear(),d.getMonth(),d.getDate())}
function renderMonths(ev){
  const host=$('#months');host.className='months'+(S.view==='list'?' list':'');
  const by={};ev.forEach(e=>{(by[e.date.slice(0,7)]=by[e.date.slice(0,7)]||[]).push(e)});
  // today inside the financial year: months before it are collapsed by default
  const cur=FYM.findIndex(x=>x.y===TODAY.getFullYear()&&x.m===TODAY.getMonth()),pastN=cur>0?cur:0;
  const firstShown=showPast?0:pastN;
  const pb=$('#pastBar');
  pb.innerHTML=(pastN?'<button type="button" class="link" id="pastBtn">'+(showPast?'Hide earlier months':'Show '+pastN+' earlier months ('+MON3[FYM[0].m]+' to '+MON3[FYM[pastN-1].m]+')')+'</button>':'')+((S.wkOff||[]).length?' &nbsp; <button type="button" class="link" id="wkBack">Show hidden weekend notes</button>':'');
  const wb=$('#wkBack');if(wb)wb.addEventListener('click',()=>{S.wkOff=[];save();renderAll()});
  if(pastN)$('#pastBtn').addEventListener('click',()=>{showPast=!showPast;renderMonths(ev)});
  host.innerHTML=FYM.slice(firstShown).map(({y,m})=>{
    const k=y+'-'+pad(m+1),list=by[k]||[],dueDays={};
    list.forEach(e=>{const d=+e.date.slice(8);(dueDays[d]=dueDays[d]||[]).push(e)});
    const first=new Date(y,m,1),lead=(first.getDay()+6)%7,dim=new Date(y,m+1,0).getDate();
    let cells='';['M','T','W','T','F','S','S'].forEach(x=>cells+='<div class="dw">'+x+'</div>');
    for(let i=0;i<lead;i++)cells+='<div class="c blank"></div>';
    for(let d=1;d<=dim;d++){
      const wd=new Date(y,m,d).getDay(),we=wd===0||wd===6,t=key(y,m,d)===todayKey?' today':'';
      if(dueDays[d]){const ds=[...new Set(dueDays[d].map(e=>e.topic))].map(tp=>'<i class="dot '+tp+'"></i>').join('');
        cells+='<button type="button" class="c due'+t+(we?' we':'')+'" data-day="'+key(y,m,d)+'" aria-label="'+d+' '+MONTHS[m]+', '+dueDays[d].length+' due">'+d+'<span class="dots">'+ds+'</span></button>'}
      else cells+='<div class="c'+t+(we?' we':'')+'">'+d+'</div>';
    }
    return '<article class="card m"><div class="m-h"><h3>'+MONTHS[m]+' '+y+'</h3><span>'+(list.length?list.length+(list.length===1?' due':' due'):'')+'</span></div><div class="mini">'+cells+'</div>'+
      (list.length?'<ul class="evs">'+list.map(evRow).join('')+'</ul>':'')+wkNote(y,m,list)+'</article>';
  }).join('');
  host.querySelectorAll('.ev-h').forEach(b=>b.addEventListener('click',()=>{const li=b.parentElement,o=li.dataset.open==='1';li.dataset.open=o?'0':'1';b.setAttribute('aria-expanded',o?'false':'true')}));
  host.querySelectorAll('.mini .due').forEach(b=>b.addEventListener('click',()=>{
    host.querySelectorAll('.ev.flash').forEach(x=>x.classList.remove('flash'));
    const art=b.closest('.m');art.querySelectorAll('.ev[data-date="'+b.dataset.day+'"]').forEach((li,i)=>{li.dataset.open='1';li.querySelector('.ev-h').setAttribute('aria-expanded','true');li.classList.add('flash');if(!i)li.scrollIntoView({block:'nearest',behavior:'smooth'})});
  }));
  host.querySelectorAll('[data-wk]').forEach(b=>b.addEventListener('click',()=>{S.wkOff=[...new Set([...(S.wkOff||[]),b.dataset.wk])];save();renderAll();toast('Note hidden. It is also left out of the image and PDF.')}));
  host.querySelectorAll('[data-edit]').forEach(b=>b.addEventListener('click',()=>openMy(b.dataset.edit)));
  host.querySelectorAll('[data-del]').forEach(b=>b.addEventListener('click',()=>{S.custom=S.custom.filter(c=>c.id!==b.dataset.del);save();renderAll();toast('Event removed')}));
  host.querySelectorAll('[data-ics]').forEach(b=>b.addEventListener('click',()=>{const e=ev.find(x=>x.id===b.dataset.ics);download(toICS([e],S.rem),'payrolltool-'+slug(e.title)+'.ics');toast('Calendar file downloaded');track('tool_download_completed',{format:'ics_single'})}));
}

/* ================= CALENDAR FILE (.ics, RFC 5545) ================= */
function icsEsc(s){return String(s).replace(/\\/g,'\\\\').replace(/;/g,'\\;').replace(/,/g,'\\,').replace(/\r?\n/g,'\\n')}
function fold(line){const out=[];let cur='',bytes=0;for(const ch of line){const b=new TextEncoder().encode(ch).length;if(bytes+b>73){out.push(cur);cur=' '+ch;bytes=1+b}else{cur+=ch;bytes+=b}}out.push(cur);return out.join('\r\n')}
function remDaysOf(r){return r==='c'?Math.max(1,Math.min(60,parseInt(S.remDays,10)||1)):+r}
function trig(n,t){                       // offset from the start of an all-day event (midnight)
  const [h,mi]=String(t||'09:00').split(':').map(Number);let x=(h||0)*60+(mi||0)-n*1440;const neg=x<0;x=Math.abs(x);
  const D=Math.floor(x/1440),H=Math.floor(x%1440/60),M=x%60;
  let out=(neg?'-':'')+'P'+(D?D+'D':'');if(H||M||!D)out+='T'+(H?H+'H':'')+(M||!H?M+'M':'');return out;
}
const remTxt=n=>n===0?'due today':n===1?'due tomorrow':'due in '+n+' days';
function toICS(events,rem){
  const stamp=new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d+/,'');
  const L=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//PayrollTool.in//Compliance Calendar '+FY_LABEL+'//EN','CALSCALE:GREGORIAN','METHOD:PUBLISH','X-WR-CALNAME:Payroll compliance '+FY_LABEL];
  events.forEach(e=>{
    L.push('BEGIN:VEVENT','UID:'+e.topic+'-'+slug(e.stateId)+'-'+e.date.replace(/-/g,'')+'-'+slug(e.title)+'@payrolltool.in','DTSTAMP:'+stamp,
      'DTSTART;VALUE=DATE:'+e.date.replace(/-/g,''),'DTEND;VALUE=DATE:'+nextDay(e.date).replace(/-/g,''),
      'SUMMARY:'+icsEsc(evTitle(e)+(REVIEW&&e.status==='verify'?' (verify date)':'')),
      'DESCRIPTION:'+icsEsc(e.detail+(userBasis(e)?'\nBasis: '+userBasis(e):'')+'\nPayrollTool.in compliance calendar: '+PAGE_URL),
      'CATEGORIES:'+icsEsc(TOPICS[e.topic].label),'TRANSP:TRANSPARENT');
    [...new Set((rem||[]).map(remDaysOf))].forEach(n=>L.push('BEGIN:VALARM','ACTION:DISPLAY','DESCRIPTION:'+icsEsc(evTitle(e)+' - '+remTxt(n)),'TRIGGER:'+trig(n,S.remTime),'END:VALARM'));
    L.push('END:VEVENT');
  });
  L.push('END:VCALENDAR');
  return L.map(fold).join('\r\n')+'\r\n';
}
function download(text,name){const b=new Blob([text],{type:'text/calendar;charset=utf-8'}),a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500)}

/* ---------- scheduler dialog ---------- */
function schedState(){
  const ev=allEvents(),inc=$('#incUnv').checked,incPast=$('#incPast').checked,unv=ev.filter(e=>e.status==='verify');
  const past=ev.filter(e=>e.date<todayKey);                       // already behind us: left out unless asked for
  let use=inc?ev:ev.filter(e=>e.status!=='verify');
  if(!incPast)use=use.filter(e=>e.date>=todayKey);
  const rem=[...document.querySelectorAll('input[name=rem]:checked')].map(i=>i.value);
  return {ev,use,unv,past,incPast,rem};
}
function renderSched(){
  const {use,unv,past,incPast,rem}=schedState();
  $('#unvRow').style.display=unv.length?'':'none';
  $('#pastRow').style.display=past.length?'':'none';
  $('#schedSum').innerHTML='<b>'+use.length+' dates</b> will be added'+(rem.length?', each with '+rem.length+(rem.length===1?' reminder.':' reminders.'):' with no reminders.')+
    (unv.length&&!$('#incUnv').checked?'<div class="skip">'+unv.length+' not-verified dates are left out.</div>':'')+
    (past.length&&!incPast?'<div class="skip">'+past.length+' earlier dates (already passed) are left out.</div>':'');
  $('#schedGo').disabled=!use.length;
}
function openSched(){document.querySelectorAll('input[name=rem]').forEach(i=>i.checked=S.rem.includes(i.value));$('#remTime').value=S.remTime||'09:00';$('#remDays').value=S.remDays||10;renderSched();$('#sched').showModal()}

/* ================= YOUR OWN EVENTS ================= */
function myErr(m){const e=$('#myErr');e.textContent=m;e.hidden=false}
function openMy(id){
  const c=id?S.custom.find(x=>x.id===id):null;
  $('#myId').value=c?c.id:'';$('#myTitleIn').value=c?c.title:'';$('#myDate').value=c?c.date:'';$('#myRep').value=c?c.repeat:'none';$('#myNote').value=c?c.note:'';$('#myFor').value=c?(c.forWho||''):'';
  $('#myHead').textContent=c?'Edit your event':'Add your own event';$('#myErr').hidden=true;$('#myDlg').showModal();
}
function saveMy(){
  const title=$('#myTitleIn').value.trim(),date=$('#myDate').value,repeat=$('#myRep').value,note=$('#myNote').value.trim(),forWho=$('#myFor').value.trim(),id=$('#myId').value;
  if(!title){myErr('Give the event a name.');return}
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)){myErr('Choose a date.');return}
  if(date<FY_START||date>FY_END){myErr('Choose a date between 1 April 2026 and 31 March 2027.');return}
  if(id){Object.assign(S.custom.find(x=>x.id===id),{title,date,repeat,note,forWho})}
  else S.custom.push({id:'c'+Date.now().toString(36)+Math.random().toString(36).slice(2,6),title,date,repeat,note,forWho});
  save();$('#myDlg').close();renderAll();toast(id?'Event updated':'Event added');
}

/* ================= IMAGE (PNG, portrait, next 30 days) ================= */
const TCOL={epf:'#7C3AED',esi:'#0D9488',tds:'#D97706',pt:'#2563EB',lwf:'#DB2777',mine:'#0F766E'};
function downloadBlob(b,name){const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500)}
function rr(c,x,y,w,h,r){c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath()}

/* ---------- wall-calendar drawing, shared by the image and the PDF ---------- */
const SORA='Sora,"DM Sans",system-ui,sans-serif',SANS='"DM Sans",system-ui,sans-serif';
const TORD={tds:0,epf:1,esi:2,pt:3,lwf:4,mine:5};
const sortEv=a=>a.slice().sort((x,y)=>x.date.localeCompare(y.date)||TORD[x.topic]-TORD[y.topic]||x.title.localeCompare(y.title));
function fitTxt(c,t,w){if(c.measureText(t).width<=w)return t;while(t.length>1&&c.measureText(t+'…').width>w)t=t.slice(0,-1);return t+'…'}
function drawGrid(c,o){        // o: x,y,w,yy,mm,list,fs,maxL,minH,fixedH,inWin(key)
  const {x,w,yy,mm,fs}=o,cw=w/7,lead=(new Date(yy,mm,1).getDay()+6)%7,dim=new Date(yy,mm+1,0).getDate(),rows=Math.ceil((lead+dim)/7);
  const by={};o.list.forEach(e=>{const d=+e.date.slice(8);(by[d]=by[d]||[]).push(e)});
  let y=o.y;const dh=fs*1.9;
  c.font='700 '+Math.round(fs*0.95)+'px '+SANS;c.textAlign='center';c.textBaseline='middle';
  ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].forEach((d,i)=>{c.fillStyle=i>4?'#B45309':'#6B6785';c.fillText(d,x+cw*i+cw/2,y+dh/2)});
  y+=dh;c.textBaseline='alphabetic';
  const lineH=fs*1.32,top=fs*1.75,maxIn=r=>{let mx=0;for(let i=0;i<7;i++){const d=r*7+i-lead+1;if(d>=1&&d<=dim)mx=Math.max(mx,(by[d]||[]).length)}return mx};
  let RH=null;
  if(o.totalH){            // printed page: share the height, busy weeks get more room
    const avail=o.totalH-dh,min=Math.max(fs*4,avail/rows*0.55),need=[...Array(rows)].map((_,r)=>Math.max(min,top+maxIn(r)*lineH+fs*0.6));
    const sum=need.reduce((a,b)=>a+b,0);
    if(sum<=avail){const extra=(avail-sum)/rows;RH=need.map(n=>n+extra)}
    else{let lo=min,hi=Math.max(...need);for(let k=0;k<40;k++){const t=(lo+hi)/2;need.reduce((a,n)=>a+Math.min(n,t),0)>avail?hi=t:lo=t}RH=need.map(n=>Math.min(n,lo))}   // busiest weeks give way first
  }
  for(let r=0;r<rows;r++){
    let h=RH?RH[r]:o.fixedH;
    if(!h){let mx=0;for(let i=0;i<7;i++){const d=r*7+i-lead+1;if(d>=1&&d<=dim)mx=Math.max(mx,Math.min((by[d]||[]).length,o.maxL))}h=Math.max(o.minH,top+mx*lineH+fs*0.6)}
    for(let i=0;i<7;i++){
      const d=r*7+i-lead+1,cx=x+cw*i;
      if(d<1||d>dim){c.fillStyle='#FAFAFC';c.fillRect(cx,y,cw,h);c.strokeStyle='#E7E4F0';c.lineWidth=1.5;c.strokeRect(cx,y,cw,h);continue}
      const k=key(yy,mm,d),fade=o.inWin&&!o.inWin(k);
      c.fillStyle=i>4?'#FFF8EE':'#FFFFFF';c.fillRect(cx,y,cw,h);c.strokeStyle='#E7E4F0';c.lineWidth=1.5;c.strokeRect(cx,y,cw,h);
      if(k===todayKey){c.strokeStyle='#7C3AED';c.lineWidth=4;c.strokeRect(cx+2,y+2,cw-4,h-4)}
      c.textAlign='left';c.font='700 '+Math.round(fs*1.05)+'px '+SORA;c.fillStyle=fade?'#C9C5D8':i>4?'#B45309':'#1E1B4B';c.fillText(String(d),cx+fs*0.5,y+fs*1.25);
      if(fade)continue;
      const its=sortEv(by[d]||[]),n=its.length,room=h-top-fs*0.3;
      let f=fs,cols=1;const pr=!!(o.totalH||o.fixedH);
      if(pr&&n*f*1.32>room){f=room/(n*1.32);if(f<fs*0.72){cols=2;f=Math.min(fs*0.85,room/(Math.ceil(n/2)*1.32))}f=Math.max(fs*0.6,f)}
      const lh=f*1.32,per=Math.max(1,Math.floor(room/lh)),cp=per*cols,show=n>cp?cp-1:n,colW=(cw-fs*0.5)/cols;
      c.font='600 '+f.toFixed(1)+'px '+SANS;
      for(let j=0;j<show;j++){const e=its[j],col=Math.floor(j/per),row=j%per,bx=cx+fs*0.3+col*colW,ly=y+top+row*lh+f*0.85;
        c.fillStyle=TCOL[e.topic]||'#7C3AED';c.beginPath();c.arc(bx+f*0.45,ly-f*0.33,f*0.28,0,7);c.fill();
        c.fillStyle='#1E1B4B';c.fillText(fitTxt(c,shortLabel(e),colW-f*1.3),bx+f*0.95,ly)}
      if(n>show){const col=Math.floor(show/per),row=show%per;c.fillStyle='#5B21B6';c.font='700 '+(f*0.92).toFixed(1)+'px '+SANS;c.fillText('+'+(n-show)+' more',cx+fs*0.3+col*colW+f*0.95,y+top+row*lh+f*0.85)}
    }
    y+=h;
  }
  return y;
}
function legendTxt(list){
  const st=[...new Set(list.filter(e=>e.topic==='pt'||e.topic==='lwf').map(e=>e.stateId))].sort();
  const parts=[];if(list.some(e=>e.topic==='pt'))parts.push('PT = Professional Tax');if(list.some(e=>e.topic==='lwf'))parts.push('LWF = Labour Welfare Fund');
  if(list.some(e=>e.topic==='epf'))parts.push('PF + ECR = EPF contribution and ECR');if(list.some(e=>/ rtn$/.test(shortLabel(e))))parts.push('rtn = return or statement');
  st.forEach(x=>parts.push((SC[x]||x)+' '+x));return parts.join('  ·  ');
}
function wrapAll(c,t,w){const out=[];let cur='';t.split(/\s+/).forEach(wd=>{const tt=cur?cur+' '+wd:wd;if(c.measureText(tt).width<=w||!cur)cur=tt;else{out.push(cur);cur=wd}});if(cur)out.push(cur);return out}
function drawNoteBox(c,x,y,w,txt,fs,bg,fg){
  c.font='600 '+fs+'px '+SANS;const L=wrapAll(c,txt,w-fs*1.6),h=L.length*fs*1.4+fs*1.1;
  c.fillStyle=bg;rr(c,x,y,w,h,fs*0.6);c.fill();c.fillStyle=fg;c.textAlign='left';L.forEach((l,i)=>c.fillText(l,x+fs*0.8,y+fs*1.35+i*fs*1.4));return y+h;
}
const wkText=(list,y,m)=>{if(!wkOn(y,m))return '';const it=wkItems(list);return it.length?'On a weekend: '+it.map(x=>x.txt).join('; ')+'. '+WK_MSG:''};

/* ================= IMAGE (PNG, portrait, calendar of the next 30 days) ================= */
async function makeImage(){
  const end=new Date(TODAY);end.setDate(end.getDate()+30);const endKey=key(end.getFullYear(),end.getMonth(),end.getDate());
  const all=allEvents().filter(e=>e.status!=='verify'||REVIEW),win=all.filter(e=>e.date>=todayKey&&e.date<=endKey);
  if(!win.length){toast('Nothing due in the next 30 days');return}
  if(document.fonts&&document.fonts.ready){try{await document.fonts.ready}catch(e){}}
  const months=[];for(let d=new Date(TODAY.getFullYear(),TODAY.getMonth(),1);key(d.getFullYear(),d.getMonth(),1)<=endKey;d.setMonth(d.getMonth()+1))months.push({y:d.getFullYear(),m:d.getMonth()});
  const W=1080,inWin=k=>k>=todayKey&&k<=endKey;
  const paint=(c,dry)=>{
    let y=0;
    if(!dry){const g=c.createLinearGradient(0,0,W,200);g.addColorStop(0,'#7C3AED');g.addColorStop(1,'#5B21B6');c.fillStyle='#F4F1FB';c.fillRect(0,0,W,c.canvas.height);c.fillStyle=g;c.fillRect(0,0,W,200);
      c.fillStyle='#fff';c.textAlign='left';c.font='700 30px '+SORA;c.fillText('PayrollTool.in',50,70);c.font='700 52px '+SORA;c.fillText('Compliance calendar',50,135);
      c.globalAlpha=.88;c.font='500 26px '+SANS;c.fillText('Next 30 days · '+fmtLong(todayKey)+' to '+fmtLong(endKey),50,178);c.globalAlpha=1}
    y=230;
    months.forEach(({y:yy,m:mm})=>{
      const list=win.filter(e=>e.date.slice(0,7)===yy+'-'+pad(mm+1));
      c.fillStyle='#1E1B4B';c.textAlign='left';c.font='700 34px '+SORA;if(!dry)c.fillText(MONTHS[mm]+' '+yy,50,y+30);y+=50;
      y=dry?drawGrid(mock,{x:40,y,w:W-80,yy,mm,list,fs:15.5,maxL:7,minH:70,inWin}):drawGrid(c,{x:40,y,w:W-80,yy,mm,list,fs:15.5,maxL:7,minH:70,inWin});
      const wt=wkText(list,yy,mm);if(wt)y=(dry?drawNoteBox(mock,40,y+16,W-80,wt,19,'#FEF3C7','#92400E'):drawNoteBox(c,40,y+16,W-80,wt,19,'#FEF3C7','#92400E'));
      y+=30;
    });
    const lg=legendTxt(win);c.font='500 18px '+SANS;const L=wrapAll(c,lg,W-100);
    if(!dry){c.fillStyle='#6B6785';c.textAlign='left';L.forEach((l,i)=>c.fillText(l,50,y+10+i*26))}
    y+=L.length*26+30;
    if(!dry){c.fillStyle='#5B21B6';c.font='700 21px '+SORA;c.fillText('payrolltool.in · '+FY_LABEL+' compliance calendar',50,y+10)}
    return y+50;
  };
  const mc=document.createElement('canvas');mc.width=W;mc.height=100;const mock=mc.getContext('2d');
  const H=Math.ceil(paint(mock,true));
  const cv=document.createElement('canvas');cv.width=W;cv.height=H;paint(cv.getContext('2d'),false);
  cv.toBlob(b=>{if(b){downloadBlob(b,'payrolltool-calendar-next-30-days.png');toast('Image downloaded');track('tool_download_completed',{format:'png'})}else toast('Could not make the image on this device')},'image/png');
}

/* ================= PDF (wall calendar, A4 landscape, one month per page) ================= */
function loadJsPDF(){return import('jspdf').then(m=>m.jsPDF)}
function drawPage(c,W,H,yy,mm,list){
  c.fillStyle='#FFFFFF';c.fillRect(0,0,W,H);
  c.fillStyle='#7C3AED';c.fillRect(0,0,W,14);
  c.textAlign='left';c.fillStyle='#1E1B4B';c.font='700 64px '+SORA;c.fillText(MONTHS[mm]+' '+yy,60,108);
  c.textAlign='right';c.fillStyle='#5B21B6';c.font='700 26px '+SORA;c.fillText('PayrollTool.in',W-60,70);
  c.fillStyle='#6B6785';c.font='500 22px '+SANS;c.fillText('Payroll compliance calendar '+FY_LABEL,W-60,104);
  const wt=wkText(list,yy,mm),lg=legendTxt(list);
  c.font='600 19px '+SANS;const wl=wt?wrapAll(c,wt,W-120-30).length:0;c.font='500 18px '+SANS;const ll=lg?wrapAll(c,lg,W-120).length:0;
  const foot=(wt?wl*26.6+24+16:0)+(ll?ll*25+10:0)+60;
  const gy=140,fs=20;
  let y=drawGrid(c,{x:60,y:gy,w:W-120,yy,mm,list,fs,maxL:99,totalH:H-gy-foot-10});
  y+=16;
  if(wt)y=drawNoteBox(c,60,y,W-120,wt,19,'#FEF3C7','#92400E')+14;
  if(lg){c.font='500 18px '+SANS;c.fillStyle='#6B6785';c.textAlign='left';wrapAll(c,lg,W-120).forEach((l,i)=>c.fillText(l,60,y+18+i*25));y+=ll*25+8}
  c.font='500 16px '+SANS;c.fillStyle='#8A86A0';c.textAlign='left';
  c.fillText('Due dates are general rules and can change by notification, extension or holiday. This is information, not legal or tax advice.',60,H-30);
  c.textAlign='right';c.fillText('payrolltool.in',W-60,H-30);
}
async function makePDF(){
  const btn=$('#pdfBtn');btn.disabled=true;toast('Making your calendar…');
  try{
    const J=await loadJsPDF();
    if(document.fonts&&document.fonts.ready){try{await document.fonts.ready}catch(e){}}
    const ev=allEvents().filter(e=>e.status!=='verify'||REVIEW),W=1754,H=1240;
    const doc=new J({orientation:'landscape',unit:'mm',format:'a4',compress:true});
    const cv=document.createElement('canvas');cv.width=W;cv.height=H;const c=cv.getContext('2d');
    FYM.forEach(({y,m},i)=>{
      const list=ev.filter(e=>e.date.slice(0,7)===y+'-'+pad(m+1));
      drawPage(c,W,H,y,m,list);
      if(i)doc.addPage('a4','landscape');
      doc.addImage(cv.toDataURL('image/jpeg',0.92),'JPEG',0,0,297,210,undefined,'FAST');
    });
    doc.setProperties({title:'Payroll compliance calendar '+FY_LABEL,creator:'PayrollTool.in'});
    doc.save('scheduler 2026-27.pdf');toast('PDF downloaded');track('tool_download_completed',{format:'pdf'});
  }catch(e){toast('Could not make the PDF. Check your connection and try again.')}
  finally{btn.disabled=false}
}

/* ================= WIRING ================= */
function renderAll(){const ev=allEvents();renderChips();renderSummary(ev);renderMonths(ev);
  $('#vCal').setAttribute('aria-pressed',S.view!=='list');$('#vList').setAttribute('aria-pressed',S.view==='list')}
function init(){
  if(!S.view)S.view=window.innerWidth<760?'list':'calendar';
  renderStates();renderStateBtn();renderTopicPanel();renderTopicBtn();renderAll();
  $('#topicBtn').addEventListener('click',e=>{e.stopPropagation();setStPanel(false);setPanel($('#topicPanel').hidden)});
  onDoc('click',e=>{if(!$('#topicDD').contains(e.target))setPanel(false);if(!$('#stateDD').contains(e.target))setStPanel(false)});
  onDoc('keydown',e=>{if(e.key==='Escape'){setPanel(false);setStPanel(false)}});
  $('#topicBtn').addEventListener('click',()=>setTimeout(()=>{if(!$('#topicPanel').hidden&&window.innerWidth>=760)$('#tpQ').focus()},0));
  $('#stateBtn').addEventListener('click',()=>setTimeout(()=>{if(!$('#statePanel').hidden&&window.innerWidth>=760)$('#stQ').focus()},0));
  $('#addBtn').addEventListener('click',onAdd);
  $('#stateBtn').addEventListener('click',e=>{e.stopPropagation();setPanel(false);setStPanel($('#statePanel').hidden)});
  $('#vCal').addEventListener('click',()=>{S.view='calendar';save();renderAll()});
  $('#vList').addEventListener('click',()=>{S.view='list';save();renderAll()});
  $('#schedBtn').addEventListener('click',openSched);
  $('#myBtn').addEventListener('click',()=>openMy());
  $('#myCancel').addEventListener('click',()=>$('#myDlg').close());
  $('#mySave').addEventListener('click',saveMy);
  $('#myTitleIn').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();saveMy()}});
  $('#myDlg').addEventListener('click',e=>{if(e.target===$('#myDlg'))$('#myDlg').close()});
  $('#imgBtn').addEventListener('click',makeImage);
  $('#pdfBtn').addEventListener('click',makePDF);
  $('#schedCancel').addEventListener('click',()=>$('#sched').close());
  $('#sched').addEventListener('click',e=>{if(e.target===$('#sched'))$('#sched').close()});
  document.querySelectorAll('input[name=rem],#incUnv,#incPast').forEach(i=>i.addEventListener('change',renderSched));
  $('#remTime').addEventListener('change',()=>{S.remTime=$('#remTime').value||'09:00';save()});
  $('#remDays').addEventListener('input',()=>{S.remDays=$('#remDays').value;$('#remC').checked=true;renderSched()});
  $('#schedGo').addEventListener('click',()=>{const {use,rem}=schedState();S.rem=rem;S.remTime=$('#remTime').value||'09:00';S.remDays=$('#remDays').value;save();download(toICS(use,rem),'payrolltool-compliance-FY2026-27.ics');track('tool_download_completed',{format:'ics',dates:use.length});$('#sched').close();toast(use.length+' dates downloaded')});
}

init();
return ()=>docHandlers.forEach(([t,f])=>document.removeEventListener(t,f));
}
