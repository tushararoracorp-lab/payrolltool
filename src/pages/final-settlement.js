import Head from "next/head";
import { useState, useEffect } from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import FeedbackWidget from "../components/FeedbackWidget";
import Lenis from "lenis";

const MONEY_CAP = 5e7; // Rs. 5,00,00,000
const DAYS_CAP = 3650;
const LEAVE_EXEMPT_LIMIT = 2500000; // Rs. 25L lifetime limit, Sec 10(10AA)

function fmt(n) {
  const neg = n < 0;
  n = Math.round(Math.abs(n));
  return (neg ? "-Rs. " : "Rs. ") + n.toLocaleString("en-IN");
}
function daysBetween(a, b) {
  return Math.max(0, Math.floor((b - a) / (1000 * 60 * 60 * 24)));
}
function isValidDate(d) {
  return d instanceof Date && !isNaN(d.getTime());
}
function clamp(val, max) {
  return Math.min(Math.max(val, 0), max);
}

// Pure calculation - mirrors the original vanilla-JS calc() logic exactly.
function calculate(f) {
  const capWarnings = [];
  function clampMoney(raw, label) {
    const n = parseFloat(raw) || 0;
    if (n > MONEY_CAP) capWarnings.push(`${label} capped at Rs. 5,00,00,000.`);
    return clamp(n, MONEY_CAP);
  }
  function clampDays(raw, label, max) {
    const n = parseFloat(raw) || 0;
    if (n > max) capWarnings.push(`${label} capped at ${max} days.`);
    return clamp(n, max);
  }

  const basic = clampMoney(f.basic, "Basic Salary");
  const da = clampMoney(f.da, "Dearness Allowance");
  const gross = clampMoney(f.gross, "Gross Salary");
  const basicDA = basic + da;
  const doj = new Date(f.doj);
  const dor = new Date(f.dor);
  const dol = new Date(f.dol);
  const leaveDays = clampDays(f.leave, "Unused paid leave", 365);
  const req = clampDays(f.req, "Notice period required", DAYS_CAP);
  const served = clampDays(f.served, "Notice period served", DAYS_CAP);
  const credit = clampMoney(f.credit, "Other amount owed to you");
  const debit = clampMoney(f.debit, "Dues to be deducted");

  let noticeSalary = basicDA;
  const hasShortfall = served < req;
  if (f.noticeBasis === "gross") {
    if (gross > 0) {
      noticeSalary = gross;
    } else if (hasShortfall) {
      capWarnings.push("Gross Salary not entered - using Basic + DA instead for notice pay.");
    }
  }

  const messages = [];
  const datesValid = isValidDate(doj) && isValidDate(dol) && dol >= doj;
  if (!isValidDate(doj) || !isValidDate(dol) || dol < doj) {
    messages.push(
      "Check your dates - enter a valid Date of Joining and Last Working Day (Last Working Day must be on or after Date of Joining)."
    );
  } else if (isValidDate(dor) && isValidDate(dol) && dol < dor) {
    messages.push("Last working day should be on or after your resignation date.");
  }
  messages.push(...capWarnings);

  const lines = [];
  let gratuity = 0;
  const gratuityCap = f.sector === "government" ? 2500000 : 2000000;
  let tenureLine = "Let's see what you're owed - press Calculate below";

  if (!datesValid) {
    tenureLine = "Enter valid dates to see your tenure";
    lines.push({ label: "Gratuity", amount: 0, explain: "Enter a valid Date of Joining and Last Working Day to calculate this." });
  } else {
    let years = dol.getFullYear() - doj.getFullYear();
    let anniversary = new Date(doj);
    anniversary.setFullYear(doj.getFullYear() + years);
    if (anniversary > dol) {
      years -= 1;
      anniversary = new Date(doj);
      anniversary.setFullYear(doj.getFullYear() + years);
    }
    const extraDays = Math.max(0, Math.floor((dol - anniversary) / (1000 * 60 * 60 * 24)));
    const nextAnniversary = new Date(anniversary);
    nextAnniversary.setFullYear(anniversary.getFullYear() + 1);
    const windowDays = daysBetween(anniversary, nextAnniversary);
    const daysUntilNext = Math.max(0, windowDays - extraDays);
    tenureLine = `${years} year(s) complete - ${daysUntilNext} day(s) until your next work anniversary`;

    if (years >= 5) {
      const gratuityYears = years + (extraDays >= 182 ? 1 : 0);
      gratuity = (basicDA * 15) / 26 * gratuityYears;
      let explain = `Qualifies at ${years} completed year(s) of service${
        extraDays >= 182 ? `, rounded up to ${gratuityYears} for the payout (6+ months counts as a full year)` : ""
      }.`;
      if (gratuity > gratuityCap) {
        gratuity = gratuityCap;
        explain += ` Capped at the statutory ${f.sector === "government" ? "Rs. 25L" : "Rs. 20L"} limit.`;
      }
      lines.push({ label: "Gratuity", amount: gratuity, explain });
    } else {
      const shortMsg =
        years === 4
          ? `So close - just ${daysUntilNext} more day(s) and you'd have qualified for gratuity.`
          : `Not applicable yet - gratuity kicks in after 5 completed years, and you're at ${years}.`;
      lines.push({ label: "Gratuity", amount: 0, explain: shortMsg });
    }
  }

  const leaveAmt = (basicDA / 30) * leaveDays;
  let leaveExplain = `${leaveDays} unused leave day(s) paid out.`;
  let leaveTaxFlag = null;
  if (leaveAmt > LEAVE_EXEMPT_LIMIT) {
    leaveTaxFlag = "This alone exceeds the Rs. 25L lifetime tax-exemption limit (assuming no prior use) - the excess is likely taxable.";
  }
  lines.push({ label: "Leave encashment", amount: leaveAmt, explain: leaveExplain, taxFlag: leaveTaxFlag });

  let noticeAmt = 0;
  if (served < req) {
    const shortfall = req - served;
    noticeAmt = -((noticeSalary / 30) * shortfall);
    lines.push({
      label: "Notice period shortfall",
      amount: noticeAmt,
      explain: `Served ${served} of ${req} required days - ${shortfall} day(s) short, on ${
        f.noticeBasis === "gross" && gross > 0 ? "Gross salary" : "Basic + DA"
      }.`,
    });
  } else {
    lines.push({ label: "Notice period", amount: 0, explain: `Served ${served} of ${req} required days - no deduction.` });
  }

  if (credit > 0) lines.push({ label: "Other amount owed to you", amount: credit, explain: "As entered above." });
  if (debit > 0) lines.push({ label: "Dues deducted", amount: -debit, explain: "As entered above." });

  const net = gratuity + leaveAmt + noticeAmt + credit - debit;

  return { messages, tenureLine, lines, net };
}

const initialFields = {
  doj: "",
  dor: "",
  dol: "",
  sector: "private",
  basic: "",
  da: "",
  gross: "",
  req: "60",
  served: "",
  servedAuto: true,
  noticeBasis: "basic",
  leave: "",
  credit: "",
  debit: "",
};

function autoServed(dor, dol) {
  const a = new Date(dor);
  const b = new Date(dol);
  if (isValidDate(a) && isValidDate(b) && b >= a) return String(daysBetween(a, b));
  return "";
}

export default function FinalSettlement() {
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

  const [fields, setFields] = useState(() => ({
    ...initialFields,
    served: autoServed(initialFields.dor, initialFields.dol),
  }));

  const set = (key) => (e) => setFields((s) => ({ ...s, [key]: e.target.value, ...(key === "served" ? { servedAuto: false } : {}) }));

  const setDateField = (key) => (e) => {
    const value = e.target.value;
    setFields((s) => {
      const next = { ...s, [key]: value };
      if (s.servedAuto) {
        next.served = autoServed(key === "dor" ? value : s.dor, key === "dol" ? value : s.dol);
      }
      return next;
    });
  };

  const [openSections, setOpenSections] = useState({
    employment: true,
    salary: true,
    notice: true,
    other: true,
  });
  const toggleSection = (key) => setOpenSections((s) => ({ ...s, [key]: !s[key] }));

  const [results, setResults] = useState(null);

  const handleCalculate = () => {
    setResults(calculate(fields));
    if (typeof window !== "undefined" && window.gtag) {
      window.gtag("event", "tool_calculate_click", { tool_name: "Final Settlement" });
    }
    setOpenSections({ employment: false, salary: false, notice: false, other: false });
  };

  // Smooth scrolling - scoped to THIS page only. Destroyed on unmount, so
  // navigating to any other page (Home, LOP Splitter, etc.) is completely
  // unaffected and reverts to native scroll immediately.
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (prefersReducedMotion) return; // native scroll only - no Lenis at all

    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => 1 - Math.pow(1 - t, 2),
      smoothWheel: true,
      wheelMultiplier: 0.8,
      touchMultiplier: 1.5,
      infinite: false,
    });

    let rafId;
    function raf(time) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }
    rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
    };
  }, []);

  return (
    <>
      <Head>
        <title>Final Settlement Calculator – Gratuity, Leave Encashment | PayrollTool.in</title>
        <meta
          name="description"
          content="Calculate your full and final settlement - gratuity, notice pay, and leave encashment - browser-based, no login required."
        />
        <meta name="robots" content="index, follow" />
        <meta name="author" content="PayrollTool.in" />
        <meta property="og:title" content="Final Settlement Calculator – PayrollTool.in" />
        <meta
          property="og:description"
          content="Calculate your full and final settlement - gratuity, notice pay, and leave encashment - browser-based, no login required."
        />
        <meta property="og:url" content="https://www.payrolltool.in/final-settlement" />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="PayrollTool.in" />
        <meta property="og:locale" content="en_IN" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Final Settlement Calculator – PayrollTool.in" />
        <meta
          name="twitter:description"
          content="Calculate your full and final settlement - gratuity, notice pay, and leave encashment - browser-based, no login required."
        />
        <link rel="canonical" href="https://www.payrolltool.in/final-settlement" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              name: "Final Settlement Calculator",
              url: "https://www.payrolltool.in/final-settlement",
              applicationCategory: "BusinessApplication",
              operatingSystem: "Any (browser-based)",
              description: "Calculates full and final settlement — gratuity, notice pay, leave encashment, and statutory deductions — in one place.",
              offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
            }),
          }}
        />
      </Head>

      <div className="fsc-wrapper" data-theme={theme} style={{ fontFamily: "'DM Sans', sans-serif", background: theme === "dark" ? "#15111F" : "#EEEAF8" }}>
        <Header />

        <div className="fsc-hero">
          <h1>
            Final Settlement <span>Calculator</span>
          </h1>
          <p>Calculate your gratuity, notice pay, and leave encashment in one place - know your number before HR tells you theirs.</p>
        </div>

        <div className="layout">
          <div>
            <div className="section" id="sec-employment">
              <div className="section-head">
                <div className="section-head-left">
                  <span className="sec-icon"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M4 21v-1a8 8 0 0116 0v1"/></svg></span>
                  <span className="sec-title">Tenure &amp; Classification</span>
                </div>
                <button type="button" className="collapse-btn" onClick={() => toggleSection("employment")}>
                  {openSections.employment ? "▼ Collapse" : "▶ Expand"}
                </button>
              </div>
              {openSections.employment && (
              <div className="section-body">
                <div className="grid2">
                  <div className="field">
                    <label htmlFor="doj">Date of Joining</label>
                    <input type="date" id="doj" value={fields.doj} onChange={setDateField("doj")} />
                  </div>
                  <div className="field">
                    <label htmlFor="dor">Date of Resignation</label>
                    <input type="date" id="dor" value={fields.dor} onChange={setDateField("dor")} />
                    <div className="help">The date you submitted your resignation.</div>
                  </div>
                  <div className="field field-full">
                    <label htmlFor="dol">
                      Last Working Day{" "}
                      <span className="info-dot" title="Also known as your Date of Leaving" tabIndex={0}>
                        ⓘ
                      </span>
                    </label>
                    <input type="date" id="dol" value={fields.dol} onChange={setDateField("dol")} />
                    <div className="help info-mobile">Also known as your Date of Leaving.</div>
                  </div>
                  <div className="field field-full">
                    <label htmlFor="sector">Sector</label>
                    <select id="sector" value={fields.sector} onChange={set("sector")}>
                      <option value="private">Private (gratuity capped at Rs. 20L)</option>
                      <option value="government">Government (gratuity capped at Rs. 25L)</option>
                    </select>
                    <div className="help">Not sure? Most salaried company jobs count as Private.</div>
                  </div>
                </div>
              </div>
              )}
            </div>

            <div className="section" id="sec-salary">
              <div className="section-head">
                <div className="section-head-left">
                  <span className="sec-icon"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2"><path d="M12 2v20m-7-5h14M3 9h18"/></svg></span>
                  <span className="sec-title">Salary</span>
                </div>
                <button type="button" className="collapse-btn" onClick={() => toggleSection("salary")}>
                  {openSections.salary ? "▼ Collapse" : "▶ Expand"}
                </button>
              </div>
              {openSections.salary && (
              <div className="section-body">
                <div className="grid2">
                  <div className="field">
                    <label htmlFor="basic">Monthly Basic Salary (Rs. )</label>
                    <input inputMode="decimal" type="number" id="basic" value={fields.basic} onChange={set("basic")} min="0" max="50000000" />
                    <div className="help">Check your latest payslip - usually the largest single line item.</div>
                  </div>
                  <div className="field">
                    <label htmlFor="da">
                      Monthly Dearness Allowance (Rs. ) <span className="req-tag">optional</span>
                    </label>
                    <input inputMode="decimal" type="number" id="da" value={fields.da} onChange={set("da")} min="0" max="50000000" />
                    <div className="help">If DA is a separate line on your payslip, enter it here - it&apos;s combined with Basic for gratuity and leave encashment.</div>
                  </div>
                  <div className="field field-full">
                    <label htmlFor="gross">
                      Monthly Gross Salary (Rs. ) <span className="req-tag">optional</span>
                    </label>
                    <input inputMode="decimal" type="number" id="gross" value={fields.gross} onChange={set("gross")} min="0" max="50000000" />
                    <div className="help">Only needed if your notice pay below is based on Gross.</div>
                  </div>
                </div>
              </div>
              )}
            </div>

            <div className="section" id="sec-notice">
              <div className="section-head">
                <div className="section-head-left">
                  <span className="sec-icon">⏱</span>
                  <span className="sec-title">Notice Period</span>
                </div>
                <button type="button" className="collapse-btn" onClick={() => toggleSection("notice")}>
                  {openSections.notice ? "▼ Collapse" : "▶ Expand"}
                </button>
              </div>
              {openSections.notice && (
              <div className="section-body">
                <div className="grid2">
                  <div className="field">
                    <label htmlFor="req">Notice period required (days)</label>
                    <input inputMode="decimal" type="number" id="req" value={fields.req} onChange={set("req")} min="0" max="3650" />
                    <div className="help">Check your contract - 60 is the common default.</div>
                  </div>
                  <div className="field">
                    <label htmlFor="served">
                      Notice period served (days) <span className="auto-badge">auto</span>
                    </label>
                    <input inputMode="decimal" type="number" id="served" value={fields.served} onChange={set("served")} min="0" max="3650" />
                    <div className="help">Calculated from resignation → last working day. Edit if it doesn&apos;t match.</div>
                  </div>
                  <div className="field field-full">
                    <label htmlFor="noticeBasis">Notice pay is based on</label>
                    <select id="noticeBasis" value={fields.noticeBasis} onChange={set("noticeBasis")}>
                      <option value="basic">Basic + DA</option>
                      <option value="gross">Gross Salary</option>
                    </select>
                    <div className="help">Check your appointment letter to confirm - if unsure, most companies use Basic + DA.</div>
                  </div>
                </div>
              </div>
              )}
            </div>

            <div className="section" id="sec-other">
              <div className="section-head">
                <div className="section-head-left">
                  <span className="sec-icon"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></span>
                  <span className="sec-title">Leave &amp; Other Amounts</span>
                </div>
                <button type="button" className="collapse-btn" onClick={() => toggleSection("other")}>
                  {openSections.other ? "▼ Collapse" : "▶ Expand"}
                </button>
              </div>
              {openSections.other && (
              <div className="section-body">
                <div className="grid2">
                  <div className="field">
                    <label htmlFor="leave">Unused paid leave (days)</label>
                    <input inputMode="decimal" type="number" id="leave" value={fields.leave} onChange={set("leave")} min="0" max="365" />
                  </div>
                  <div className="field">
                    <label htmlFor="credit">Other amount owed to you (Rs. )</label>
                    <input inputMode="decimal" type="number" id="credit" value={fields.credit} onChange={set("credit")} min="0" max="50000000" />
                  </div>
                  <div className="field field-full">
                    <label htmlFor="debit">Dues to be deducted (Rs. )</label>
                    <input inputMode="decimal" type="number" id="debit" value={fields.debit} onChange={set("debit")} min="0" max="50000000" />
                  </div>
                </div>
              </div>
              )}
            </div>

            <button type="button" className="calc-btn" onClick={handleCalculate}>
              Calculate Settlement
            </button>
          </div>

          <div className="summary">
            <div className="summary-card">
              <div className="summary-title" style={{display:"flex",alignItems:"center",gap:"7px"}}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="10" x2="8" y2="10"/><line x1="12" y1="10" x2="12" y2="10"/><line x1="16" y1="10" x2="16" y2="10"/><line x1="8" y1="14" x2="8" y2="14"/><line x1="12" y1="14" x2="12" y2="14"/><line x1="16" y1="14" x2="16" y2="14"/><line x1="8" y1="18" x2="8" y2="18"/><line x1="12" y1="18" x2="12" y2="18"/><line x1="16" y1="18" x2="16" y2="18"/></svg>Your Settlement Summary</div>

              {!results ? (
                <div className="summary-placeholder">
                  <div className="placeholder-icon"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="1.5"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/></svg></div>
                  <p>
                    Fill in the details on the left and tap <b>Calculate Settlement</b> to see your estimate.
                  </p>
                  <p className="placeholder-sub">Results: Gratuity · Leave encashment · Notice pay · Net settlement</p>
                </div>
              ) : (
              <>
              <div className="summary-sub">{results.tenureLine}</div>

              {results.messages.length > 0 && (
                <div className="warn show">
                  {results.messages.map((m, i) => (
                    <div key={i}>{m}</div>
                  ))}
                </div>
              )}

              <div>
                {results.lines.map((line, i) => (
                  <div className="line-item" key={i}>
                    <div className="li-top">
                      <span className="li-label">{line.label}</span>
                      <span className={`li-amt ${line.amount < 0 ? "neg" : ""}`}>{fmt(line.amount)}</span>
                    </div>
                    <div className="li-explain">
                      {line.explain}
                      {line.taxFlag && <span className="tax-flag">{line.taxFlag}</span>}
                    </div>
                  </div>
                ))}
              </div>

              <div className={`stamp ${results.net < 0 ? "recover" : ""}`}>
                <div className="stamp-label">{results.net < 0 ? "You'd owe your employer" : "You should receive"}</div>
                <div className="stamp-amt">{fmt(results.net)}</div>
                <div className="stamp-sub">Estimate only - confirm with HR.</div>
              </div>

              <div className="feedback-slot">
                <FeedbackWidget toolName="Final Settlement" />
              </div>
              </>
              )}

              <details className="rules">
                <summary>How this is calculated</summary>
                <div className="rules-box">
                  <p>
                    <b>Gratuity</b> - paid only after 5+ years of service: <code>(Basic + DA) × 15 ÷ 26 × years worked</code>. A period of 6+ months
                    in the final year rounds up to a full year. Capped at Rs. 20 lakh (private sector) or Rs. 25 lakh (government) per the Payment of
                    Gratuity Act, 1972.
                  </p>
                  <p>
                    <b>Leave encashment</b> - <code>(Basic + DA) ÷ 30 × unused leave days</code>. Only Earned/Privilege Leave is encashable in most
                    states - casual and sick leave typically aren&apos;t.
                  </p>
                  <p>
                    <b>Notice shortfall</b> - served days are worked out from your resignation and last working day; if that&apos;s less than the
                    required notice, the shortfall is deducted at <code>(Basic+DA or Gross) ÷ 30</code> per day, based on whichever your appointment
                    letter specifies. If you select Gross but don&apos;t enter it, this falls back to Basic + DA.
                  </p>
                  <p>
                    <b>Tax</b> - Gratuity above is capped at the same figure as its tax-exemption limit (Sec 10(10)), so it stays tax-free by
                    construction. Leave encashment isn&apos;t capped here, so a high salary plus a large leave balance can push it past the Sec 10(10AA)
                    exemption (a lifetime limit shared across employers) - anything above that limit is taxable, so treat that figure as pre-tax.
                  </p>
                </div>
              </details>
              {results && (
              <>
              <div className="next-step" style={{display:"flex",gap:"8px",alignItems:"flex-start"}}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2" style={{flexShrink:0,marginTop:"2px"}}><path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z"/></svg>
                <span>Once you have this number, ask HR for a written FnF statement and compare it line by line - if anything doesn&apos;t match, ask which
                formula or dates they used. It&apos;s a completely normal question to ask.</span>
              </div>
              <div className="closing-note">Whatever comes next, we hope it goes well for you.</div>
              </>
              )}
            </div>
          </div>
        </div>

        <Footer />
      </div>

      <style jsx>{`
        .fsc-wrapper {
          --surface: #fff;
          --surface-alt: #f9f8fc;
          --surface-alt2: #f2f1f7;
          --ink: #1e1b29;
          --ink-mid: #6b7280;
          --ink-soft: #9ca3af;
          --line: #ecead3;
          --brand: #7c3aed;
          --brand-deep: #6d28d9;
          --brand-tint: #f5f3ff;
          --brand-tint-border: #e4dbfb;
          --danger: #dc2626;
          --danger-deep: #c0392b;
          --warn: #b45309;
          --warn-tint: #fef3c7;
          --warn-tint-border: #f5dfa6;
        }
        .fsc-wrapper[data-theme="dark"] {
          --surface: #1c1730;
          --surface-alt: #16131c;
          --surface-alt2: #221c3a;
          --ink: #f3f0fa;
          --ink-mid: #d6cfe8;
          --ink-soft: #b3aac7;
          --line: #2a2536;
          --brand: #9163f2;
          --brand-deep: #a47df5;
          --brand-tint: #2c2147;
          --brand-tint-border: #3d3654;
          --danger: #f87171;
          --danger-deep: #f87171;
          --warn: #fbbf54;
          --warn-tint: #332411;
          --warn-tint-border: #5c4a1f;
        }
        .fsc-hero {
          text-align: center;
          padding: 24px 20px 8px;
          max-width: 720px;
          margin: 0 auto;
        }
        .fsc-hero h1 {
          font-family: "Sora", sans-serif;
          font-size: clamp(1.5rem, 3vw, 2rem);
          font-weight: 800;
          margin: 0 0 6px;
          letter-spacing: -1px;
          line-height: 1.12;
          color: var(--ink);
        }
        .fsc-hero h1 span {
          color: var(--brand);
        }
        .fsc-hero p {
          color: var(--ink-mid);
          font-size: 14.5px;
          line-height: 1.6;
          margin: 0 auto;
          max-width: 56ch;
        }
        .layout {
          max-width: 1040px;
          margin: 36px auto 0;
          padding: 0 20px 40px;
          display: grid;
          grid-template-columns: 1.35fr 1fr;
          gap: 22px;
          align-items: start;
        }
        .section {
          background: var(--surface);
          border: 1px solid var(--line);
          border-radius: 14px;
          margin-bottom: 16px;
          overflow: hidden;
        }
        .section-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 18px;
        }
        .collapse-btn {
          background: none;
          border: none;
          font-family: "DM Sans", sans-serif;
          font-size: 12px;
          font-weight: 600;
          color: var(--brand);
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 6px;
        }
        .collapse-btn:hover {
          background: var(--brand-tint);
        }
        .calc-btn {
          width: 100%;
          margin-top: 4px;
          padding: 14px;
          border: none;
          border-radius: 10px;
          background: linear-gradient(135deg, var(--brand), var(--brand-deep));
          color: var(--surface);
          font-family: "Sora", sans-serif;
          font-size: 14.5px;
          font-weight: 700;
          cursor: pointer;
        }
        .calc-btn:hover {
          filter: brightness(1.05);
        }
        .section-head-left {
          display: flex;
          align-items: center;
          gap: 11px;
        }
        .sec-icon {
          width: 30px;
          height: 30px;
          border-radius: 9px;
          background: var(--brand-tint);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
        }
        .sec-title {
          font-family: "Sora", sans-serif;
          font-weight: 700;
          font-size: 14.5px;
          color: var(--ink);
        }
        .section-body {
          padding: 2px 18px 20px;
        }
        .grid2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }
        .field-full {
          grid-column: 1 / -1;
        }
        .field {
          margin-bottom: 14px;
        }
        .field label {
          display: block;
          font-size: 12.5px;
          font-weight: 600;
          color: var(--ink);
          margin-bottom: 5px;
        }
        .field label .req-tag {
          font-weight: 400;
          color: var(--ink-soft);
          font-size: 11px;
        }
        .field label .info-dot {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 700;
          color: var(--brand-deep);
          cursor: help;
          margin-left: 2px;
        }
        .field .help {
          font-size: 11px;
          color: var(--ink-soft);
          margin-top: 4px;
          line-height: 1.4;
        }
        .help.info-mobile {
          display: none;
        }
        @media (hover: none) {
          .help.info-mobile {
            display: block;
          }
        }
        input[type="number"],
        input[type="date"],
        input[type="text"],
        select {
          width: 100%;
          font-family: "DM Sans", sans-serif;
          font-size: 13.5px;
          color: var(--ink);
          border: 1px solid var(--line);
          border-radius: 8px;
          padding: 10px 11px;
          background: var(--surface);
          outline: none;
        }
        input[type="number"] {
          -moz-appearance: textfield !important;
        }
        input[type="number"]::-webkit-outer-spin-button,
        input[type="number"]::-webkit-inner-spin-button {
          -webkit-appearance: none !important;
          margin: 0 !important;
        }
        select {
          cursor: pointer;
        }
        input:focus,
        select:focus {
          border-color: var(--brand);
          box-shadow: 0 0 0 3px var(--brand-tint);
        }
        .auto-badge {
          display: inline-block;
          margin-left: 6px;
          font-size: 10px;
          font-weight: 700;
          color: var(--brand-deep);
          background: var(--brand-tint);
          border: 1px solid var(--brand-tint-border);
          padding: 1px 7px;
          border-radius: 999px;
        }
        .summary {
          position: sticky;
          top: 76px;
        }
        .summary-card {
          background: var(--surface);
          border: 1px solid var(--line);
          border-radius: 14px;
          padding: 22px;
        }
        .summary-title {
          font-family: "Sora", sans-serif;
          font-weight: 700;
          font-size: 14.5px;
          margin-bottom: 2px;
          color: var(--ink);
        }
        .summary-sub {
          font-size: 11.5px;
          color: var(--ink-soft);
          margin-bottom: 14px;
        }
        .summary-placeholder {
          text-align: center;
          padding: 28px 8px 20px;
        }
        .placeholder-icon {
          font-size: 28px;
          margin-bottom: 10px;
          opacity: 0.6;
        }
        .summary-placeholder p {
          font-size: 12.5px;
          color: var(--ink-mid);
          line-height: 1.6;
          margin: 0 0 8px;
        }
        .summary-placeholder .placeholder-sub {
          font-size: 11px;
          color: var(--ink-soft);
          margin: 0;
        }
        .warn {
          font-size: 11.5px;
          color: var(--warn);
          background: var(--warn-tint);
          border: 1px solid var(--warn-tint-border);
          border-radius: 8px;
          padding: 9px 11px;
          margin-bottom: 12px;
        }
        .line-item {
          padding: 9px 0;
          border-bottom: 1px solid var(--surface-alt2);
        }
        .line-item:last-child {
          border-bottom: none;
        }
        .li-top {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          gap: 8px;
          flex-wrap: wrap;
        }
        .li-label {
          font-size: 13px;
          font-weight: 600;
          color: var(--ink);
        }
        .li-amt {
          font-size: 13.5px;
          font-weight: 700;
          white-space: normal;
          word-break: break-word;
          overflow-wrap: anywhere;
          color: var(--ink);
        }
        .li-amt.neg {
          color: var(--danger);
        }
        .li-explain {
          font-size: 11px;
          color: var(--ink-soft);
          margin-top: 2px;
          line-height: 1.4;
        }
        .tax-flag {
          display: block;
          margin-top: 5px;
          font-size: 11.5px;
          font-weight: 700;
          color: var(--warn);
        }
        .stamp {
          margin-top: 14px;
          padding: 18px 18px;
          border-radius: 12px;
          text-align: center;
          background: linear-gradient(135deg, var(--brand), var(--brand-deep));
          color: var(--surface);
          width: 100%;
          max-width: 100%;
          overflow: hidden;
        }
        .stamp.recover {
          background: linear-gradient(135deg, var(--danger-deep), var(--danger));
        }
        .stamp-label {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          opacity: 0.85;
        }
        .stamp-amt {
          font-family: "Sora", sans-serif;
          font-size: 28px;
          font-weight: 800;
          margin-top: 4px;
          word-break: break-word;
          overflow-wrap: anywhere;
          white-space: normal;
          line-height: 1.2;
        }
        .stamp-sub {
          font-size: 11px;
          opacity: 0.85;
          margin-top: 6px;
        }
        .feedback-slot {
          margin-top: 14px;
        }
        .rules {
          margin-top: 14px;
        }
        .rules summary {
          cursor: pointer;
          font-size: 11.5px;
          font-weight: 700;
          color: var(--ink-mid);
          list-style: none;
        }
        .rules summary::-webkit-details-marker {
          display: none;
        }
        .rules-box {
          font-size: 11.5px;
          color: var(--ink-mid);
          line-height: 1.6;
          background: var(--surface-alt);
          border: 1px solid var(--line);
          border-radius: 8px;
          padding: 12px 14px;
          margin-top: 8px;
        }
        .rules-box code {
          background: var(--surface);
          border: 1px solid var(--line);
          padding: 1px 5px;
          border-radius: 4px;
        }
        .next-step {
          margin-top: 14px;
          font-size: 11.5px;
          color: var(--brand-deep);
          background: var(--brand-tint);
          border: 1px solid var(--brand-tint-border);
          border-radius: 8px;
          padding: 10px 12px;
          line-height: 1.5;
        }
        .closing-note {
          margin-top: 14px;
          font-size: 12px;
          color: var(--ink-mid);
          text-align: center;
        }
        @media (max-width: 840px) {
          .layout {
            grid-template-columns: 1fr;
          }
          .summary {
            position: static;
          }
          .grid2 {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </>
  );
}
