// Payroll compliance calendar: due-date rules for FY 2026-27.
// Only dates checked against the Act, Rules or notification are in this file.
// Update here when a notification changes a date; the page and the calendar both read from it.
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));


const MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December'];
const MON3=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DOW=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const FYM=Array.from({length:12},(_,i)=>({y:i<9?2026:2027,m:(3+i)%12}));   // Apr 2026 ... Mar 2027
const FY_LABEL='FY 2026-27';

const TOPICS={
  epf:{label:'EPF',name:'Provident Fund (EPF)',scope:'central',desc:'ECR and payment, every month'},
  esi:{label:'ESI',name:'ESI',scope:'central',desc:'Contribution, every month'},
  tds:{label:'TDS on salary',name:'TDS on salary',scope:'central',desc:'Deposit, returns and Form 16'},
  pt:{label:'Professional Tax',name:'Professional Tax',scope:'state',desc:'Depends on your state'},
  lwf:{label:'Labour Welfare Fund',name:'Labour Welfare Fund',scope:'state',desc:'Depends on your state'},
  mine:{label:'My event',name:'My event',scope:'central',desc:'Added by you'}
};
const STATES=['Andaman and Nicobar Islands','Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chandigarh','Chhattisgarh','Dadra and Nagar Haveli and Daman and Diu','Delhi','Goa','Gujarat','Haryana','Himachal Pradesh','Jammu and Kashmir','Jharkhand','Karnataka','Kerala','Ladakh','Lakshadweep','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Puducherry','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal'];

/* ---------- helpers ---------- */
const pad=n=>String(n).padStart(2,'0');
const key=(y,m,d)=>y+'-'+pad(m+1)+'-'+pad(d);
const parse=k=>{const [y,m,d]=k.split('-').map(Number);return new Date(y,m-1,d)};
const prevM=(y,m)=>m===0?{y:y-1,m:11}:{y,m:m-1};
const monthName=(y,m)=>MONTHS[m]+' '+y;
const slug=s=>s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
let uid=0;
function mk(o){return Object.assign({id:'e'+(++uid),stateId:'IN',link:null,note:''},o)}

/* ---------- central rules ---------- */
function epf(){return FYM.map(({y,m})=>{const p=prevM(y,m);return mk({topic:'epf',date:key(y,m,15),
  title:'PF contribution and ECR - '+monthName(p.y,p.m)+' wages',
  detail:'File the ECR and pay the challan on the EPFO Unified Portal by the 15th of the month after the wage month.',
  status:'verified',source:'Paragraph 38, EPF Scheme 1952 (within 15 days of the close of the month).',
  link:{label:'Generate the ECR file',href:'/pf-ecr-creator'}})})}
function esi(){return FYM.map(({y,m})=>{const p=prevM(y,m);
  const ooc=(m===4||m===10)?'This is the April/October wage month, so the "Out of Coverage" reason code (4) can be used in this file.':'';
  return mk({topic:'esi',date:key(y,m,15),
  title:'ESI contribution - '+monthName(p.y,p.m)+' wages',
  detail:'Upload the monthly contribution file and pay on the ESIC portal by the 15th of the month after the wage month. '+ooc,
  status:'verified',source:'Regulation 31, ESI (General) Regulations 1950, as amended (15 days from June 2017 contributions).',
  link:{label:ooc?'ESIC reason codes explained':'Build the ESIC file',href:ooc?'/blog/esic-mc-file-upload-template-reason-codes':'/esic-mc-creator'}})})}
const SRC_TDS='Income-tax Rules, 2026: rule 218(2) (on or before 7 days from month end; 30 April for March), text on incometaxindia.gov.in and ICAI; rule 219(4) (31 Jul, 31 Oct, 31 Jan, 31 May). Form 138 (return) and Form 130 (certificate, 15 June): Income Tax Department FAQs on Form 130, incometaxindia.gov.in. Old-Act items: Income-tax Rules, 1962, rules 30, 31, 31A (primary).';
function tds(){
  const out=[];
  out.push(mk({topic:'tds',date:'2026-04-30',title:'TDS deposit - March 2026 deductions',
    detail:'Tax deducted from salary in March is deposited by 30 April, not the 7th. This one still falls under the old Income-tax Act, 1961.',status:'verified',
    source:SRC_TDS}));
  FYM.slice(1).forEach(({y,m})=>{const p=prevM(y,m);out.push(mk({topic:'tds',date:key(y,m,7),title:'TDS deposit - '+monthName(p.y,p.m)+' deductions',
    detail:'Deposit tax deducted from salary by the 7th of the following month.',status:'verified',
    source:SRC_TDS}))});
  const ret=(date,q,form,extra)=>mk({topic:'tds',date,title:'Salary TDS return - '+q+' ('+form+')',detail:'File the quarterly salary TDS statement. '+extra,status:'verified',
    source:SRC_TDS});
  out.push(ret('2026-05-31','Jan-Mar 2026','Form 24Q, old form','This is the last quarter of FY 2025-26, so it still uses the old form.'));
  out.push(ret('2026-07-31','Apr-Jun 2026','Form 138','From tax year 2026-27 the salary return is Form 138 (earlier Form 24Q).'));
  out.push(ret('2026-10-31','Jul-Sep 2026','Form 138','Same form as the previous quarter.'));
  out.push(ret('2027-01-31','Oct-Dec 2026','Form 138','Same form as the previous quarter.'));
  out.push(mk({topic:'tds',date:'2026-06-15',title:'Form 16 for FY 2025-26 to employees',detail:'Issue the salary TDS certificate for the year that ended on 31 March 2026. It is the old Form 16. From tax year 2026-27 the certificate is Form 130, due by 15 June 2027.',status:'verified',
    source:SRC_TDS}));
  return out;
}

/* ---------- state rules: only what the research tracker has confirmed ---------- */
const PT_RULES={
  'Maharashtra':()=>{const e=FYM.map(({y,m})=>mk({topic:'pt',stateId:'Maharashtra',date:key(y,m,15),title:'Maharashtra PT - monthly payment',
      detail:'Professional tax is due by the 15th of each month from March 2026 (it was the month-end before). Notification dated 28 February 2026, Amendment Rules 2026, Rule 11(3).',status:'verified',source:'mahagst.gov.in, as recorded in the research tracker (primary).',
      link:{label:'State-wise PT guide',href:'/blog/professional-tax-india-state-wise-guide'}}));
    e.push(mk({topic:'pt',stateId:'Maharashtra',date:'2027-03-15',title:'Maharashtra PT - annual return',detail:'Annual return due 15 March.',status:'verified',source:'mahagst.gov.in, as recorded in the research tracker (primary).'}));return e}

};
const LWF_RULES={
  'Tamil Nadu':()=>[mk({topic:'lwf',stateId:'Tamil Nadu',date:'2026-12-31',title:'Tamil Nadu LWF - annual contribution',detail:'Contribution is due 31 December. Employee Rs. 20 and employer Rs. 40. Managerial staff and supervisors earning above Rs. 15,000 are exempt.',status:'verified',source:'G.O.(Ms) No. 161 dated 2 December 2022 (primary).'}),
    mk({topic:'lwf',stateId:'Tamil Nadu',date:'2027-01-31',title:'Tamil Nadu LWF - returns',detail:'Returns are due by 31 January.',status:'verified',source:'G.O.(Ms) No. 161 dated 2 December 2022 (primary).'})]

};

/* ---------- added 28 Oct 2026: states where several published guides agree (not primary-sourced) ---------- */
const PTG={label:'State-wise PT guide',href:'/blog/professional-tax-india-state-wise-guide'};
function one(topic,state,date,title,detail,status,source,link){return mk({topic,stateId:state,date,title,detail,status,source,link:link||null})}
/* ---------- added 29 Oct 2026: primary-sourced from the Acts and Rules ----------
   Dates are shown exactly as the law states them. Users set their own reminders before the date. */
function lw(state,date,title,detail,status,source){return one('lwf',state,date,title,detail,status,source)}
Object.assign(LWF_RULES,{
  'Haryana':()=>[lw('Haryana','2026-12-31','Haryana LWF - yearly payment (January to December 2026)','Pay both shares for the calendar year online to the Haryana Labour Welfare Board.','verified','Punjab LWF Act 1965 s.9A(2) as substituted by Haryana Act 16 of 2021 (gazette 5 Apr 2021); Act text on indiankanoon (primary).')],
  'Punjab':()=>[
    lw('Punjab','2026-04-15','Punjab LWF - October 2025 to March 2026','Pay both shares and the return for the half-year.','verified','Punjab LWF Act 1965 s.9A(2); same dates in Bill 15-PLA-2025 as passed (primary).'),
    lw('Punjab','2026-10-15','Punjab LWF - April to September 2026','Pay both shares and the return for the half-year.','verified','Punjab LWF Act 1965 s.9A(2); same dates in Bill 15-PLA-2025 as passed (primary).')],
  'Maharashtra':()=>[
    lw('Maharashtra','2026-07-15','Maharashtra LWF - January to June 2026 contributions','Pay both shares for employees on the register on 30 June.','verified','Maharashtra LWF Act 1953 s.6BB(3), text on indiankanoon (primary).'),
    lw('Maharashtra','2027-01-15','Maharashtra LWF - July to December 2026 contributions','Pay both shares for employees on the register on 31 December.','verified','Maharashtra LWF Act 1953 s.6BB(3), text on indiankanoon (primary).')],
  'Gujarat':()=>[
    lw('Gujarat','2026-07-15','Gujarat LWF - January to June 2026 contributions','Pay both shares for employees on the register in June.','verified','Gujarat LWF Act 1953 s.6B(3), text on indiankanoon (primary).'),
    lw('Gujarat','2026-07-31','Gujarat LWF - statement of contributions (January to June)','Submit the half-yearly statement of employer and employee contributions.','verified','Labour Welfare Fund (Gujarat) Rules 1962: statement on or before 31 July and 31 January (primary).'),
    lw('Gujarat','2027-01-15','Gujarat LWF - July to December 2026 contributions','Pay both shares for employees on the register in December.','verified','Gujarat LWF Act 1953 s.6B(3), text on indiankanoon (primary).'),
    lw('Gujarat','2027-01-31','Gujarat LWF - statement of contributions (July to December)','Submit the half-yearly statement of employer and employee contributions.','verified','Labour Welfare Fund (Gujarat) Rules 1962 (primary).')],
  'Delhi':()=>[
    lw('Delhi','2026-07-15','Delhi LWF - January to June 2026 contributions','Pay both shares for employees on the register on 30 June.','verified','Bombay LWF Act 1953 s.6BB(3) as extended to Delhi; LG notification 13 Jul 2004 (primary).'),
    lw('Delhi','2026-07-31','Delhi LWF - Form A statement (January to June)','Submit the statement of contributions in Form A.','verified','Delhi LWF Rules 1997: Form A on or before 31 July and 31 January (primary).'),
    lw('Delhi','2027-01-15','Delhi LWF - July to December 2026 contributions','Pay both shares for employees on the register on 31 December.','verified','Bombay LWF Act 1953 s.6BB(3) as extended to Delhi (primary).'),
    lw('Delhi','2027-01-31','Delhi LWF - Form A statement (July to December)','Submit the statement of contributions in Form A.','verified','Delhi LWF Rules 1997 (primary).')],
  'Kerala':()=>[
    lw('Kerala','2026-07-15','Kerala LWF - January to June 2026 contributions','Pay both shares to the Kerala Labour Welfare Fund Board.','verified','Kerala LWF Act 1975 s.15(2), text on indiankanoon (primary).'),
    lw('Kerala','2027-01-15','Kerala LWF - July to December 2026 contributions','Pay both shares to the Kerala Labour Welfare Fund Board.','verified','Kerala LWF Act 1975 s.15(2) (primary).')],
  'Goa':()=>[
    lw('Goa','2026-07-31','Goa LWF - January to June 2026 contributions','Pay the half-yearly contribution and statement to the Goa Labour Welfare Board.','verified','labour.goa.gov.in (Board page) and Goa LWF Rules 1990: by 31 July and 31 January (primary).'),
    lw('Goa','2027-01-31','Goa LWF - July to December 2026 contributions','Pay the half-yearly contribution and statement to the Goa Labour Welfare Board.','verified','labour.goa.gov.in and Goa LWF Rules 1990 (primary).')],
  'Odisha':()=>[
    lw('Odisha','2026-07-15','Odisha LWF - January to June 2026 contributions','Pay both shares to the Welfare Commissioner.','verified','Odisha Labour Dept EoDB note on OLWF Act s.10 and Rule 6: before 15 Jan and 15 Jul (primary).'),
    lw('Odisha','2027-01-15','Odisha LWF - July to December 2026 contributions','Pay both shares to the Welfare Commissioner.','verified','Odisha Labour Dept EoDB note on OLWF Act s.10 and Rule 6 (primary).')]
});
/* ---------- what a user reads under "Basis": the law behind the date. Never how sure we are. ---------- */
const BASIS={
  'tds':'Income Tax Department rules for TDS payment and statements.',
  'pt|Maharashtra':'Maharashtra State Tax on Professions, Trades, Callings and Employments Act, 1975, and its Rules.',
  'pt|Karnataka':'Karnataka Tax on Professions, Trades, Callings and Employments Act, 1976.',
  'pt|Andhra Pradesh':'Andhra Pradesh Tax on Professions, Trades, Callings and Employments Act, 1987.',
  'pt|Telangana':'Telangana Tax on Professions, Trades, Callings and Employments Act, 1987.',
  'pt|Madhya Pradesh':'Madhya Pradesh Vritti Kar Adhiniyam, 1995.',
  'pt|West Bengal':'West Bengal State Tax on Professions, Trades, Callings and Employments Act, 1979.',
  'pt|Gujarat':'Gujarat State Tax on Professions, Trades, Callings and Employments Act, 1976.',
  'pt|Kerala':'Kerala Municipality Act, 1994 (section 254) and Kerala Panchayat Raj Act, 1994.',
  'lwf|Karnataka':'Karnataka Labour Welfare Fund Act, 1965.',
  'lwf|West Bengal':'West Bengal Labour Welfare Fund Act, 1974.',
  'lwf|Madhya Pradesh':'Madhya Pradesh Shram Kalyan Nidhi Adhiniyam, 1982.',
  'lwf|Chhattisgarh':'Chhattisgarh Shram Kalyan Nidhi Adhiniyam, 1982.',
  'lwf|Andhra Pradesh':'Andhra Pradesh Labour Welfare Fund Act, 1987.',
  'lwf|Telangana':'Telangana Labour Welfare Fund Act.'
};
function userBasis(e){
  if(e.custom)return '';
  if(BASIS[e.topic+'|'+e.stateId])return BASIS[e.topic+'|'+e.stateId];
  if(e.status==='verified')return String(e.source).replace(/,? as recorded in the research tracker/i,'').replace(/\s*\(primary\)/i,'').replace(/\.\.$/,'.');
  return BASIS[e.topic]||'';
}

/* ---------- 29 Oct 2026, round 2: PT and LWF read from the Acts and Rules ---------- */
const lastDay=(y,m)=>new Date(y,m+1,0).getDate();
const pt=(state,date,title,detail,source)=>one('pt',state,date,title,detail,'verified',source,PTG);
function ptEvery(state,day,title,detail,source){return FYM.map(({y,m})=>pt(state,key(y,m,day==='last'?lastDay(y,m):day),title(prevM(y,m)),detail,source))}
const forM=t=>p=>t+' - '+monthName(p.y,p.m)+' salaries';
Object.assign(PT_RULES,{
  'Karnataka':()=>[...ptEvery('Karnataka',20,forM('Karnataka PT - payment and Form 5-A'),'Pay the tax deducted and file the monthly statement in Form 5-A within 20 days of the month end. Employees earning up to Rs. 25,000 a month are exempt.','Karnataka PT Rules 1976 r.11: statement within 20 days of month end; Act s.6(5) (primary, via rule text quoted).'),
    pt('Karnataka','2026-05-30','Karnataka PT - annual return (Form 5) for FY 2025-26','File the annual return within 60 days of the end of the year.','Karnataka PT Rules 1976 r.11: annual return within 60 days of year end (primary).')],
  'Andhra Pradesh':()=>ptEvery('Andhra Pradesh',10,forM('Andhra Pradesh PT - payment and Form V'),'Pay the tax deducted and file the monthly return in Form V on or before the 10th of the following month.','AP PT Rules 1987 r.12(1) as amended by G.O.: on or before 10th of succeeding month (primary).'),
  'Telangana':()=>ptEvery('Telangana',10,forM('Telangana PT - payment and Form V'),'Pay the tax deducted and file the monthly return in Form V on or before the 10th of the following month.','Telangana continues the AP PT Act and Rules 1987, r.12(1): on or before 10th (primary).'),
  'Madhya Pradesh':()=>[...ptEvery('Madhya Pradesh',10,forM('Madhya Pradesh PT - payment'),'Pay the tax deducted within ten days of the end of the month.','MP Vritti Kar Adhiniyam 1995 s.4(2): within ten days of month end (primary).'),
    ...[['2026-04-15','January to March 2026'],['2026-07-15','April to June 2026'],['2026-10-15','July to September 2026'],['2027-01-15','October to December 2026']].map(([d,q])=>pt('Madhya Pradesh',d,'Madhya Pradesh PT - quarterly return (Form 7), '+q,'File the quarterly return with the paid challans, even if no tax was payable.','MP Vritti Kar Niyam 1995 r.11(1): on or before the 15th of the month after the quarter (primary).'))],
  'Gujarat':()=>ptEvery('Gujarat',15,forM('Gujarat PT - payment and Form 5'),'File Form 5 and pay within fifteen days of the month end. If you have permission to file an annual return (Form 5-A), you still pay monthly by the 15th and file the return by the end of April.','Gujarat PT Rules 1976 r.11(1) and (2): within fifteen days of the previous month (primary).'),
  'West Bengal':()=>FYM.map(({y,m})=>{const p=prevM(y,m),qEnd=[2,5,8,11].includes(p.m);
    if(qEnd){const q={2:'January to March',5:'April to June',8:'July to September',11:'October to December'}[p.m];
      return pt('West Bengal',key(y,m,lastDay(y,m)),'West Bengal PT - quarterly return (Form III), '+q+' '+p.y,'Pay the balance tax for the quarter and file Form III within one month of the quarter end. Employers whose yearly tax is up to Rs. 30,000 file one annual return by 30 April instead and pay monthly by the 21st.','WB PT Rules 1979 r.12(1)(a),(b) and (1a),(1b), official consolidated text on comtax.wb.gov.in (primary).')}
    return pt('West Bengal',key(y,m,21),'West Bengal PT - '+monthName(p.y,p.m)+' payment','Pay the tax for the month within 21 days of the month end.','WB PT Rules 1979 r.12(1)(b)(i): within twenty-one days from expiry of each month (primary).')}),
  'Tamil Nadu':()=>[pt('Tamil Nadu','2026-09-30','Tamil Nadu PT - April to September 2026','Deduct the half-year tax (usually from August salary) and pay it to your local body.','TN Urban Local Bodies Act 1998 s.117-C and Rules 2023 r.277(2); Greater Chennai Corporation notice (primary, via notice report).'),
    pt('Tamil Nadu','2027-03-31','Tamil Nadu PT - October 2026 to March 2027','Deduct the half-year tax (usually from January salary) and pay it to your local body.','TN Urban Local Bodies Act 1998 s.117-C and Rules 2023 r.277(2) (primary).')],
  'Kerala':()=>[pt('Kerala','2026-08-31','Kerala PT - April to September 2026','Assess every employee, recover the tax and pay it to the municipality or panchayat before the end of August.','Kerala Municipality Act 1994 s.254(2): before the end of August and February (primary).'),
    pt('Kerala','2027-02-28','Kerala PT - October 2026 to March 2027','Assess every employee, recover the tax and pay it to the municipality or panchayat before the end of February.','Kerala Municipality Act 1994 s.254(2) (primary).')],
  'Assam':()=>ptEvery('Assam','last',forM('Assam PT - payment and Form III'),'Pay the tax deducted and file the monthly return in Form III on or before the last day of the following month.','Assam PT Rules 1947 r.12(1), official text on tax.assam.gov.in: on or before the last day of every month (primary). Guides saying the 28th are wrong.')
});
const lwfV=(state,src)=>()=>[
  one('lwf',state,'2026-07-15',state+' LWF - January to June 2026 contributions','Pay both shares for employees on the register on 30 June.','verified',src),
  one('lwf',state,'2027-01-15',state+' LWF - July to December 2026 contributions','Pay both shares for employees on the register on 31 December.','verified',src)];
Object.assign(LWF_RULES,{
  'West Bengal':lwfV('West Bengal','WB LWF Act 1974 s.9(3): before 15 July and 15 January (primary)'),
  'Madhya Pradesh':lwfV('Madhya Pradesh','MP Shram Kalyan Nidhi Adhiniyam 1982 s.9(3): before 15 July and 15 January (primary)'),
  'Chhattisgarh':lwfV('Chhattisgarh','Chhattisgarh Shram Kalyan Nidhi Adhiniyam 1982 (adapted MP Act) s.9(3) (primary)'),
  'Karnataka':()=>[one('lwf','Karnataka','2027-01-15','Karnataka LWF - yearly contribution for 2026','Pay both shares for the calendar year to the Karnataka Labour Welfare Board.','verified','Karnataka LWF Act 1965 s.7A(3): on or before 15 January of the following year (primary, Act extract in Bill 68 of 2025).')]
});
// Kerala LWF: tell shops they are under a different fund
const _kl=LWF_RULES['Kerala'];LWF_RULES['Kerala']=()=>_kl().map(e=>Object.assign(e,{detail:e.detail+' Shops and commercial establishments contribute to the Kerala Shops and Commercial Establishments Workers Welfare Fund instead, which is monthly and is not part of this calendar.'}));

Object.assign(BASIS,{
  'lwf|Haryana':'Punjab Labour Welfare Fund Act, 1965, section 9A(2), as amended for Haryana in 2021.',
  'lwf|Punjab':'Punjab Labour Welfare Fund Act, 1965, section 9A(2).',
  'lwf|Chandigarh':'Punjab Labour Welfare Fund Act, 1965, as applied to Chandigarh.',
  'lwf|Maharashtra':'Maharashtra Labour Welfare Fund Act, 1953, section 6BB, and its Rules.',
  'lwf|Gujarat':'Gujarat Labour Welfare Fund Act, 1953, section 6B, and the Labour Welfare Fund (Gujarat) Rules, 1962.',
  'lwf|Delhi':'Bombay Labour Welfare Fund Act, 1953, as extended to Delhi, and the Delhi Labour Welfare Fund Rules, 1997.',
  'lwf|Kerala':'Kerala Labour Welfare Fund Act, 1975, section 15.',
  'lwf|Goa':'Goa Labour Welfare Fund Act, 1986, and the Goa Labour Welfare Fund Rules, 1990.',
  'lwf|Odisha':'Odisha Labour Welfare Fund Act, 1996, section 10, and the Odisha Labour Welfare Fund Rules, 2015.',
  'pt|Assam':'Assam Professions, Trades, Callings and Employments Taxation Rules, 1947, rule 12.',
  'pt|Karnataka':'Karnataka Tax on Professions, Trades, Callings and Employments Act and Rules, 1976.',
  'pt|Tamil Nadu':'Tamil Nadu Urban Local Bodies Act, 1998, section 117-C, and its Rules, 2023.',
  'pt|Kerala':'Kerala Municipality Act, 1994, section 254.',
  'pt|West Bengal':'West Bengal State Tax on Professions, Trades, Callings and Employments Rules, 1979, rule 12.',
  'pt|Madhya Pradesh':'Madhya Pradesh Vritti Kar Adhiniyam, 1995, section 4, and Vritti Kar Niyam, 1995, rule 11.',
  'pt|Gujarat':'Gujarat State Tax on Professions, Trades, Callings and Employments Rules, 1976, rule 11.',
  'lwf|Karnataka':'Karnataka Labour Welfare Fund Act, 1965, section 7A.',
  'lwf|West Bengal':'West Bengal Labour Welfare Fund Act, 1974, section 9.',
  'lwf|Madhya Pradesh':'Madhya Pradesh Shram Kalyan Nidhi Adhiniyam, 1982, section 9.',
  'lwf|Chhattisgarh':'Chhattisgarh Shram Kalyan Nidhi Adhiniyam, 1982, section 9.',
  'tds':'Income-tax Act, 2025 and Income-tax Rules, 2026 (rules 218 and 219). Old-Act items: Income-tax Rules, 1962.'
});

/* ---------- build everything for one selection ---------- */
function buildRaw(topic,stateId){
  if(topic==='epf')return epf(); if(topic==='esi')return esi(); if(topic==='tds')return tds();
  if(topic==='pt'&&PT_RULES[stateId])return PT_RULES[stateId]();
  if(topic==='lwf'&&LWF_RULES[stateId])return LWF_RULES[stateId]();
  return [];
}
// users only ever get dates that have passed validation
function buildFor(topic,stateId){return buildRaw(topic,stateId).filter(e=>e.status==='verified'||e.status==='mine')}
// what to say when a state has no dates for a topic. Lists follow wide agreement across published state-wise guides.
const NO_PT=['Andaman and Nicobar Islands','Arunachal Pradesh','Chandigarh','Dadra and Nagar Haveli and Daman and Diu','Delhi','Haryana','Himachal Pradesh','Jammu and Kashmir','Ladakh','Lakshadweep','Rajasthan','Uttar Pradesh','Uttarakhand'];
const NO_LWF=['Andaman and Nicobar Islands','Arunachal Pradesh','Assam','Bihar','Himachal Pradesh','Jammu and Kashmir','Jharkhand','Ladakh','Lakshadweep','Manipur','Meghalaya','Mizoram','Nagaland','Puducherry','Sikkim','Tripura','Uttar Pradesh','Uttarakhand'];
function noticeFor(topic,stateId){
  if(buildFor(topic,stateId).length)return null;
  if(topic==='pt'){
    if(stateId==='Odisha')return {k:'odisha'};
    if(stateId==='Punjab')return {k:'punjab'};
    if(NO_PT.includes(stateId))return {k:'nopt'};
  }
  if(topic==='lwf'&&NO_LWF.includes(stateId))return {k:'nolwf'};
  return {k:'skip'};
}
function groupNotes(list){            // list of [topic,state,notice]
  const g={nopt:[],nolwf:[],none:{},pend:{}},out=[];
  list.forEach(([t,st,n])=>{if(n.k==='nopt')g.nopt.push(st);else if(n.k==='nolwf')g.nolwf.push(st);else if(n.k==='none')(g.none[t]=g.none[t]||[]).push(st);else if(n.k==='pending')(g.pend[n.t]=g.pend[n.t]||[]).push(st);else g[n.k]=1});
  const j=a=>a.map(x=>'<b>'+esc(x)+'</b>').join(', ');
  if(g.nopt.length)out.push('No professional tax in '+j(g.nopt)+', so there is nothing to add.');
  if(g.nolwf.length)out.push('No Labour Welfare Fund in '+j(g.nolwf)+', so there is nothing to add.');
  if(g.odisha)out.push('<b>Odisha</b> abolished professional tax from 1 April 2026 (Ordinance 2 of 2026). Tax deducted up to March 2026 is still payable.');
  if(g.punjab)out.push('<b>Punjab</b> levies the State Development Tax (Rs. 200 a month) instead of professional tax. It is not part of this calendar.');
  return out;
}
// a calendar entry is only kept if it brings dates
const hasDates=x=>TOPICS[x.topic].scope==='central'||buildFor(x.topic,x.state).length>0;


export {BASIS,DOW,FYM,FY_LABEL,LWF_RULES,MON3,MONTHS,NO_LWF,NO_PT,PTG,PT_RULES,SRC_TDS,STATES,TOPICS,buildFor,buildRaw,epf,esc,esi,forM,groupNotes,hasDates,key,lastDay,lw,lwfV,mk,monthName,noticeFor,one,pad,parse,prevM,pt,ptEvery,slug,tds,uid,userBasis};
