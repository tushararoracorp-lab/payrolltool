import Head from "next/head";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { useEffect, useRef, useState } from "react";
import FeedbackWidget from "../components/FeedbackWidget";

const INFO_CARDS = [
  {
    icon: "📅",
    title: "What is Proration?",
    body: "Pay calculated for a partial month - mid-month joining, exit, or a role change - split proportionally across the days actually payable.",
  },
  {
    icon: "🧮",
    title: "The Formula",
    body: "Monthly Amount ÷ Calendar Days in Month × Payable Days. Payable days are calendar days, matching what EPFO and most Indian payroll systems expect.",
  },
  {
    icon: "📝",
    title: "Worked Example",
    body: "Joined 15 Aug on Rs. 60,000/month. August has 31 days, so 17 are payable: (Rs. 60,000 ÷ 31) × 17 = Rs. 32,903 gross for that month.",
  },
  {
    icon: "⚖️",
    title: "Statutory Coverage",
    body: "EPF + VPF, Employer NPS, ESI, state-wise Professional Tax & LWF, and a New vs Old regime TDS estimate - all recalculated on the prorated figure.",
  },
  {
    icon: "📄",
    title: "PDF In, PDF Out",
    body: "Upload an appointment letter to auto-fill pay heads, then download a shareable, ready-to-send payslip PDF.",
  },
];

// Markup for the calculator itself, mounted into a Shadow DOM so its
// standalone CSS (resets, custom properties, etc.) and its ~1500-line
// vanilla-JS engine (PF/VPF/NPS/ESI/PT/LWF/TDS + PDF extraction/payslip
// generation, ported from the original tool) can't leak into or collide
// with the rest of the site.
const TOOL_BODY_HTML = `
<div class="hero">
  <h1>Salary <em>Proration</em> Calculator</h1>
  <p>Fill in your salary structure and get a precise prorated salary - with EPF, ESI, PT and TDS computed automatically.</p>
</div>

<div class="grid">
<!-- ═══════════════ LEFT ═══════════════ -->
<div id="leftPanel">

  <!-- STEP 1: Upload -->
  <div class="card" id="card1">
    <div class="card-hd">
      <div class="step">1</div>
      <div class="card-title">Appointment Letter (PDF)
        <div class="tip-wrap">
          <button class="tip-btn" data-tip="tip1" onmouseenter="tipShow(this)" onmouseleave="tipHide(this)" onfocus="tipShow(this)" onblur="tipHide(this)">i</button>
          <div class="tip-box" id="tip1">
            <h5>📄 PDF Upload</h5>
            <p>Upload the appointment letter to auto-fill pay heads and EPF amounts. Gratuity, insurance lines are excluded automatically.</p>
            <p><strong>Optional</strong> - skip and fill in manually.</p>
          </div>
        </div>
      </div>
      <button class="card-toggle" id="t1" onclick="toggleCard('card1','t1')">▼ Collapse</button>
    </div>
    <div class="card-body">
      <div id="filePill" style="display:none"></div>
      <div id="extractMsg" style="display:none;margin-bottom:8px"></div>
      <div class="dropzone" id="dz" ondrop="onDrop(event)" ondragover="event.preventDefault();this.classList.add('over')" ondragleave="this.classList.remove('over')" onclick="window.__spRoot.getElementById('fi').click()">
        <span class="dz-icon">📄</span>
        <div class="dz-lbl">Drop PDF here or click to browse</div>
        <div class="dz-hint">Auto-extracts pay heads &amp; EPF amounts · scanned PDFs require manual entry</div>
      </div>
      <input type="file" id="fi" accept=".pdf" onchange="onFile(this.files[0])"/>
    </div>
  </div>

  <!-- STEP 2: Employee -->
  <div class="card" id="card2">
    <div class="card-hd">
      <div class="step">2</div>
      <div class="card-title">Employee Details
        <div class="tip-wrap">
          <button class="tip-btn" data-tip="tip2" onmouseenter="tipShow(this)" onmouseleave="tipHide(this)" onfocus="tipShow(this)" onblur="tipHide(this)">i</button>
          <div class="tip-box" id="tip2">
            <h5>👤 Employee Details</h5>
            <p><strong>Gender</strong> is needed for Professional Tax - in Maharashtra, women earning ≤ Rs. 25,000/month are exempt. Gender <em>Other</em> is treated as male for PT purposes until statutory guidance specifies otherwise.</p>
            <p><strong>Payable Days</strong> are auto-calculated from Date of Joining using calendar days.</p>
          </div>
        </div>
      </div>
      <button class="card-toggle" id="t2" onclick="toggleCard('card2','t2')">▼ Collapse</button>
    </div>
    <div class="card-body">
      <div class="row3">
        <div class="field"><label>Employee Name</label><input type="text" id="empName" placeholder="Full name"/></div>
        <div class="field"><label>Gender</label>
          <select id="gender">
            <option value="M">Male</option>
            <option value="F">Female</option>
            <option value="O">Other</option>
          </select>
        </div>
        <div class="field"><label>Date of Joining</label><input type="date" id="doj" onchange="autoDays()"/></div>
      </div>
      <div class="row2">
        <div class="field"><label>Proration Month</label><input type="month" id="proMonth" onchange="autoDays()"/></div>
        <div class="field">
          <label>Payable Days <span style="text-transform:none;letter-spacing:0;font-weight:400">(calendar · editable)</span></label>
          <div class="days-wrap">
            <input class="day-inp" type="number" id="payDays" min="0" max="31" oninput="clampPayDays()" style="border-radius:8px;padding:7px 9px"/>
          </div>
          <div class="days-note" id="daysNote">Select DOJ and month to auto-fill.</div>
        </div>
      </div>
    </div>
  </div>

  <!-- STEP 3: Pay Heads -->
  <div class="card" id="card3">
    <div class="card-hd">
      <div class="step">3</div>
      <div class="card-title">Earnings
        <div class="tip-wrap">
          <button class="tip-btn" data-tip="tip3" onmouseenter="tipShow(this)" onmouseleave="tipHide(this)" onfocus="tipShow(this)" onblur="tipHide(this)">i</button>
          <div class="tip-box" id="tip3">
            <h5>💰 Pay Heads</h5>
            <p>Enter monthly amounts from the salary structure.</p>
            <ul>
              <li><strong>Fixed</strong> - Basic, HRA, allowances (form PF base)</li>
              <li><strong>Variable</strong> - reimbursements, bonus, incentives (excluded from PF base)</li>
            </ul>
            <p>Mark Medical, Internet, Telephone reimbursements as <strong>Variable</strong>.</p>
          </div>
        </div>
      </div>
      <button class="card-toggle" id="t3" onclick="toggleCard('card3','t3')">▼ Collapse</button>
    </div>
    <div class="card-body">
      <div id="extractErr" style="display:none"></div>
      <div class="ph-hdr"><h4>Monthly Pay Heads</h4><button class="btn-add" onclick="addRow()">＋ Add</button></div>
      <div class="ph-cols">
        <div class="ph-col-lbl">Description</div>
        <div class="ph-col-lbl" style="text-align:right">Monthly (Rs.)</div>
        <div class="ph-col-lbl" style="text-align:center">Type</div>
        <div></div>
      </div>
      <div id="phList"></div>
    </div>
  </div>

  <!-- STEP 4: Statutory -->
  <div class="card" id="card4">
    <div class="card-hd">
      <div class="step">4</div>
      <div class="card-title">Statutory &amp; Tax
        <div class="tip-wrap">
          <button class="tip-btn" data-tip="tip4" onmouseenter="tipShow(this)" onmouseleave="tipHide(this)" onfocus="tipShow(this)" onblur="tipHide(this)">i</button>
          <div class="tip-box" id="tip4">
            <h5>⚖️ Statutory Deductions</h5>
            <p>All statutory items are mandatory by law. PT and LWF are deducted on this month's prorated earnings. ESI eligibility is checked on full monthly gross.</p>
          </div>
        </div>
      </div>
      <button class="card-toggle" id="t4" onclick="toggleCard('card4','t4')">▼ Collapse</button>
    </div>
    <div class="card-body">

      <!-- ── EPF - from appointment letter ── -->
      <div class="sdiv">Employee &amp; Employer PF
        <div class="tip-wrap">
          <button class="tip-btn" data-tip="tip5" onmouseenter="tipShow(this)" onmouseleave="tipHide(this)" onfocus="tipShow(this)" onblur="tipHide(this)">i</button>
          <div class="tip-box" id="tip5">
            <h5>🏦 EPF - from Appointment Letter</h5>
            <p>Enter the EPF amounts exactly as shown in your appointment letter. These are <strong>fixed monthly figures</strong> and will not be auto-calculated.</p>
            <p>The <strong>This Month</strong> column shows the prorated PF for joining month, calculated as: 12% of (prorated Gross − prorated HRA − prorated Variable pay).</p>
            <p><strong>VPF</strong> is an additional voluntary % of Basic on top of EPF. 80C benefit applies.</p>
          </div>
        </div>
      </div>
      <div class="row4">
        <div class="field">
          <label>Employee EPF (Rs./mo)</label>
          <input type="number" class="pf-input" id="empPFInput" min="0" placeholder="e.g. 1800" oninput="syncErPF();updatePreviews()"/>
          <div class="pf-hint">From appointment letter</div>
        </div>
        <div class="field">
          <label>Employer EPF (Rs./mo)</label>
          <input type="text" id="erPFInput" readonly placeholder="Same as Employee EPF"/>
          <div class="pf-hint">Mirrors employee EPF</div>
        </div>
        <div class="field">
          <label>VPF % (of Basic)</label>
          <input type="number" id="vpfPct" min="0" max="100" placeholder="0" value="0" oninput="updatePreviews()"/>
        </div>
        <div class="field">
          <label>VPF Amount</label>
          <input type="text" id="vpfDisp" readonly placeholder="After Calculate"/>
        </div>
      </div>

      <!-- ── NPS ── -->
      <div class="sdiv">NPS - Employer Contribution
        <div class="tip-wrap">
          <button class="tip-btn" data-tip="tip6" onmouseenter="tipShow(this)" onmouseleave="tipHide(this)" onfocus="tipShow(this)" onblur="tipHide(this)">i</button>
          <div class="tip-box" id="tip6">
            <h5>🏛️ Employer NPS</h5>
            <p>Employer NPS is funded from <strong>Special Allowance</strong> (flexi basket) - SA is reduced by the NPS amount, so total gross stays the same.</p><p>Tax-exempt u/s 80CCD(2): up to 14% of Basic (New Regime) / 10% (Old Regime).</p>
          </div>
        </div>
      </div>
      <div class="row2">
        <div class="field"><label>Employer NPS % (of Basic)</label><input type="number" id="npsPct" min="0" max="20" placeholder="0" value="0" oninput="updatePreviews()"/></div>
        <div class="field"><label>NPS Amount - Monthly</label><input type="text" id="npsDisp" readonly placeholder="After Calculate"/></div>
      </div>

      <!-- ── ESI ── -->
      <div class="sdiv">ESI
        <div class="tip-wrap">
          <button class="tip-btn" data-tip="tip7" onmouseenter="tipShow(this)" onmouseleave="tipHide(this)" onfocus="tipShow(this)" onblur="tipHide(this)">i</button>
          <div class="tip-box" id="tip7">
            <h5>🏥 ESI</h5>
            <p>Applies when monthly gross ≤ Rs. 21,000. ESI deduction amount is calculated on <strong>this month's prorated earnings</strong>.</p>
            <p>Employee: 0.75% &nbsp;|&nbsp; Employer: 3.25%</p>
          </div>
        </div>
      </div>
      <div class="row2">
        <div class="field"><label>Employee ESI</label><input type="text" id="esiEmpDisp" readonly placeholder="After Calculate"/></div>
        <div class="field"><label>Employer ESI (info)</label><input type="text" id="esiErDisp" readonly placeholder="After Calculate"/></div>
      </div>

      <!-- ── PT & LWF ── -->
      <div class="sdiv">Professional Tax &amp; LWF
        <div class="tip-wrap">
          <button class="tip-btn" data-tip="tip8" onmouseenter="tipShow(this)" onmouseleave="tipHide(this)" onfocus="tipShow(this)" onblur="tipHide(this)">i</button>
          <div class="tip-box" id="tip8">
            <h5>🗺️ PT &amp; LWF</h5>
            <p><strong>PT</strong> is looked up from the monthly gross slab but deducted on this month's prorated earnings amount.</p>
            <p><strong>LWF</strong> is a flat Rs. amount, deducted only in applicable months (monthly / half-yearly Jun+Dec / annual Dec).</p>
            <p>Odisha: PT abolished w.e.f. 1 Apr 2026. &nbsp;Haryana LWF: Rs. 35/emp revised w.e.f. 1 Jan 2026.</p>
          </div>
        </div>
      </div>
      <div class="row3">
        <div class="field"><label>State</label>
          <select id="stateSelect" onchange="onStateChange()">
            <option value="NONE">- Select State -</option>
            <option value="AP">Andhra Pradesh</option>
            <option value="AS">Assam</option>
            <option value="BR">Bihar</option>
            <option value="CG">Chhattisgarh</option>
            <option value="GJ">Gujarat</option>
            <option value="HR">Haryana</option>
            <option value="JH">Jharkhand</option>
            <option value="KA">Karnataka</option>
            <option value="KL">Kerala</option>
            <option value="MP">Madhya Pradesh</option>
            <option value="MH">Maharashtra</option>
            <option value="MN">Manipur</option>
            <option value="ML">Meghalaya</option>
            <option value="MZ">Mizoram</option>
            <option value="NL">Nagaland</option>
            <option value="OR">Odisha (PT abolished Apr 2026)</option>
            <option value="PB">Punjab</option>
            <option value="PY">Puducherry</option>
            <option value="SK">Sikkim</option>
            <option value="TN">Tamil Nadu</option>
            <option value="TG">Telangana</option>
            <option value="TR">Tripura</option>
            <option value="UP">Uttar Pradesh</option>
            <option value="UK">Uttarakhand</option>
            <option value="WB">West Bengal</option>
            <optgroup label="No Professional Tax">
            <option value="DL">Delhi</option>
            <option value="GA">Goa</option>
            <option value="HP">Himachal Pradesh</option>
            <option value="JK">Jammu &amp; Kashmir</option>
            <option value="RJ">Rajasthan</option>
            <option value="CH">Chandigarh</option>
            <option value="DN">Dadra &amp; Nagar Haveli</option>
            </optgroup>
          </select>
        </div>
        <div class="field"><label>Professional Tax</label><input type="text" id="ptDisp" readonly placeholder="Select state"/></div>
        <div class="field"><label>LWF (this month)</label><input type="text" id="lwfDisp" readonly placeholder="Select state"/></div>
      </div>

      <!-- ── Tax Regime ── -->
      <div class="sdiv">Income Tax Regime - FY 2026-27
        <div class="tip-wrap">
          <button class="tip-btn" data-tip="tip9" onmouseenter="tipShow(this)" onmouseleave="tipHide(this)" onfocus="tipShow(this)" onblur="tipHide(this)">i</button>
          <div class="tip-box" id="tip9">
            <h5>📊 Tax Regime</h5>
            <p><strong>New Regime:</strong> Std deduction Rs. 75,000. Zero tax if annual taxable ≤ Rs. 12L.</p>
            <p><strong>Old Regime:</strong> Std deduction Rs. 50,000. 80C/HRA/80D deductions allowed. Zero tax if ≤ Rs. 5L.</p>
            <p>TDS shown is an estimate based on gross only.</p>
          </div>
        </div>
      </div>
      <div class="tabs c2">
        <button class="tab on2" id="btnNew" onclick="setRegime('new')">New Regime (Default)<span class="tab-sub">Rs. 75k std ded · 87A ≤Rs. 12L</span></button>
        <button class="tab" id="btnOld" onclick="setRegime('old')">Old Regime<span class="tab-sub">80C/HRA etc · Rs. 50k std ded</span></button>
      </div>

    </div>
  </div>

  <!-- CALCULATE -->
  <div class="card" style="padding:13px" id="cardCalc">
    <div id="flashMsg" style="display:none;background:var(--rdb);border:1.5px solid var(--rdm);color:var(--rd);border-radius:8px;padding:8px 12px;font-size:.76rem;font-weight:600;margin-bottom:8px;line-height:1.5"></div>
<button class="calc-btn" id="calcBtn" onclick="calculate()">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="10" x2="16" y2="10"/><line x1="8" y1="14" x2="12" y2="14"/><line x1="15" y1="17" x2="15" y2="13"/><line x1="13" y1="15" x2="17" y2="15"/></svg>
      Calculate Prorated Salary
    </button>
  </div>

</div><!-- /left -->

<!-- ═══════════════ RIGHT ═══════════════ -->
<div class="right-panel">
  <div class="empty-panel" id="emptyPanel">
    <span class="empty-ico">🧮</span>
    <div class="empty-txt">Fill details on the left and tap<br><strong>Calculate Prorated Salary</strong><br><br>Results: Earnings · EPF+VPF · NPS · ESI<br>PT · LWF · TDS · Net Take-Home<br>+ <strong>Tax Regime Comparison</strong></div>
  </div>

  <div class="card" id="resultCard" style="display:none">
    <div class="res-hdr">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--pm)" stroke-width="2.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
      <div class="res-title">Proration Result</div>
      <span class="res-emp" id="resEmp"></span>
      <button class="dl-btn" onclick="openDlModal()" title="Download Payslip">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        Download
      </button>
    </div>
    <div class="tiles" id="resTiles"></div>
    <table class="rtbl">
      <thead><tr><th>Description</th><th>Monthly (Rs.)</th><th>This Month (Rs.)</th></tr></thead>
      <tbody id="resBody"></tbody>
    </table>
    <div class="warn" id="resWarn" style="display:none;margin-top:9px;font-size:.68rem"></div>
  </div>

  <div class="card" id="taxCmpCard" style="display:none;margin-top:0">
    <div class="cmp-title">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--pm)" stroke-width="2.5"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
      Tax Regime Comparison - FY 2026-27
    </div>
    <table class="rtbl" id="taxCmpTable"></table>
    <div id="taxCmpVerdict" style="margin-top:9px"></div>
  </div>
</div>

</div><!-- /grid -->


<!-- DOWNLOAD MODAL -->
<div class="modal-overlay" id="dlModal">
  <div class="modal-box">
    <div class="modal-title">⚠️ Projected Pay Calculation</div>
    <div class="modal-body">
      This payslip is generated from estimated proration data only. It <strong>cannot be used for official, legal, or financial purposes</strong>. All figures are projections based on the inputs provided and may differ from your actual payslip.
    </div>
    <div id="dlNameTip" style="display:none;background:#FFFBEB;border:1px solid #FCD34D;border-radius:6px;padding:7px 10px;font-size:.72rem;color:#92400E;margin-bottom:10px">💡 <strong>Tip:</strong> Enter employee name in Step 2 for a personalised payslip.</div>
    <label class="modal-check">
      <input type="checkbox" id="dlAgree" onchange="window.__spRoot.getElementById('dlConfirm').className='modal-confirm'+(this.checked?' active':'')"/>
      I understand this is a projected document and cannot be used for official purposes.
    </label>
    <div class="modal-actions">
      <button class="modal-cancel" onclick="closeDlModal()">Cancel</button>
      <button class="modal-confirm" id="dlConfirm" onclick="downloadPayslip()">Download PDF</button>
    </div>
  </div>
</div>

<!-- PAYSLIP PRINT AREA (hidden, populated on download) -->
<div id="payslipPrint"></div>

`;

// Inlined directly rather than fetched as a separate stylesheet. The
// external <link> approach left a real, if brief, gap: the Shadow DOM
// mounted and rendered its markup immediately, but the CSS still had to
// complete a full network round-trip before it could apply - visible as
// a flash of unstyled default-browser buttons/borders. A preload hint
// (added earlier) reduced how often that gap was noticeable but couldn't
// eliminate it entirely, since the fetch still has to finish before the
// styles exist. Inlining the CSS as a string means it's already present
// the instant this JS runs - no network request to race against at all.
const SP_TOOL_CSS = `*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:host{
  --pm:#7C3AED;--pd:#5B21B6;--pl:#A78BFA;--pp:#EDE9FE;--pg:#F5F3FF;
  --td:#1E1B4B;--tm:#4B4585;--ts:#7C74B0;
  --bd:#DDD6FE;--bd2:#C4B5FD;
  --gr:#059669;--grb:#ECFDF5;--grm:#A7F3D0;
  --rd:#DC2626;--rdb:#FEF2F2;--rdm:#FECACA;
  --am:#D97706;--amb:#FFFBEB;--amm:#FCD34D;
  --bl:#2563EB;--blb:#EFF6FF;--blm:#BFDBFE;
  --surface:#fff;
  --sh:0 2px 12px rgba(124,58,237,.10),0 1px 3px rgba(124,58,237,.06);
  --shl:0 20px 60px rgba(124,58,237,.14),0 4px 16px rgba(124,58,237,.07);
}
/* Dark mode. :host() is the Shadow-DOM-native way to react to an attribute
   on the host element (set in the light DOM by the React wrapper) - this
   is the correct mechanism here, not a workaround, since a shadow tree
   can't see the outer document's html[data-theme] at all. */
:host([data-theme="dark"]){
  --pm:#9163F2;--pd:#A47DF5;--pl:#C4B0F9;--pp:#2C2147;--pg:#15111F;
  --td:#F3F0FA;--tm:#D6CFE8;--ts:#B3AAC7;
  --bd:#2A2536;--bd2:#3D3654;
  --gr:#34D399;--grb:#123027;--grm:#1F5A44;
  --rd:#F87171;--rdb:#3D1F1F;--rdm:#5C2E2E;
  --am:#FBBF54;--amb:#332411;--amm:#5C4A1F;
  --bl:#60A5FA;--blb:#172033;--blm:#2D4A6B;
  --surface:#1C1730;
  --sh:0 2px 12px rgba(0,0,0,.35),0 1px 3px rgba(0,0,0,.2);
  --shl:0 20px 60px rgba(0,0,0,.45),0 4px 16px rgba(0,0,0,.25);
}
:host{display:block;min-height:100%;font-family:'DM Sans',sans-serif;background:var(--pg);color:var(--td);overflow-x:hidden}
.hero{text-align:center;padding:28px 20px 18px;background:linear-gradient(135deg,rgba(124,58,237,.07) 0%,transparent 100%)}
.hero h1{font-family:'Sora',sans-serif;font-size:clamp(1.5rem,3vw,2rem);font-weight:800;color:var(--td);letter-spacing:-1px;line-height:1.12;margin-bottom:6px}
.hero h1 em{color:var(--pm);font-style:normal}
.hero p{font-size:.8rem;color:var(--ts);max-width:500px;margin:0 auto;line-height:1.6}
.grid{max-width:1200px;margin:14px auto;padding:0 16px 50px;display:grid;grid-template-columns:1fr 1fr;gap:16px;align-items:start}

/* CARD */
.card{background:var(--surface);border:1.5px solid var(--bd);border-radius:14px;padding:16px;box-shadow:var(--shl);margin-bottom:10px}
.card:last-child{margin-bottom:0}
.card-hd{display:flex;align-items:center;gap:8px;padding-bottom:10px;margin-bottom:12px;border-bottom:1.5px solid var(--bd)}
.step{width:22px;height:22px;border-radius:50%;background:var(--pp);color:var(--pm);font-family:'Sora',sans-serif;font-size:.64rem;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.card-title{font-family:'Sora',sans-serif;font-size:.84rem;font-weight:700;color:var(--td);flex:1;display:flex;align-items:center;gap:6px}
.card-toggle{background:none;border:1.5px solid var(--bd);color:var(--ts);cursor:pointer;font-size:.7rem;padding:3px 9px;border-radius:20px;transition:all .15s;display:inline-flex;white-space:nowrap;font-family:'DM Sans',sans-serif;font-weight:600}
.card-toggle:hover{background:var(--pp);color:var(--pm);border-color:var(--pl)}
.card.collapsed .card-body{display:none}
.card.collapsed .card-hd{padding-bottom:0;margin-bottom:0;border-bottom:none}

/* UPLOAD */
.dropzone{border:2px dashed var(--pl);border-radius:12px;padding:20px 14px;text-align:center;cursor:pointer;transition:all .2s;background:var(--pg)}
.dropzone:hover,.dropzone.over{border-color:var(--pm);background:var(--pp)}
.dz-icon{font-size:1.8rem;margin-bottom:5px;display:block}
.dz-lbl{font-family:'Sora',sans-serif;font-size:.8rem;font-weight:700;color:var(--pm);margin-bottom:2px}
.dz-hint{font-size:.67rem;color:var(--ts)}
input[type=file]{display:none}
.file-pill{background:var(--grb);border:1.5px solid var(--grm);border-radius:9px;padding:7px 11px;display:flex;align-items:center;gap:7px;margin-bottom:8px}
.file-pill-name{font-size:.76rem;font-weight:600;color:var(--td);flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.file-pill-rm{background:none;border:none;color:var(--ts);cursor:pointer;font-size:1rem;line-height:1}
.file-pill-rm:hover{color:var(--rd)}

/* FIELD */
.field{margin-bottom:9px}
.field label{display:block;font-size:.6rem;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:var(--ts);margin-bottom:4px}
.field input,.field select{width:100%;padding:7px 9px;border:1.5px solid var(--bd);border-radius:8px;font-family:'DM Sans',sans-serif;font-size:.82rem;color:var(--td);background:var(--surface);outline:none;transition:border-color .17s,box-shadow .17s}
.field input:focus,.field select:focus{border-color:var(--pm);box-shadow:0 0 0 3px rgba(124,58,237,.09)}
.field input[readonly]{background:var(--pg);color:var(--ts);cursor:default}
/* editable PF inputs from appointment letter */
.field input.pf-input{background:var(--surface);color:var(--td);border-color:var(--bd2)}
.field input.pf-input:focus{border-color:var(--pm)}
.row2{display:grid;grid-template-columns:1fr 1fr;gap:9px}
.row3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px}
.row4{display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:8px}

/* DAYS */
.days-wrap{display:flex;align-items:center;border:1.5px solid var(--bd);border-radius:8px;overflow:hidden}
.day-btn{width:30px;height:32px;border:none;background:none;font-size:1rem;color:var(--pm);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background .14s}
.day-btn:hover{background:var(--pp)}
.day-inp{flex:1;border:none;background:transparent;text-align:center;font-family:'DM Sans',sans-serif;font-size:.87rem;font-weight:600;color:var(--td);outline:none}
.days-note{font-size:.62rem;color:var(--ts);margin-top:3px;line-height:1.5}

/* SDIV */
.sdiv{font-size:.59rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--ts);display:flex;align-items:center;gap:7px;margin:10px 0 7px}
.sdiv::after{content:'';flex:1;height:1px;background:var(--bd)}

/* TABS */
.tabs{display:grid;gap:6px}
.tabs.c2{grid-template-columns:1fr 1fr}
.tab{padding:8px 5px;border-radius:8px;border:1.5px solid var(--bd);background:var(--surface);font-family:'DM Sans',sans-serif;font-size:.69rem;font-weight:600;color:var(--tm);cursor:pointer;text-align:center;transition:all .16s;line-height:1.4}
.tab:hover{border-color:var(--pl);color:var(--pm)}
.tab.on2{border-color:var(--pd);background:var(--pp);color:var(--pd);font-weight:700}
.tab-sub{font-size:.57rem;display:block;margin-top:1px;opacity:.75;font-weight:400}

/* INFO TOOLTIP - JS-positioned, stays within viewport */
/* Hide browser number input spinners */
input[type=number]::-webkit-inner-spin-button,
input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}
input[type=number]{-moz-appearance:textfield}

.tip-wrap{position:relative;display:inline-block}
.tip-btn{background:var(--pp);border:1.5px solid var(--bd2);color:var(--pm);border-radius:50%;width:17px;height:17px;font-size:.64rem;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;vertical-align:middle;line-height:1;margin-left:4px;transition:all .15s}
.tip-btn:hover{background:var(--pm);color:#fff}
.tip-box{
  display:none;position:fixed;z-index:9999;
  width:250px;max-width:calc(100vw - 24px);
  background:var(--surface);border:1.5px solid var(--bd2);border-radius:10px;
  padding:10px 12px;font-size:.71rem;line-height:1.7;color:var(--tm);
  box-shadow:0 8px 24px rgba(124,58,237,.18);
  pointer-events:auto;
}
.tip-box.tip-active{display:block}
.tip-box h5{font-size:.71rem;font-weight:700;color:var(--pm);margin-bottom:5px;border-bottom:1px solid var(--bd);padding-bottom:3px}
.tip-box p{margin-bottom:4px}
.tip-box ul{margin-left:12px;margin-bottom:4px}
.tip-box li{margin-bottom:2px}

/* PAY HEADS */
.ph-hdr{display:flex;justify-content:space-between;align-items:center;margin-bottom:7px}
.ph-hdr h4{font-size:.59rem;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:var(--ts)}
.btn-add{display:flex;align-items:center;gap:4px;padding:3px 9px;border-radius:6px;border:1.5px dashed var(--bd2);background:var(--pg);font-family:'DM Sans',sans-serif;font-size:.66rem;font-weight:700;color:var(--pm);cursor:pointer;transition:all .16s}
.btn-add:hover{border-style:solid;background:var(--pp)}
.ph-cols{display:grid;grid-template-columns:1.8fr 1fr 88px 28px;gap:6px;padding-bottom:5px;margin-bottom:4px;border-bottom:1px solid var(--bd)}
.ph-col-lbl{font-size:.57rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--ts)}
.ph-row{display:grid;grid-template-columns:1.8fr 1fr 88px 28px;gap:6px;align-items:center;margin-bottom:5px;animation:fu .16s ease}
@keyframes fu{from{opacity:0;transform:translateY(-3px)}to{opacity:1;transform:translateY(0)}}
.ph-name,.ph-amt{padding:5px 7px;border:1.5px solid var(--bd);border-radius:6px;font-family:'DM Sans',sans-serif;font-size:.79rem;color:var(--td);background:var(--surface);outline:none;width:100%;transition:border-color .17s}
.ph-name:focus,.ph-amt:focus{border-color:var(--pm)}
.ph-amt{text-align:right}
.cat-toggle{display:flex;border-radius:6px;overflow:hidden;border:1.5px solid var(--bd);height:32px}
.cat-btn{flex:1;border:none;background:var(--surface);font-family:'DM Sans',sans-serif;font-size:.61rem;font-weight:600;color:var(--ts);cursor:pointer;transition:all .13s;padding:0 2px;white-space:nowrap}
.cat-btn.active-f{background:var(--blb);color:var(--bl);font-weight:700}
.cat-btn.active-v{background:var(--amb);color:var(--am);font-weight:700}
.cat-btn:first-child{border-right:1px solid var(--bd)}
.ph-del{width:28px;height:28px;border-radius:5px;border:1.5px solid var(--bd);background:var(--surface);color:var(--ts);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .13s;font-size:.68rem}
.ph-del:hover{border-color:var(--rd);background:var(--rdb);color:var(--rd)}

/* NOTICES */
.notice,.info,.warn,.err,.ok{border-radius:8px;padding:7px 10px;font-size:.69rem;line-height:1.6;margin-bottom:8px;display:flex;gap:7px}
.notice{background:var(--pg);border:1.5px solid var(--bd);color:var(--tm)}
.info{background:var(--blb);border:1.5px solid var(--blm);color:#1D4ED8}
.warn{background:var(--amb);border:1.5px solid var(--amm);color:var(--am)}
.err{background:var(--rdb);border:1.5px solid var(--rdm);color:var(--rd)}
.ok{background:var(--grb);border:1.5px solid var(--grm);color:var(--gr);font-weight:600}

/* CALC BUTTON */
.calc-btn{width:100%;padding:11px;border:none;border-radius:10px;background:linear-gradient(135deg,var(--pm),var(--pd));color:#fff;font-family:'Sora',sans-serif;font-size:.9rem;font-weight:700;cursor:pointer;transition:all .2s;display:flex;align-items:center;justify-content:center;gap:7px;box-shadow:0 4px 14px rgba(124,58,237,.28);letter-spacing:-.2px}
.calc-btn:hover{transform:translateY(-2px);box-shadow:0 7px 24px rgba(124,58,237,.38)}
.calc-btn:active{transform:translateY(0)}

/* RIGHT PANEL */
.right-panel{position:sticky;top:16px}
.empty-panel{background:var(--surface);border:1.5px solid var(--bd);border-radius:14px;padding:40px 22px;text-align:center;box-shadow:var(--shl)}
.empty-ico{font-size:2.4rem;margin-bottom:10px;display:block;opacity:.28}
.empty-txt{font-size:.8rem;color:var(--ts);line-height:1.65}

/* TILES */
.tiles{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin-bottom:13px}
.tile{background:var(--surface);border:1.5px solid var(--bd);border-radius:10px;padding:10px 5px;text-align:center}
.tile.tg{background:var(--pp);border-color:var(--pl)}
.tile.tn{background:var(--grb);border-color:var(--grm)}
.tile-v{font-family:'Sora',sans-serif;font-size:1.2rem;font-weight:800;display:block;color:var(--td);line-height:1}
.tile.tg .tile-v{color:var(--pm)}
.tile.tn .tile-v{color:var(--gr)}
.tile-l{font-size:.55rem;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:var(--ts);margin-top:3px}

/* RESULT TABLE */
.res-hdr{display:flex;align-items:center;gap:7px;padding-bottom:10px;margin-bottom:11px;border-bottom:1.5px solid var(--bd)}
.res-title{font-family:'Sora',sans-serif;font-size:.85rem;font-weight:700;color:var(--td);flex:1}
.res-emp{font-size:.69rem;color:var(--ts)}
.rtbl{width:100%;border-collapse:collapse;font-size:.76rem}
.rtbl th{background:var(--pp);padding:6px 8px;text-align:left;font-size:.56rem;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:var(--pm);border-bottom:2px solid var(--bd)}
.rtbl th:not(:first-child){text-align:right}
.rtbl td{padding:6px 8px;border-bottom:1px solid var(--bd);color:var(--tm)}
.rtbl td:not(:first-child){text-align:right;font-weight:600;color:var(--td)}
.rtbl tr:last-child td{border-bottom:none}
.rtbl .s-hdr td{background:var(--pg);font-size:.57rem;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:var(--pm);border-top:1.5px solid var(--bd);padding:5px 8px}
.rtbl .sub td{color:var(--ts)!important;font-weight:400!important}
.rtbl .earn-tot td{background:var(--pp);color:var(--pm)!important;font-weight:700;border-top:2px solid var(--bd2)}
.rtbl .ded td{color:var(--rd)!important}
.rtbl .ded-tot td{background:var(--rdb);color:var(--rd)!important;font-weight:700;border-top:2px solid var(--rdm)}
.rtbl .net td{background:var(--grb);color:var(--gr)!important;font-weight:700;font-size:.84rem;border-top:3px solid var(--grm);font-family:'Sora',sans-serif}
.itnote{font-size:.56rem;font-style:italic;font-weight:400;color:var(--am);margin-left:3px}

/* TAX CMP */
.cmp-title{font-family:'Sora',sans-serif;font-size:.81rem;font-weight:700;color:var(--td);margin-bottom:10px;display:flex;align-items:center;gap:7px;padding-bottom:8px;border-bottom:1.5px solid var(--bd)}
.rtbl .winner td{background:var(--grb);color:var(--gr)!important;font-weight:700}
.rtbl .loser td{background:var(--rdb);color:var(--rd)!important}

/* LOADER */
.loader{width:11px;height:11px;border:2px solid rgba(124,58,237,.2);border-top-color:var(--pm);border-radius:50%;animation:spin .75s linear infinite;display:inline-block}
@keyframes spin{to{transform:rotate(360deg)}}

/* PF SOURCE HINT */
.pf-hint{font-size:.6rem;color:var(--ts);margin-top:2px;line-height:1.4}
.pf-hint strong{color:var(--pm)}

footer{display:none}

/* DOWNLOAD BUTTON */
.dl-btn{display:inline-flex;align-items:center;gap:5px;padding:4px 10px;border:1.5px solid var(--bd2);border-radius:7px;background:var(--pp);color:var(--pm);font-family:"DM Sans",sans-serif;font-size:.65rem;font-weight:700;cursor:pointer;transition:all .15s}
.dl-btn:hover{background:var(--pm);color:#fff;border-color:var(--pm)}
.dl-btn svg{flex-shrink:0}

/* MODAL OVERLAY */
.modal-overlay{display:none;position:fixed;inset:0;background:rgba(30,27,75,.45);z-index:10000;align-items:center;justify-content:center;padding:16px}
.modal-overlay.open{display:flex}
.modal-box{background:var(--surface);border-radius:16px;padding:22px 22px 18px;max-width:420px;width:100%;box-shadow:0 24px 64px rgba(124,58,237,.22);border:1.5px solid var(--bd)}
.modal-title{font-family:"Sora",sans-serif;font-size:.9rem;font-weight:800;color:var(--td);margin-bottom:6px}
.modal-body{font-size:.76rem;color:var(--tm);line-height:1.65;margin-bottom:14px}
.modal-check{display:flex;align-items:flex-start;gap:8px;font-size:.73rem;color:var(--tm);margin-bottom:16px;cursor:pointer}
.modal-check input{margin-top:2px;accent-color:var(--pm)}
.modal-actions{display:flex;gap:8px;justify-content:flex-end}
.modal-cancel{padding:7px 16px;border:1.5px solid var(--bd);border-radius:8px;background:var(--surface);color:var(--ts);font-family:"DM Sans",sans-serif;font-size:.76rem;font-weight:600;cursor:pointer}
.modal-cancel:hover{border-color:var(--rd);color:var(--rd)}
.modal-confirm{padding:7px 16px;border:none;border-radius:8px;background:linear-gradient(135deg,var(--pm),var(--pd));color:#fff;font-family:"DM Sans",sans-serif;font-size:.76rem;font-weight:700;cursor:pointer;opacity:.45;transition:opacity .15s}
.modal-confirm.active{opacity:1}

#payslipPrint{display:none}
@media(max-width:840px){.grid{grid-template-columns:1fr}.right-panel{position:static}}
`;

export default function SalaryProration() {
  const hostRef = useRef(null);

  // Mirror <html data-theme> (set by Header.js's toggle) onto the shadow
  // host element itself. A shadow tree has no visibility into the outer
  // document at all - it can't see html[data-theme="dark"] no matter how
  // that selector is written, since the shadow boundary blocks it entirely.
  // :host([data-theme="dark"]) in the CSS is the correct, Shadow-DOM-native
  // way to react to this: it matches based on an attribute present on the
  // host element in the light DOM, which is exactly what this sets.
  const [theme, setTheme] = useState("light");
  useEffect(() => {
    const root = document.documentElement;
    setTheme(root.getAttribute("data-theme") || "light");
    const observer = new MutationObserver(() => {
      setTheme(root.getAttribute("data-theme") || "light");
    });
    observer.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (hostRef.current) hostRef.current.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const host = hostRef.current;
    if (!host || host.shadowRoot) return; // guard: already mounted (e.g. React 18 dev double-effect)

    const shadow = host.attachShadow({ mode: "open" });

    const styleEl = document.createElement("style");
    styleEl.textContent = SP_TOOL_CSS;
    shadow.appendChild(styleEl);

    const container = document.createElement("div");
    container.innerHTML = TOOL_BODY_HTML;
    shadow.appendChild(container);

    function loadScriptOnce(src, readyFlag) {
      if (window[readyFlag]) return Promise.resolve();
      if (window[readyFlag + "_p"]) return window[readyFlag + "_p"];
      const p = new Promise((resolve) => {
        const s = document.createElement("script");
        s.src = src;
        s.onload = () => {
          window[readyFlag] = true;
          resolve();
        };
        s.onerror = () => {
          if (readyFlag === "__spJsPdfLoaded") window._jspdfLoadErr = true;
          resolve();
        };
        document.body.appendChild(s);
      });
      window[readyFlag + "_p"] = p;
      return p;
    }

    // jsPDF loads independently (only needed when the user downloads a payslip).
    loadScriptOnce(
      "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js",
      "__spJsPdfLoaded"
    );

    // pdf.js must finish before the tool script (which references pdfjsLib) runs.
    loadScriptOnce(
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js",
      "__spPdfJsLoaded"
    )
      .then(() => loadScriptOnce("/salary-proration-tool.js", "__spToolLoaded"))
      .then(() => {
        window.__spRoot = shadow;
        if (typeof window.__spInitTool === "function") {
          window.__spInitTool();
        }
      });
  }, []);

  return (
    <>
      <Head>
        <title>Salary Proration Calculator – PayrollTool</title>
        <meta
          name="description"
          content="Calculate precise prorated salary for partial months, mid-month joining or exit. EPF, ESI, PT, LWF, NPS, TDS included."
        />
        <meta name="robots" content="index, follow" />
        <meta property="og:title" content="Salary Proration Calculator – PayrollTool" />
        <meta property="og:url" content="https://www.payrolltool.in/salary-proration" />
        <meta property="og:type" content="website" />
        <link rel="canonical" href="https://www.payrolltool.in/salary-proration" />
      </Head>

      <div className="sp-wrapper" data-theme={theme}>
        <Header />

        <div className="sp-host" ref={hostRef} />

        <div className="sp-cards-row">
          {INFO_CARDS.map((c) => (
            <div className="sp-info-card" key={c.title}>
              <div className="sp-info-icon">{c.icon}</div>
              <h2>{c.title}</h2>
              <p>{c.body}</p>
            </div>
          ))}
        </div>

        <div className="max-w-3xl mx-auto px-4">
          <FeedbackWidget toolName="Salary Proration" />
        </div>

        <Footer />
      </div>

      <style jsx>{`
        .sp-wrapper {
          font-family: "DM Sans", sans-serif;
          background: #eeeaf8;
        }
        .sp-wrapper[data-theme="dark"] {
          background: #15111f;
        }

        .sp-host {
          display: block;
        }

        .sp-cards-row {
          max-width: 1200px;
          margin: 28px auto 40px;
          padding: 0 20px;
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 14px;
        }

        .sp-info-card {
          background: #fff;
          border: 1.5px solid #ddd6fe;
          border-radius: 12px;
          padding: 14px 15px;
          box-shadow: 0 2px 10px rgba(124, 58, 237, 0.07);
        }
        .sp-wrapper[data-theme="dark"] .sp-info-card {
          background: #1c1730;
          border-color: #2a2536;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
        }

        .sp-info-icon {
          font-size: 18px;
          margin-bottom: 6px;
        }

        .sp-info-card h2 {
          font-family: "Sora", sans-serif;
          font-size: 12.5px;
          font-weight: 700;
          color: #5b21b6;
          margin: 0 0 6px;
        }
        .sp-wrapper[data-theme="dark"] .sp-info-card h2 {
          color: #a47df5;
        }

        .sp-info-card p {
          font-size: 11.8px;
          line-height: 1.6;
          color: #726c87;
          margin: 0;
        }
        .sp-wrapper[data-theme="dark"] .sp-info-card p {
          color: #b3aac7;
        }

        @media (max-width: 980px) {
          .sp-cards-row {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 560px) {
          .sp-cards-row {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </>
  );
}
// Deployed: 08/16/2026 20:16:00
