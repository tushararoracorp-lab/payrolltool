pdfjsLib.GlobalWorkerOptions=pdfjsLib.GlobalWorkerOptions||{};
pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// ══ STATE ══
let regime='new', rows=[], rid=0, calcDone=false;
const EPF_WAGE_CEILING=15000; // Statutory PF wage ceiling - update here if law changes

// ══════════════════════════════════════════════════════
// PT SLABS - read-only, backend-managed
// Basis: Monthly Gross (for slab lookup only)
// Deduction: applied on THIS MONTH'S prorated earnings (change #2)
// Odisha (OR): abolished w.e.f. 1 Apr 2026 → all zeros (change #4)
// Maharashtra Feb rule: top slab ₹300 instead of ₹200
// Karnataka Feb rule: top slab ₹300 instead of ₹200
// Maharashtra gender rule: women ≤ ₹25k/mo → exempt
// ══════════════════════════════════════════════════════
const PT_SLABS = {
  AP:[{from:0,to:15000,tax:0},{from:15001,to:20000,tax:150},{from:20001,to:Infinity,tax:200}],
  AS:[{from:0,to:10000,tax:0},{from:10001,to:15000,tax:150},{from:15001,to:24999,tax:180},{from:25000,to:Infinity,tax:208}],
  BR:[{from:0,to:25000,tax:0},{from:25001,to:41667,tax:83},{from:41668,to:83333,tax:167},{from:83334,to:Infinity,tax:208}],
  CG:[{from:0,to:8333,tax:0},{from:8334,to:12500,tax:130},{from:12501,to:16667,tax:150},{from:16668,to:20833,tax:200},{from:20834,to:Infinity,tax:208}],
  GJ:[{from:0,to:11999,tax:0},{from:12000,to:Infinity,tax:200}],
  HR:[{from:0,to:Infinity,tax:0}],
  JH:[{from:0,to:25000,tax:0},{from:25001,to:41667,tax:100},{from:41668,to:66667,tax:150},{from:66668,to:83333,tax:175},{from:83334,to:Infinity,tax:208}],
  KA:[{from:0,to:24999,tax:0},{from:25000,to:Infinity,tax:200}],
  KL:[{from:0,to:11999,tax:0},{from:12000,to:17999,tax:120},{from:18000,to:29999,tax:180},{from:30000,to:44999,tax:300},{from:45000,to:59999,tax:450},{from:60000,to:74999,tax:600},{from:75000,to:99999,tax:750},{from:100000,to:124999,tax:1000},{from:125000,to:Infinity,tax:1250}],
  MP:[{from:0,to:18750,tax:0},{from:18751,to:25000,tax:125},{from:25001,to:33333,tax:167},{from:33334,to:Infinity,tax:208}],
  MH:[{from:0,to:7500,tax:0},{from:7501,to:10000,tax:175},{from:10001,to:Infinity,tax:200}],
  MN:[{from:0,to:4167,tax:0},{from:4168,to:6250,tax:17},{from:6251,to:8333,tax:25},{from:8334,to:12500,tax:42},{from:12501,to:16667,tax:63},{from:16668,to:20833,tax:83},{from:20834,to:25000,tax:104},{from:25001,to:29167,tax:125},{from:29168,to:33333,tax:150},{from:33334,to:37500,tax:175},{from:37501,to:41667,tax:200},{from:41668,to:Infinity,tax:208}],
  ML:[{from:0,to:25000,tax:0},{from:25001,to:33333,tax:125},{from:33334,to:Infinity,tax:208}],
  MZ:[{from:0,to:13333,tax:0},{from:13334,to:25000,tax:125},{from:25001,to:Infinity,tax:208}],
  NL:[{from:0,to:Infinity,tax:0}],
  OR:[{from:0,to:Infinity,tax:0}], // ABOLISHED w.e.f. 1 April 2026 (Gazette 21 Apr 2026)
  PB:[{from:0,to:Infinity,tax:0}],
  PY:[{from:0,to:1000,tax:0},{from:1001,to:2000,tax:20},{from:2001,to:3000,tax:30},{from:3001,to:4000,tax:40},{from:4001,to:5000,tax:50},{from:5001,to:6000,tax:60},{from:6001,to:7000,tax:80},{from:7001,to:8000,tax:90},{from:8001,to:9000,tax:100},{from:9001,to:10000,tax:110},{from:10001,to:12000,tax:130},{from:12001,to:14000,tax:150},{from:14001,to:16000,tax:180},{from:16001,to:Infinity,tax:200}],
  SK:[{from:0,to:8333,tax:0},{from:8334,to:12500,tax:42},{from:12501,to:16667,tax:83},{from:16668,to:20833,tax:125},{from:20834,to:25000,tax:167},{from:25001,to:Infinity,tax:208}],
  TN:[{from:0,to:21000,tax:0},{from:21001,to:30000,tax:135},{from:30001,to:45000,tax:315},{from:45001,to:60000,tax:440},{from:60001,to:75000,tax:600},{from:75001,to:100000,tax:810},{from:100001,to:125000,tax:1040},{from:125001,to:Infinity,tax:1250}],
  TG:[{from:0,to:15000,tax:0},{from:15001,to:20000,tax:150},{from:20001,to:Infinity,tax:200}],
  TR:[{from:0,to:13333,tax:0},{from:13334,to:25000,tax:125},{from:25001,to:Infinity,tax:208}],
  WB:[{from:0,to:10000,tax:0},{from:10001,to:15000,tax:110},{from:15001,to:25000,tax:130},{from:25001,to:40000,tax:150},{from:40001,to:75000,tax:174},{from:75001,to:Infinity,tax:208}],
  UP:[{from:0,to:12000,tax:0},{from:12001,to:15000,tax:125},{from:15001,to:25000,tax:150},{from:25001,to:Infinity,tax:200}],
  UK:[{from:0,to:Infinity,tax:0}],DL:[{from:0,to:Infinity,tax:0}],GA:[{from:0,to:Infinity,tax:0}],
  HP:[{from:0,to:Infinity,tax:0}],RJ:[{from:0,to:Infinity,tax:0}],CH:[{from:0,to:Infinity,tax:0}],
  JK:[{from:0,to:Infinity,tax:0}],DN:[{from:0,to:Infinity,tax:0}],
};

// ══════════════════════════════════════════════════════
// LWF DATA - read-only, backend-managed
// emp/er = flat ₹ per applicable period
// freq: 'monthly'|'halfyearly'|'annual'|'nil'
// Haryana: revised to emp=35, er=70 w.e.f. 1 Jan 2026
//   (HLWB/REV/2026/3436 dated 08 May 2026; previously 34/68)
// LWF is deducted on THIS MONTH'S prorated earnings (change #3)
// ══════════════════════════════════════════════════════
const LWF_DATA = {
  AP:{emp:20,er:40,freq:'annual'},
  AS:{emp:20,er:20,freq:'annual'},
  GJ:{emp:6,er:12,freq:'halfyearly'},
  HR:{emp:35,er:70,freq:'monthly'}, // Updated w.e.f. 1 Jan 2026
  KA:{emp:50,er:100,freq:'annual'},
  KL:{emp:40,er:160,freq:'annual'},
  MH:{emp:25,er:75,freq:'halfyearly'},
  MP:{emp:20,er:40,freq:'annual'},
  OR:{emp:20,er:40,freq:'annual'},
  PB:{emp:40,er:160,freq:'monthly'},
  TN:{emp:20,er:40,freq:'annual'},
  TG:{emp:2,er:5,freq:'halfyearly'},
  WB:{emp:3,er:30,freq:'halfyearly'},
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
    showMsg('ok',`✓ Extracted ${filtered.length} pay head${filtered.length>1?'s':''}.${pfMsg} Verify EPF fields in Step 4.`);
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
// Rule A: Entered ≈ 12% of Basic (within ₹5)
//   Monthly  = 12% × Basic  (full month)
//   ThisMonth= 12% × (Basic × payable/calDays)
//
// Rule B: Entered = 1800 AND Basic > ₹15,000
//   Monthly  = ₹1,800  (cap: statutory 12% of ₹15k ceiling)
//   ThisMonth= ₹1,800 × payable/calDays
//   Sub-rule: if Basic ≤ ₹15,000 → 12% × (gross−HRA−var) prorated
//
// Rule C: Entered = 0 → pfMode='none', row not shown
//
// VPF = vpfPct% × Basic  (voluntary, capped at 88% OR 12% of Basic, whichever is lower)
// ══════════════════════════════════════════════════════════════
function calcPF(vpfPct, proratedGross, proratedHRA, proratedReimbs, _calDays, _payable){
  const basic=getBasic();
  
  // ⚠ FIX: Cap VPF - cannot exceed 88% OR 12% of basic (whichever is lower)
  let effectiveVpfPct = vpfPct || 0;
  if (effectiveVpfPct > 0) {
    const proposedVPF = basic * (effectiveVpfPct / 100);
    const maxVPF_88pct = basic * 0.88;  // 88% cap
    const maxVPF_12pct = basic * 0.12;  // 12% cap
    const maxEligible = Math.min(maxVPF_88pct, maxVPF_12pct);  // Take lower limit
    
    if (proposedVPF > maxEligible) {
      // Recalculate effective percentage to not exceed cap
      effectiveVpfPct = (maxEligible / basic) * 100;
    }
  }
  
  const vpf=R(basic*(effectiveVpfPct||0)/100);          // Monthly VPF: capped
  const vpfThisMonth=R(R(basic*_payable/_calDays)*(effectiveVpfPct||0)/100); // This month VPF: prorated
  const entered=R(parseFloat(window.__spRoot.getElementById('empPFInput').value)||0);

  // Sync readonly employer EPF display field
  window.__spRoot.getElementById('erPFInput').value=
    entered?'₹'+entered.toLocaleString('en-IN')+'/mo':'';

  // Rule C - PF not opted
  if(entered===0&&vpf===0){
    window.__spRoot.getElementById('erPFInput').value='Nil';
    return{empPF_monthly:0,empPF_thisMonth:0,erPF_monthly:0,
           erPF_thisMonth:0,vpf:0,pfMode:'none',pfCapApplies:false};
  }

  const twelveOfBasic = basic>0 ? R(basic*0.12) : 0;
  const isRuleA = basic>0 && Math.abs(entered-twelveOfBasic)<=5;
  const isRuleB = entered===1800 && basic>EPF_WAGE_CEILING;

  let empPF_monthly, empPF_thisMonth, erPF_monthly, erPF_thisMonth;
  let pfMode='letter_value', pfCapApplies=false;

  if(isRuleA){
    // Rule A: 12% of Basic / 12% of prorated Basic
    pfMode='12pct_basic';
    empPF_monthly  = twelveOfBasic + vpf;
    erPF_monthly   = twelveOfBasic;
    const prorBasic = R(basic/_calDays*_payable);
    empPF_thisMonth = R(prorBasic*0.12) + vpfThisMonth;
    erPF_thisMonth  = R(prorBasic*0.12);

  } else if(isRuleB){
    // Rule B: statutory cap ₹1,800 (12% of ₹15k ceiling) when Basic > ₹15k
    // This Month = ₹1,800 flat - PF is on actual earnings, not day-prorated
    pfMode='capped_1800'; pfCapApplies=true;
    empPF_monthly   = 1800 + vpf;
    erPF_monthly    = 1800;
    empPF_thisMonth = 1800 + vpfThisMonth;   // flat ₹1,800 + prorated VPF
    erPF_thisMonth  = 1800;
    // Sub-rule: if basic ≤ ₹15k → 12% of (gross−HRA−var), capped at ₹1,800
    if(basic<=EPF_WAGE_CEILING){
      pfCapApplies=false;
      const actualBase=Math.max(0,proratedGross-proratedHRA-proratedReimbs);
      empPF_thisMonth = Math.min(R(actualBase*0.12), 1800) + vpfThisMonth;
      erPF_thisMonth  = Math.min(R(actualBase*0.12), 1800);
      const monthlyBase=Math.max(0,getGross()-getHRA()-getReimbs());
      empPF_monthly   = Math.min(R(monthlyBase*0.12), 1800) + vpf;
      erPF_monthly    = Math.min(R(monthlyBase*0.12), 1800);
    }

  } else {
    // Letter value (custom / non-standard)
    pfMode='letter_value';
    empPF_monthly  = entered + vpf;
    erPF_monthly   = entered;
    if(basic>0&&basic<=EPF_WAGE_CEILING){
      // Low basic → this month = 12% of prorated (gross−HRA−var), capped at entered
      const prorBase=Math.max(0,proratedGross-proratedHRA-proratedReimbs);
      empPF_thisMonth = R(prorBase*0.12) + vpfThisMonth;
      erPF_thisMonth  = R(prorBase*0.12);
    } else {
      // High basic with custom value → prorate entered amount
      empPF_thisMonth = Math.round(entered*_payable/_calDays) + vpfThisMonth;
      erPF_thisMonth  = Math.round(entered*_payable/_calDays);
    }
  }
  return{empPF_monthly,empPF_thisMonth,erPF_monthly,erPF_thisMonth,vpf,vpfThisMonth,pfMode,pfCapApplies};
}

// ══════════════════════════════════════════════════════
// ESI - Change #3
// Eligibility: monthly gross ≤ ₹21,000
// Monthly column: 0.75% of monthly gross
// This Month column: 0.75% of prorated gross (this month's earnings)
// ══════════════════════════════════════════════════════
function calcESI(monthlyGrossIn, proratedGross){
  // #1+#8: monthlyGrossIn for eligibility & monthly col; proratedGross for thisMonth col
  const monthlyGross=monthlyGrossIn||getGross();
  if(!proratedGross) proratedGross=monthlyGross;
  if(monthlyGross>21000)return{esiEmp_monthly:0,esiEmp_thisMonth:0,esiEr_monthly:0,esiEr_thisMonth:0,applies:false};
  return{
    esiEmp_monthly:R(monthlyGross*0.0075),
    esiEmp_thisMonth:R(proratedGross*0.0075),
    esiEr_monthly:R(monthlyGross*0.0325),
    esiEr_thisMonth:R(proratedGross*0.0325),
    applies:true
  };
}

// ══════════════════════════════════════════════════════
// PT - Change #2
// Slab lookup: on monthly gross (to find the applicable PT rate)
// Deduction: PT flat amount deducted on THIS month's prorated earnings
//   i.e. if PT slab says ₹200 but prorated gross is only ₹12,000,
//   the actual deduction is ₹200 (PT is a flat amount, not a %)
//   - PT remains flat in "this month" column because it is a flat slab amount
//   - But it is only deducted if this month's earnings exceed the slab minimum
// Note: PT is a fixed slab amount, so "deducting on earnings" means:
//   we use the slab based on monthly gross, but only apply it if
//   prorated earnings ≥ the slab's lower bound.
// TN SPECIAL: Half-yearly PT for Sept(9) and March(3): 210 instead of 208
//            Ensures yearly = 2500 and half-yearly = 1250
// ══════════════════════════════════════════════════════
function getPT(state, monthlyGross, proratedGross, month, gender){
  if(!state||state==='NONE')return{ptMonthly:0,ptThisMonth:0};
  const slabs=PT_SLABS[state];if(!slabs)return{ptMonthly:0,ptThisMonth:0};
  // Maharashtra women exemption
  if(state==='MH'&&gender==='F'&&monthlyGross<=25000)return{ptMonthly:0,ptThisMonth:0};
  // Find slab from monthly gross
  const slab=slabs.find(s=>monthlyGross>=s.from&&monthlyGross<=s.to);
  if(!slab||slab.tax===0)return{ptMonthly:0,ptThisMonth:0};
  // Feb special rules
  let taxAmt=slab.tax;
  if(state==='MH'&&month&&parseInt(month.split('-')[1])===2&&taxAmt===200)taxAmt=300;
  if(state==='KA'&&month&&parseInt(month.split('-')[1])===2&&taxAmt===200)taxAmt=300;
  // TN (Tamil Nadu) SPECIAL: Sept and March have 210 (half-yearly handling)
  // This ensures 6 months × 210 = 1260 (approx 1250 half-yearly), 12 months total = ~2500
  if(state==='TN'&&month){
    const moNum=parseInt(month.split('-')[1]);
    if((moNum===9||moNum===3)&&taxAmt===1250)taxAmt=210; // Sept & March special rate
  }
  // PT is a flat amount - deducted in full if employee is in applicable slab
  // In proration month, PT is deducted only if prorated earnings ≥ slab lower bound
  const ptThisMonth=(proratedGross>=slab.from)?taxAmt:0;
  return{ptMonthly:taxAmt,ptThisMonth};
}

// ══════════════════════════════════════════════════════
// LWF - Change #3
// LWF is a flat ₹ amount per applicable period
// Monthly column: shows full LWF amount if applicable this month
// This Month column: shows same flat amount (LWF is not a %, it's flat)
// Both columns show the same value - LWF is always flat
// ══════════════════════════════════════════════════════
function getLWFFreq(state){
  const d=LWF_DATA[state];
  return d?d.freq:'monthly';
}
function getLWF(state,month){
  if(!state||state==='NONE')return{emp:0,er:0,active:false};
  const d=LWF_DATA[state];if(!d||d.freq==='nil')return{emp:0,er:0,active:false};
  if(d.freq==='monthly')return{emp:d.emp,er:d.er,active:true};
  const mo=month?parseInt(month.split('-')[1]):0;
  if(d.freq==='halfyearly'&&(mo===6||mo===12))return{emp:d.emp,er:d.er,active:true};
  if(d.freq==='annual'&&mo===12)return{emp:d.emp,er:d.er,active:true};
  return{emp:0,er:0,active:false};
}

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
function calcAnnualTax(taxable,r){
  let tax=calcBaseSlabTax(taxable,r);
  // FIX13: proper 87A rebate - up to ₹12,500 off tax (not a cliff)
  if(r==='new'&&taxable<=1200000)tax=0; // New: full rebate ≤₹12L
  if(r==='old'&&taxable<=500000)tax=Math.max(0,tax-Math.min(tax,12500));
  // FIX12: Surcharge on income >₹50L
  let surcharge=0;
  if(taxable>10000000)     surcharge=tax*0.15; // 15% above ₹1Cr
  else if(taxable>5000000) surcharge=tax*0.10; // 10% on ₹50L–₹1Cr
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

  // Retiral perquisite u/s 17(2)(vii): (Employer EPF + Employer NPS contribution) > ₹7.5L
  // IMPORTANT: use ACTUAL NPS contribution (npsErAnnual), NOT the exempted cap (npsExemptAnnual)
  // The 14%/10% cap is only for 80CCD(2) exemption - perquisite is on actual contribution.
  // If employer contributes 15% of Basic to NPS, full 15% amount is used here.
  // This means perquisite is regime-neutral - same for New and Old regime.
  const erEPFAnnual=R(erEPFP+erEPFM*fullMos);
  const combinedRetiral=erEPFAnnual+npsErAnnual; // actual EPF + actual NPS contribution
  const retiralThreshold=R(750000*totalMos/12);
  const perquisiteAdd=Math.max(0,combinedRetiral-retiralThreshold);

  // PT u/s 16(iii) - old regime only
  const ptDed=r==='old'?ptAnnual:0;
  // 80C: employee EPF - old regime only, cap already applied by caller
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
  window.__spRoot.getElementById('erPFInput').value=v?'₹'+v.toLocaleString('en-IN')+'/mo':'';
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
  window.__spRoot.getElementById('vpfDisp').value=vpf>0&&basicMissing?'⚠ Add Basic Salary row':vpfAmt?`₹${fmt(vpfAmt)}/mo`:'-';
  const npsAmt=calcNPS(nps);
  window.__spRoot.getElementById('npsDisp').value=nps>0&&basicMissing?'⚠ Add Basic Salary row':npsAmt?`₹${fmt(npsAmt)}/mo`:'-';
  const monthlyGross=getGross();
  const esi=calcESI(monthlyGross, monthlyGross); // preview: no proration context
  window.__spRoot.getElementById('esiEmpDisp').value=esi.applies?`₹${fmt(esi.esiEmp_monthly)}/mo (0.75%)`:'Not applicable (Gross > ₹21k)';
  window.__spRoot.getElementById('esiErDisp').value=esi.applies?`₹${fmt(esi.esiEr_monthly)}/mo (3.25%)`:'-';
  if(state==='NONE'){window.__spRoot.getElementById('ptDisp').value='-';window.__spRoot.getElementById('lwfDisp').value='-';return;}
  const pt=getPT(state,monthlyGross,monthlyGross,mv,gender);
  window.__spRoot.getElementById('ptDisp').value=pt.ptMonthly?`₹${fmt(pt.ptMonthly)}/mo`:'₹0 (exempt/nil)';
  const lwf=getLWF(state,mv);
  window.__spRoot.getElementById('lwfDisp').value=lwf.active?`₹${fmt(lwf.emp)} this month`:`₹0 (not applicable)`;
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
  const pfRes=calcPF(vpfPct,totP,proratedHRA,proratedReimbs,calDays,payable);
  const{empPF_monthly,empPF_thisMonth,erPF_monthly,erPF_thisMonth,vpf,pfCapApplies}=pfRes;

  // Update PF display fields
  window.__spRoot.getElementById('vpfDisp').value=vpf?`₹${fmt(vpf)}/mo`:'-';
  window.__spRoot.getElementById('npsDisp').value=npsM?`₹${fmt(npsM)}/mo (${npsPct}% of Basic)`:'-';

  // ── ESI (Change #3) ──
  const esiRes=calcESI(totM, totP); // monthly gross for eligibility; prorated for thisMonth
  const{esiEmp_monthly,esiEmp_thisMonth,esiEr_monthly=0,esiEr_thisMonth=0,applies:esiApplies}=esiRes;
  window.__spRoot.getElementById('esiEmpDisp').value=esiApplies?`₹${fmt(esiEmp_monthly)}/mo (0.75%)`:'Not applicable (Gross > ₹21k)';
  window.__spRoot.getElementById('esiErDisp').value=esiApplies?`₹${fmt(esiEr_monthly)}/mo (3.25%)`:'-';

  // ── PT (Change #2) - slab on monthly gross, deduct on prorated earnings ──
  const ptRes=getPT(state,totM,totP,mv,gender); // monthlyGross=totM (slab), proratedGross=totP (deduct)
  const{ptMonthly,ptThisMonth}=ptRes;

  // ── LWF - flat amount ──
  const lwfR=getLWF(state,mv);
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
  // PT annual: full slab × all months from DOJ (joining month always full slab)
  const dojMonthNum=dojVal?new Date(dojVal).getUTCMonth()+1:4;
  // Feb PT extra: only when Feb actually falls between DOJ month and March
  // AND we haven't already passed Feb (proration month must be before Feb, i.e. not March)
  // In FY (Apr=4 to Mar=3): Feb is month 2. It falls after DOJ if dojMonth<=1 (Jan/Feb) or dojMonth>=4 (Apr-Dec)
  // But if proration month is March (mo===3), Feb has already passed - no extra.
  const febFallsAfterJoin=(dojMonthNum>=4||dojMonthNum<=1)&&mo!==3&&mo!==2;
  const ptFebExtra=(state==='MH'||state==='KA')&&febFallsAfterJoin?100:0;
  const ptAnnual=R(ptMonthly+ptMonthly*fullMos+ptFebExtra);
  // Call DOJ-exact TDS
  // 80C: employee PF (joining month + remaining full months), cap ₹1.5L
  const pfAnnual80C=pfRes.pfMode!=='none'
    ? Math.min(R(empPF_thisMonth + empPF_monthly*fullMos), 150000)
    : 0;
  const tdsRes=calcTDS(totM,regime,npsM,basicM,erPF_monthly,ptAnnual,tdsGrossP,tdsNpsErP,tdsErEPFP,tdsBasicP,fullMos,totalMos,pfAnnual80C);
  const tdsM=tdsRes.tdsM; // this month's actual TDS deduction
  const tdsProjected = fullMos > 0
    ? R((tdsRes.annualTax - tdsM) / fullMos)
    : tdsM; // last month of FY - nothing left to spread, charge remaining balance now
  const tdsDiffers=Math.abs(tdsM-tdsProjected)>1;

  // ── Totals - both columns ──
  const ptMonthlyForDed=regime==='old'?ptMonthly:0; // PT tax benefit old regime only
  const dedM=empPF_monthly+(esiApplies?esiEmp_monthly:0)+ptMonthlyForDed+lwfEm+npsM+tdsProjected;
  const npsPrForDed=R(npsM/calDays*payable);
  const dedP=empPF_thisMonth+(esiApplies?esiEmp_thisMonth:0)+ptThisMonth+lwfEm+npsPrForDed+tdsM;

  const netM=R(grossWithNPS_M-dedM);
  const netP=Math.max(0,R(grossWithNPS_P-dedP)); // FIX26: cannot show negative take-home

  // ── Tiles ──
  window.__spRoot.getElementById('resTiles').innerHTML=`
    <div class="tile"><span class="tile-v">${payable}/${calDays}</span><div class="tile-l">Payable Days</div></div>
    <div class="tile tg"><span class="tile-v">₹${fmt(grossWithNPS_P)}</span><div class="tile-l">Gross This Month</div></div>
    <div class="tile tn"><span class="tile-v">₹${fmt(netP)}</span><div class="tile-l">Net Take-Home</div></div>`;

  // ── Result Table ──
  let tb='';
  tb+=`<tr class="s-hdr"><td colspan="3">Earnings - Prorated by Calendar Days</td></tr>`;
  earnR.forEach(r=>{
    const badge=''; // variable tag removed from result view
    tb+=`<tr><td>${eH(r.name)}${badge}</td><td>₹${fmt(r.m)}</td><td>₹${fmt(r.p)}</td></tr>`;
  });
  if(npsM>0){
    const npsPr=R(npsM/calDays*payable);
    tb+=`<tr><td>Employer NPS</td><td>₹${fmt(npsM)}</td><td>₹${fmt(npsPr)}</td></tr>`;
  }
  tb+=`<tr class="earn-tot"><td><strong>Gross Earnings</strong></td><td><strong>₹${fmt(grossWithNPS_M)}</strong></td><td><strong>₹${fmt(grossWithNPS_P)}</strong></td></tr>`;

  tb+=`<tr class="s-hdr"><td colspan="3">Deductions</td></tr>`;

  const{pfMode}=pfRes;
  if(pfMode!=='none'){
    const pfLabel=vpf>0?'EPF + VPF':'EPF';
    // #12: PF monthly vs this month display
    const pfMoNote='';  // Removed: "full month rate"
    const pfThisNote='';  // Removed: "prorated this month"
    tb+=`<tr class="ded"><td>${pfLabel}</td><td>₹${fmt(empPF_monthly)}${pfMoNote}</td><td>₹${fmt(empPF_thisMonth)}${pfThisNote}</td></tr>`;
  }

  if(esiApplies)tb+=`<tr class="ded"><td>Employee ESI (0.75%)</td><td>₹${fmt(esiEmp_monthly)}</td><td>₹${fmt(esiEmp_thisMonth)}</td></tr>`;

  if(state!=='NONE'&&ptMonthly>0)tb+=`<tr class="ded"><td>Professional Tax - ${eH(stateName)}</td><td style="color:var(--ts);font-style:italic">-</td><td>₹${fmt(ptThisMonth)}</td></tr>`;
  else if(state==='OR')tb+=`<tr class="sub"><td>Professional Tax - Odisha<span class="itnote">abolished Apr 2026</span></td><td>₹0</td><td>₹0</td></tr>`;

  if(lwfEm>0)tb+=`<tr class="ded"><td>Labour Welfare Fund - ${eH(stateName)}</td><td style="color:var(--ts);font-style:italic">-</td><td>₹${fmt(lwfEm)}</td></tr>`;
  if(npsM>0){
    const npsPrDed=R(npsM/calDays*payable);
    tb+=`<tr class="ded"><td>Employer NPS</td><td>₹${fmt(npsM)}</td><td>₹${fmt(npsPrDed)}</td></tr>`;
  }
  // Single TDS row - Monthly = projected/mo, This Month = actual DOJ-prorated
  const _tdsSub='';  // Removed: "proj. ₹.../mo · actual ₹..."
  tb+=`<tr class="ded"><td>Income Tax / TDS${_tdsSub}</td><td>₹${fmt(tdsProjected)}</td><td>₹${fmt(tdsM)}</td></tr>`;

  tb+=`<tr class="ded-tot"><td><strong>Total Deductions</strong></td><td><strong>₹${fmt(dedM)}</strong></td><td><strong>₹${fmt(dedP)}</strong></td></tr>`;
  tb+=`<tr class="net"><td><strong>Net Take-Home</strong></td><td><strong>₹${fmt(netM)}</strong></td><td><strong>₹${fmt(netP)}</strong></td></tr>`;

  tb+=`<tr class="s-hdr"><td colspan="3">Employer Costs - Informational Only</td></tr>`;
  tb+=`<tr class="sub"><td>Employer PF</td><td>₹${fmt(erPF_monthly)}</td><td>₹${fmt(erPF_thisMonth)}</td></tr>`;
  if(esiApplies)tb+=`<tr class="sub"><td>Employer ESI (3.25%)</td><td>₹${fmt(esiEr_monthly)}</td><td>₹${fmt(esiEr_thisMonth)}</td></tr>`;
  if(lwfErm>0)tb+=`<tr class="sub"><td>Employer LWF - ${eH(stateName)}</td><td style="color:var(--ts);font-style:italic">-</td><td>₹${fmt(lwfErm)}</td></tr>`;

  window.__spRoot.getElementById('resBody').innerHTML=tb;
  window.__spRoot.getElementById('resEmp').textContent=`${emp} · ${monthName}`;

  const w=window.__spRoot.getElementById('resWarn');
  const _perqNote=tdsRes.perquisiteAdd>0?` EPF+NPS exceeded ₹${fmt(Math.round(750000*totalMos/12))} (₹7.5L × ${totalMos}/12 months) - retiral perquisite ₹${fmt(tdsRes.perquisiteAdd)} added to taxable income u/s 17(2)(vii).`:'';
  const _surNote=tdsRes.taxable>5000000?' Surcharge applied (taxable >₹50L).':'';
  const _priorFYNote=!dojInThisFY&&dojVal
    ?' Prior-FY joiner: TDS assumes full 12-month income. Actual may differ if earnings were lower earlier in FY.':'';
  const _esiSmallNote=esiApplies&&totP<5000
    ?` ESI deducted on monthly gross ≤₹21k - prorated gross this month is small (₹${fmt(totP)}) but ESI applies on full monthly basis.`:'';
  const _tdsDiffNote=tdsDiffers?` TDS this month (₹${fmt(tdsM)}) differs from projected monthly TDS (₹${fmt(tdsProjected)}) due to proration.`:'';
  w.innerHTML=`<span>⚠</span><div><strong>TDS estimate</strong> (DOJ-exact ${totalMos}-month basis). Actual varies with 80C/HRA/80D.${_perqNote}${_surNote}${_tdsDiffNote}${_priorFYNote}${_esiSmallNote} Gratuity excluded.</div>`;
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
  buildTaxCmp({totM,totP,npsM,basicM,empPF_monthly,empPF_thisMonth,erPF_monthly,erPF_thisMonth,esiApplies,esiEmp_monthly,esiEmp_thisMonth,ptMonthly,ptThisMonth,ptAnnual,lwfEm,lwfFreq,tdsM,tdsProjected,tdsRes,totalMos,fullMos,regime,calDays,payable,pfCapApplies,pfMode});

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
        pfMode,pfCapApplies}=o;

  const regimes=['new','old'];
  const labels=['New Regime','Old Regime'];
  const npsPr=R(npsM/calDays*payable);

  // Compute full details for both regimes
  const pf80CThis=pfMode&&pfMode!=='none'?Math.min(R(empPF_thisMonth+empPF_monthly*fullMos),150000):0;
  const pf80CProj=pfMode&&pfMode!=='none'?Math.min(R(empPF_monthly*12),150000):0;

  const results=regimes.map(r=>{
    const res=calcTDS(totM,r,npsM,basicM,erPF_monthly,ptAnnual,
                      totP,npsPr,erPF_thisMonth,R(basicM/calDays*payable),fullMos,totalMos,pf80CThis);
    const resProj=calcTDS(totM,r,npsM,basicM,erPF_monthly,ptAnnual,
                          totM,npsM,erPF_monthly,basicM,11,12,pf80CProj);

    const stdDed=r==='new'?75000:50000;
    const capPct=r==='new'?0.14:0.10;
    const npsExempt=res.npsExemptAnnual;
    const ptExempt=r==='old'?ptAnnual:0;
    const perqAdd=res.perquisiteAdd||0;

    // Monthly deductions for net calc
    const ptForDed=r==='old'?ptMonthly:0;
    const tdsForThis = res.tdsM; // this month's actual TDS
    const tdsForMonth = fullMos > 0
      ? R((res.annualTax - tdsForThis) / fullMos)
      : tdsForThis;
    // #5: Use amortised LWF for monthly column (annual/half-yearly states should spread cost)
    // lwfEm is the this-month amount; for annual states this is 0 in most months
    // We use lwfAnnual/12 for comparison table monthly net to give a realistic monthly picture
    const lwfAnnual=lwfEm*(o.lwfFreq==='monthly'?12:o.lwfFreq==='halfyearly'?2:1);
    const lwfMonthlyAvg=R(lwfAnnual/12);
    const dedMonth=empPF_monthly+(esiApplies?esiEmp_monthly:0)+ptForDed+lwfMonthlyAvg+npsM+tdsForMonth;
    const dedThis=empPF_thisMonth+(esiApplies?esiEmp_thisMonth:0)+ptThisMonth+lwfEm+npsPr+tdsForThis;
    const netMonthly=R(totM-dedMonth);
    const netThisMonth=Math.max(0,R(totP-dedThis));

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
  const rupee=v=>`₹${fmt(v)}`;
  const dash=`<span style="color:var(--ts)">-</span>`;

  // 1. This month earnings
  tbl+=row('This Month Earnings',rupee(totP),rupee(totP));
  // 2. Projected Monthly Earnings
  tbl+=row('Projected Monthly Earnings',rupee(totM),rupee(totM));
  // 3. Standard Deduction
  tbl+=row('(-) Standard Deduction',`−₹${fmt(results[0].stdDed)}`,`−₹${fmt(results[1].stdDed)}`);
  // 4. NPS Exemption 80CCD(2)
  tbl+=row('(-) NPS Exempt 80CCD(2)',
    results[0].npsExempt>0?`−₹${fmt(results[0].npsExempt)}`:dash,
    results[1].npsExempt>0?`−₹${fmt(results[1].npsExempt)}`:dash);
  // 5. PT exemption - old regime only
  tbl+=row('(-) Prof. Tax Exemption u/s 16(iii)',
    dash,
    results[1].ptExempt>0?`−₹${fmt(results[1].ptExempt)}`:dash);
  // 5b. 80C: Employee EPF contribution - old regime only, DOJ-aware, cap ₹1.5L/yr
  // = actual PF this joining month + full monthly PF × remaining full months
  // e.g. DOJ June: 1800 (June) + 1800×9 (Jul-Mar) = ₹18,000
  if(pf80CThis>0){
    // #4: joining month is prorated; subsequent months are full monthly EPF
    tbl+=row('(-) 80C EPF u/s 80C (Old Regime)<span style="display:block;font-size:.6rem;color:var(--ts)">Joining month prorated + full months × remaining</span>',
      dash,`−₹${fmt(pf80CThis)}`);
  }
  // 6. Additional taxable income (perquisites)
  const perqNew=results[0].perqAdd; const perqOld=results[1].perqAdd;
  if(perqNew>0||perqOld>0){
    // Perquisite is now regime-neutral (based on actual contribution, not exemption cap)
    const _pNote=(perqNew>0)
      ?`<span style="display:block;font-size:.62rem;color:#D97706;margin-top:1px">Employer EPF + NPS contribution exceeds ₹7.5L - taxed u/s 17(2)(vii)</span>`:'';
    tbl+=`<tr style="background:#FFFBEB">
      <td style="padding:6px 8px;font-size:.77rem;color:#D97706">(+) Retiral Perquisite u/s 17(2)(vii)${_pNote}</td>
      <td style="text-align:right;padding:6px 8px;font-weight:600;color:#D97706">${perqNew>0?`+₹${fmt(perqNew)}`:dash}</td>
      <td style="text-align:right;padding:6px 8px;font-weight:600;color:#D97706">${perqOld>0?`+₹${fmt(perqOld)}`:dash}</td>
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
    <td style="text-align:right" class="${best===0?'winner':'loser'}"><strong>${rupee(results[0].netMonthly)}</strong></td>
    <td style="text-align:right" class="${best===1?'winner':'loser'}"><strong>${rupee(results[1].netMonthly)}</strong></td></tr>`;
  // 11. This Month Net
  tbl+=`<tr><td>This Month Net</td>
    <td style="text-align:right" class="${best===0?'winner':'loser'}">${rupee(results[0].netThisMonth)}</td>
    <td style="text-align:right" class="${best===1?'winner':'loser'}">${rupee(results[1].netThisMonth)}</td></tr>`;

  // Annual tax saving
  tbl+=`<tr><td colspan="3" style="text-align:center;font-weight:700;color:var(--pm);padding:8px 8px 4px">
    ${diff===0?'Both regimes equal - ₹0 difference':((results[0].annTax<results[1].annTax?'New':'Old')+' Regime saves ₹'+fmt(diff)+'/yr · ₹'+fmt(R(diff/12))+'/mo avg')}
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
    ?`<div class="ok"><span>✓</span><div><strong>Both regimes are equivalent</strong> for your income level - ₹0 difference. No action needed.<span style="display:block;margin-top:3px;font-size:.62rem;opacity:.8">Old regime may improve further with 80C/HRA/80D declarations.</span></div></div>`
    :`<div class="${isOptimal?'ok':'warn'}"><span>${isOptimal?'✓':'⚠'}</span><div><strong>${isOptimal?'You are on the optimal regime.':'Consider switching regime!'}</strong> ${labels[best]} saves ₹${fmt(diff)}/yr (₹${fmt(R(diff/12))}/mo).<span style="display:block;margin-top:3px;font-size:.62rem;opacity:.8">Old regime may improve further with 80C/HRA/80D declarations.</span></div></div>`;
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
  const Rs=n=>n?'Rs.'+f(n):'--'; // jsPDF built-in fonts don't support ₹ glyph
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
    taxRows+=cmpRow('(−) NPS Exempt 80CCD(2)',
      tr[0].npsExempt>0?rm(tr[0].npsExempt):dash,
      tr[1].npsExempt>0?rm(tr[1].npsExempt):dash);
    taxRows+=cmpRow('(−) Prof. Tax Exemption u/s 16(iii)',
      dash, tr[1].ptExempt>0?rm(tr[1].ptExempt):dash);
    if(pf80C>0) taxRows+=cmpRow('(−) 80C EPF Deduction (Old Regime)', dash, rm(pf80C));
    if(tr[0].perqAdd>0||tr[1].perqAdd>0){
      taxRows+=cmpRow('(+) Retiral Perquisite u/s 17(2)(vii)',
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

      // ₹ cannot render in jsPDF standard Helvetica - use Rs. prefix
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
            // Strip ₹ glyph - not supported in built-in fonts
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
        if(d.npsM>0) crow('(-) NPS Exempt 80CCD(2)', tcr[0].npsExempt>0?neg(tcr[0].npsExempt):'--', tcr[1].npsExempt>0?neg(tcr[1].npsExempt):'--');
        crow('(-) Prof. Tax Exemption u/s 16(iii)', '--', tcr[1].ptExempt>0?neg(tcr[1].ptExempt):'--');
        if(pf80Cv>0) crow('(-) 80C EPF Deduction (Old Regime)', '--', neg(pf80Cv));
        if(tcr[0].perqAdd>0||tcr[1].perqAdd>0){
          crow('(+) Retiral Perquisite u/s 17(2)(vii)',
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
