import { cardHtml, jlistsHtml, mwCardHtml } from './render';

const PAGE = 12;
// The page markup. The first 12 notifications are written into the HTML on the server so crawlers see real content.
export function buildMarkup(data) {
  const rows = data.feed || [];
  const cards = rows.slice(0, PAGE).map(cardHtml).join('');
  const count = `showing ${Math.min(PAGE, rows.length)} of ${rows.length}`;
  const mwCards = (data.mw || []).map(mwCardHtml).join('');
  const ptLists = jlistsHtml('pt', data.pt);
  const lwfLists = jlistsHtml('lwf', data.lwf);
  const moreStyle = rows.length > PAGE ? 'display:block' : 'display:none';
  return `

<section class="intro"><h1>Compliance Updates &amp; Rates</h1>
<p>Statutory notifications that affect Indian payroll - wages, EPF, ESI, PT, LWF, NPS and TDS - explained in plain English and Hindi, with a link to the official source.</p></section>

<div class="upd-wrap">
<div class="tabs">
<button class="tab active" data-panel="feed">Notifications</button>
<button class="tab" data-panel="rates">Minimum Wages</button>
<button class="tab" data-panel="ptp">Professional Tax</button>
<button class="tab" data-panel="lwfp">Labour Welfare Fund</button>
</div>

<div class="panel on" id="feed">
<div class="banner alert"><b>Active fraud alert - Delhi.</b> A forged minimum wage order dated 13 October 2025, showing an unskilled rate of Rs. 19,846 and forging the signature of the Joint Labour Commissioner, is in circulation. The Delhi Labour Department confirmed on 14 October 2025 that no such order was issued. The genuine current rate is Rs. 18,456, effective 1 April 2025.</div>
<div class="stats" id="fstats"></div>
<div class="toolbar">
<input id="q" placeholder="Search notifications, references, states&hellip;">
<select id="fcat"><option value="">All categories</option></select>
<select id="fstate"><option value="">All states</option></select>
<select id="fstatus"><option value="">All statuses</option></select>
<select id="fyear"><option value="">All years</option></select>
<span class="count" id="fcount">${count}</span>
</div>
<div class="cardlist" id="cards">${cards}</div>
<button class="more" id="more" style="${moreStyle}">Show more</button>
</div>

<div class="panel" id="rates">
<div class="seo">
<h2>What is Minimum Wage in India?</h2>
<p>Minimum wage is the lowest remuneration an employer is legally required to pay a worker for a given period, fixed by the appropriate government under the Minimum Wages Act, 1948 - now subsumed into the Code on Wages, 2019. Unlike a single national figure, India runs a fragmented, state-by-state and scheduled-employment-by-scheduled-employment system: each state government fixes rates separately for different job categories (skilled, semi-skilled, unskilled, highly skilled), often further split by geographic zone within the state.</p>
<h3>How the rate is actually built: Basic + VDA</h3>
<p>Most states express minimum wage as a Basic component plus Variable Dearness Allowance (VDA), a cost-of-living adjustment revised on a fixed cycle - typically half-yearly (April and October), though a handful of states revise quarterly or even monthly. VDA is usually linked to the Consumer Price Index (CPI-IW), so it moves with inflation even when the Basic component stays fixed for years. This is why a state's "minimum wage" changes far more often than most other payroll figures, and why any minimum-wage tracker needs a full revision history, not just a current snapshot, to be useful for back-pay or audit purposes.</p>
<h3>National Floor Wage and the 2019 Code</h3>
<p>The Code on Wages, 2019 introduced a National Floor Wage below which no state can set its minimum wage, intended to reduce the wide historical variation between states. States remain free to set a higher rate above the floor, and most already do.</p>
<details><summary>Scope, applicability and who this affects</summary>
<p>Minimum wage law covers scheduled employments - a list of specific industries and job categories each state notifies, from shops and commercial establishments to agriculture, construction, and factories. An employer must check both the state and the specific scheduled employment their workforce falls under, since two employers in the same state can be subject to different minimum wage figures depending on the industry.</p>
</details>
</div>
<div class="banner" id="mwbanner"></div>
<div class="stats" id="rstats"></div>
<div class="toolbar">
  <div class="seg" id="mwseg"><button class="on" data-v="all">All</button><button data-v="current">Current</button><button data-v="attn">Dormant or disputed</button></div>
  <input id="rq" placeholder="Search a state or union territory&hellip;">
  <span class="count" id="rcount"></span>
</div>
<div class="jgrid" id="rgrid">${mwCards}</div>
</div>

<div class="panel" id="ptp">
<div class="seo">
<h2>What is Professional Tax?</h2>
<p>Professional Tax (PT) is a direct tax levied by state governments in India on income earned through a profession, trade, calling, or employment - deducted by the employer from an employee's salary and deposited with the state, under the authority of Article 276 of the Constitution. Despite the name, it isn't limited to "professionals" in the everyday sense; salaried employees, self-employed individuals, traders, and practising professionals like doctors and lawyers can all be liable, depending on the state's specific Act.</p>
<h3>The Rs. 2,500 constitutional ceiling</h3>
<p>Article 276(2) caps total Professional Tax payable by any one person at Rs. 2,500 per year, regardless of how a state structures its slabs. Within that ceiling, each state sets its own income slabs, exemption thresholds, and payment cycle independently - there is no central Professional Tax Act, so the rules, rates, and even whether PT applies at all vary considerably from one state to the next.</p>
<h3>Who actually levies it, and who doesn't</h3>
<p>Only around 20 of India's 28 states and 8 union territories currently levy Professional Tax; large states including Delhi, Haryana, Uttar Pradesh, Rajasthan, and Uttarakhand levy none at all. Among states that do levy it, payment cycles differ meaningfully - most collect monthly, while Tamil Nadu, Kerala, and Puducherry work on a half-yearly cycle, and a few states collect annually.</p>
<details><summary>Registration, deduction and filing basics</summary>
<p>An employer must register for Professional Tax within 30 days of employing staff, and deduct the applicable slab amount from salary each pay cycle for onward deposit to the state government. Employers above a certain employee count typically file monthly, while smaller employers may file quarterly. Failure to register, deduct, or deposit on time typically attracts interest and a penalty under the relevant state Act.</p>
</details>
</div>
<div class="banner"><b>The constitutional ceiling is Rs. 2,500 per person per year</b> under Article 276(2), whatever a state's slab says. Cycles differ: most states are monthly, Tamil Nadu, Kerala and Puducherry are half-yearly, and Jharkhand is annual. <b>Tap any state that levies professional tax</b> for its basis, cycle, due dates and what to watch in that state.</div>
<div class="jlists" id="ptlists">${ptLists}</div>
</div>

<div class="panel" id="lwfp">
<div class="seo">
<h2>What is the Labour Welfare Fund?</h2>
<p>The Labour Welfare Fund (LWF) is a statutory contribution, made jointly by employer, employee, and in some states the state government, that funds welfare measures for workers in the unorganised and organised sectors - housing, medical care, education for workers' children, recreational facilities, and vocational training, among others, administered by a state-level Labour Welfare Board.</p>
<h3>There is no central LWF Act</h3>
<p>Unlike Provident Fund or ESI, which run under unified central legislation, Labour Welfare Fund is entirely state-legislated - each state that operates one has its own separate Act, its own contribution amounts, its own employer-to-employee contribution ratio, and its own payment cycle. Only 16 of India's states and union territories currently operate an LWF at all; large states including Uttar Pradesh, Rajasthan, Bihar, and Jharkhand have no LWF scheme whatsoever.</p>
<h3>Contribution amounts vary enormously between states</h3>
<p>There is no standard employer-to-employee contribution ratio nationally. Some states split contributions close to evenly, others load the burden heavily onto the employer - West Bengal, for instance, collects a far larger employer share relative to the employee's, while other states use a more moderate ratio. Payment frequency also differs: some states collect half-yearly, others annually, and the applicability threshold (the minimum employee headcount before LWF applies) varies by state too, with some states recently lowering their threshold to bring smaller establishments into scope.</p>
<details><summary>How the contribution is typically used</summary>
<p>Labour Welfare Boards generally apply fund proceeds toward education assistance for workers' children, medical and health facilities, housing schemes, recreational and cultural activities, and vocational or skill training - the exact mix of benefits differs by state and is set out in each state's own LWF Act and rules.</p>
</details>
</div>
<div class="banner alert"><b>There is no national convention for the employer-to-employee ratio.</b> Tamil Nadu and Haryana are 1:2. Maharashtra, Madhya Pradesh and Chhattisgarh are 1:3. Punjab is 1:4. <b>West Bengal is 1:10</b> - Rs. 3 from the employee, Rs. 30 from the employer. Never derive the employer figure from the employee figure.</div>
<div class="jlists" id="lwflists">${lwfLists}</div>
</div>
</div>

<nav class="statelinks browse" aria-label="Browse by topic"><a href="/updates/minimum-wages">Minimum wages by state</a><a href="/updates/professional-tax">Professional Tax by state</a><a href="/updates/labour-welfare-fund">Labour Welfare Fund by state</a></nav>
  <div class="foot"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg><p>Summaries are for guidance only and are not a substitute for the official notification or professional advice.</p></div>

`;
}
