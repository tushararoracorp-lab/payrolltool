import Head from "next/head";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { useEffect, useRef, useState } from "react";
import FeedbackWidget from "../components/FeedbackWidget";
import { signalResult } from "../lib/resultPrompt";

const TOOL_NAME = "Gratuity Calculator";
const PAGE_URL = "https://www.payrolltool.in/gratuity-calculator";
const PAGE_TITLE = "Gratuity Calculator under the Code on Social Security | PayrollTool.in";
const PAGE_DESC =
  "Calculate gratuity from the actual dates of service for regular and fixed-term employees under the Code on Social Security, 2020: the 240-day rule, the 50% wage rule, the Rs. 20 lakh limit and the tax-exempt amount, with every step shown.";

const CODE_START = Date.UTC(2025, 10, 21); // 21 November 2025
const CAP = 2000000;
const DAY = 86400000;

// Amounts may be typed as sums: 45000+9000-1500. Only + and - are used; anything else is refused.
function evalAmt(raw) {
  const s = String(raw || "").replace(/[\s,]/g, "").replace(/^Rs\.?/i, "");
  if (s === "") return { ok: true, val: 0, empty: true };
  if (!/^[+-]?\d+(\.\d+)?([+-]\d+(\.\d+)?)*$/.test(s)) return { ok: false, val: 0 };
  const parts = s.match(/[+-]?\d+(\.\d+)?/g) || [];
  return { ok: true, val: parts.reduce((a, b) => a + parseFloat(b), 0), sum: parts.length > 1 };
}
const amtOf = (v) => {
  const r = evalAmt(v);
  return r.ok && r.val > 0 ? r.val : 0;
};
const fmt = (n) => "Rs. " + Math.round(n).toLocaleString("en-IN");
const parse = (s) => {
  if (!s) return null;
  const p = s.split("-").map(Number);
  return Date.UTC(p[0], p[1] - 1, p[2]);
};
const show = (t) => new Date(t).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
const addYears = (t, n) => {
  const d = new Date(t);
  return Date.UTC(d.getUTCFullYear() + n, d.getUTCMonth(), d.getUTCDate());
};
const addMonths = (t, n) => {
  const d = new Date(t);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, d.getUTCDate());
};
const pl = (k, w) => k + " " + w + (k === 1 ? "" : "s");

// Decided in the prototype review: the 240-day rule applies, and a fixed-term
// employee's final part-year of more than six months counts as a full year.
function calcGratuity(f) {
  const doj = parse(f.doj), lwd = parse(f.lwd), rows = [];
  const row = (k, v, why) => rows.push([k, v, why || ""]);
  if (doj == null || lwd == null || lwd < doj) return { err: "Enter a joining date and a last working day on or after it." };
  if (["tot", "exc", "wages", "prior", "unpaid"].some((k) => !evalAmt(f[k]).ok))
    return { err: "Use numbers with + and - only in the amount fields." };

  const end = lwd + DAY, underCode = lwd >= CODE_START;
  let years = 0;
  while (addYears(doj, years + 1) <= end) years++;
  const anniv = addYears(doj, years);
  const remDays = Math.round((end - anniv) / DAY), totalDays = Math.round((end - doj) / DAY);
  let rm = 0;
  while (addMonths(anniv, rm + 1) <= end) rm++;
  const rd = Math.round((end - addMonths(anniv, rm)) / DAY);
  const overSix = addMonths(anniv, 6) < end;
  const law = underCode ? "Code on Social Security, 2020" : "Payment of Gratuity Act, 1972";
  row("Service", pl(years, "year") + ", " + pl(rm, "month") + ", " + pl(rd, "day"),
    show(doj) + " to " + show(lwd) + ", both days included: " + totalDays.toLocaleString("en-IN") + " days.");

  let wages = amtOf(f.wages), wageNote = "";
  if (underCode && amtOf(f.tot) > 0) {
    const tot = amtOf(f.tot), exc = Math.min(amtOf(f.exc), tot), add = Math.max(0, exc - tot / 2);
    wages = tot - exc + add;
    wageNote = "Total pay " + fmt(tot) + " less excluded items " + fmt(exc) +
      (add > 0 ? ", plus " + fmt(add) + " added back because excluded items are over half of pay." : "; excluded items are within half of pay.");
  }
  row(underCode ? "Wages used" : "Basic + DA used", fmt(wages), wageNote || (underCode ? "As entered." : "The 1972 Act applies to this exit."));

  const need = f.fiveday ? 190 : 240, unpaid = amtOf(f.unpaid), worked = Math.max(0, remDays - unpaid);
  const rounded = years + (overSix ? 1 : 0);
  let eligible = false, counted = 0, why = "", from = null;
  if (f.reason === "death") {
    eligible = true; counted = rounded; why = "No minimum service applies on death or disablement.";
  } else if (f.type === "fte" && underCode) {
    from = addYears(doj, 1) - DAY;
    eligible = years >= 1; counted = eligible ? rounded : 0;
    why = eligible ? "Fixed-term: one year of service under the contract is enough."
      : "Fixed-term: one year under the contract is needed; " + pl(Math.round((addYears(doj, 1) - end) / DAY), "day") + " short.";
  } else {
    from = addYears(doj, 4) + (need + unpaid - 1) * DAY;
    if (years >= 5) { eligible = true; counted = rounded; why = "Five or more years of continuous service."; }
    else if (years === 4 && worked >= need) {
      eligible = true; counted = 5;
      why = "4 years plus " + worked + " days worked in the fifth year (at least " + need + "), so service counts as 5 years under section 54.";
    } else {
      why = years === 4
        ? "4 years plus " + worked + " days worked in the fifth year; " + need + " needed, so " + pl(need - worked, "day") + " short."
        : "Five years of continuous service are needed; this service has " + pl(years, "full year") + ".";
    }
  }
  row("Eligible", eligible ? "Yes" : "No", why);
  if (from != null && f.reason !== "death")
    row("Qualifies from", show(from), f.type === "fte" && underCode ? "The day one year under the contract is completed."
      : "The day the fifth year reaches " + need + " days worked" + (unpaid ? " (after " + pl(unpaid, "unpaid day") + ")" : "") + ".");
  if (!eligible) return { law, rows, eligible, why, g: 0, counted: 0, exempt: 0 };

  row("Years counted", String(counted), counted > years ? "The final part-year is over six months, so it counts as a year."
    : remDays > 0 ? "The final part-year is six months or less, so it is not counted." : "");
  const div = f.cov === "covered" ? 26 : 30;
  let g = (wages * 15) / div * counted;
  row("Formula", fmt(wages) + " × 15 ÷ " + div + " × " + counted,
    f.cov === "covered" ? "15 days’ wages a year, taking a month as 26 working days." : "Not covered: 15 days on a 30-day month, as employer policies usually use.");
  if (f.cov === "covered" && g > CAP) { row("Ceiling", fmt(CAP), "Calculated " + fmt(g) + "; the most payable is Rs. 20 lakh."); g = CAP; }
  let exempt;
  if (f.sec === "gov") { exempt = g; row("Tax-exempt", fmt(exempt), "Gratuity from a government employer is fully exempt."); }
  else {
    const room = Math.max(0, CAP - amtOf(f.prior));
    const fa = f.cov === "covered" ? (wages * 15) / 26 * counted : wages * 0.5 * years;
    exempt = Math.min(g, room, fa);
    row("Tax-exempt", fmt(exempt), "Least of the gratuity, the formula amount (" + fmt(fa) + ") and the unused lifetime limit (" + fmt(room) + "), section 19 of the Income-tax Act, 2025.");
  }
  row("Taxable as salary", fmt(g - exempt));
  return { law, rows, eligible, why, g, counted, exempt };
}

const GC_INFO_CARDS = [
  { icon: "📅", title: "Who qualifies", body: "Regular employees after 5 years of continuous service; fixed-term employees after 1 year under the contract; no minimum on death or disablement." },
  { icon: "🧮", title: "The formula", body: "Wages × 15 ÷ 26 × years. A final part-year of more than six months counts as a full year. Maximum Rs. 20 lakh." },
  { icon: "⏳", title: "The 240-day rule", body: "A year of service is 240 days worked, or 190 in a five-day establishment (section 54), so 4 years and 240 days counts as 5." },
  { icon: "💰", title: "Which wages", body: "For exits from 21 November 2025, wages under the Code, with the excess added back when excluded allowances are over half of pay." },
];

const GC_MISTAKES = [
  { t: "Counting only complete years", d: "4 years and 240 days worked in the fifth year counts as 5 years of service under section 54, or 190 days in an establishment working fewer than six days a week. Stopping at 4 complete years refuses gratuity that is due." },
  { t: "Rounding a part-year of exactly six months up", d: "Only a final part-year of more than six months counts as a full year. 7 years and exactly 6 months is 7 years; 7 years, 6 months and 1 day is 8." },
  { t: "Using gross salary as wages", d: "Gratuity is calculated on wages under the Code: basic pay, dearness allowance and retaining allowance. Where the excluded allowances are more than half of total pay, the excess is added back. Gross salary overstates it." },
  { t: "Dividing by 30 in a covered establishment", d: "For an establishment covered by the Code, 15 days' wages are worked out on a 26-day month: wages × 15 ÷ 26. Dividing by 30 underpays by about 13%." },
  { t: "Holding fixed-term employees to five years", d: "A fixed-term employee qualifies after 1 year of service under the contract. Applying the 5-year rule to them refuses gratuity that is due." },
  { t: "Ignoring gratuity exempted earlier", d: "The Rs. 20 lakh tax exemption is a lifetime limit across employers. Gratuity exempted at an earlier employer reduces what can be exempt now." },
];

const GC_FAQ = [
  { q: "How is gratuity calculated?", a: "Gratuity = wages × 15 ÷ 26 × years of service, for an establishment covered by the Code on Social Security, 2020. A final part-year of more than six months counts as a full year. The amount payable is capped at Rs. 20 lakh." },
  { q: "Is an employee with 4 years and 240 days eligible?", a: "Yes. Under section 54 of the Code, a year of continuous service is counted once 240 days are worked in it, or 190 days in an establishment that works fewer than six days a week. 4 years plus 240 days worked in the fifth year counts as 5 years, which meets the requirement." },
  { q: "When does a fixed-term employee get gratuity?", a: "After 1 year of service under the contract. The same formula applies: wages × 15 ÷ 26 × years, with a final part-year of more than six months counted as a full year." },
  { q: "Which wages are used under the Code?", a: "Basic pay, dearness allowance and retaining allowance. HRA, conveyance, bonus, overtime, commission and employer PF and NPS contributions are excluded, but if the excluded items are more than half of total pay, the excess is added back to wages. The calculator does this when you fill in total pay and excluded items." },
  { q: "What applies to an exit before 21 November 2025?", a: "The Payment of Gratuity Act, 1972, under which wages mean basic pay plus dearness allowance. The calculator switches to that basis when the last working day is before 21 November 2025." },
  { q: "How much of the gratuity is tax-free?", a: "For a private employer, the least of the gratuity received, the formula amount and the unused part of the Rs. 20 lakh lifetime limit is exempt under section 19 of the Income-tax Act, 2025. The rest is taxed as salary. Gratuity from a government employer is fully exempt." },
];

const INITIAL = {
  doj: "2021-03-01", lwd: "2025-12-15", type: "regular", reason: "leave",
  wages: "45000", tot: "", exc: "", cov: "covered", sec: "pvt", unpaid: "0", prior: "0", fiveday: false,
};

export default function GratuityCalculator() {
  const [theme, setTheme] = useState("light");
  useEffect(() => {
    const root = document.documentElement;
    setTheme(root.getAttribute("data-theme") || "light");
    const observer = new MutationObserver(() => setTheme(root.getAttribute("data-theme") || "light"));
    observer.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  const [f, setF] = useState(INITIAL);
  const [result, setResult] = useState(null);
  const [stale, setStale] = useState(false);
  const resultRef = useRef(null);

  const set = (k) => (e) => {
    const v = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setF((s) => ({ ...s, [k]: v }));
    if (result) setStale(true);
  };
  const preCode = (() => { const t = parse(f.lwd); return t != null && t < CODE_START; })();

  const sumHint = (k) => {
    const r = evalAmt(f[k]);
    if (!r.ok) return <div className="gc-sum bad">Use numbers with + and - only.</div>;
    if (r.sum) return <div className="gc-sum">= {fmt(r.val)}</div>;
    return <div className="gc-sum" />;
  };

  const handleCalculate = () => {
    setResult(calcGratuity(f));
    setStale(false);
    if (typeof window !== "undefined" && window.gtag) {
      window.gtag("event", "tool_calculate_click", { tool_name: TOOL_NAME });
    }
    signalResult(TOOL_NAME, "calc");
    if (typeof window !== "undefined" && window.innerWidth < 900 && resultRef.current) {
      setTimeout(() => resultRef.current && resultRef.current.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    }
  };
  const onKeyDown = (e) => {
    if (e.key === "Enter" && e.target.tagName !== "TEXTAREA" && e.target.tagName !== "BUTTON") {
      e.preventDefault();
      handleCalculate();
    }
  };

  return (
    <>
      <Head>
        <title>{PAGE_TITLE}</title>
        <meta name="description" content={PAGE_DESC} />
        <meta name="robots" content="index, follow" />
        <meta name="author" content="PayrollTool.in" />
        <link rel="canonical" href={PAGE_URL} />
        <meta property="og:title" content={PAGE_TITLE} />
        <meta property="og:description" content={PAGE_DESC} />
        <meta property="og:url" content={PAGE_URL} />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="PayrollTool.in" />
        <meta property="og:locale" content="en_IN" />
        <meta property="og:image" content="https://www.payrolltool.in/icon.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={PAGE_TITLE} />
        <meta name="twitter:description" content={PAGE_DESC} />
        <meta name="twitter:image" content="https://www.payrolltool.in/icon.png" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              name: TOOL_NAME,
              url: PAGE_URL,
              applicationCategory: "BusinessApplication",
              operatingSystem: "Any (browser-based)",
              description: "Calculates gratuity from the dates of service under the Code on Social Security, 2020, with the 240-day rule, the 50% wage rule and the tax-exempt amount.",
              offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
            }),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: GC_FAQ.map((x) => ({ "@type": "Question", name: x.q, acceptedAnswer: { "@type": "Answer", text: x.a } })),
            }),
          }}
        />
      </Head>

      <div className="gc-wrapper" data-theme={theme}>
        <Header />

        <div className="gc-hero">
          <h1>Gratuity <span>Calculator</span></h1>
          <p>Gratuity under the Code on Social Security, 2020, from the actual dates of service, for regular and fixed-term employees, with every step shown.</p>
        </div>

        <div className="gc-grid" onKeyDown={onKeyDown}>
          <div className="gc-col">
            <section className="gc-card">
              <div className="gc-ch"><span>1</span><h2>Service</h2></div>
              <div className="gc-row">
                <div className="gc-f"><label htmlFor="doj">Date of joining</label><input type="date" id="doj" value={f.doj} onChange={set("doj")} /></div>
                <div className="gc-f"><label htmlFor="lwd">Last working day</label><input type="date" id="lwd" value={f.lwd} onChange={set("lwd")} /></div>
              </div>
              <div className="gc-row">
                <div className="gc-f">
                  <label htmlFor="type">Employee type</label>
                  <select id="type" value={f.type} onChange={set("type")}><option value="regular">Regular/Permanent</option><option value="fte">Fixed-term</option></select>
                </div>
                <div className="gc-f">
                  <label htmlFor="reason">Reason for leaving</label>
                  <select id="reason" value={f.reason} onChange={set("reason")}><option value="leave">Resignation, retirement or termination</option><option value="death">Death or disablement</option></select>
                </div>
              </div>
            </section>

            <section className="gc-card">
              <div className="gc-ch"><span>2</span><h2>Wages</h2></div>
              <div className="gc-f">
                <label htmlFor="wages">Monthly wages (Rs.)</label>
                <input type="text" id="wages" inputMode="decimal" value={f.wages} onChange={set("wages")} />
                <div className="gc-help">
                  {preCode ? "For exits before 21 November 2025, wages mean Basic + DA under the 1972 Act." : "Basic pay, DA, retaining allowance and other pay not excluded by the Code."}
                </div>
              </div>
              {!preCode && (
                <details className="gc-more">
                  <summary>Work out wages with the 50% rule</summary>
                  <div className="gc-inner">
                    <div className="gc-row">
                      <div className="gc-f"><label htmlFor="tot">Total monthly pay (Rs.)</label><input type="text" id="tot" placeholder="e.g. 45000+25000+10000" value={f.tot} onChange={set("tot")} />{sumHint("tot")}</div>
                      <div className="gc-f"><label htmlFor="exc">Excluded items (Rs.)</label><input type="text" id="exc" placeholder="e.g. 20000+3000+2000" value={f.exc} onChange={set("exc")} />{sumHint("exc")}</div>
                    </div>
                    <div className="gc-help">Type amounts as a sum with + and -, for example 20000+3000-500. Excluded items: HRA, conveyance, bonus, overtime, commission, employer PF and NPS.</div>
                  </div>
                </details>
              )}
            </section>

            <section className="gc-card">
              <details className="gc-more gc-flat">
                <summary>More options (optional)</summary>
                <div className="gc-inner">
                  <div className="gc-row">
                    <div className="gc-f">
                      <label htmlFor="cov">Establishment</label>
                      <select id="cov" value={f.cov} onChange={set("cov")}><option value="covered">Covered (10 or more employees)</option><option value="not">Not covered</option></select>
                    </div>
                    <div className="gc-f">
                      <label htmlFor="sec">Employer</label>
                      <select id="sec" value={f.sec} onChange={set("sec")}><option value="pvt">Private</option><option value="gov">Government</option></select>
                    </div>
                  </div>
                  <div className="gc-row">
                    <div className="gc-f"><label htmlFor="unpaid">Unpaid days in final year</label><input type="text" id="unpaid" inputMode="numeric" value={f.unpaid} onChange={set("unpaid")} /></div>
                    <div className="gc-f"><label htmlFor="prior">Gratuity exempted earlier (Rs.)</label><input type="text" id="prior" inputMode="decimal" value={f.prior} onChange={set("prior")} /></div>
                  </div>
                  <label className="gc-check"><input type="checkbox" checked={f.fiveday} onChange={set("fiveday")} /> The establishment works fewer than six days a week (190-day test)</label>
                </div>
              </details>
            </section>

            <button type="button" className="gc-btn" id="calcBtn" onClick={handleCalculate}>Calculate Gratuity</button>
          </div>

          <section className="gc-card gc-result" ref={resultRef} aria-live="polite">
            <div className="gc-rh"><h2>&#9878; Gratuity Result</h2><small>{result && result.law}</small></div>
            {!result && <div className="gc-empty">Enter the dates and wages, then select Calculate Gratuity.</div>}
            {result && result.err && <p className="gc-err">{result.err}</p>}
            {result && !result.err && (
              <>
                {stale && <div className="gc-stale">Inputs changed. Select Calculate Gratuity to update.</div>}
                <div className="gc-tiles">
                  <div className="gc-tile p"><b>{fmt(result.g)}</b><span>Gratuity payable</span></div>
                  <div className="gc-tile"><b>{result.counted}</b><span>Years counted</span></div>
                  <div className="gc-tile g"><b>{fmt(result.exempt)}</b><span>Tax-exempt</span></div>
                </div>
                <div className={`gc-note ${result.eligible ? "ok" : "no"}`}>{result.eligible ? "Eligible. " : "Not eligible. "}{result.why}</div>
                <div className="gc-tbl">
                  <table>
                    <thead><tr><th>Step</th><th>Result</th></tr></thead>
                    <tbody>
                      {result.rows.map((r) => (
                        <tr key={r[0]}><td>{r[0]}{r[2] && <small>{r[2]}</small>}</td><td>{r[1]}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>
        </div>

        <div className="gc-feedback">
          <FeedbackWidget toolName={TOOL_NAME} />
        </div>

        <div className="gc-info">
          {GC_INFO_CARDS.map((c) => (
            <div className="gc-info-card" key={c.title}>
              <div className="gc-info-icon">{c.icon}</div>
              <h2>{c.title}</h2>
              <p>{c.body}</p>
            </div>
          ))}
        </div>

        <div className="gc-box">
          <h4>Worked example - 4 years 9 months, wages Rs. 45,000</h4>
          <p>
            A regular employee joins on 1 March 2021 and leaves on 15 December 2025, with monthly wages of Rs. 45,000 in a
            covered establishment and no unpaid days.
          </p>
          <div className="gc-we-grid">
            <div className="gc-we-col">
              <h5>Eligibility</h5>
              <p>
                Service is 4 years, 9 months and 15 days. The fifth year, from 1 March 2025 to 15 December 2025, has
                290 days, more than 240, so service counts as <b>5 years</b> under section 54.
              </p>
            </div>
            <div className="gc-we-col alt">
              <h5>Gratuity</h5>
              <p>
                Rs. 45,000 &times; 15 &divide; 26 &times; 5 = <b>Rs. 1,29,808</b>. Well under Rs. 20 lakh, and for a private
                employer the whole amount is within the formula, so it is fully tax-exempt.
              </p>
            </div>
          </div>
          <p className="gc-we-verdict">Without the 240-day rule this employee would have 4 complete years and no gratuity.</p>
        </div>

        <div className="gc-box">
          <h4>Common mistakes</h4>
          {GC_MISTAKES.map((m) => (
            <details className="gc-acc" key={m.t}>
              <summary><h5>{m.t}</h5></summary>
              <p>{m.d}</p>
            </details>
          ))}
        </div>

        <div className="gc-box gc-last">
          <h4>Frequently asked questions</h4>
          {GC_FAQ.map((x) => (
            <details className="gc-acc" key={x.q}>
              <summary><h5>{x.q}</h5></summary>
              <p>{x.a}</p>
            </details>
          ))}
        </div>

        <Footer />
      </div>

      <style jsx>{`
        .gc-wrapper {
          --surface: #fff;
          --surface-alt: #faf9fc;
          --ink: #1e1b29;
          --ink-soft: #6b6785;
          --line: #e7e4f0;
          --brand: #7c3aed;
          --brand-deep: #6d28d9;
          --brand-tint: #f5f3ff;
          --green: #059669;
          --green-tint: #ecfdf5;
          --amber: #b45309;
          --amber-tint: #fffbeb;
          --red: #b91c1c;
          --red-tint: #fef2f2;
          font-family: "DM Sans", sans-serif;
          background: #eeeaf8;
          color: var(--ink);
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }
        .gc-wrapper[data-theme="dark"] {
          --surface: #1c1730;
          --surface-alt: #16131c;
          --ink: #f3f0fa;
          --ink-soft: #b3aac7;
          --line: #2a2536;
          --brand: #9163f2;
          --brand-deep: #a47df5;
          --brand-tint: #2c2147;
          --green: #34d399;
          --green-tint: #123027;
          --amber: #fbbf54;
          --amber-tint: #332411;
          --red: #f87171;
          --red-tint: #3d1f1f;
          background: #15111f;
        }
        .gc-hero,
        .gc-grid,
        .gc-card,
        .gc-info,
        .gc-feedback,
        .gc-box,
        .gc-btn,
        .gc-f input,
        .gc-f select,
        .gc-f textarea,
        .gc-tiles {
          box-sizing: border-box;
        }
        .gc-hero {
          text-align: center;
          padding: 24px 16px 18px;
          max-width: 680px;
          margin: 0 auto;
        }
        .gc-hero h1 {
          font-size: clamp(1.9rem, 5vw, 3rem);
          font-weight: 700;
          letter-spacing: -0.02em;
          margin: 0 0 10px;
          color: var(--ink);
        }
        .gc-hero h1 span {
          color: #8b5cf6;
        }
        .gc-hero p {
          font-size: 14px;
          line-height: 1.6;
          color: var(--ink-soft);
          margin: 0;
        }
        .gc-grid {
          max-width: 1100px;
          width: 100%;
          margin: 0 auto;
          padding: 0 16px;
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(0, 1.08fr);
          gap: 18px;
          align-items: start;
        }
        .gc-col {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .gc-card {
          background: var(--surface);
          border: 1px solid var(--line);
          border-radius: 16px;
          padding: 18px;
          box-shadow: 0 2px 10px rgba(124, 58, 237, 0.07);
        }
        .gc-ch {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 14px;
        }
        .gc-ch span {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: var(--brand-tint);
          color: var(--brand-deep);
          display: grid;
          place-items: center;
          font-size: 12px;
          font-weight: 600;
        }
        .gc-ch h2 {
          font-family: "Sora", sans-serif;
          font-size: 15px;
          font-weight: 700;
          margin: 0;
        }
        .gc-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        .gc-f {
          margin-bottom: 12px;
        }
        .gc-f label {
          display: block;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--ink-soft);
          margin-bottom: 6px;
        }
        .gc-f input,
        .gc-f select {
          width: 100%;
          font: inherit;
          font-size: 14px;
          color: var(--ink);
          background: var(--surface);
          border: 1px solid var(--line);
          border-radius: 12px;
          padding: 10px 12px;
          min-height: 44px;
          color-scheme: light;
        }
        .gc-wrapper[data-theme="dark"] .gc-f input,
        .gc-wrapper[data-theme="dark"] .gc-f select {
          color-scheme: dark;
        }
        .gc-f input:focus,
        .gc-f select:focus {
          outline: none;
          border-color: var(--brand);
          box-shadow: 0 0 0 3px var(--brand-tint);
        }
        .gc-help {
          font-size: 12px;
          color: var(--ink-soft);
          margin-top: 5px;
        }
        .gc-sum {
          font-size: 12px;
          color: var(--brand-deep);
          margin-top: 5px;
          min-height: 1.2em;
        }
        .gc-sum.bad {
          color: var(--amber);
        }
        .gc-more {
          border-top: 1px solid var(--line);
          margin-top: 4px;
          padding-top: 10px;
        }
        .gc-more.gc-flat {
          border-top: 0;
          margin: 0;
          padding: 0;
        }
        .gc-more > summary {
          cursor: pointer;
          font-weight: 600;
          color: var(--brand-deep);
          font-size: 14px;
          list-style: none;
        }
        .gc-more > summary::-webkit-details-marker {
          display: none;
        }
        .gc-more > summary::before {
          content: "▸  ";
        }
        .gc-more[open] > summary::before {
          content: "▾  ";
        }
        .gc-inner {
          padding-top: 12px;
        }
        .gc-check {
          display: flex;
          gap: 9px;
          align-items: flex-start;
          font-size: 14px;
          color: var(--ink);
        }
        .gc-check input {
          margin-top: 3px;
          width: 17px;
          height: 17px;
          accent-color: var(--brand);
        }
        .gc-btn {
          width: 100%;
          height: 48px;
          border: 0;
          border-radius: 12px;
          font: inherit;
          font-size: 15px;
          font-weight: 600;
          color: #fff;
          background: #7c3aed;
          cursor: pointer;
        }
        .gc-btn:hover {
          background: #6d28d9;
        }
        .gc-result {
          position: sticky;
          top: 84px;
          scroll-margin-top: 84px;
        }
        .gc-rh {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 14px;
        }
        .gc-rh h2 {
          font-family: "Sora", sans-serif;
          font-size: 16px;
          margin: 0;
        }
        .gc-rh small {
          color: var(--brand-deep);
          font-size: 12px;
          text-align: right;
        }
        .gc-empty {
          color: var(--ink-soft);
          text-align: center;
          padding: 28px 10px;
          font-size: 14px;
        }
        .gc-err {
          color: var(--red);
          background: var(--red-tint);
          border: 1px solid var(--red);
          border-radius: 8px;
          padding: 8px 12px;
          font-size: 14px;
          margin: 0;
        }
        .gc-stale {
          font-size: 13px;
          color: var(--amber);
          background: var(--amber-tint);
          border: 1px solid var(--amber);
          border-radius: 8px;
          padding: 6px 10px;
          margin-bottom: 12px;
        }
        .gc-tiles {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
          margin-bottom: 14px;
        }
        .gc-tile {
          border: 1px solid var(--line);
          border-radius: 12px;
          padding: 12px 10px;
          text-align: center;
          background: var(--surface-alt);
        }
        .gc-tile b {
          display: block;
          font-size: 17px;
          font-weight: 600;
          word-break: break-word;
          color: var(--ink);
        }
        .gc-tile span {
          display: block;
          font-size: 10.5px;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--ink-soft);
          margin-top: 4px;
        }
        .gc-tile.p {
          background: var(--brand-tint);
          border-color: var(--brand);
        }
        .gc-tile.p b {
          color: var(--brand-deep);
        }
        .gc-tile.g {
          background: var(--green-tint);
          border-color: var(--green);
        }
        .gc-tile.g b {
          color: var(--green);
        }
        .gc-note {
          border-radius: 12px;
          padding: 10px 12px;
          font-size: 14px;
          margin-bottom: 14px;
          border: 1px solid;
        }
        .gc-note.ok {
          background: var(--green-tint);
          color: var(--green);
          border-color: var(--green);
        }
        .gc-note.no {
          background: var(--amber-tint);
          color: var(--amber);
          border-color: var(--amber);
        }
        .gc-tbl {
          overflow-x: auto;
        }
        .gc-tbl table {
          width: 100%;
          border-collapse: collapse;
          font-size: 14px;
        }
        .gc-tbl th {
          background: var(--brand-tint);
          color: var(--brand-deep);
          font-size: 10.5px;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          text-align: left;
          padding: 9px 10px;
        }
        .gc-tbl th:last-child,
        .gc-tbl td:last-child {
          text-align: right;
        }
        .gc-tbl td {
          padding: 10px;
          border-bottom: 1px solid var(--line);
          vertical-align: top;
          color: var(--ink);
        }
        .gc-tbl td small {
          display: block;
          color: var(--ink-soft);
          font-size: 12px;
          margin-top: 2px;
          text-align: left;
        }
        .gc-tbl td:last-child {
          font-weight: 600;
          white-space: nowrap;
        }
        .gc-feedback {
          max-width: 768px;
          width: 100%;
          margin: 18px auto 0;
          padding: 0 16px;
        }
        .gc-info {
          max-width: 1100px;
          width: 100%;
          margin: 28px auto 0;
          padding: 0 16px;
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
        }
        .gc-info-card {
          background: var(--surface);
          border: 1px solid var(--line);
          border-radius: 12px;
          padding: 14px 15px;
          box-shadow: 0 2px 10px rgba(124, 58, 237, 0.07);
        }
        .gc-info-icon {
          font-size: 18px;
          margin-bottom: 6px;
        }
        .gc-info-card h2 {
          font-family: "Sora", sans-serif;
          font-size: 12.5px;
          font-weight: 700;
          color: var(--brand-deep);
          margin: 0 0 6px;
        }
        .gc-info-card p {
          font-size: 12px;
          line-height: 1.6;
          color: var(--ink-soft);
          margin: 0;
        }
        .gc-box {
          max-width: 768px;
          width: calc(100% - 32px);
          margin: 18px auto 0;
          background: var(--surface);
          border-radius: 16px;
          padding: 22px 24px;
        }
        .gc-box.gc-last {
          margin-bottom: 40px;
        }
        .gc-box h4 {
          font-size: 14px;
          font-weight: 700;
          margin: 0 0 12px;
          color: var(--ink);
        }
        .gc-box p {
          font-size: 14px;
          line-height: 1.7;
          color: var(--ink-soft);
          margin: 0 0 12px;
        }
        .gc-box b {
          color: var(--ink);
        }
        .gc-we-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 12px;
        }
        .gc-we-col {
          background: var(--surface-alt);
          border-radius: 10px;
          padding: 14px;
        }
        .gc-we-col.alt {
          background: var(--brand-tint);
        }
        .gc-we-col h5 {
          font-size: 12px;
          font-weight: 700;
          color: var(--brand-deep);
          margin: 0 0 6px;
        }
        .gc-we-col p {
          font-size: 13px;
          margin: 0;
        }
        .gc-we-verdict {
          color: var(--ink) !important;
          font-weight: 500;
          margin: 0 !important;
        }
        .gc-acc {
          padding: 12px 0;
          border-top: 1px solid var(--line);
        }
        .gc-acc:first-of-type {
          border-top: 0;
          padding-top: 0;
        }
        .gc-acc > summary {
          list-style: none;
          cursor: pointer;
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
        }
        .gc-acc > summary::-webkit-details-marker {
          display: none;
        }
        .gc-acc > summary::after {
          content: "+";
          color: #8b5cf6;
          font-weight: 700;
          font-size: 16px;
          line-height: 1.2;
        }
        .gc-acc[open] > summary::after {
          content: "−";
        }
        .gc-acc h5 {
          flex: 1;
          font-size: 14px;
          font-weight: 600;
          color: var(--brand-deep);
          margin: 0;
        }
        .gc-acc p {
          margin: 6px 0 0;
        }
        @media (max-width: 900px) {
          .gc-grid {
            grid-template-columns: 1fr;
          }
          .gc-result {
            position: static;
          }
          .gc-info {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (max-width: 560px) {
          .gc-row,
          .gc-we-grid,
          .gc-info {
            grid-template-columns: 1fr;
          }
          .gc-tiles {
            grid-template-columns: 1fr;
          }
          .gc-box {
            padding: 18px 16px;
          }
        }
      `}</style>
    </>
  );
}
