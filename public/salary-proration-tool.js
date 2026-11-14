pdfjsLib.GlobalWorkerOptions=pdfjsLib.GlobalWorkerOptions||{};
pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// ══ STATE ══
let regime='new', rows=[], rid=0, calcDone=false;
// ── EPF wage ceiling, effective-dated ──────────────────────────────────────
// Rs 15,000 up to 16 Sep 2026; Rs 25,000 from 17 Sep 2026 (MoLE S.O. 5109(E) of 17 Sep 2026,
// which supersedes S.O. 2702(E) of 29 May 2026). September 2026 uses both ceilings for a full month:
// 1-16 Sep on 15,000 and 17-30 Sep on 25,000 = 8,000 + 11,667 = 19,667 (EPFO FAQ on the revision).
const EPF_CEILING_OLD=15000, EPF_CEILING_NEW=25000;
const EPF_WAGE_CEILING=EPF_CEILING_OLD; // legacy name: the ceiling before 17 Sep 2026
function epfWageCap(yymm){ // PF wage cap for a full wage month; yymm like 202610
  if(!yymm||yymm<202609) return EPF_CEILING_OLD;
  if(yymm===202609) return Math.round(EPF_CEILING_OLD*16/30+EPF_CEILING_NEW*14/30);
  return EPF_CEILING_NEW;
}
function epfCapPF(yymm){ return Math.round(epfWageCap(yymm)*0.12); } // 12% of the cap: 1,800 / 2,360 / 3,000
function addMonthsYY(y,n){ let yr=Math.floor(y/100), m=(y%100)-1+n; yr+=Math.floor(m/12); m=((m%12)+12)%12; return yr*100+m+1; }
function proYYMMNow(){ const el=window.__spRoot&&window.__spRoot.getElementById('proMonth'); const p=((el&&el.value)||'').split('-'); return p.length===2?(parseInt(p[0],10)*100+parseInt(p[1],10)):0; }
function monthLabelYY(y){ return new Date(Math.floor(y/100),(y%100)-1,1).toLocaleString('en-IN',{month:'long',year:'numeric'}); }
// PF for one wage month in capped mode follows that month's ceiling; every other mode is a fixed monthly figure
function pfMonthAmt(pfRes,yymm){
  if(!pfRes||pfRes.pfMode!=='capped') return {emp:pfRes?pfRes.empPF_monthly:0, er:pfRes?pfRes.erPF_monthly:0};
  const cap=epfCapPF(yymm), v=pfRes.vpf||0;
  const x=Math.min(R((pfRes.wagesM||0)*0.12),cap);
  return {emp:x+v, er:x};
}
function pfSeries(pfRes,startYY,n){ // totals for the n wage months AFTER startYY
  let y=startYY, emp=0, er=0;
  for(let i=0;i<n;i++){ y=addMonthsYY(y,1); const a=pfMonthAmt(pfRes,y); emp+=a.emp; er+=a.er; }
  return {emp,er};
}

// ══════════════════════════════════════════════════════
// PT RULES - aligned with the state rows published on /updates (Professional Tax).
// bands: [upper limit (inclusive), amount]. Monthly states use monthly salary; annual and
// half-yearly states use the income of that period and show the liability, not a monthly deduction.
// ══════════════════════════════════════════════════════
const INF=Infinity;
const PT_RULES = {
  AP:{cycle:'monthly',bands:[[15000,0],[20000,150],[INF,200]]},
  AS:{cycle:'monthly',bands:[[15000,0],[24999,180],[INF,208]]},   // Rs. 25,000 is in the Rs. 208 slab
  GJ:{cycle:'monthly',bands:[[12000,0],[INF,200]]},
  KA:{cycle:'monthly',bands:[[24999,0],[INF,200]],feb300:true},
  MP:{cycle:'monthly',bands:[[18750,0],[25000,125],[33333,166],[INF,208]],lastMonth:{166:174,208:212}},
  MH:{cycle:'monthly',bands:[[7500,0],[10000,175],[INF,200]],women:[[25000,0],[INF,200]],feb300:true},
  MZ:{cycle:'monthly',bands:[[5000,0],[8000,75],[10000,120],[12000,150],[15000,180],[20000,195],[INF,208]]},
  NL:{cycle:'monthly',bands:[[3999,0],[4999,35],[6999,75],[8999,110],[11999,180],[INF,208]]},   // below Rs. 4,000 nil; Rs. 12,000 and above Rs. 208
  SK:{cycle:'monthly',bands:[[20000,0],[30000,125],[40000,150],[INF,200]]},
  TG:{cycle:'monthly',bands:[[15000,0],[20000,150],[INF,200]]},
  TR:{cycle:'monthly',bands:[[7500,0],[15000,150],[INF,208]]},
  WB:{cycle:'monthly',bands:[[20000,0],[30000,100],[50000,140],[100000,170],[INF,208]]},
  PB:{cycle:'monthly',punjab:true}, // Rs. 200 a month above the income-tax basic exemption of the chosen regime (Rs. 2,50,000 old, Rs. 4,00,000 new)
  // Bihar Rules 5 and 6: deducted from the September salary, paid by 15 November; liable after September: February salary, paid by 15 April
  BR:{cycle:'annual',bands:[[300000,0],[500000,1000],[1000000,2000],[INF,2500]],due:'from the September salary by 15 November (joiners after September: from the February salary, by 15 April)',deduct:[9],lateDeduct:2},
  JH:{cycle:'annual',bands:[[300000,0],[500000,1200],[800000,1800],[1000000,2100],[INF,2500]],due:'quarterly online in Form JPT-03'},
  MN:{cycle:'annual',bands:[[50000,0],[75000,1200],[100000,2000],[125000,2400],[INF,2500]],due:'by 30 March',deduct:[3]},
  ML:{cycle:'annual',bands:[[180000,0],[300000,500],[500000,1000],[750000,1500],[INF,2500]],due:'by the 28th of every month'},
  // Kerala: liable only when employed 60 days or more in the half-year (Kerala Panchayat Raj Act, s.204; Municipality Act likewise)
  KL:{cycle:'halfyearly',bands:[[11999,0],[17999,320],[29999,450],[44999,600],[99999,750],[124999,1000],[INF,1250]],due:'from the August salary (April to September) and the February salary (October to March)',deduct:[8,2],minDays:60},
  PY:{cycle:'halfyearly',bands:[[99999,0],[200000,250],[300000,500],[400000,750],[500000,1000],[INF,1250]],due:'each half-year, on the municipality\'s requisition',deduct:[7,1]},
  TN:{cycle:'halfyearly',bands:[[21000,0],[30000,180],[45000,425],[60000,930],[75000,1025],[INF,1250]],due:'by 30 September and 31 March',deduct:[9,3]},
};
// Every other state and union territory levies no professional tax.

// ══════════════════════════════════════════════════════
// LWF DATA - read-only, backend-managed
// emp/er = flat Rs.  per applicable period
// freq: 'monthly'|'halfyearly'|'annual'|'nil'
// Haryana: revised to emp=35, er=70 w.e.f. 1 Jan 2026
//   (HLWB/REV/2026/3436 dated 08 May 2026; previously 34/68)
// LWF is deducted on THIS MONTH'S prorated earnings (change #3)
// ══════════════════════════════════════════════════════
const LWF_DATA = {
  // Aligned with the state rows published on /updates (Labour Welfare Fund). Amounts per deduction.
  AP:{emp:30,er:70,freq:'annual',months:[12]},
  CH:{emp:5,er:20,freq:'monthly'},
  CG:{emp:15,er:45,freq:'halfyearly',months:[6,12]},
  DL:{emp:4.5,er:13.5,freq:'halfyearly',months:[6,12]},   // Rs. 0.75 and Rs. 2.25 a month, deducted for six months at a time
  GA:{emp:60,er:180,freq:'halfyearly',months:[6,12]},
  GJ:{emp:6,er:12,freq:'halfyearly',months:[6,12]},
  HR:{emp:35,er:70,freq:'monthly',pct:0.002},             // 0.2% of wages, up to Rs. 35; employer twice the employee share
  KA:{emp:50,er:100,freq:'annual',months:[12]},
  KL:{emp:50,er:50,freq:'monthly'},
  MP:{emp:10,er:50,freq:'halfyearly',months:[6,12]},
  MH:{emp:25,er:75,freq:'halfyearly',months:[6,12]},
  OR:{emp:10,er:20,freq:'halfyearly',months:[6,12]},
  PB:{emp:5,er:20,freq:'monthly'},
  TN:{emp:20,er:40,freq:'annual',months:[12]},
  TG:{emp:2,er:5,freq:'annual',months:[12]},
  WB:{emp:3,er:30,freq:'halfyearly',months:[6,12]},
};

// ══ CARD COLLAPSE ══
function toggleCard(id,btnId){
  const card=window.__spRoot.getElementById(id),btn=window.__spRoot.getElementById(btnId);
  const c=card.classList.toggle('collapsed');
  btn.textContent=c?'▶ Expand':'▼ Collapse';
}
function showToggles(){window.__spRoot.querySelectorAll('.card-toggle').forEach(b=>b.style.display='inline-flex');}

// ══ INIT ══
// Called explicitly by the host page on every mount (first load or SPA
// client-side re-navigation) instead of DOMContentLoaded, since this
// script is injected into an already-parsed document and that event
// will never fire again after the first page load.
window.__spInitTool=function(){
  regime='new';rows=[];rid=0;calcDone=false;
  const n=new Date();
  window.__spRoot.getElementById('proMonth').value=`${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}`;
  addRow('Basic Salary','','fixed');
  addRow('HRA','','fixed');
  addRow('Special Allowance','','fixed');
};

// ══ PDF EXTRACTION ══
function onDrop(e){e.preventDefault();window.__spRoot.getElementById('dz').classList.remove('over');if(e.dataTransfer.files[0])onFile(e.dataTransfer.files[0]);}
async function onFile(file){
  if(!file||file.type!=='application/pdf'){showMsg('err','Please upload a valid PDF.');return;}
  const pill=window.__spRoot.getElementById('filePill');
  pill.innerHTML=`<div class="file-pill"><span>📄</span><span class="file-pill-name">${file.name}</span><button class="file-pill-rm" onclick="resetUpload()">×</button></div>`;
  pill.style.display='block';showMsg('load','Reading PDF…');
  try{const tokens=await getPDFTokens(file);doExtract(tokens);}
  catch(e){showMsg('err','Error reading PDF: '+e.message);}
}
async function getPDFTokens(file){
  const buf=await file.arrayBuffer();
  const pdf=await pdfjsLib.getDocument({data:buf}).promise;
  const tokens=[];
  for(let p=1;p<=pdf.numPages;p++){
    const pg=await pdf.getPage(p);const vp=pg.getViewport({scale:1});
    const ct=await pg.getTextContent({normalizeWhitespace:true});
    ct.items.forEach(it=>{const s=(it.str||'').replace(/\s+/g,' ').trim();if(!s)return;tokens.push({s,x:Math.round(it.transform[4]),y:Math.round(vp.height-it.transform[5])});});
  }
  return tokens;
}
function bucketRows(tokens){
  const sorted=[...tokens].sort((a,b)=>a.y-b.y||a.x-b.x);const groups=[];
  for(const t of sorted){const g=groups.find(g=>Math.abs(g.y-t.y)<=5);if(g)g.items.push(t);else groups.push({y:t.y,items:[t]});}
  groups.forEach(g=>g.items.sort((a,b)=>a.x-b.x));return groups;
}
function isAmt(s){return /^[\d,]+(\.\d+)?$/.test(s.replace(/\s/g,''))&&!/[A-Za-z]/.test(s);}
function parseA(s){return parseFloat(s.replace(/,/g,''));}
const SKIP=new Set(['total','gross','ctc','cost to company','sub total','subtotal','grand total','annual','per annum','per year','monthly','comments','particulars','title','salary sheet','salary structure','fixed salary','retiral','retirement benefits','retiral benefits','variable','note','notes','annexure','ref','name','designation','department','date of joining','grade','performance','amount','inr','rs','rs.','a.','b.','c.','d.','earnings','deductions','benefits','compensation','emoluments','fixed compensation','total fixed','total fixed compensation','total variable','total reimbursements','gross salary','gross earnings','ctc( a + b )','ctc(a + b)','total ctc','retirement benefit']);
function isSkip(s){const l=s.toLowerCase().trim();if(SKIP.has(l))return true;if(l.length<=1)return true;if(/^[\d\s\.,\-\*\(\)]+$/.test(l))return true;if(/^(a|b|c|d)\s*[\.\)]/.test(l))return true;return false;}
function isGrat(s){return /gratuity/i.test(s);}
// PF rows - also try to extract EPF amount for the input boxes
function isPFRow(s){return /provident\s*fund|employer.*pf|employee.*pf|\bepf\b|\bpf\b/i.test(s);}
function isESI(s){return /\besi\b|employee.*state.*insurance/i.test(s);}
function isInsurance(s){return /\binsurance\b/i.test(s)&&!/allowance/i.test(s);}
function isReimb(s){return /reimb|reimbursement/i.test(s);}

function doExtract(tokens){
  rows=[];rid=0;
  const groups=bucketRows(tokens);const candidates=[];const pfCandidates=[];const seen=new Set();
  for(const g of groups){
    const textP=g.items.filter(it=>/[A-Za-z]{2,}/.test(it.s)&&!isAmt(it.s));
    const numP=g.items.filter(it=>isAmt(it.s)&&parseA(it.s)>0);
    if(!textP.length||!numP.length)continue;
    const label=textP.map(t=>t.s).join(' ').replace(/\s+/g,' ').trim();
    if(label.length<3)continue;
    numP.sort((a,b)=>a.x-b.x);let amt=null;
    for(const ni of numP){const v=parseA(ni.s);if(v>=100&&v<9999999){amt=v;break;}}
    if(!amt)continue;
    const key=label.toLowerCase();
    // Capture PF rows separately to populate EPF input boxes
    if(isPFRow(label)){
      if(!seen.has(key)){seen.add(key);pfCandidates.push({name:label,amount:amt});}
      continue;
    }
    if(isSkip(label))continue;
    if(!seen.has(key)){seen.add(key);candidates.push({name:label,amount:amt});}
  }
  // Fallback regex extraction
  if(candidates.length<2){
    const flat=tokens.map(t=>t.s).join(' ');
    [['Basic',/Basic[\s\S]{0,80}?([\d,]{4,})/i],['HRA',/\bHRA\b[\s\S]{0,80}?([\d,]{4,})/i],['Special Allowance',/Special\s+Allowance[\s\S]{0,80}?([\d,]{4,})/i],['Transport Allowance',/Transport(?:ation)?\s*(?:Allowance)?[\s\S]{0,60}?([\d,]{4,})/i],['Medical Reimbursement',/Medical\s+Reimb[\s\S]{0,60}?([\d,]{4,})/i],['Statutory Bonus',/Statutory\s+Bonus[\s\S]{0,60}?([\d,]{4,})/i],['Conveyance',/Conveyance[\s\S]{0,60}?([\d,]{4,})/i],['Other Allowance',/Other\s+Allowance[\s\S]{0,60}?([\d,]{4,})/i],['Internet Reimbursement',/Internet\s+Reimb[\s\S]{0,60}?([\d,]{4,})/i],['Telephone Reimbursement',/Telephone\s+Reimb[\s\S]{0,60}?([\d,]{4,})/i]].forEach(([name,pat])=>{
      const key=name.toLowerCase();if(seen.has(key))return;
      const m=flat.match(pat);if(m){const v=parseA(m[1]);if(!isNaN(v)&&v>=100){seen.add(key);candidates.push({name,amount:v});}}
    });
    // Fallback PF extraction
    const pfMatch=flat.match(/(?:employee\s+)?(?:epf|provident\s+fund|pf)[\s\S]{0,60}?([\d,]{3,})/i);
    if(pfMatch&&!pfCandidates.length){const v=parseA(pfMatch[1]);if(!isNaN(v)&&v>=100)pfCandidates.push({name:'EPF',amount:v});}
  }
  // Populate EPF input boxes from extracted PF rows
  const empPFRow=pfCandidates.find(p=>/employee|emp\b/i.test(p.name));
  const erPFRow=pfCandidates.find(p=>/employer|er\b/i.test(p.name));
  if(empPFRow)window.__spRoot.getElementById('empPFInput').value=Math.round(empPFRow.amount);
  else if(pfCandidates.length>0)window.__spRoot.getElementById('empPFInput').value=Math.round(pfCandidates[0].amount);
  // erPFInput is now readonly (mirrors empPFInput) - no need to set from PDF

  const filtered=candidates.filter(c=>!isGrat(c.name)&&!isPFRow(c.name)&&!isESI(c.name)&&!isInsurance(c.name));
  window.__spRoot.getElementById('extractErr').style.display='none';
  if(!filtered.length){
    showMsg('err','Could not auto-extract pay heads. PDF may be scanned. Please enter manually.');
    addRow('Basic Salary','','fixed');addRow('HRA','','fixed');addRow('Special Allowance','','fixed');
  } else {
    filtered.forEach(c=>addRow(c.name,String(Math.round(c.amount)),isReimb(c.name)?'variable':'fixed'));
    const pfMsg=pfCandidates.length?` EPF amounts prefilled.`:'';
    showMsg('ok',`Extracted ${filtered.length} pay head${filtered.length>1?'s':''}.${pfMsg} Verify EPF fields in Step 4.`);
  }
  renderRows();onStateChange();updatePreviews();
}
function resetUpload(){
  window.__spRoot.getElementById('fi').value='';
  window.__spRoot.getElementById('filePill').style.display='none';
  window.__spRoot.getElementById('extractMsg').style.display='none';
  window.__spRoot.getElementById('extractErr').style.display='none';
  window.__spRoot.getElementById('empPFInput').value=''; // erPFInput is readonly, clears automatically
  rows=[];rid=0;
  addRow('Basic Salary','','fixed');addRow('HRA','','fixed');addRow('Special Allowance','','fixed');
  renderRows(); // explicit render after reset (#17)
}
function showMsg(type,html){
  const el=window.__spRoot.getElementById('extractMsg');
  const cls={load:'notice',ok:'ok',err:'err',warn:'warn'}[type]||'notice';
  const ico={load:'<div class="loader"></div>',ok:'✓',err:'⚠',warn:'⚠'}[type]||'ℹ';
  el.innerHTML=`<div class="${cls}" style="margin-bottom:0"><span>${ico}</span><div>${html}</div></div>`;
  el.style.display='block';
}

// ══ PAY HEADS ══
function addRow(name='',amount='',cat='fixed'){rows.push({id:++rid,name,amount,cat});renderRows();}
function updRow(id,f,v){const r=rows.find(r=>r.id===id);if(r)r[f]=v;updatePreviews();}
function delRow(id){rows=rows.filter(r=>r.id!==id);renderRows();updatePreviews();}
function setCat(id,cat){
  const r=rows.find(r=>r.id===id);if(r)r.cat=cat;
  const row=window.__spRoot.querySelector(`.ph-row[data-id="${id}"]`);
  if(row){
    row.querySelector('.cat-btn-f').className='cat-btn cat-btn-f'+(cat==='fixed'?' active-f':'');
    row.querySelector('.cat-btn-v').className='cat-btn cat-btn-v'+(cat==='variable'?' active-v':'');
  }
  updatePreviews();
}
function renderRows(){
  const ul=window.__spRoot.getElementById('phList');
  if(!rows.length){ul.innerHTML='<div style="text-align:center;padding:14px;font-size:.78rem;color:var(--ts)">No pay heads. Add one above.</div>';return;}
  ul.innerHTML='';
  rows.forEach(r=>{
    const d=document.createElement('div');
    d.className='ph-row';d.dataset.id=r.id;
    const cat=r.cat||'fixed';
    d.innerHTML=`
      <input class="ph-name" type="text" placeholder="Pay head name" value="${eH(r.name)}" oninput="updRow(${r.id},'name',this.value)"/>
      <input class="ph-amt" type="number" min="0" placeholder="0" value="${r.amount}" oninput="updRow(${r.id},'amount',this.value)"/>
      <div class="cat-toggle">
        <button class="cat-btn cat-btn-f${cat==='fixed'?' active-f':''}" onclick="setCat(${r.id},'fixed')">Fixed</button>
        <button class="cat-btn cat-btn-v${cat==='variable'?' active-v':''}" onclick="setCat(${r.id},'variable')">Var</button>
      </div>
      <button class="ph-del" onclick="delRow(${r.id})">✕</button>`;
    ul.appendChild(d);
  });
}
function eH(s){return(s||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}

// ══ HELPERS ══
function getBasic(){const r=rows.find(r=>/basic/i.test(r.name));return r?R(parseFloat(r.amount)||0):0;}
function getHRA(){const r=rows.find(r=>/\bhra\b/i.test(r.name));return r?R(parseFloat(r.amount)||0):0;}
function getGross(){return R(rows.reduce((s,r)=>s+(parseFloat(r.amount)||0),0));}
function getReimbs(){return R(rows.filter(r=>r.cat==='variable').reduce((s,r)=>s+(parseFloat(r.amount)||0),0));}
function R(n){return Math.round(n);}
function fmt(n){return R(n).toLocaleString('en-IN');}

// ══════════════════════════════════════════════════════════════
// PF LOGIC - 3 rules based on what was entered in the letter
//
// Rule A: Entered ≈ 12% of Basic (within Rs. 5)
//   Monthly  = 12% × Basic  (full month)
//   ThisMonth= 12% × (Basic × payable/calDays)
//
// Rule B: Entered = 1800 AND Basic > Rs. 15,000
//   Monthly  = Rs. 1,800  (cap: statutory 12% of Rs. 15k ceiling)
//   ThisMonth= Rs. 1,800 × payable/calDays
//   Sub-rule: if Basic ≤ Rs. 15,000 → 12% × (gross−HRA−var) prorated
//
// Rule C: Entered = 0 → pfMode='none', row not shown
//
// VPF = vpfPct% × Basic  (voluntary, capped at 88% OR 12% of Basic, whichever is lower)
// ══════════════════════════════════════════════════════════════
// Wages under the Labour Codes (Code on Wages s.2(y), the same definition in the Code on Social Security):
// all pay except the excluded items (HRA, conveyance and travel, bonus, overtime, commission, incentives,
// reimbursements, employer NPS); if the excluded items exceed half of total pay, the excess counts as wages.
const PF_EXCLUDED=/\bhra\b|house\s*rent|conveyance|transport|\blta\b|leave\s*travel|travel|bonus|overtime|\bot\b|commission|incentive|gratuity|retrench/i;
function codeWages(scale,npsMonthly){
  let total=0,excl=0;
  rows.forEach(r=>{const a=(parseFloat(r.amount)||0)*scale;if(!(a>0))return;total+=a;if(r.cat==='variable'||PF_EXCLUDED.test(r.name||''))excl+=a;});
  const nps=(npsMonthly||0)*scale; excl+=Math.min(nps,Math.max(0,total-excl));
  const wages=total-excl+Math.max(0,excl-total/2);
  return R(wages);
}
function calcPF(vpfPct, _calDays, _payable, npsMonthly){
  const basic=getBasic();
  // VPF: employee PF plus VPF can reach 100% of Basic, so VPF can go up to 88%
  const effectiveVpfPct=Math.min(Math.max(vpfPct||0,0),88);
  const vpf=R(basic*effectiveVpfPct/100);
  const vpfThisMonth=R(R(basic*_payable/_calDays)*effectiveVpfPct/100);
  const entered=R(parseFloat(window.__spRoot.getElementById('empPFInput').value)||0);
  window.__spRoot.getElementById('erPFInput').value=entered?'Rs. '+entered.toLocaleString('en-IN')+'/mo':'';

  // PF not opted
  if(entered===0&&vpf===0){
    window.__spRoot.getElementById('erPFInput').value='Nil';
    return{empPF_monthly:0,empPF_thisMonth:0,erPF_monthly:0,erPF_thisMonth:0,vpf:0,vpfThisMonth:0,pfMode:'none',pfCapApplies:false,pfNote:'',wagesM:0,wagesP:0};
  }
  const wagesM=codeWages(1,npsMonthly);
  const wagesP=codeWages(_payable/_calDays,npsMonthly);
  const proYY=proYYMMNow();
  const ceilW=epfWageCap(proYY), capPF=epfCapPF(proYY);
  const f=(n)=>'Rs. '+n.toLocaleString('en-IN');
  // The letter shows the statutory cap (Rs. 1,800 on the old ceiling, or this month's cap): PF is restricted to the ceiling.
  const capped=(entered===1800||entered===capPF)&&wagesM>EPF_CEILING_OLD;
  let empPF_monthly, empPF_thisMonth, erPF_monthly, erPF_thisMonth, pfMode, pfNote='';
  if(capped){
    pfMode='capped';
    erPF_monthly=Math.min(R(wagesM*0.12),capPF);
    erPF_thisMonth=Math.min(R(wagesP*0.12),capPF);   // the ceiling applies to wages earned, not a prorated ceiling
    if(entered!==capPF){
      pfNote=proYY===202609
        ? `Your letter shows ${f(entered)}, the cap on the old ${f(15000)} PF wage ceiling. In September 2026 the ceiling changes mid-month (${f(15000)} to 16 Sep, ${f(25000)} from 17 Sep), so the cap for a full month is ${f(capPF)}.`
        : `Your letter shows ${f(entered)}, the cap on the old ${f(15000)} PF wage ceiling. For ${monthLabelYY(proYY)} the PF wage ceiling is ${f(ceilW)}, so the cap is ${f(capPF)}.`;
    }
  }else{
    pfMode='code_wages';
    erPF_monthly=R(wagesM*0.12);
    erPF_thisMonth=R(wagesP*0.12);
    if(Math.abs(entered-erPF_monthly)>5)
      pfNote=`PF is worked out on wages under the Labour Codes (${f(wagesM)} a month: pay other than HRA, conveyance, bonus, reimbursements and the other excluded items, with the 50% rule applied). Your letter shows ${f(entered)}; on these wages PF is ${f(erPF_monthly)}.`;
  }
  empPF_monthly=erPF_monthly+vpf;
  empPF_thisMonth=erPF_thisMonth+vpfThisMonth;
  return{empPF_monthly,empPF_thisMonth,erPF_monthly,erPF_thisMonth,vpf,vpfThisMonth,pfMode,pfCapApplies:pfMode==='capped',pfNote,wagesM,wagesP};
}

// ══════════════════════════════════════════════════════
// ESI - on ESI wages (gross pay without reimbursements). Ceiling Rs. 21,000, or Rs. 25,000 for a person with disability.
// ESIC rounds the employee share up for each person and the employer share up on the total (one person here).
// ══════════════════════════════════════════════════════
function esiCeiling(){const el=window.__spRoot.getElementById('pwd');return el&&el.value==='Y'?25000:21000;}
function ceilR(x){return Math.ceil(Math.round(x*100)/100);}
function calcESI(wageM, wageP){
  const monthly=wageM||0, prorated=(wageP==null?monthly:wageP);
  if(monthly>esiCeiling())return{esiEmp_monthly:0,esiEmp_thisMonth:0,esiEr_monthly:0,esiEr_thisMonth:0,applies:false};
  return{
    esiEmp_monthly:ceilR(monthly*0.0075),
    esiEmp_thisMonth:ceilR(prorated*0.0075),
    esiEr_monthly:ceilR(monthly*0.0325),
    esiEr_thisMonth:ceilR(prorated*0.0325),
    applies:true
  };
}
// ══════════════════════════════════════════════════════
// PT - the slab follows the salary actually earned in the month, so a part month uses its prorated earnings.
// Monthly column: the full-month salary. This Month column: this month's earnings.
// ══════════════════════════════════════════════════════
function ptBand(bands,x){for(const[u,a]of bands){if(x<=u)return a;}return 0;}
function ptMonthAmt(rule,monthNum,amountBase,gender,annualIncome){
  if(rule.punjab){const lim=regime==='old'?250000:400000;return annualIncome>lim?200:0;}
  const bands=(rule.women&&gender==='F')?rule.women:rule.bands;
  let a=ptBand(bands,amountBase);
  if(rule.feb300&&monthNum===2&&a===200)a=300;
  if(rule.lastMonth&&monthNum===3&&rule.lastMonth[a])a=rule.lastMonth[a];
  return a;
}
function ptMonthsLeftInHalf(m){return m>=4&&m<=9?9-m:(m>=10?12-m+3:3-m);}
const FY_ORDER=[4,5,6,7,8,9,10,11,12,1,2,3];
const fyPos=(m)=>FY_ORDER.indexOf(m);
const halfOf=(m)=>(m>=4&&m<=9)?1:2;
const MONTH_NAME=(m)=>new Date(2026,m-1,1).toLocaleString('en-IN',{month:'long'});
// the calendar year of month m, seen from proration month mo in year yr (m on or after mo in the tax year)
const yearOfNext=(m,mo,yr)=>(fyPos(m)>=fyPos(mo)?(m<mo?yr+1:yr):yr);
// Half-year liability. Current half: income from joining to the half's end; Kerala needs 60 days of employment in the half.
function ptHalfLiability(rule,mo,monthlyGross,c,isCurrent){
  if(!isCurrent)return ptBand(rule.bands,monthlyGross*6);
  if(rule.minDays&&c.dojDate&&c.yr){
    const endM=halfOf(mo)===1?9:3, endY=(halfOf(mo)===2&&mo>=10)?c.yr+1:c.yr;
    const end=Date.UTC(endY,endM,0), start=Math.max(c.dojDate.getTime(),Date.UTC(endM===9?endY:endY-1,endM===9?3:9,1));
    if((end-start)/86400000+1<rule.minDays)return 0;
  }
  return ptBand(rule.bands,c.halfIncome||monthlyGross*6);
}
// ctx: {annualIncome, halfIncome, dojDate, yr}
function getPT(state, monthlyGross, proratedGross, month, gender, ctx){
  const none={ptMonthly:0,ptThisMonth:0,cycle:'none',liability:0,due:''};
  if(!state||state==='NONE')return none;
  const rule=PT_RULES[state];if(!rule)return none;
  const [yr,mo]=month?month.split('-').map(Number):[0,0];
  const c=ctx||{};
  if(rule.cycle==='monthly'){
    const ai=c.annualIncome||monthlyGross*12;
    return{ptMonthly:ptMonthAmt(rule,mo,monthlyGross,gender,ai),ptThisMonth:ptMonthAmt(rule,mo,proratedGross,gender,ai),cycle:'monthly',liability:0,due:''};
  }
  const out={ptMonthly:0,ptThisMonth:0,cycle:rule.cycle,liability:0,due:rule.due||'',next:null};
  if(rule.cycle==='annual'){
    out.liability=ptBand(rule.bands,c.annualIncome||monthlyGross*12);
    if(rule.deduct){
      // joined after the main deduction month: the later deduction month applies (Bihar: February)
      const dm=(rule.lateDeduct&&fyPos(mo)>fyPos(rule.deduct[0]))?rule.lateDeduct:rule.deduct[0];
      if(mo===dm){out.ptMonthly=out.ptThisMonth=out.liability;}
      else if(fyPos(dm)>fyPos(mo))out.next={month:dm,year:yearOfNext(dm,mo,yr),amount:out.liability};
    }
    return out;
  }
  // half-yearly
  out.liability=ptHalfLiability(rule,mo,monthlyGross,{...c,yr},true);
  if(rule.minDays&&out.liability===0&&ptBand(rule.bands,c.halfIncome||monthlyGross*6)>0)out.under60=true;
  if(rule.deduct){
    const dmThis=rule.deduct.find(m=>halfOf(m)===halfOf(mo));
    if(mo===dmThis){out.ptMonthly=out.ptThisMonth=out.liability;}
    else if(fyPos(dmThis)>fyPos(mo))out.next={month:dmThis,year:yearOfNext(dmThis,mo,yr),amount:out.liability};
    else if(halfOf(mo)===1){const dm2=rule.deduct.find(m=>halfOf(m)===2);out.next={month:dm2,year:yearOfNext(dm2,mo,yr),amount:ptBand(rule.bands,monthlyGross*6)};}
  }
  return out;
}
// PT for the tax year from this month on (old-regime deduction). months: how many later months to add.
function ptForYear(state,monthlyGross,proratedGross,month,gender,months,ctx){
  const rule=PT_RULES[state];if(!rule)return 0;
  const mo=month?parseInt(month.split('-')[1]):0;
  if(rule.cycle==='monthly'){
    const ai=(ctx&&ctx.annualIncome)||monthlyGross*12;
    let t=ptMonthAmt(rule,mo,proratedGross,gender,ai);
    for(let i=1;i<=months;i++){const m=((mo-1+i)%12)+1;t+=ptMonthAmt(rule,m,monthlyGross,gender,ai);}
    return t;
  }
  if(rule.cycle==='annual')return ptBand(rule.bands,(ctx&&ctx.annualIncome)||monthlyGross*12);
  // half-yearly: this half on its income (Kerala's 60-day rule applied), plus the second half when this month is in April to September
  const yrNow=month?parseInt(month.split('-')[0]):0;
  let t=ptHalfLiability(rule,mo,monthlyGross,{...(ctx||{}),yr:yrNow},true);
  if(mo>=4&&mo<=9&&months>=ptMonthsLeftInHalf(mo)+6)t+=ptBand(rule.bands,monthlyGross*6);
  return t;
}

// ══════════════════════════════════════════════════════
// LWF - Change #3
// LWF is a flat Rs.  amount per applicable period
// Monthly column: shows full LWF amount if applicable this month
// This Month column: shows same flat amount (LWF is not a %, it's flat)
// Both columns show the same value - LWF is always flat
// ══════════════════════════════════════════════════════
function getLWFFreq(state){
  const d=LWF_DATA[state];
  return d?d.freq:'nil';
}
function lwfAmounts(d,wage){
  if(d.pct){const e=Math.min(Math.round(wage*d.pct*100)/100,d.emp);return{emp:e,er:Math.round(e*2*100)/100};}
  return{emp:d.emp,er:d.er};
}
function getLWF(state,month,wage){
  const off={emp:0,er:0,active:false,annualEmp:0,annualEr:0};
  if(!state||state==='NONE')return off;
  const d=LWF_DATA[state];if(!d)return off;
  const a=lwfAmounts(d,wage||getGross());
  const per=d.freq==='monthly'?12:d.freq==='halfyearly'?2:1;
  const base={annualEmp:a.emp*per,annualEr:a.er*per};
  if(d.freq==='monthly')return{...a,active:true,...base};
  const mo=month?parseInt(month.split('-')[1]):0;
  if((d.months||[]).includes(mo))return{...a,active:true,...base};
  return{emp:0,er:0,active:false,...base};
}
function netText(n){return n<0?'<span style="font-size:.78rem;font-weight:600;color:#B91C1C;white-space:normal">Deductions exceed pay for this month</span>':`Rs. ${fmt(n)}`;}
function fmtL(n){return Number.isInteger(n)?fmt(n):n.toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2});}

// ══ NPS Employer - % of Basic ══
function calcNPS(npsPct){
  // Cap NPS to max 100% as per requirements
  const capped = Math.min(npsPct || 0, 100);
  return R(getBasic()*(capped/100));
}

// ══ INCOME TAX FY 2026-27 (surcharge + proper 87A rebate) ══
function calcBaseSlabTax(taxable,r){
  // Raw slab tax - no rebate, no surcharge, no cess
  let tax=0;
  if(r==='new'){
    const s=[[400000,0],[800000,.05],[1200000,.10],[1600000,.15],[2000000,.20],[2400000,.25],[Infinity,.30]];
    let p=0;for(const[sl,rt]of s){if(taxable<=p)break;tax+=Math.min(taxable-p,sl-p)*rt;p=sl;}
  }else{
    const s=[[250000,0],[500000,.05],[1000000,.20],[Infinity,.30]];
    let p=0;for(const[sl,rt]of s){if(taxable<=p)break;tax+=Math.min(taxable-p,sl-p)*rt;p=sl;}
  }
  return tax;
}
// Surcharge bands: 10% above Rs. 50 lakh, 15% above Rs. 1 crore, 25% above Rs. 2 crore, 37% above Rs. 5 crore (old regime;
// the new regime stops at 25%). Marginal relief: tax plus surcharge above a band never exceeds the amount at the band's
// start plus the income above it.
function surchargeRate(income,r){
  if(income>50000000&&r==='old')return 0.37;
  if(income>20000000)return 0.25;
  if(income>10000000)return 0.15;
  if(income>5000000)return 0.10;
  return 0;
}
function taxWithSurcharge(income,r){
  const t=calcBaseSlabTax(income,r);
  let total=t*(1+surchargeRate(income,r));
  for(const thr of [5000000,10000000,20000000,50000000]){
    if(income>thr&&surchargeRate(income,r)!==surchargeRate(thr,r)){
      const atThr=calcBaseSlabTax(thr,r)*(1+surchargeRate(thr,r));
      total=Math.min(total,atThr+(income-thr));
    }
  }
  return total;
}
function calcAnnualTax(taxable,r){
  if(taxable>5000000)return R(taxWithSurcharge(taxable,r)*1.04);   // 4% health and education cess
  let tax=calcBaseSlabTax(taxable,r);
  // Rebate: new regime nil up to Rs. 12 lakh, and above it the tax never exceeds the income over Rs. 12 lakh (marginal relief)
  if(r==='new'){ if(taxable<=1200000)tax=0; else tax=Math.min(tax,taxable-1200000); }
  if(r==='old'&&taxable<=500000)tax=Math.max(0,tax-Math.min(tax,12500));
  return R(tax*1.04);
}
function calcAnnualTaxLegacy(taxable,r){
  let tax=calcBaseSlabTax(taxable,r);
  // FIX13: proper 87A rebate - up to Rs. 12,500 off tax (not a cliff)
  if(r==='new'&&taxable<=1200000)tax=0; // New: full rebate ≤Rs. 12L
  if(r==='old'&&taxable<=500000)tax=Math.max(0,tax-Math.min(tax,12500));
  // FIX12: Surcharge on income >Rs. 50L
  let surcharge=0;
  if(taxable>10000000)     surcharge=tax*0.15; // 15% above Rs. 1Cr
  else if(taxable>5000000) surcharge=tax*0.10; // 10% on Rs. 50L–Rs. 1Cr
  // Marginal relief - total tax+surcharge cannot exceed tax@threshold + income above threshold
  if(surcharge>0){
    const thr=taxable>10000000?10000000:5000000;
    const taxAtThr=calcBaseSlabTax(thr,r);
    const maxTS=taxAtThr+(taxable-thr);
    surcharge=Math.max(0,Math.min(surcharge,maxTS-tax));
  }
  return R((tax+surcharge)*1.04); // 4% health & education cess
}
// ═══════════════════════════════════════════════════════════════════
// DOJ-EXACT TDS CALCULATION
// Annual income = prorated gross (joining month) + full grossM × full months after DOJ.
// No assumption of income before DOJ in the FY.
// grossP   = actual prorated earnings for joining/proration month
// basicP   = prorated basic this month (for NPS cap)
// npsErP   = prorated NPS employer this month
// erEPFP   = prorated employer EPF this month
// fullMos  = complete months AFTER the joining month (e.g. DOJ 5-Jun → fullMos=9, Jun-Mar)
// totalMos = 1 + fullMos (used to spread TDS)
// ═══════════════════════════════════════════════════════════════════
function calcTDS(grossM,r,npsErM,basicM,erEPFM,ptAnnual,grossP,npsErP,erEPFP,basicP,fullMos,totalMos,pf80C=0){
  const stdDed=r==='new'?75000:50000;
  const capPct=r==='new'?0.14:0.10;
  const mo=Math.max(1,totalMos);

  // Annual gross: prorated joining month + full months after - NO prior months assumed
  const annualGross=R(grossP+grossM*fullMos);

  // NPS 80CCD(2): prorated this month + full for subsequent
  const npsErAnnual=R(npsErP+npsErM*fullMos);
  const npsCapAnnual=R(basicP*capPct+basicM*capPct*fullMos);
  const npsExemptAnnual=Math.min(npsErAnnual,npsCapAnnual);

  // Retiral perquisite u/s 17(2)(vii): (Employer EPF + Employer NPS contribution) > Rs. 7.5L
  // IMPORTANT: use ACTUAL NPS contribution (npsErAnnual), NOT the exempted cap (npsExemptAnnual)
  // The 14%/10% cap is only for 80CCD(2) exemption - perquisite is on actual contribution.
  // If employer contributes 15% of Basic to NPS, full 15% amount is used here.
  // This means perquisite is regime-neutral - same for New and Old regime.
  const erEPFAnnual=R(erEPFP+erEPFM*fullMos);
  const combinedRetiral=erEPFAnnual+npsErAnnual; // actual EPF + actual NPS contribution
  const retiralThreshold=750000;   // a yearly limit, not reduced for a part year
  const perquisiteAdd=Math.max(0,combinedRetiral-retiralThreshold);

  // Professional tax, Section 19 - old regime only
  const ptDed=r==='old'?ptAnnual:0;
  // Section 123: employee EPF - old regime only, cap already applied by caller
  const pfDed80C=r==='old'?pf80C:0;

  const taxable=Math.max(0,annualGross-stdDed-npsExemptAnnual+perquisiteAdd-ptDed-pfDed80C);
  const annualTax=calcAnnualTax(taxable,r);

  return{tdsM:R(annualTax/mo),taxable,annualTax,annualGross,npsExemptAnnual,perquisiteAdd,ptDed,mo,fullMos};
}

// Legacy wrapper for buildTaxCmp (uses 12-month assumption for comparison table)
function monthlyTDS(grossM,r,npsErM,basicM){
  const stdDed=r==='new'?75000:50000;
  const capPct=r==='new'?0.14:0.10;
  const npsExempt=Math.min(npsErM*12,R(basicM*12*capPct));
  const taxable=Math.max(0,grossM*12-stdDed-npsExempt);
  return R(calcAnnualTax(taxable,r)/12);
}

// ══ PREVIEWS ══
function syncErPF(){
  const v=parseFloat(window.__spRoot.getElementById('empPFInput').value)||0;
  window.__spRoot.getElementById('erPFInput').value=v?'Rs. '+v.toLocaleString('en-IN')+'/mo':'';
}
function updatePreviews(){
  syncErPF();
  const vpf=parseFloat(window.__spRoot.getElementById('vpfPct').value)||0;
  const nps=parseFloat(window.__spRoot.getElementById('npsPct').value)||0;
  const state=window.__spRoot.getElementById('stateSelect').value;
  const mv=window.__spRoot.getElementById('proMonth').value;
  const gender=window.__spRoot.getElementById('gender').value;
  const basic=getBasic();
  const basicMissing=basic===0&&rows.some(r=>r.name.trim()&&parseFloat(r.amount)>0);
  const vpfAmt=R(basic*(vpf||0)/100);
  window.__spRoot.getElementById('vpfDisp').value=vpf>0&&basicMissing?'⚠ Add Basic Salary row':vpfAmt?`Rs. ${fmt(vpfAmt)}`:'-';
  const npsAmt=calcNPS(nps);
  window.__spRoot.getElementById('npsDisp').value=nps>0&&basicMissing?'⚠ Add Basic Salary row':npsAmt?`Rs. ${fmt(npsAmt)}`:'-';
  const monthlyGross=getGross();
  const esiWage=R(monthlyGross-getReimbs());
  const esi=calcESI(esiWage, esiWage); // preview: no proration context
  window.__spRoot.getElementById('esiEmpDisp').value=esi.applies?`Rs. ${fmt(esi.esiEmp_monthly)}`:'Not applicable';
  window.__spRoot.getElementById('esiErDisp').value=esi.applies?`Rs. ${fmt(esi.esiEr_monthly)}`:'-';
  if(state==='NONE'){window.__spRoot.getElementById('ptDisp').value='-';window.__spRoot.getElementById('lwfDisp').value='-';return;}
  const pt=getPT(state,monthlyGross,monthlyGross,mv,gender);
  window.__spRoot.getElementById('ptDisp').value=pt.cycle==='monthly'
    ?(pt.ptMonthly?`Rs. ${fmt(pt.ptMonthly)}`:'Nil at this salary')
    :(pt.cycle==='none'?'No professional tax':`Rs. ${fmt(pt.liability)} per ${pt.cycle==='annual'?'year':'half-year'}`);
  const lwf=getLWF(state,mv,monthlyGross);
  window.__spRoot.getElementById('lwfDisp').value=lwf.active?`Rs. ${fmtL(lwf.emp)} this month`:(LWF_DATA[state]?'Rs. 0 this month':'No labour welfare fund');
}
function onStateChange(){updatePreviews();}

// ══ REGIME ══
function setRegime(r){
  regime=r;
  window.__spRoot.getElementById('btnNew').className='tab'+(r==='new'?' on2':'');
  window.__spRoot.getElementById('btnOld').className='tab'+(r==='old'?' on2':'');
  if(calcDone)calculate(); // FIX8: re-render result table when regime toggled post-calculate
}

// ══ DAYS ══
function autoDays(){
  const dv=window.__spRoot.getElementById('doj').value,mv=window.__spRoot.getElementById('proMonth').value;
  const note=window.__spRoot.getElementById('daysNote');
  if(!dv||!mv)return;
  // FIX: use UTC-safe parsing to avoid timezone offset issues in IST
  const dojDate=new Date(dv);
  const dojYYMM=dojDate.getUTCFullYear()*100+(dojDate.getUTCMonth()+1);
  const dojDay=dojDate.getUTCDate();
  const[yr,mo]=mv.split('-').map(Number);
  const proYYMM=yr*100+mo;
  const total=new Date(yr,mo,0).getDate();
  if(dojYYMM>proYYMM){note.textContent='⚠ DOJ is after the selected month.';window.__spRoot.getElementById('payDays').value='';return;}
  let pay;
  if(dojYYMM<proYYMM){pay=total;note.textContent=`Joined before month - full ${total} calendar days.`;}
  else{pay=total-dojDay+1;note.textContent=`Joined ${dojDay} → ${pay} of ${total} calendar days.`;}
  window.__spRoot.getElementById('payDays').value=pay;updatePreviews();
}
function chgDays(d){
  const inp=window.__spRoot.getElementById('payDays'),mv=window.__spRoot.getElementById('proMonth').value;
  let max=31;if(mv){const[yr,mo]=mv.split('-').map(Number);max=new Date(yr,mo,0).getDate();}
  inp.value=Math.min(max,Math.max(0,(parseInt(inp.value)||0)+d));
}

// ══ CALCULATE ══
function calculate(){
  const emp=window.__spRoot.getElementById('empName').value.trim()||'Employee';
  const mv=window.__spRoot.getElementById('proMonth').value;
  const payable=parseFloat(window.__spRoot.getElementById('payDays').value);
  const state=window.__spRoot.getElementById('stateSelect').value;
  const gender=window.__spRoot.getElementById('gender').value;
  const vpfPct=parseFloat(window.__spRoot.getElementById('vpfPct').value)||0;
  const npsPct=parseFloat(window.__spRoot.getElementById('npsPct').value)||0;

  if(!mv){flash('Select a proration month.');return;}
  // FIX25: guard future DOJ
  if(window.__spRoot.getElementById('doj').value){
    const _doj=new Date(window.__spRoot.getElementById('doj').value);
    const[_yr,_mo]=mv.split('-').map(Number);
    const _mE=new Date(_yr,_mo,0);
    if(_doj>_mE){flash('DOJ is after the proration month - check inputs.');return;}
  }
  if(isNaN(payable)||payable<=0){flash('Payable days must be at least 1.');return;}
  const vRows=rows.filter(r=>r.name.trim()&&parseFloat(r.amount)>0);
  if(!vRows.length){flash('Add at least one pay head with an amount.');return;}

  const[yr,mo]=mv.split('-').map(Number);
  const calDays=new Date(yr,mo,0).getDate();
  const monthName=new Date(yr,mo-1,1).toLocaleString('default',{month:'long',year:'numeric'});
  const sEl=window.__spRoot.getElementById('stateSelect');
  const stateName=state==='NONE'?'N/A':sEl.options[sEl.selectedIndex].text.replace(' (PT abolished Apr 2026)','');

  // ── Earnings ──
  let totM=0,totP=0;const earnR=[];
  vRows.forEach(r=>{
    const am=R(parseFloat(r.amount));
    const pr=R(am/calDays*payable);
    totM+=am;totP+=pr;
    earnR.push({name:r.name,m:am,p:pr,cat:r.cat||'fixed'});
  });
  totM=R(totM);totP=R(totP);
  const basicM=getBasic();

  // ── Prorated HRA and Variable (reimbursements) ──
  const hraRow=rows.find(r=>/\bhra\b/i.test(r.name));
  const proratedHRA=hraRow?R((parseFloat(hraRow.amount)||0)/calDays*payable):0;
  const proratedReimbs=R(rows.filter(r=>r.cat==='variable').reduce((s,r)=>s+((parseFloat(r.amount)||0)/calDays*payable),0));

  // ── NPS - Flexi Basket ──
  // NPS is funded from Special Allowance. Cap NPS at SA amount.
  const saRow=rows.find(r=>/special\s*allow/i.test(r.name));
  const saMonthly=saRow?R(parseFloat(saRow.amount)||0):0;
  const npsRaw=calcNPS(npsPct);
  const npsM=saMonthly>0?Math.min(npsRaw,saMonthly):npsRaw; // cap at SA
  // Adjust the Special Allowance row in earnR to show it net of NPS
  if(npsM>0){
    const saIdx=earnR.findIndex(r=>/special\s*allow/i.test(r.name));
    if(saIdx>=0){
      const saProrated=R(earnR[saIdx].m/calDays*payable); // recompute for safety
      earnR[saIdx]={...earnR[saIdx],
        m:Math.max(0,earnR[saIdx].m-npsM),
        p:Math.max(0,earnR[saIdx].p-R(npsM/calDays*payable))
      };
      // Adjust totals accordingly (NPS was already in totM/totP via SA)
      totM=R(totM); // totM unchanged - NPS came from SA
      totP=R(totP); // totP unchanged
    }
  }
  // Gross: NPS is carved from SA. But for display, NPS is shown separately so gross includes it.
  const grossWithNPS_M=totM; // SA already reduced by npsM; gross same
  const grossWithNPS_P=totP; // prorated gross with SA already reduced

  // ── PF (Change #1/#5) ──
  // Monthly: from appointment letter inputs (fixed rate)
  // This Month: 12% of (prorated Gross − prorated HRA − prorated Variable)
  const pfRes=calcPF(vpfPct,calDays,payable,npsM);
  const{empPF_monthly,empPF_thisMonth,erPF_monthly,erPF_thisMonth,vpf,pfCapApplies}=pfRes;

  // Update PF display fields
  window.__spRoot.getElementById('vpfDisp').value=vpf?`Rs. ${fmt(vpf)}`:'-';
  window.__spRoot.getElementById('npsDisp').value=npsM?`Rs. ${fmt(npsM)}`:'-';

  // ── ESI (Change #3) ──
  // ESI wages: gross pay without reimbursements
  const esiRes=calcESI(R(totM-getReimbs()), R(totP-proratedReimbs));
  const{esiEmp_monthly,esiEmp_thisMonth,esiEr_monthly=0,esiEr_thisMonth=0,applies:esiApplies}=esiRes;
  window.__spRoot.getElementById('esiEmpDisp').value=esiApplies?`Rs. ${fmt(esiEmp_monthly)}`:'Not applicable';
  window.__spRoot.getElementById('esiErDisp').value=esiApplies?`Rs. ${fmt(esiEr_monthly)}`:'-';

  // ── PT (Change #2) - slab on monthly gross, deduct on prorated earnings ──

  // ── LWF - flat amount ──
  const lwfR=getLWF(state,mv,totP);
  const lwfEm=lwfR.emp;const lwfErm=lwfR.er;

  // ── TDS - DOJ-exact annualisation ──────────────────────────────────
  const dojVal=window.__spRoot.getElementById('doj').value;
  let fullMos=11, totalMos=12, dojInThisFY=false;
  if(dojVal){
    // FIX: use UTC methods to avoid timezone mismatch (IST vs UTC)
    const dojDate=new Date(dojVal);
    const dojYear=dojDate.getUTCFullYear(), dojMonth=dojDate.getUTCMonth()+1;
    const fyStartYYMM=(mo>=4?yr:yr-1)*100+4; // April of current FY
    const dojYYMM=dojYear*100+dojMonth;
    const proYYMM=yr*100+mo;
    if(dojYYMM>=fyStartYYMM&&dojYYMM<=proYYMM){
      dojInThisFY=true;
      // Full months AFTER the joining month in this FY (Apr→Mar)
      fullMos=dojMonth>=4?(3+12-dojMonth):(3-dojMonth);
      fullMos=Math.max(0,Math.min(11,fullMos));
      totalMos=Math.max(1,1+fullMos);
    }
  }
  // Prorated values for joining month (or full if pre-FY)
  const tdsGrossP=dojInThisFY?totP:totM;
  const tdsBasicP=dojInThisFY?R(basicM/calDays*payable):basicM;
  const tdsNpsErP=dojInThisFY?R(npsM/calDays*payable):npsM;
  const tdsErEPFP=dojInThisFY?erPF_thisMonth:erPF_monthly;
  // PT: income for the period decides annual and half-yearly states; monthly states use each month's salary
  const ptCtx={annualIncome:R(tdsGrossP+totM*fullMos),
               halfIncome:dojInThisFY?R(totP+totM*Math.min(ptMonthsLeftInHalf(mo),fullMos)):totM*6,
               dojDate:(dojVal&&dojInThisFY)?new Date(dojVal):null};
  const ptRes=getPT(state,totM,totP,mv,gender,ptCtx);
  const{ptMonthly,ptThisMonth}=ptRes;
  const ptAnnual=R(ptForYear(state,totM,dojInThisFY?totP:totM,mv,gender,fullMos,ptCtx));
  // Call DOJ-exact TDS
  // 80C: employee PF (joining month + remaining full months), cap Rs. 1.5L
  // PF for the later months follows the ceiling in force each month (15,000, split Sep 2026, 25,000)
  const _proYY=yr*100+mo;
  const _dojYY=dojVal?(new Date(dojVal).getUTCFullYear()*100+new Date(dojVal).getUTCMonth()+1):_proYY;
  const pfStartYY=dojInThisFY?_dojYY:_proYY;
  const pfFut=pfSeries(pfRes,pfStartYY,fullMos);
  const pfAnnual80C=pfRes.pfMode!=='none'
    ? Math.min(R(empPF_thisMonth + pfFut.emp), 150000)
    : 0;
  const erEPFAvg=fullMos>0?R(pfFut.er/fullMos):erPF_monthly;
  const tdsRes=calcTDS(totM,regime,npsM,basicM,erEPFAvg,ptAnnual,tdsGrossP,tdsNpsErP,tdsErEPFP,tdsBasicP,fullMos,totalMos,pfAnnual80C);
  const tdsM=tdsRes.tdsM; // this month's actual TDS deduction
  const tdsProjected = fullMos > 0
    ? R((tdsRes.annualTax - tdsM) / fullMos)
    : tdsM; // last month of FY - nothing left to spread, charge remaining balance now
  const tdsDiffers=Math.abs(tdsM-tdsProjected)>1;

  // ── Totals - both columns ──
  // PT is deducted from pay under both regimes; only its tax deduction is old-regime only
  const lwfEmFull=lwfEm>0&&LWF_DATA[state]?lwfAmounts(LWF_DATA[state],totM).emp:0;   // full-month LWF for the Monthly column
  const dedM=empPF_monthly+(esiApplies?esiEmp_monthly:0)+ptMonthly+lwfEmFull+npsM+tdsProjected;
  const npsPrForDed=R(npsM/calDays*payable);
  const dedP=empPF_thisMonth+(esiApplies?esiEmp_thisMonth:0)+ptThisMonth+lwfEm+npsPrForDed+tdsM;

  const netM=R(grossWithNPS_M-dedM);
  const netP=R(grossWithNPS_P-dedP);   // may be below zero: shown as a message, never as a negative figure or a silent zero

  // ── Tiles ──
  window.__spRoot.getElementById('resTiles').innerHTML=`
    <div class="tile"><span class="tile-v">${payable}/${calDays}</span><div class="tile-l">Payable Days</div></div>
    <div class="tile tg"><span class="tile-v">Rs. ${fmt(grossWithNPS_P)}</span><div class="tile-l">Gross This Month</div></div>
    <div class="tile tn">${netP<0?'<span class="tile-v" style="font-size:.9rem;line-height:1.3">Deductions exceed pay for this month</span>':`<span class="tile-v">Rs. ${fmt(netP)}</span>`}<div class="tile-l">Net Take-Home</div></div>`;

  // ── Result Table ──
  let tb='';
  tb+=`<tr class="s-hdr"><td colspan="3">Earnings - Prorated by Calendar Days</td></tr>`;
  earnR.forEach(r=>{
    const badge=''; // variable tag removed from result view
    tb+=`<tr><td>${eH(r.name)}${badge}</td><td>Rs. ${fmt(r.m)}</td><td>Rs. ${fmt(r.p)}</td></tr>`;
  });
  if(npsM>0){
    const npsPr=R(npsM/calDays*payable);
    tb+=`<tr><td>Employer NPS</td><td>Rs. ${fmt(npsM)}</td><td>Rs. ${fmt(npsPr)}</td></tr>`;
  }
  tb+=`<tr class="earn-tot"><td><strong>Gross Earnings</strong></td><td><strong>Rs. ${fmt(grossWithNPS_M)}</strong></td><td><strong>Rs. ${fmt(grossWithNPS_P)}</strong></td></tr>`;

  tb+=`<tr class="s-hdr"><td colspan="3">Deductions</td></tr>`;

  const{pfMode}=pfRes;
  if(pfMode!=='none'){
    const pfLabel=vpf>0?'EPF + VPF':'EPF';
    // #12: PF monthly vs this month display
    const pfMoNote='';  // Removed: "full month rate"
    const pfThisNote='';  // Removed: "prorated this month"
    tb+=`<tr class="ded"><td>${pfLabel}</td><td>Rs. ${fmt(empPF_monthly)}${pfMoNote}</td><td>Rs. ${fmt(empPF_thisMonth)}${pfThisNote}</td></tr>`;
  }

  if(esiApplies)tb+=`<tr class="ded"><td>Employee ESI (0.75%)</td><td>Rs. ${fmt(esiEmp_monthly)}</td><td>Rs. ${fmt(esiEmp_thisMonth)}</td></tr>`;

  if(ptRes.cycle==='monthly'&&(ptMonthly>0||ptThisMonth>0))tb+=`<tr class="ded"><td>Professional Tax - ${eH(stateName)}</td><td>Rs. ${fmt(ptMonthly)}</td><td>Rs. ${fmt(ptThisMonth)}</td></tr>`;
  // Explanations go to the notes box below Net Take-Home; the table lists only what is deducted.
  const statNotes=[];
  if(ptRes.cycle==='annual'||ptRes.cycle==='halfyearly'){
    const _kind=ptRes.cycle==='annual'?'an annual tax':'a half-yearly tax';
    if(ptRes.ptThisMonth>0)tb+=`<tr class="ded"><td>Professional Tax - ${eH(stateName)}</td><td>Rs. ${fmt(ptRes.ptMonthly)}</td><td>Rs. ${fmt(ptRes.ptThisMonth)}</td></tr>`;
    if(ptRes.under60&&!(ptRes.next&&halfOf(ptRes.next.month)!==halfOf(mo)))
      statNotes.push(`<strong>Professional Tax:</strong> not payable for this half-year in ${eH(stateName)}, as employment in it is under ${PT_RULES[state].minDays} days.`);
    else if(ptRes.ptThisMonth>0)
      statNotes.push(`<strong>Professional Tax:</strong> ${eH(stateName)} levies ${_kind}; this month's salary carries the deduction for ${ptRes.cycle==='annual'?'the year':'the half-year'}.`);
    else if(ptRes.next)
      statNotes.push(`<strong>Professional Tax:</strong> ${eH(stateName)} levies ${_kind}. The next deduction falls in the ${MONTH_NAME(ptRes.next.month)} ${ptRes.next.year} salary: Rs. ${fmt(ptRes.next.amount)}.`);
    else
      statNotes.push(`<strong>Professional Tax:</strong> ${eH(stateName)} levies ${_kind} of Rs. ${fmt(ptRes.liability)} for ${ptRes.cycle==='annual'?'the year':'this half-year'}, paid ${eH(ptRes.due)}.`);
  }
  else if(state==='OR')statNotes.push('<strong>Professional Tax:</strong> Odisha abolished professional tax from 1 April 2026.');
  const _lwfFull=LWF_DATA[state]?lwfAmounts(LWF_DATA[state],totM):{emp:0,er:0};
  if(lwfEm>0)tb+=`<tr class="ded"><td>Labour Welfare Fund - ${eH(stateName)}</td><td>Rs. ${fmtL(_lwfFull.emp)}</td><td>Rs. ${fmtL(lwfEm)}</td></tr>`;
  else if(LWF_DATA[state]&&LWF_DATA[state].months){
    const _lm=LWF_DATA[state].months.slice().sort((a,b)=>a-b);
    const _nm=_lm.find(m=>m>mo)||_lm[0];
    const _ny=_nm>mo?yr:yr+1;
    const _la=lwfAmounts(LWF_DATA[state],totM);
    statNotes.push(`<strong>Labour Welfare Fund:</strong> the next deduction falls in the ${MONTH_NAME(_nm)} ${_ny} salary: Rs. ${fmtL(_la.emp)} (employer Rs. ${fmtL(_la.er)}).`);
  }
  if(npsM>0){
    const npsPrDed=R(npsM/calDays*payable);
    tb+=`<tr class="ded"><td>Employer NPS</td><td>Rs. ${fmt(npsM)}</td><td>Rs. ${fmt(npsPrDed)}</td></tr>`;
  }
  // Single TDS row - Monthly = projected/mo, This Month = actual DOJ-prorated
  const _tdsSub='';  // Removed: "proj. Rs. .../mo · actual Rs. ..."
  tb+=`<tr class="ded"><td>Income Tax / TDS${_tdsSub}</td><td>Rs. ${fmt(tdsProjected)}</td><td>Rs. ${fmt(tdsM)}</td></tr>`;

  tb+=`<tr class="ded-tot"><td><strong>Total Deductions</strong></td><td><strong>Rs. ${fmt(dedM)}</strong></td><td><strong>Rs. ${fmt(dedP)}</strong></td></tr>`;
  tb+=`<tr class="net"><td><strong>Net Take-Home</strong></td><td><strong>${netText(netM)}</strong></td><td><strong>${netText(netP)}</strong></td></tr>`;

  tb+=`<tr class="s-hdr"><td colspan="3">Employer Costs - Informational Only</td></tr>`;
  tb+=`<tr class="sub"><td>Employer PF</td><td>Rs. ${fmt(erPF_monthly)}</td><td>Rs. ${fmt(erPF_thisMonth)}</td></tr>`;
  if(esiApplies)tb+=`<tr class="sub"><td>Employer ESI (3.25%)</td><td>Rs. ${fmt(esiEr_monthly)}</td><td>Rs. ${fmt(esiEr_thisMonth)}</td></tr>`;
  if(lwfErm>0)tb+=`<tr class="sub"><td>Employer LWF - ${eH(stateName)}</td><td>Rs. ${fmtL(_lwfFull.er)}</td><td>Rs. ${fmtL(lwfErm)}</td></tr>`;

  window.__spRoot.getElementById('resBody').innerHTML=tb;
  window.__spRoot.getElementById('resEmp').textContent=`${emp} · ${monthName}`;

  const w=window.__spRoot.getElementById('resWarn');
  const _perqNote=tdsRes.perquisiteAdd>0?` Employer PF and NPS contributions exceed Rs. 7,50,000 for the year, so Rs. ${fmt(tdsRes.perquisiteAdd)} is added to taxable income as a perquisite.`:'';
  const _pfNote=pfRes.pfNote?` <br><strong>PF:</strong> ${pfRes.pfNote}`:'';
  const _surNote=tdsRes.taxable>5000000?' Surcharge applied (taxable >Rs. 50L).':'';
  const _priorFYNote=!dojInThisFY&&dojVal
    ?' Prior-FY joiner: TDS assumes full 12-month income. Actual may differ if earnings were lower earlier in FY.':'';
  const _esiSmallNote='';
  const _tdsDiffNote=tdsDiffers?` TDS this month (Rs. ${fmt(tdsM)}) differs from projected monthly TDS (Rs. ${fmt(tdsProjected)}) due to proration.`:'';
  w.innerHTML=`<span>⚠</span><div><strong>TDS estimate</strong> (DOJ-exact ${totalMos}-month basis). Old regime: HRA and Section 123 investments other than EPF, and Section 126, are not included.${_perqNote}${_pfNote}${_surNote}${_tdsDiffNote}${_priorFYNote}${_esiSmallNote} Gratuity excluded.${statNotes.length?'<br>'+statNotes.join('<br>'):''}</div>`;
  w.style.display='flex';

  const lwfFreq=getLWFFreq(state);

  // ⚠ CRITICAL FIX #1: Initialize _payslipData BEFORE buildTaxCmp
  // buildTaxCmp saves taxCmpResults into window._payslipData.
  // If _payslipData doesn't exist when buildTaxCmp runs, tax results are lost
  // and the PDF tax comparison table will be empty.
  // Store all data for payslip generation (no DOM cloning needed)
  window._payslipData={
    emp:(window.__spRoot.getElementById('empName').value.trim()||'Employee'),
    monthName:mv?new Date(yr,mo-1,1).toLocaleString('default',{month:'long',year:'numeric'}):'',
    payable, calDays,
    grossP:grossWithNPS_P, grossM:grossWithNPS_M, netP, netM,
    totP, totM,
    earnR:[...earnR], npsM, npsPr:R(npsM/calDays*payable),
    pfMode, vpf, empPF_monthly, empPF_thisMonth, erPF_monthly, erPF_thisMonth,
    esiApplies, esiEmp_monthly, esiEmp_thisMonth,
    esiEr_monthly:esiEr_monthly||0, esiEr_thisMonth:esiEr_thisMonth||0,
    ptMonthly, ptThisMonth, state,
    stateName:stateName||state||'',
    lwfEm, lwfErm:lwfErm||0, npsM,
    tdsM, tdsProjected, tdsDiffers,
    dedM, dedP,
    regime, tdsRes,
    // Tax comparison data - populated by buildTaxCmp (called immediately below)
    taxCmpResults:null, taxCmpBest:null, taxCmpDiff:null
  };

  // Now call buildTaxCmp - it will populate taxCmpResults, taxCmpBest, taxCmpDiff into _payslipData
  buildTaxCmp({totM,totP,npsM,basicM,empPF_monthly,empPF_thisMonth,erPF_monthly,erPF_thisMonth,esiApplies,esiEmp_monthly,esiEmp_thisMonth,ptMonthly,ptThisMonth,ptAnnual,lwfEm,lwfFreq,lwfAnnualEmp:lwfR.annualEmp,tdsM,tdsProjected,tdsRes,totalMos,fullMos,regime,calDays,payable,pfCapApplies,pfMode,pfRes,pfStartYY,proYY:_proYY});

  if(!calcDone){calcDone=true;showToggles();}
  window.__spRoot.getElementById('emptyPanel').style.display='none';
  window.__spRoot.getElementById('resultCard').style.display='block';
  window.__spRoot.getElementById('taxCmpCard').style.display='block';
  window.__spRoot.getElementById('resultCard').scrollIntoView({behavior:'smooth',block:'start'});
}

function buildTaxCmp(o){
  // o = {totM,totP,npsM,basicM,empPF_monthly,empPF_thisMonth,erPF_monthly,erPF_thisMonth,
  //       esiApplies,esiEmp_monthly,esiEmp_thisMonth,ptMonthly,ptThisMonth,ptAnnual,
  //       lwfEm,tdsM,tdsProjected,tdsRes,totalMos,fullMos,regime,calDays,payable,pfCapApplies}
  const{totM,totP,npsM,basicM,empPF_monthly,empPF_thisMonth,erPF_monthly,erPF_thisMonth,
        esiApplies,esiEmp_monthly,esiEmp_thisMonth,ptMonthly,ptThisMonth,ptAnnual,
        lwfEm,tdsM,tdsProjected,tdsRes,totalMos,fullMos,regime,calDays,payable,
        pfMode,pfCapApplies,pfRes,pfStartYY,proYY}=o;

  const regimes=['new','old'];
  const labels=['New Regime','Old Regime'];
  const npsPr=R(npsM/calDays*payable);

  // Compute full details for both regimes
  // PF follows the ceiling in force each month (15,000, split Sep 2026, 25,000)
  const _fut=pfRes&&pfStartYY?pfSeries(pfRes,pfStartYY,fullMos):{emp:empPF_monthly*fullMos,er:erPF_monthly*fullMos};
  const _p12=pfRes&&proYY?pfSeries(pfRes,addMonthsYY(proYY,-1),12):{emp:empPF_monthly*12,er:erPF_monthly*12};
  const _p12first=pfRes&&proYY?pfMonthAmt(pfRes,proYY).er:erPF_monthly;
  const erAvgThis=fullMos>0?R(_fut.er/fullMos):erPF_monthly;
  const erAvg11=R((_p12.er-_p12first)/11);
  const pf80CThis=pfMode&&pfMode!=='none'?Math.min(R(empPF_thisMonth+_fut.emp),150000):0;
  const pf80CProj=pfMode&&pfMode!=='none'?Math.min(R(_p12.emp),150000):0;

  const results=regimes.map(r=>{
    const res=calcTDS(totM,r,npsM,basicM,erAvgThis,ptAnnual,
                      totP,npsPr,erPF_thisMonth,R(basicM/calDays*payable),fullMos,totalMos,pf80CThis);
    const resProj=calcTDS(totM,r,npsM,basicM,erAvg11,ptAnnual,
                          totM,npsM,_p12first,basicM,11,12,pf80CProj);

    const stdDed=r==='new'?75000:50000;
    const capPct=r==='new'?0.14:0.10;
    const npsExempt=res.npsExemptAnnual;
    const ptExempt=r==='old'?ptAnnual:0;
    const perqAdd=res.perquisiteAdd||0;

    // Monthly deductions for net calc
    const ptForDed=ptMonthly;   // PT is deducted from pay under both regimes
    const tdsForThis = res.tdsM; // this month's actual TDS
    const tdsForMonth = fullMos > 0
      ? R((res.annualTax - tdsForThis) / fullMos)
      : tdsForThis;
    // #5: Use amortised LWF for monthly column (annual/half-yearly states should spread cost)
    // lwfEm is the this-month amount; for annual states this is 0 in most months
    // We use lwfAnnual/12 for comparison table monthly net to give a realistic monthly picture
    const lwfAnnual=o.lwfAnnualEmp||0;
    const lwfMonthlyAvg=R(lwfAnnual/12);
    const dedMonth=empPF_monthly+(esiApplies?esiEmp_monthly:0)+ptForDed+lwfMonthlyAvg+npsM+tdsForMonth;
    const dedThis=empPF_thisMonth+(esiApplies?esiEmp_thisMonth:0)+ptThisMonth+lwfEm+npsPr+tdsForThis;
    const netMonthly=R(totM-dedMonth);
    const netThisMonth=R(totP-dedThis);

    return{
      stdDed,npsExempt,ptExempt,perqAdd,
      annualTaxable:res.taxable,
      projectedTaxable:resProj.taxable,
      annTax:res.annualTax, // DOJ-exact FY liability - matches Excel (114745 old / 0 new)
      tdsMonthly:tdsForMonth,
      tdsThisMonth:tdsForThis,
      netMonthly,netThisMonth,
      annualGross:resProj.annualGross,
      thisMonthGross:res.annualGross // actually totalised for the period
    };
  });

  const best=results[0].netMonthly>=results[1].netMonthly?0:1;
  const diff=Math.abs(results[0].annTax-results[1].annTax);

  // ── Build table ──
  let tbl=`<thead><tr>
    <th style="width:44%">Parameter</th>
    <th style="width:28%;text-align:right">New Regime</th>
    <th style="width:28%;text-align:right">Old Regime</th>
  </tr></thead><tbody>`;

  const row=(label,v0,v1,cls='',bold=false,bg='')=>{
    const s=bold?'font-weight:700':''; const bgStyle=bg?`background:${bg}`:'';
    return `<tr class="${cls}" style="${bgStyle}"><td style="${s};padding:6px 8px">${label}</td><td style="text-align:right;${s};padding:6px 8px">${v0}</td><td style="text-align:right;${s};padding:6px 8px">${v1}</td></tr>`;
  };
  const rupee=v=>`Rs. ${fmt(v)}`;
  const dash=`<span style="color:var(--ts)">-</span>`;

  // 1. This month earnings
  tbl+=row('This Month Earnings',rupee(totP),rupee(totP));
  // 2. Projected Monthly Earnings
  tbl+=row('Projected Monthly Earnings',rupee(totM),rupee(totM));
  // 3. Standard Deduction
  tbl+=row('(-) Standard Deduction',`−Rs. ${fmt(results[0].stdDed)}`,`−Rs. ${fmt(results[1].stdDed)}`);
  // 4. NPS Exemption 80CCD(2)
  tbl+=row('(-) Employer NPS, Section 124',
    results[0].npsExempt>0?`−Rs. ${fmt(results[0].npsExempt)}`:dash,
    results[1].npsExempt>0?`−Rs. ${fmt(results[1].npsExempt)}`:dash);
  // 5. PT exemption - old regime only
  tbl+=row('(-) Professional Tax, Section 19',
    dash,
    results[1].ptExempt>0?`−Rs. ${fmt(results[1].ptExempt)}`:dash);
  // 5b. 80C: Employee EPF contribution - old regime only, DOJ-aware, cap Rs. 1.5L/yr
  // = actual PF this joining month + full monthly PF × remaining full months
  // e.g. DOJ June: 1800 (June) + 1800×9 (Jul-Mar) = Rs. 18,000
  if(pf80CThis>0){
    // #4: joining month is prorated; subsequent months are full monthly EPF
    tbl+=row('(-) Employee EPF, Section 123 (Old Regime)<span style="display:block;font-size:.6rem;color:var(--ts)">Joining month prorated + full months × remaining</span>',
      dash,`−Rs. ${fmt(pf80CThis)}`);
  }
  // 6. Additional taxable income (perquisites)
  const perqNew=results[0].perqAdd; const perqOld=results[1].perqAdd;
  if(perqNew>0||perqOld>0){
    // Perquisite is now regime-neutral (based on actual contribution, not exemption cap)
    const _pNote=(perqNew>0)
      ?`<span style="display:block;font-size:.62rem;color:#D97706;margin-top:1px">Employer PF and NPS contributions exceed Rs. 7,50,000 for the year - taxed as a perquisite</span>`:'';
    tbl+=`<tr style="background:#FFFBEB">
      <td style="padding:6px 8px;font-size:.77rem;color:#D97706">(+) Retirement contributions above Rs. 7.5 lakh${_pNote}</td>
      <td style="text-align:right;padding:6px 8px;font-weight:600;color:#D97706">${perqNew>0?`+Rs. ${fmt(perqNew)}`:dash}</td>
      <td style="text-align:right;padding:6px 8px;font-weight:600;color:#D97706">${perqOld>0?`+Rs. ${fmt(perqOld)}`:dash}</td>
    </tr>`;
  }
  // 7. Annual taxable income
  tbl+=row('Annual Taxable Income',rupee(results[0].annualTaxable),rupee(results[1].annualTaxable),'','true');
  // 8. Annual tax incl cess + surcharge
  tbl+=row('Annual Tax (cess + surcharge)',rupee(results[0].annTax),rupee(results[1].annTax));
  // 9. Monthly TDS
  tbl+=row('Monthly TDS (projected)',rupee(results[0].tdsMonthly),rupee(results[1].tdsMonthly));
  // 10. Monthly Net Take-Home
  tbl+=`<tr><td><strong>Monthly Net Take-Home</strong></td>
    <td style="text-align:right" class="${best===0?'winner':'loser'}"><strong>${netText(results[0].netMonthly)}</strong></td>
    <td style="text-align:right" class="${best===1?'winner':'loser'}"><strong>${netText(results[1].netMonthly)}</strong></td></tr>`;
  // 11. This Month Net
  tbl+=`<tr><td>This Month Net</td>
    <td style="text-align:right" class="${best===0?'winner':'loser'}">${netText(results[0].netThisMonth)}</td>
    <td style="text-align:right" class="${best===1?'winner':'loser'}">${netText(results[1].netThisMonth)}</td></tr>`;

  // Annual tax saving
  tbl+=`<tr><td colspan="3" style="text-align:center;font-weight:700;color:var(--pm);padding:8px 8px 4px">
    ${diff===0?'Both regimes equal - Rs. 0 difference':((results[0].annTax<results[1].annTax?'New':'Old')+' Regime saves Rs. '+fmt(diff)+'/yr · Rs. '+fmt(R(diff/12))+'/mo avg')}
  </td></tr>`;
  tbl+=`</tbody>`;

  window.__spRoot.getElementById('taxCmpTable').innerHTML=tbl;
  // Save for payslip
  if(window._payslipData){
    window._payslipData.taxCmpResults=results;
    window._payslipData.taxCmpBest=best;
    window._payslipData.taxCmpDiff=diff;
    window._payslipData.taxCmpLabels=['New Regime','Old Regime'];
    window._payslipData.pf80CThis=pf80CThis;
    window._payslipData.ptExempts=[results[0].ptExempt,results[1].ptExempt];
  }
  const isOptimal=(regime==='new'&&best===0)||(regime==='old'&&best===1);
  // #13: Neutral message when both regimes are equal (diff===0)
  const verdictHTML=diff===0
    ?`<div class="ok"><span>✓</span><div><strong>Both regimes are equivalent</strong> for your income level - Rs. 0 difference. No action needed.<span style="display:block;margin-top:3px;font-size:.62rem;opacity:.8">Old regime can come out lower with HRA, Section 123 and Section 126 deductions.</span></div></div>`
    :`<div class="${isOptimal?'ok':'warn'}"><span>${isOptimal?'✓':'⚠'}</span><div><strong>${isOptimal?'You are on the optimal regime.':'Consider switching regime!'}</strong> ${labels[best]} saves Rs. ${fmt(diff)}/yr (Rs. ${fmt(R(diff/12))}/mo).<span style="display:block;margin-top:3px;font-size:.62rem;opacity:.8">Old regime can come out lower with HRA, Section 123 and Section 126 deductions.</span></div></div>`;
  window.__spRoot.getElementById('taxCmpVerdict').innerHTML=verdictHTML;
}

function clampPayDays(){
  const inp=window.__spRoot.getElementById('payDays');
  const mv=window.__spRoot.getElementById('proMonth').value;
  let max=31;if(mv){const[yr,mo]=mv.split('-').map(Number);max=new Date(yr,mo,0).getDate();}
  const v=parseInt(inp.value)||0;
  if(v>max)inp.value=max;else if(v<0)inp.value=0;
}
function flash(msg){
  const btn=window.__spRoot.getElementById('calcBtn'),orig=btn.innerHTML;
  btn.innerHTML=`⚠ ${msg}`;btn.style.background='linear-gradient(135deg,#DC2626,#EF4444)';
  setTimeout(()=>{btn.innerHTML=orig;btn.style.background='';},2800);
}

// ── DOWNLOAD PAYSLIP ────────────────────────────────────────────────────────
function openDlModal(){
  if(!calcDone){flash('Calculate first before downloading.');return;}
  if(window._jspdfLoadErr){flash('PDF library failed to load - check internet connection.');return;}
  // ⚠ CRITICAL FIX #2: Check for jsPDF in multiple possible locations
  // CDN load can put it at window.jspdf.jsPDF (UMD) or window.jsPDF (global)
  const jsPDFExists=(window.jspdf&&typeof window.jspdf.jsPDF==='function')||(window.jsPDF&&typeof window.jsPDF==='function');
  if(!jsPDFExists){
    flash('PDF library loading - please wait 2 seconds and try again.');
    return;
  }
  // #11: Soft warning if name blank
  const nm=window.__spRoot.getElementById('empName').value.trim();
  if(!nm){
    // Show name tip in modal but still allow download
    window.__spRoot.getElementById('dlNameTip').style.display='block';
  } else {
    window.__spRoot.getElementById('dlNameTip').style.display='none';
  }
  window.__spRoot.getElementById('dlAgree').checked=false;
  window.__spRoot.getElementById('dlConfirm').className='modal-confirm';
  window.__spRoot.getElementById('dlModal').classList.add('open');
}
function closeDlModal(){
  window.__spRoot.getElementById('dlModal').classList.remove('open');
}
// Close modal when clicking backdrop (safe - checks element exists)
document.addEventListener('click',e=>{
  const m=window.__spRoot.getElementById('dlModal');
  const _t=(e.composedPath&&e.composedPath()[0])||e.target;if(m&&_t===m)closeDlModal();
});
function downloadPayslip(){
  if(!window.__spRoot.getElementById('dlAgree').checked)return;
  if(!window._payslipData){flash('Please calculate first.');return;}
  closeDlModal();

  const d=window._payslipData;
  // #7: If taxCmpResults not populated (edge case), guard gracefully
  if(!d.taxCmpResults){
    // taxCmpResults should always be populated after calculate() - show fallback note
    console.warn('taxCmpResults not populated - PDF tax comparison will be empty');
  }
    const f=n=>{
    const num=Math.round(n||0);
    // Safe Indian number format using only ASCII - avoids jsPDF f2 crash
    const s=Math.abs(num).toString();
    let result='';
    const len=s.length;
    for(let i=0;i<len;i++){
      if(i>0){
        const rem=len-i;
        if(rem===3||(rem>3&&(rem-3)%2===0)) result+=',';
      }
      result+=s[i];
    }
    return (num<0?'-':'')+result;
  };
  const Rs=n=>n?'Rs.'+f(n):'--'; // jsPDF built-in fonts don't support Rs.  glyph
  const fmtRs=v=>(v||v===0)?'Rs.'+f(v):'--'; // used in HTML builder section

  // ── Filename ─────────────────────────────────────────────────
  const empName=((d.emp&&d.emp!=='Employee')?d.emp:(window.__spRoot.getElementById('empName').value.trim()||'Employee')).replace(/\s+/g,'_');
  const mMatch=(d.monthName||'').match(/(\w+)\s+(\d{4})/);
  const shortMonth=mMatch?mMatch[1].slice(0,3)+(mMatch[2].slice(2)):'';
  const filename=`${empName}_${shortMonth}_Payslip.pdf`;

  // ── Inline style helpers ──────────────────────────────────────
  const V='#7C3AED'; const G='#059669'; const R2='#DC2626';
  const TD='#1E1B4B'; const TM='#4B4585'; const TS='#7C74B0';
  const BD='#DDD6FE'; const PP='#EDE9FE'; const GP='#ECFDF5';
  const FP='#F5F3FF'; const AP='#FFFBEB'; const AM='#D97706';

  const th=(txt,w='')=>`<th style="background:${FP};padding:7px 10px;text-align:${w==='r'?'right':'left'};font-size:10px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:${V};border-bottom:2px solid ${BD};font-family:Arial,sans-serif">${txt}</th>`;
  const td=(txt,align='l',bold=false,color=TD,bg='transparent',size='11px')=>
    `<td style="padding:6px 10px;text-align:${align==='r'?'right':'left'};font-weight:${bold?'700':'400'};color:${color};background:${bg};font-size:${size};font-family:Arial,sans-serif;border-bottom:1px solid ${BD}">${txt}</td>`;
  const hdrRow=(label)=>
    `<tr><td colspan="3" style="background:${FP};padding:5px 10px;font-size:9px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:${V};font-family:Arial,sans-serif">${label}</td></tr>`;
  const earRow=(name,m,p,color=TD)=>
    `<tr>${td(name,'l',false,color)}${td(fmtRs(m),'r',false,color)}${td(fmtRs(p),'r',false,color)}</tr>`;
  const totRow=(name,m,p,bg,color)=>
    `<tr>${td('<strong>'+name+'</strong>','l',true,color,bg,'12px')}${td('<strong>Rs.'+f(Math.round(m||0))+'</strong>','r',true,color,bg,'12px')}${td('<strong>Rs.'+f(Math.round(p||0))+'</strong>','r',true,color,bg,'12px')}</tr>`;
  const dash=`<span style="color:${TS}">-</span>`;

  // ── Build Proration Result rows from raw data ─────────────────
  let resRows='';
  resRows+=hdrRow('Earnings - Prorated by Calendar Days');
  (d.earnR||[]).forEach(r=>{ if(r&&r.name) resRows+=earRow(r.name, r.m, r.p); });
  if(d.npsM>0) resRows+=earRow('Employer NPS', d.npsM, d.npsPr);
  resRows+=totRow('Gross Earnings', d.grossM, d.grossP, PP, V);

  resRows+=hdrRow('Deductions');
  if(d.pfMode!=='none'){
    const pfLbl=d.vpf>0?'EPF + VPF':'EPF';
    resRows+=earRow(pfLbl, d.empPF_monthly, d.empPF_thisMonth, R2);
  }
  if(d.esiApplies) resRows+=earRow('Employee ESI (0.75%)', d.esiEmp_monthly, d.esiEmp_thisMonth, R2);
  if(d.ptThisMonth>0) resRows+=`<tr>${td('Professional Tax - '+d.stateName,'l',false,R2)}${td(dash,'r')}${td('Rs.'+f(Math.round(d.ptThisMonth)),'r',false,R2)}</tr>`;
  if(d.lwfEm>0) resRows+=`<tr>${td('Labour Welfare Fund - '+d.stateName,'l',false,R2)}${td(dash,'r')}${td('Rs.'+f(Math.round(d.lwfEm)),'r',false,R2)}</tr>`;
  if(d.npsM>0) resRows+=earRow('Employer NPS', d.npsM, d.npsPr, R2);
  if(d.tdsDiffers){
    resRows+=`<tr>${td('Income Tax / TDS','l',false,R2)}${td('Rs.'+f(Math.round(d.tdsProjected||0)),'r',false,R2)}${td('Rs.'+f(Math.round(d.tdsM||0)),'r',false,R2)}</tr>`;
  } else {
    resRows+=earRow('Income Tax / TDS', d.tdsProjected, d.tdsM, R2);
  }
  resRows+=totRow('Total Deductions', d.dedM, d.dedP, '#FEF2F2', R2);
  resRows+=totRow('Net Take-Home', d.netM, d.netP, GP, G);

  resRows+=hdrRow('Employer Costs - Informational Only');
  if(d.pfMode!=='none') resRows+=earRow('Employer PF', d.erPF_monthly, d.erPF_thisMonth, TS);
  if(d.esiApplies) resRows+=earRow('Employer ESI (3.25%)', d.esiEr_monthly, d.esiEr_thisMonth, TS);
  if(d.lwfErm>0) resRows+=`<tr>${td('Employer LWF','l',false,TS)}${td(dash,'r')}${td('Rs.'+f(Math.round(d.lwfErm)),'r',false,TS)}</tr>`;

  // ── Build Tax Comparison rows from raw data ───────────────────
  const tr=d.taxCmpResults; const best=d.taxCmpBest; const diff=d.taxCmpDiff;
  const labels=d.taxCmpLabels||['New Regime','Old Regime'];
  const pf80C=d.pf80CThis||0;

  const tth=(t,align='l')=>`<th style="background:${FP};padding:7px 10px;text-align:${align==='r'?'right':'left'};font-size:10px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:${V};border-bottom:2px solid ${BD};font-family:Arial,sans-serif">${t}</th>`;
  const ttd=(v,align='l',bold=false,color=TD,bg='transparent')=>
    `<td style="padding:6px 10px;text-align:${align==='r'?'right':'left'};font-weight:${bold?'700':'400'};color:${color};background:${bg};font-size:11px;font-family:Arial,sans-serif;border-bottom:1px solid ${BD}">${v}</td>`;
  const cmpRow=(label,v0,v1,bold=false,bg0='transparent',bg1='transparent',c0=TD,c1=TD)=>
    `<tr>${ttd(label,'l',bold,TD)}${ttd(v0,'r',bold,c0,bg0)}${ttd(v1,'r',bold,c1,bg1)}</tr>`;
  const rv=v=>v?'Rs.'+f(Math.round(v||0)):dash;
  const rm=v=>v?'-Rs.'+f(Math.round(v||0)):dash;

  let taxRows='<thead><tr>'+tth('Parameter')+tth('New Regime','r')+tth('Old Regime','r')+'</tr></thead><tbody>';
  if(tr){
    taxRows+=cmpRow('This Month Earnings', rv(d.grossP), rv(d.grossP));
    taxRows+=cmpRow('Projected Monthly Earnings', rv(d.grossM), rv(d.grossM));
    taxRows+=cmpRow('(−) Standard Deduction', rm(tr[0].stdDed), rm(tr[1].stdDed));
    taxRows+=cmpRow('(−) Employer NPS, Section 124',
      tr[0].npsExempt>0?rm(tr[0].npsExempt):dash,
      tr[1].npsExempt>0?rm(tr[1].npsExempt):dash);
    taxRows+=cmpRow('(−) Professional Tax, Section 19',
      dash, tr[1].ptExempt>0?rm(tr[1].ptExempt):dash);
    if(pf80C>0) taxRows+=cmpRow('(−) Employee EPF, Section 123 (Old Regime)', dash, rm(pf80C));
    if(tr[0].perqAdd>0||tr[1].perqAdd>0){
      taxRows+=cmpRow('(+) Retirement contributions above Rs. 7.5 lakh',
        tr[0].perqAdd>0?'+Rs.'+f(Math.round(tr[0].perqAdd)):dash,
        tr[1].perqAdd>0?'+Rs.'+f(Math.round(tr[1].perqAdd)):dash,
        false, AP, AP, AM, AM);
    }
    taxRows+=cmpRow('Annual Taxable Income', rv(tr[0].annualTaxable), rv(tr[1].annualTaxable), true);
    taxRows+=cmpRow('Annual Tax (cess + surcharge)', rv(tr[0].annTax), rv(tr[1].annTax));
    taxRows+=cmpRow('Monthly TDS (projected)', rv(tr[0].tdsMonthly), rv(tr[1].tdsMonthly));
    const w0=best===0?GP:'transparent'; const w1=best===1?GP:'transparent';
    const c0=best===0?G:TD; const c1=best===1?G:TD;
    taxRows+=cmpRow('Monthly Net Take-Home', rv(tr[0].netMonthly), rv(tr[1].netMonthly), true, w0, w1, c0, c1);
    taxRows+=cmpRow('This Month Net', rv(tr[0].netThisMonth), rv(tr[1].netThisMonth), false, w0, w1, c0, c1);
    taxRows+=`<tr><td colspan="3" style="text-align:center;font-weight:700;color:${V};padding:9px 10px;font-family:Arial,sans-serif;font-size:11px">
      ${diff===0?'Both regimes equivalent - Rs.0 difference':(tr[0].annTax<tr[1].annTax?'New':'Old')+' Regime saves Rs.'+f(Math.round(diff))+'/yr . Rs.'+f(Math.round(diff/12))+'/mo avg'}
    </td></tr>`;
  }
  taxRows+='</tbody>';

  const verdictLabel=tr?(diff===0?'Both regimes equivalent - Rs.0 difference. No action needed.':`${best===0?'New':'Old'} Regime optimal - saves Rs.${f(Math.round(diff))}/yr (Rs.${f(Math.round(diff/12))}/mo).`):'';

  // ── Draw PDF directly using jsPDF (no html2canvas - guaranteed table rendering) ──
  const btn=window.__spRoot.getElementById('dlConfirm');
  const origText=btn.textContent;
  btn.textContent='Generating…'; btn.style.opacity='.6';

  setTimeout(()=>{
    try{
      // ⚠ CRITICAL FIX #2b: Robust jsPDF lookup - handles both UMD and global namespaces
      const jsPDF=(window.jspdf&&window.jspdf.jsPDF)||window.jsPDF;
      if(typeof jsPDF!=='function')throw new Error('jsPDF not available');
      const pdf=new jsPDF({orientation:'portrait',unit:'pt',format:'a4'});
      // ⚑ GLOBAL f2 FIX: sanitize ALL text before it hits jsPDF's internal f2 encoder
      // Catches hardcoded em-dashes, minus signs (U+2212), rupee glyphs, etc.
      const _pdfTextOrig=pdf.text.bind(pdf);
      pdf.text=function(text,...args){
        const clean=t=>typeof t==='string'
          ?t.replace(/\u20B9/g,'Rs.').replace(/\u2014/g,'-').replace(/\u2013/g,'-')
            .replace(/\u2212/g,'-').replace(/[^\x20-\x7E]/g,'')
          :t;
        const cleaned=Array.isArray(text)?text.map(clean):clean(text);
        return _pdfTextOrig(cleaned,...args);
      };
      const PW=pdf.internal.pageSize.getWidth(); // 595
      const PH=pdf.internal.pageSize.getHeight(); // 842
      const ML=36, MR=36, MT=36;
      const CW=PW-ML-MR; // content width
      let y=MT;

      // Rs.  cannot render in jsPDF standard Helvetica - use Rs. prefix
      const rs=n=>(n!=null&&n!==undefined&&n!=='')?'Rs.'+f(Math.round(Math.abs(n))):'--';
      const rsNeg=n=>n?'-Rs.'+f(n):'--';
      
      // ⚠ FIX #3: Safe text wrapper to avoid jsPDF.f2 error with special chars
      const safeTxt=(s)=>{
        if(!s||s===undefined||s===null)return '';
        return String(s)
          .replace(/₹/g,'Rs.')
          .replace(/-/g,'-')
          .replace(/–/g,'-')
          .replace(/[^\x20-\x7E]/g,'')  // Remove non-ASCII except spaces
          .trim();
      };
      // Sanitize stateName before PDF rendering
      d.stateName = safeTxt(d.stateName) || 'State';
      
      // Helpers
      function hex2rgb(hex){const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);return[r,g,b];}
      function setFill(hex){pdf.setFillColor(...hex2rgb(hex));}
      function setDraw(hex){pdf.setDrawColor(...hex2rgb(hex));}
      function setTxt(hex){pdf.setTextColor(...hex2rgb(hex));}
      function newPage(){pdf.addPage();y=MT;}
      function checkY(need){if(y+need>PH-30)newPage();}

      // ── HEADER ─────────────────────────────────────────────────
      setTxt('#7C3AED'); pdf.setFont('helvetica','bold'); pdf.setFontSize(18);
      pdf.text('PayrollTool',ML,y);
      setTxt('#7C74B0'); pdf.setFont('helvetica','normal'); pdf.setFontSize(8);
      pdf.text('Projected Salary Proration - Not for official use',ML,y+13);
      // Employee name top-right
      setTxt('#1E1B4B'); pdf.setFont('helvetica','bold'); pdf.setFontSize(10);
      pdf.text(safeTxt(d.emp)||'Employee',PW-MR,y,{align:'right'});
      setTxt('#7C74B0'); pdf.setFont('helvetica','normal'); pdf.setFontSize(9);
      pdf.text(safeTxt(d.monthName)||'',PW-MR,y+12,{align:'right'});
      // Divider
      y+=26;
      setDraw('#7C3AED'); pdf.setLineWidth(1.5);
      pdf.line(ML,y,PW-MR,y); y+=14;

      // ── TILES ───────────────────────────────────────────────────
      const tileW=(CW-16)/3; const tileH=44;
      const tiles=[
        {v:`${d.payable}/${d.calDays}`,l:'PAYABLE DAYS',bg:'#F5F3FF',border:'#DDD6FE',vc:'#1E1B4B'},
        {v:'Rs.'+f(Math.round(d.grossP)),l:'GROSS THIS MONTH',bg:'#EDE9FE',border:'#C4B5FD',vc:'#7C3AED'},
        {v:'Rs.'+f(Math.round(d.netP)),l:'NET TAKE-HOME',bg:'#ECFDF5',border:'#A7F3D0',vc:'#059669'},
      ];
      tiles.forEach((t,i)=>{
        const tx=ML+i*(tileW+8);
        setFill(t.bg); setDraw(t.border); pdf.setLineWidth(1);
        pdf.roundedRect(tx,y,tileW,tileH,4,4,'FD');
        setTxt(t.vc); pdf.setFont('helvetica','bold'); pdf.setFontSize(13);
        pdf.text(t.v.replace(/₹/g,'Rs.'),tx+tileW/2,y+18,{align:'center'});
        setTxt('#7C74B0'); pdf.setFont('helvetica','normal'); pdf.setFontSize(6.5);
        pdf.text(t.l,tx+tileW/2,y+31,{align:'center'});
      });
      y+=tileH+16;

      // ── TABLE DRAWING HELPER ────────────────────────────────────
      // colWidths: array of pt widths. cols: array of {text,align,bold,color,bg}[]
      const drawRow=(cols,colWidths,rowH,bg=null)=>{
        try{
          checkY(rowH);
          if(bg){setFill(bg);setDraw(bg);pdf.rect(ML,y,CW,rowH,'F');}
          setDraw('#DDD6FE'); pdf.setLineWidth(0.3);
          pdf.line(ML,y+rowH,ML+CW,y+rowH);
          let cx=ML;
          cols.forEach((col,ci)=>{
            const cw=colWidths[ci];
            const align=col.align||'left';
            const tx=align==='right'?cx+cw-4:cx+4;
            setTxt(col.color||'#1E1B4B');
            pdf.setFont('helvetica',col.bold?'bold':'normal');
            pdf.setFontSize(col.size||8.5);
            // Strip Rs.  glyph - not supported in built-in fonts
            const safeText=String(col.text||'').replace(/₹/g,'Rs.').replace(/-/g,'--');
            const lines=pdf.splitTextToSize(safeText,cw-8);
            pdf.text(lines[0]||'',tx,y+rowH*0.65,{align});
            cx+=cw;
          });
          y+=rowH;
        }catch(e){console.warn('drawRow err:',e);y+=rowH;}
      };

      const sectionHdr=(label)=>{
        checkY(16);
        setFill('#F5F3FF'); setDraw('#DDD6FE'); pdf.setLineWidth(0.3);
        pdf.rect(ML,y,CW,14,'F');
        setTxt('#7C3AED'); pdf.setFont('helvetica','bold'); pdf.setFontSize(6.5);
        pdf.text(label.toUpperCase().replace(/₹/g,'Rs.'),ML+4,y+9.5);
        y+=14;
      };

      const tableHdr=(labels,cws,rowH=16)=>{
        checkY(rowH);
        setFill('#F5F3FF'); pdf.rect(ML,y,CW,rowH,'F');
        setDraw('#7C3AED'); pdf.setLineWidth(1); pdf.line(ML,y+rowH,ML+CW,y+rowH);
        let cx=ML;
        labels.forEach((lbl,i)=>{
          setTxt('#7C3AED'); pdf.setFont('helvetica','bold'); pdf.setFontSize(6.5);
          const al=i>0?'right':'left';
          pdf.text(lbl.replace(/₹/g,'Rs.'),al==='right'?cx+cws[i]-4:cx+4,y+rowH*0.68,{align:al});
          cx+=cws[i];
        });
        y+=rowH;
      };

      // 3-col layout: desc 55%, monthly 22.5%, this month 22.5%
      const C3=[CW*0.55, CW*0.225, CW*0.225];
      const rupee=v=>(v||v===0)?'Rs.'+f(Math.round(v||0)):'--';
      const neg=v=>v?'-Rs.'+f(Math.round(Math.abs(v))):'--';

      // ── PRORATION RESULT SECTION ─────────────────────────────
      // Section title
      setDraw('#7C3AED'); pdf.setLineWidth(1.5);
      pdf.line(ML,y,ML+CW,y); y+=1;
      setTxt('#7C3AED'); pdf.setFont('helvetica','bold'); pdf.setFontSize(7.5);
      pdf.text('PRORATION RESULT',ML,y+9); y+=13;
      setDraw('#DDD6FE'); pdf.setLineWidth(0.5); pdf.line(ML,y,ML+CW,y); y+=4;

      tableHdr(['Description','Monthly (Rs.)','This Month (Rs.)'],C3);

      // Earnings section
      sectionHdr('Earnings - Prorated by Calendar Days');
      (d.earnR||[]).forEach(r=>{
        if(!r||!r.name)return; // skip empty rows
        drawRow([{text:r.name},{text:rupee(r.m),align:'right'},{text:rupee(r.p),align:'right'}],C3,13);
      });
      if(d.npsM>0){
        drawRow([{text:'Employer NPS'},{text:rupee(d.npsM),align:'right'},{text:rupee(d.npsPr),align:'right'}],C3,13);
      }
      // Gross total row
      drawRow([
        {text:'Gross Earnings',bold:true,color:'#7C3AED',size:9},
        {text:rupee(d.grossM),align:'right',bold:true,color:'#7C3AED',size:9},
        {text:rupee(d.grossP),align:'right',bold:true,color:'#7C3AED',size:9}
      ],C3,15,'#EDE9FE');

      // Deductions section
      sectionHdr('Deductions');
      if(d.pfMode!=='none'){ const pfLbl=d.vpf>0?'EPF + VPF':'EPF'; drawRow([{text:pfLbl,color:'#DC2626'},{text:rupee(d.empPF_monthly),align:'right',color:'#DC2626'},{text:rupee(d.empPF_thisMonth),align:'right',color:'#DC2626'}],C3,13); }
      if(d.esiApplies){ drawRow([{text:'Employee ESI (0.75%)',color:'#DC2626'},{text:rupee(d.esiEmp_monthly),align:'right',color:'#DC2626'},{text:rupee(d.esiEmp_thisMonth),align:'right',color:'#DC2626'}],C3,13); }
      if(d.ptThisMonth>0){
        drawRow([{text:'Professional Tax - '+d.stateName,color:'#DC2626'},{text:'--',align:'right',color:'#7C74B0'},{text:rs(d.ptThisMonth),align:'right',color:'#DC2626'}],C3,13);
      }
      if(d.lwfEm>0){
        drawRow([{text:'Labour Welfare Fund',color:'#DC2626'},{text:'--',align:'right',color:'#7C74B0'},{text:rs(d.lwfEm),align:'right',color:'#DC2626'}],C3,13);
      }
      if(d.npsM>0){ drawRow([{text:'Employer NPS',color:'#DC2626'},{text:rupee(d.npsM),align:'right',color:'#DC2626'},{text:rupee(d.npsPr),align:'right',color:'#DC2626'}],C3,13); }
      drawRow([{text:'Income Tax / TDS',color:'#DC2626'},{text:rs(d.tdsProjected),align:'right',color:'#DC2626'},{text:rs(d.tdsM),align:'right',color:'#DC2626'}],C3,13);

      drawRow([
        {text:'Total Deductions',bold:true,color:'#DC2626',size:9},
        {text:rs(d.dedM),align:'right',bold:true,color:'#DC2626',size:9},
        {text:rs(d.dedP),align:'right',bold:true,color:'#DC2626',size:9}
      ],C3,15,'#FEF2F2');

      drawRow([
        {text:'Net Take-Home',bold:true,color:'#059669',size:10},
        {text:rs(d.netM),align:'right',bold:true,color:'#059669',size:10},
        {text:rs(d.netP),align:'right',bold:true,color:'#059669',size:10}
      ],C3,17,'#ECFDF5');

      // Employer costs
      sectionHdr('Employer Costs - Informational Only');
      if(d.pfMode!=='none') drawRow([{text:'Employer PF',color:'#7C74B0'},{text:rs(d.erPF_monthly),align:'right',color:'#7C74B0'},{text:rs(d.erPF_thisMonth),align:'right',color:'#7C74B0'}],C3,13);
      if(d.esiApplies) drawRow([{text:'Employer ESI (3.25%)',color:'#7C74B0'},{text:rs(d.esiEr_monthly),align:'right',color:'#7C74B0'},{text:rs(d.esiEr_thisMonth),align:'right',color:'#7C74B0'}],C3,13);

      y+=10;

      // ── TAX REGIME COMPARISON ────────────────────────────────
      checkY(20);
      setDraw('#7C3AED'); pdf.setLineWidth(1.5); pdf.line(ML,y,ML+CW,y); y+=1;
      setTxt('#7C3AED'); pdf.setFont('helvetica','bold'); pdf.setFontSize(7.5);
      pdf.text('TAX REGIME COMPARISON - FY 2026-27',ML,y+9); y+=13;
      setDraw('#DDD6FE'); pdf.setLineWidth(0.5); pdf.line(ML,y,ML+CW,y); y+=4;

      const C3T=[CW*0.56, CW*0.22, CW*0.22];
      tableHdr(['Parameter','New Regime','Old Regime'],C3T);

      const tcr=d.taxCmpResults; const best2=d.taxCmpBest; const diff2=d.taxCmpDiff;
      const pf80Cv=d.pf80CThis||0;

      if(tcr&&Array.isArray(tcr)&&tcr.length>=2){  // #7: null guard
        const crow=(lbl,v0,v1,bold=false,bg=null,c0='#1E1B4B',c1='#1E1B4B')=>{
          drawRow([{text:lbl,bold},{text:v0,align:'right',bold,color:c0},{text:v1,align:'right',bold,color:c1}],C3T,13,bg);
        };
        crow('This Month Earnings', rupee(d.totP||d.grossP), rupee(d.totP||d.grossP)); // #14: use totP same as screen
        crow('Projected Monthly Earnings', rupee(d.grossM), rupee(d.grossM));
        crow('(-) Standard Deduction', neg(tcr[0].stdDed), neg(tcr[1].stdDed));
        if(d.npsM>0) crow('(-) Employer NPS, Section 124', tcr[0].npsExempt>0?neg(tcr[0].npsExempt):'--', tcr[1].npsExempt>0?neg(tcr[1].npsExempt):'--');
        crow('(-) Professional Tax, Section 19', '--', tcr[1].ptExempt>0?neg(tcr[1].ptExempt):'--');
        if(pf80Cv>0) crow('(-) Employee EPF, Section 123 (Old Regime)', '--', neg(pf80Cv));
        if(tcr[0].perqAdd>0||tcr[1].perqAdd>0){
          crow('(+) Retirement contributions above Rs. 7.5 lakh',
            tcr[0].perqAdd>0?'+Rs.'+f(Math.round(tcr[0].perqAdd)):'--',
            tcr[1].perqAdd>0?'+Rs.'+f(Math.round(tcr[1].perqAdd)):'--',
            false,'#FFFBEB','#D97706','#D97706');
        }
        crow('Annual Taxable Income', rupee(tcr[0].annualTaxable), rupee(tcr[1].annualTaxable), true);
        crow('Annual Tax (cess + surcharge)', rupee(tcr[0].annTax), rupee(tcr[1].annTax));
        crow('Monthly TDS (projected)', rupee(tcr[0].tdsMonthly), rupee(tcr[1].tdsMonthly));

        const w0bg=best2===0?'#ECFDF5':null; const w1bg=best2===1?'#ECFDF5':null;
        const w0c=best2===0?'#059669':'#1E1B4B'; const w1c=best2===1?'#059669':'#1E1B4B';
        // Monthly net - draw each regime with its own bg
        checkY(15);
        setFill(best2===0?'#ECFDF5':'#ffffff'); pdf.rect(ML,y,C3T[0],15,'F');
        setFill(best2===0?'#ECFDF5':'#ffffff'); pdf.rect(ML+C3T[0],y,C3T[1],15,'F');
        setFill(best2===1?'#ECFDF5':'#ffffff'); pdf.rect(ML+C3T[0]+C3T[1],y,C3T[2],15,'F');
        setDraw('#DDD6FE'); pdf.setLineWidth(0.3); pdf.line(ML,y+15,ML+CW,y+15);
        setTxt('#1E1B4B'); pdf.setFont('helvetica','bold'); pdf.setFontSize(9);
        pdf.text('Monthly Net Take-Home',ML+4,y+10);
        setTxt(w0c); pdf.text(rupee(tcr[0].netMonthly),ML+C3T[0]+C3T[1]-4,y+10,{align:'right'});
        setTxt(w1c); pdf.text(rupee(tcr[1].netMonthly),ML+CW-4,y+10,{align:'right'});
        y+=15;

        crow('This Month Net', rupee(tcr[0].netThisMonth), rupee(tcr[1].netThisMonth), false, null, w0c, w1c);

        // Saving row
        checkY(18);
        const saveTxt=diff2===0?'Both regimes equal - Rs.0 difference':`${tcr[0].annTax<tcr[1].annTax?'New':'Old'} Regime saves Rs.${f(Math.round(diff2))}/yr . Rs.${f(Math.round(diff2/12))}/mo avg`;
        setFill('#F5F3FF'); pdf.rect(ML,y,CW,16,'F');
        setTxt('#7C3AED'); pdf.setFont('helvetica','bold'); pdf.setFontSize(8.5);
        pdf.text(saveTxt.replace(/₹/g,'Rs.'),ML+CW/2,y+11,{align:'center'});
        setDraw('#DDD6FE'); pdf.setLineWidth(0.3); pdf.line(ML,y+16,ML+CW,y+16);
        y+=20;

        // Verdict
        if(diff2>0){
          checkY(20);
          const bestLbl=best2===0?'New Regime':'Old Regime';
          const verdictTxt=diff2===0?'Both regimes equivalent - Rs.0 difference. No action needed.':`${bestLbl} is optimal - saves Rs.${f(Math.round(diff2))}/yr (Rs.${f(Math.round(diff2/12))}/mo). Old regime may improve with 80C/HRA/80D.`;
          setFill('#ECFDF5'); setDraw('#A7F3D0'); pdf.setLineWidth(0.5);
          pdf.roundedRect(ML,y,CW,16,3,3,'FD');
          setTxt('#059669'); pdf.setFont('helvetica','normal'); pdf.setFontSize(7.5);
          pdf.text(('OK: '+verdictTxt).replace(/₹/g,'Rs.'),ML+6,y+10.5);
          y+=22;
        }
      }

      // ── DISCLAIMER ──────────────────────────────────────────
      checkY(28);
      setDraw('#DDD6FE'); pdf.setLineWidth(0.5); pdf.line(ML,y,ML+CW,y); y+=8;
      setTxt('#DC2626'); pdf.setFont('helvetica','bold'); pdf.setFontSize(7);
      const importantW=pdf.getTextWidth('Important: ');
      pdf.text('Important:',ML,y);
      setTxt('#7C74B0'); pdf.setFont('helvetica','italic'); pdf.setFontSize(7);
      const discText='     I agree that the above information is based on projection only and cannot be considered for official purposes. This document is generated by PayrollTool and is not a valid payslip. Actual salary, deductions and tax may vary based on applicable laws.';
      const discLines=pdf.splitTextToSize(discText,CW-35);
      pdf.text(discLines,ML+28,y,{lineHeightFactor:1.5});

      pdf.save(filename);
      btn.textContent=origText; btn.style.opacity='1';

      // Track completed payslip download
      if (typeof window.gtag === 'function') {
        window.gtag('event', 'tool_download_completed', { tool_name: 'Salary Proration', file_type: 'pdf' });
      }

    } catch(err){
      console.error(err);
      btn.textContent=origText; btn.style.opacity='1';
      alert('PDF generation failed: '+err.message);
    }
  },100);
}
// ── TOOLTIP POSITIONING ─────────────────────────────────────────────────────
function tipShow(btn){
  const tid=btn.getAttribute('data-tip');
  const box=window.__spRoot.getElementById(tid);
  if(!box)return;
  box.style.left='-9999px';box.style.top='-9999px';
  box.classList.add('tip-active');
  const bR=btn.getBoundingClientRect(),bW=box.offsetWidth,bH=box.offsetHeight;
  const vW=window.innerWidth,vH=window.innerHeight,gap=8;
  let left,top;
  if(bR.right+gap+bW<=vW-4){left=bR.right+gap;top=bR.top-4;}
  else if(bR.left-gap-bW>=4){left=bR.left-gap-bW;top=bR.top-4;}
  else if(bR.bottom+gap+bH<=vH-4){left=Math.max(4,Math.min(bR.left,vW-bW-4));top=bR.bottom+gap;}
  else{left=Math.max(4,Math.min(bR.left,vW-bW-4));top=bR.top-gap-bH;}
  left=Math.max(4,Math.min(left,vW-bW-4));
  top=Math.max(4,Math.min(top,vH-bH-4));
  box.style.left=left+'px';box.style.top=top+'px';
}
function tipHide(btn){
  const box=window.__spRoot.getElementById(btn.getAttribute('data-tip'));
  if(box)box.classList.remove('tip-active');
}
// Close tooltips on outside click (#27)
document.addEventListener('click',e=>{
  const _t=(e.composedPath&&e.composedPath()[0])||e.target;if(!(_t.closest&&_t.closest('.tip-wrap'))){
    window.__spRoot.querySelectorAll('.tip-box.tip-active').forEach(b=>b.classList.remove('tip-active'));
  }
});
['scroll','resize'].forEach(ev=>window.addEventListener(ev,()=>
  window.__spRoot.querySelectorAll('.tip-box.tip-active').forEach(b=>b.classList.remove('tip-active')),{passive:true}
));
