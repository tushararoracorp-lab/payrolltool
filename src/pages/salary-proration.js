import Head from "next/head";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { useEffect, useRef } from "react";
import FeedbackWidget from "../components/FeedbackWidget";

const INFO_CARDS = [
  {
    icon: "📅",
    title: "What is Proration?",
    body: "Pay calculated for a partial month — mid-month joining, exit, or a role change — split proportionally across the days actually payable.",
  },
  {
    icon: "🧮",
    title: "The Formula",
    body: "Monthly Amount ÷ Calendar Days in Month × Payable Days. Payable days are calendar days, matching what EPFO and most Indian payroll systems expect.",
  },
  {
    icon: "📝",
    title: "Worked Example",
    body: "Joined 15 Aug on ₹60,000/month. August has 31 days, so 17 are payable: (₹60,000 ÷ 31) × 17 = ₹32,903 gross for that month.",
  },
  {
    icon: "⚖️",
    title: "Statutory Coverage",
    body: "EPF + VPF, Employer NPS, ESI, state-wise Professional Tax & LWF, and a New vs Old regime TDS estimate — all recalculated on the prorated figure.",
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
            <p><strong>Gender</strong> is needed for Professional Tax - in Maharashtra, women earning ≤ ₹25,000/month are exempt. Gender <em>Other</em> is treated as male for PT purposes until statutory guidance specifies otherwise.</p>
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
        <div class="ph-col-lbl" style="text-align:right">Monthly (₹)</div>
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
          <label>Employee EPF (₹/mo)</label>
          <input type="number" class="pf-input" id="empPFInput" min="0" placeholder="e.g. 1800" oninput="syncErPF();updatePreviews()"/>
          <div class="pf-hint">From appointment letter</div>
        </div>
        <div class="field">
          <label>Employer EPF (₹/mo)</label>
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
            <p>Applies when monthly gross ≤ ₹21,000. ESI deduction amount is calculated on <strong>this month's prorated earnings</strong>.</p>
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
            <p><strong>LWF</strong> is a flat ₹ amount, deducted only in applicable months (monthly / half-yearly Jun+Dec / annual Dec).</p>
            <p>Odisha: PT abolished w.e.f. 1 Apr 2026. &nbsp;Haryana LWF: ₹35/emp revised w.e.f. 1 Jan 2026.</p>
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
            <p><strong>New Regime:</strong> Std deduction ₹75,000. Zero tax if annual taxable ≤ ₹12L.</p>
            <p><strong>Old Regime:</strong> Std deduction ₹50,000. 80C/HRA/80D deductions allowed. Zero tax if ≤ ₹5L.</p>
            <p>TDS shown is an estimate based on gross only.</p>
          </div>
        </div>
      </div>
      <div class="tabs c2">
        <button class="tab on2" id="btnNew" onclick="setRegime('new')">New Regime (Default)<span class="tab-sub">₹75k std ded · 87A ≤₹12L</span></button>
        <button class="tab" id="btnOld" onclick="setRegime('old')">Old Regime<span class="tab-sub">80C/HRA etc · ₹50k std ded</span></button>
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
      <thead><tr><th>Description</th><th>Monthly (₹)</th><th>This Month (₹)</th></tr></thead>
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

export default function SalaryProration() {
  const hostRef = useRef(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const host = hostRef.current;
    if (!host || host.shadowRoot) return; // guard: already mounted (e.g. React 18 dev double-effect)

    const shadow = host.attachShadow({ mode: "open" });

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "/salary-proration-tool.css";
    shadow.appendChild(link);

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

      <div className="sp-wrapper">
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

        .sp-info-card p {
          font-size: 11.8px;
          line-height: 1.6;
          color: #726c87;
          margin: 0;
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
