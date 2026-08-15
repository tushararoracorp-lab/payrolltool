import Head from "next/head";
import { useState, useEffect, useRef } from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import FeedbackWidget from "../components/FeedbackWidget";
import Lenis from "lenis";

/* ================= constants ================= */

const MAX_INPUT = 5e8; // Rs. 50,00,00,000 - silent ceiling on every number field
const SEC123_CAP = 150000;
const NPS1B_CAP = 50000;
const D80_SELF_CAP = 25000;
const PT_CAP = 2500;
const SHARE_URL = "https://www.payrolltool.in/tax-calculator";

const SEC123_ITEMS = [
  "Employees' Provident Fund (EPF) - employee contribution",
  "Public Provident Fund (PPF)",
  "Life insurance premium",
  "Equity Linked Savings Scheme (ELSS) mutual funds",
  "National Savings Certificate (NSC)",
  "Sukanya Samriddhi Yojana",
  "Unit Linked Insurance Plan (ULIP)",
  "Housing loan - principal repayment",
  "5-year tax-saver fixed deposit",
  "Senior Citizens Savings Scheme (SCSS)",
  "Children's tuition fees",
  "Pension policy (LIC annuity, merged from Section 80CCC)",
];

const OTHER_PRESETS = [
  ["Add Leave Travel Allowance", "Leave Travel Allowance - current block 2026 to 2029"],
  ["Add Children Education Allowance", "Children Education Allowance - Rs. 3,000 per month per child, maximum 2 children"],
  ["Add Children Hostel Allowance", "Children Hostel Allowance - Rs. 9,000 per month per child, maximum 2 children"],
  ["Add Meal Coupons", "Meal or food coupons"],
  ["Add a custom item", ""],
];

/* ================= helpers ================= */

function fmt(n) {
  n = Math.round(n || 0);
  return "Rs. " + n.toLocaleString("en-IN");
}
function num(v) {
  const n = parseFloat(v);
  return isFinite(n) ? n : 0;
}
// Silent clamp: a pasted or mistyped run of digits can't blow out the layout.
function clampRaw(v) {
  if (v === "" || v === null || v === undefined) return "";
  const n = parseFloat(v);
  if (!isFinite(n)) return "";
  if (n < 0) return "0";
  if (n > MAX_INPUT) return String(MAX_INPUT);
  return String(n);
}

/* ================= tax math (pure) ================= */

function slabTax(income, brackets) {
  let tax = 0,
    lower = 0;
  for (const [upTo, rate] of brackets) {
    if (income > lower) {
      tax += (Math.min(income, upTo) - lower) * rate;
    }
    lower = upTo;
    if (income <= upTo) break;
  }
  return tax;
}

function oldSurcharge(D, G) {
  if (D <= 5000000) return 0;
  if (D <= 5195890) return (D - 5000000) * 0.7;
  if (D <= 10000000) return G * 0.1;
  if (D <= 10214700) return (D - 10000000) * 0.7 + 281250;
  if (D <= 20000000) return G * 0.15;
  if (D <= 20930000) return (D - 20000000) * 0.7 + 871875;
  if (D <= 50000000) return G * 0.25;
  if (D <= 53017830) return (D - 50000000) * 0.7 + 3703125;
  return G * 0.37;
}

function newSurcharge(D, G) {
  if (D <= 5000000) return 0;
  if (D <= 5161194) return (D - 5000000) * 0.7;
  if (D <= 10000000) return G * 0.1;
  if (D <= 10196947) return (D - 10000000) * 0.7 + 258000;
  if (D <= 20000000) return G * 0.15;
  if (D <= 20892800) return (D - 20000000) * 0.7 + 837000;
  return G * 0.25;
}

function calcOld(taxableIncome, ageBand) {
  const brackets =
    ageBand === "super"
      ? [[500000, 0], [1000000, 0.2], [Infinity, 0.3]]
      : ageBand === "senior"
      ? [[300000, 0], [500000, 0.05], [1000000, 0.2], [Infinity, 0.3]]
      : [[250000, 0], [500000, 0.05], [1000000, 0.2], [Infinity, 0.3]];
  const tax = slabTax(taxableIncome, brackets);
  const rebate = taxableIncome <= 500000 ? Math.min(tax, 12500) : 0;
  const afterRebate = Math.max(tax - rebate, 0);
  const surcharge = oldSurcharge(taxableIncome, afterRebate);
  const cess = (afterRebate + surcharge) * 0.04;
  return { tax, rebate, afterRebate, surcharge, cess, net: afterRebate + surcharge + cess };
}

function calcNew(taxableIncome) {
  const brackets = [
    [400000, 0], [800000, 0.05], [1200000, 0.1], [1600000, 0.15],
    [2000000, 0.2], [2400000, 0.25], [Infinity, 0.3],
  ];
  const tax = slabTax(taxableIncome, brackets);
  let rebate = 0;
  if (taxableIncome <= 1200000) rebate = Math.min(tax, 60000);
  else if (taxableIncome <= 1270588) rebate = Math.max(tax - (taxableIncome - 1200000), 0);
  const afterRebate = Math.max(tax - rebate, 0);
  const surcharge = newSurcharge(taxableIncome, afterRebate);
  const cess = (afterRebate + surcharge) * 0.04;
  return { tax, rebate, afterRebate, surcharge, cess, net: afterRebate + surcharge + cess };
}

/* Derived figures used by both the live card badges and the comparison. */
function derive(f, sec123, otherItems) {
  const gross = num(f.grossIncome);
  const sec123Sum = sec123.reduce((s, v) => s + num(v), 0);
  const sec123Capped = Math.min(sec123Sum, SEC123_CAP);
  const nps1bCapped = Math.min(num(f.nps1b), NPS1B_CAP);
  const d80Self = Math.min(num(f.d80Self), D80_SELF_CAP);
  const d80Parents = Math.min(num(f.d80Parents), f.parentsSenior ? 50000 : 25000);
  const d80Total = d80Self + d80Parents;

  const basic = num(f.hraBasic);
  const hraReceived = num(f.hraReceived);
  const rent = num(f.hraRent);
  const isMetro = f.hraCity === "metro";
  const hraExemption = Math.max(
    Math.min(hraReceived, Math.max(rent - 0.1 * basic, 0), basic * (isMetro ? 0.5 : 0.4)),
    0
  );

  const otherSum = otherItems.reduce((s, i) => s + num(i.amount), 0);
  const ptCapped = Math.min(num(f.pt), PT_CAP);
  const npserAmt = num(f.npser);

  const stdOld = f.salaried ? 50000 : 0;
  const stdNew = f.salaried ? 75000 : 0;

  const oldDeductions =
    stdOld + ptCapped + npserAmt + hraExemption + otherSum + sec123Capped + nps1bCapped + d80Total;
  const oldTaxable = Math.max(gross - oldDeductions, 0);
  const newDeductions = stdNew + npserAmt;
  const newTaxable = Math.max(gross - newDeductions, 0);

  return {
    gross, sec123Sum, sec123Capped, nps1bCapped, d80Total, hraExemption,
    otherSum, ptCapped, npserAmt, stdOld, stdNew, oldTaxable, newTaxable,
  };
}

function buildResult(f, sec123, otherItems) {
  const d = derive(f, sec123, otherItems);
  const oldR = calcOld(d.oldTaxable, f.ageBand);
  const newR = calcNew(d.newTaxable);
  const diff = Math.abs(newR.net - oldR.net);
  const regime = newR.net < oldR.net ? "New Regime" : oldR.net < newR.net ? "Old Regime" : null;
  return {
    gross: d.gross,
    diff,
    regime,
    new: { taxable: d.newTaxable, r: newR, std: d.stdNew, pt: d.ptCapped, npser: d.npserAmt },
    old: {
      taxable: d.oldTaxable, r: oldR, std: d.stdOld, pt: d.ptCapped, npser: d.npserAmt,
      hra: d.hraExemption, other: d.otherSum, sec123: d.sec123Capped,
      nps1b: d.nps1bCapped, d80: d.d80Total,
    },
  };
}

function dash(v) {
  return v > 0 ? "- " + fmt(v) : "----";
}

/* ================= page ================= */

const INITIAL_FIELDS = {
  grossIncome: "",
  salaried: true,
  ageBand: "general",
  nps1b: "0",
  d80Self: "0",
  d80Parents: "0",
  parentsSenior: false,
  hraBasic: "0",
  hraReceived: "0",
  hraRent: "0",
  hraCity: "metro",
  pt: "0",
  npser: "0",
};

export default function TaxCalculator() {
  const [f, setF] = useState(INITIAL_FIELDS);
  const [sec123, setSec123] = useState(() => SEC123_ITEMS.map(() => "0"));
  const [otherItems, setOtherItems] = useState([]);
  const [itemSeq, setItemSeq] = useState(0);
  const [results, setResults] = useState(null);
  const [shareMsg, setShareMsg] = useState("");
  const [copied, setCopied] = useState(false);
  const lenisRef = useRef(null);

  const scrollToEl = (id) => {
    if (typeof document === "undefined") return;
    const el = document.getElementById(id);
    if (!el) return;
    if (lenisRef.current) {
      lenisRef.current.scrollTo(el);
    } else {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const [openCards, setOpenCards] = useState({
    income: true, slabs: false, sec123: false, d80: false,
    hra: false, other: false, pt: false, npser: false,
  });
  const toggleCard = (k) => setOpenCards((s) => ({ ...s, [k]: !s[k] }));

  // number field: clamped silently, no message
  const setNum = (key) => (e) => setF((s) => ({ ...s, [key]: clampRaw(e.target.value) }));
  const setVal = (key) => (e) => setF((s) => ({ ...s, [key]: e.target.value }));
  const setChk = (key) => (e) => setF((s) => ({ ...s, [key]: e.target.checked }));

  const setSec123At = (i) => (e) => {
    const v = clampRaw(e.target.value);
    setSec123((s) => s.map((x, idx) => (idx === i ? v : x)));
  };

  const addPreset = (label) => {
    setOtherItems((s) => [...s, { id: itemSeq, label, amount: "0" }]);
    setItemSeq((n) => n + 1);
  };
  const updateOther = (id, field, value) =>
    setOtherItems((s) =>
      s.map((it) => (it.id === id ? { ...it, [field]: field === "amount" ? clampRaw(value) : value } : it))
    );
  const removeOther = (id) => setOtherItems((s) => s.filter((it) => it.id !== id));

  const live = derive(f, sec123, otherItems);

  const buildShareMessage = (r) => {
    if (!r) return "";
    const lines = [
      "I just calculated my income tax for 2026-27:",
      "\u{1F4B0} Salary: " + fmt(r.gross),
      "Old Tax Regime: " + fmt(r.old.r.net) + " | New Tax Regime: " + fmt(r.new.r.net),
    ];
    lines.push(
      r.diff > 0 && r.regime
        ? r.regime + " saves me " + fmt(r.diff) + " per year!"
        : "Both regimes work out the same for me."
    );
    lines.push(SHARE_URL);
    return lines.join("\n");
  };

  const handleCalculate = () => {
    const r = buildResult(f, sec123, otherItems);
    setResults(r);
    setShareMsg(buildShareMessage(r));
    if (typeof window !== "undefined" && window.gtag) {
      window.gtag("event", "tool_calculate_click", { tool_name: "Tax Calculator" });
    }
    setOpenCards({
      income: false, slabs: false, sec123: false, d80: false,
      hra: false, other: false, pt: false, npser: false,
    });
    scrollToEl("compare");
  };

  const expandAllAndScrollUp = () => {
    setOpenCards({
      income: true, slabs: false, sec123: true, d80: true,
      hra: true, other: true, pt: true, npser: true,
    });
    scrollToEl("card-income");
  };

  const copyShare = () => {
    if (typeof navigator === "undefined" || !navigator.clipboard) return;
    navigator.clipboard.writeText(shareMsg).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };

  // Smooth scrolling - scoped to this page only, destroyed on unmount.
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => 1 - Math.pow(1 - t, 2),
      smoothWheel: true,
      wheelMultiplier: 0.8,
      touchMultiplier: 1.5,
      infinite: false,
    });
    lenisRef.current = lenis;
    let rafId;
    function raf(time) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }
    rafId = requestAnimationFrame(raf);
    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  const r = results;
  const waHref = "https://wa.me/?text=" + encodeURIComponent(shareMsg);
  const xHref = "https://twitter.com/intent/tweet?text=" + encodeURIComponent(shareMsg);
  const liHref = "https://www.linkedin.com/sharing/share-offsite/?url=" + encodeURIComponent(SHARE_URL);

  const Chev = ({ open }) => (
    <button type="button" className="collapse-btn">
      <span className={"chev" + (open ? "" : " rot")}>▾</span>
      {open ? "Collapse" : "Expand"}
    </button>
  );

  return (
    <>
      <Head>
        <title>Income Tax Calculator 2026-27 – Old vs New Regime | PayrollTool</title>
        <meta
          name="description"
          content="Compare Old and New Tax Regime for FY 2026-27 under the Income Tax Act, 2025. Free browser-based calculator with HRA, Section 123, NPS and health insurance deductions. No login."
        />
        <meta name="robots" content="index, follow" />
        <meta property="og:title" content="Income Tax Calculator 2026-27 – Old vs New Regime | PayrollTool" />
        <meta
          property="og:description"
          content="Compare Old and New Tax Regime for FY 2026-27 instantly. Free, private, no sign-up."
        />
        <meta property="og:url" content={SHARE_URL} />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://www.payrolltool.in/icon.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <link rel="canonical" href={SHARE_URL} />
      </Head>

      <div className="tc" style={{ fontFamily: "'DM Sans', sans-serif", background: "#EEEAF8" }}>
        <Header />

        <div className="wrap">
          <div className="tc-hero">
            <h1>
              Income Tax <span>Calculator</span>
            </h1>
            <p>
              Compare the Old and New Tax Regimes instantly, as per the Income Tax Act, 2025.
              Precise work, done in less time.
            </p>
          </div>

          <div className="layout">
            <div className="col-left">
              {/* ---------- Income ---------- */}
              <div className={"card" + (openCards.income ? "" : " collapsed")} id="card-income">
                <div className="card-head" onClick={() => toggleCard("income")}>
                  <div className="card-icon">₹</div>
                  <div className="card-titles">
                    <div className="card-title">Income</div>
                    <div className="card-sub">Gross annual salary, before any deduction</div>
                  </div>
                  <Chev open={openCards.income} />
                </div>
                <div className="card-body">
                  <div className="row row-3">
                    <div className="field">
                      <label>Gross taxable salary (annual, in Rupees)</label>
                      <input
                        type="number" inputMode="decimal" min="0" step="1000" max={MAX_INPUT}
                        value={f.grossIncome} onChange={setNum("grossIncome")}
                      />
                    </div>
                    <div className="field">
                      <label>Employment type</label>
                      <div className="toggle-pair">
                        <button
                          type="button" className={f.salaried ? "active" : ""}
                          onClick={() => setF((s) => ({ ...s, salaried: true }))}
                        >
                          Salaried employee
                        </button>
                        <button
                          type="button" className={!f.salaried ? "active" : ""}
                          onClick={() => setF((s) => ({ ...s, salaried: false }))}
                        >
                          Other income
                        </button>
                      </div>
                    </div>
                    <div className="field">
                      <label>Age category</label>
                      <div className="toggle-pair toggle-3">
                        {[
                          ["general", "Below 60", "Regular"],
                          ["senior", "60 – 79", "Senior"],
                          ["super", "80 and above", "Super senior"],
                        ].map(([val, top, sub]) => (
                          <button
                            key={val} type="button"
                            className={f.ageBand === val ? "active" : ""}
                            onClick={() => setF((s) => ({ ...s, ageBand: val }))}
                          >
                            {top}
                            <small>{sub}</small>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ---------- Slabs reference ---------- */}
              <div className={"card" + (openCards.slabs ? "" : " collapsed")} id="card-slabs">
                <div className="card-head" onClick={() => toggleCard("slabs")}>
                  <div className="card-icon">📊</div>
                  <div className="card-titles">
                    <div className="card-title">Tax slabs for reference</div>
                    <div className="card-sub">
                      Under Section 202 (formerly Section 115BAC) · general taxpayer rates
                    </div>
                  </div>
                  <Chev open={openCards.slabs} />
                </div>
                <div className="card-body">
                  <div className="slab-grid">
                    <div className="slab-box old">
                      <div className="slab-box-head">Old Tax Regime</div>
                      <table className="slabs">
                        <tbody>
                          <tr><td>Up to Rs. 2,50,000</td><td>Nil</td></tr>
                          <tr><td>Rs. 2,50,001 to Rs. 5,00,000</td><td>5%</td></tr>
                          <tr><td>Rs. 5,00,001 to Rs. 10,00,000</td><td>20%</td></tr>
                          <tr><td>Above Rs. 10,00,000</td><td>30%</td></tr>
                        </tbody>
                      </table>
                      <div className="slab-foot">
                        For a senior citizen (60–79) the nil slab extends to Rs. 3,00,000, and for a
                        super senior citizen (80 and above) to Rs. 5,00,000 with no 5% band. Standard
                        Deduction of Rs. 50,000 applies. Rebate under Section 156 (formerly Section
                        87A) of up to Rs. 12,500 applies if taxable income is Rs. 5,00,000 or below.
                      </div>
                    </div>
                    <div className="slab-box new">
                      <div className="slab-box-head">New Tax Regime - Default Regime</div>
                      <table className="slabs">
                        <tbody>
                          <tr><td>Up to Rs. 4,00,000</td><td>Nil</td></tr>
                          <tr><td>Rs. 4,00,001 to Rs. 8,00,000</td><td>5%</td></tr>
                          <tr><td>Rs. 8,00,001 to Rs. 12,00,000</td><td>10%</td></tr>
                          <tr><td>Rs. 12,00,001 to Rs. 16,00,000</td><td>15%</td></tr>
                          <tr><td>Rs. 16,00,001 to Rs. 20,00,000</td><td>20%</td></tr>
                          <tr><td>Rs. 20,00,001 to Rs. 24,00,000</td><td>25%</td></tr>
                          <tr><td>Above Rs. 24,00,000</td><td>30%</td></tr>
                        </tbody>
                      </table>
                      <div className="slab-foot">
                        Standard Deduction of Rs. 75,000 applies. A full rebate of up to Rs. 60,000
                        applies if taxable income is Rs. 12,00,000 or below, with marginal relief
                        extending to approximately Rs. 12,70,588.
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ---------- Section 123 ---------- */}
              <div className={"card" + (openCards.sec123 ? "" : " collapsed")} id="card-80c">
                <div className="card-head" onClick={() => toggleCard("sec123")}>
                  <div className="card-icon">🏦</div>
                  <div className="card-titles">
                    <div className="card-title">Investments and savings</div>
                    <div className="card-sub">
                      Under Section 123 (formerly Section 80C) · combined deduction capped at Rs. 1,50,000
                    </div>
                    <span className="tag tag-old">Old Regime only</span>
                  </div>
                  <span className="card-amt">{fmt(live.sec123Capped + live.nps1bCapped)}</span>
                  <Chev open={openCards.sec123} />
                </div>
                <div className="card-body">
                  <div>
                    {SEC123_ITEMS.map((name, i) => (
                      <div className="sub-item" key={i}>
                        <div className="name">{name}</div>
                        <input
                          type="number" inputMode="decimal" min="0" step="500" max={MAX_INPUT}
                          value={sec123[i]} onChange={setSec123At(i)}
                        />
                      </div>
                    ))}
                  </div>
                  <div className={"cap-note" + (live.sec123Sum > SEC123_CAP ? " over" : "")}>
                    <span>Combined cap Rs. 1,50,000</span>
                    <span>{fmt(live.sec123Sum)} used</span>
                  </div>
                  <div className="field" style={{ marginTop: 14 }}>
                    <label>Additional NPS contribution (formerly Section 80CCD(1B))</label>
                    <input
                      type="number" inputMode="decimal" min="0" step="500" max={MAX_INPUT}
                      value={f.nps1b} onChange={setNum("nps1b")}
                    />
                    <div className="hint">
                      Capped at Rs. 50,000, over and above the Section 123 basket.
                    </div>
                  </div>
                </div>
              </div>

              {/* ---------- Section 126 ---------- */}
              <div className={"card" + (openCards.d80 ? "" : " collapsed")} id="card-80d">
                <div className="card-head" onClick={() => toggleCard("d80")}>
                  <div className="card-icon">🩺</div>
                  <div className="card-titles">
                    <div className="card-title">Health insurance premium</div>
                    <div className="card-sub">Under Section 126 (formerly Section 80D)</div>
                    <span className="tag tag-old">Old Regime only</span>
                  </div>
                  <span className="card-amt">{fmt(live.d80Total)}</span>
                  <Chev open={openCards.d80} />
                </div>
                <div className="card-body">
                  <div className="row row-2">
                    <div className="field">
                      <label>Self, spouse and children (including preventive check-up)</label>
                      <input
                        type="number" inputMode="decimal" min="0" step="500" max={MAX_INPUT}
                        value={f.d80Self} onChange={setNum("d80Self")}
                      />
                      <div className="hint">
                        Capped at Rs. 25,000. A preventive health check-up of up to Rs. 5,000 is
                        included within this cap, not additional to it.
                      </div>
                    </div>
                    <div className="field">
                      <label>Parents&apos; premium</label>
                      <input
                        type="number" inputMode="decimal" min="0" step="500" max={MAX_INPUT}
                        value={f.d80Parents} onChange={setNum("d80Parents")}
                      />
                      <div className="checkrow">
                        <input
                          type="checkbox" id="d80-parentsSenior"
                          checked={f.parentsSenior} onChange={setChk("parentsSenior")}
                        />
                        <span>
                          Parents are senior citizens (cap of Rs. 50,000 instead of Rs. 25,000)
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ---------- HRA ---------- */}
              <div className={"card" + (openCards.hra ? "" : " collapsed")} id="card-hra">
                <div className="card-head" onClick={() => toggleCard("hra")}>
                  <div className="card-icon">🏠</div>
                  <div className="card-titles">
                    <div className="card-title">House Rent Allowance (HRA)</div>
                    <div className="card-sub">
                      Under Schedule II, HRA Entry (formerly Section 10(13A))
                    </div>
                    <span className="tag tag-old">Old Regime only</span>
                  </div>
                  <span className="card-amt">{fmt(live.hraExemption)}</span>
                  <Chev open={openCards.hra} />
                </div>
                <div className="card-body">
                  <div className="row row-4">
                    <div className="field">
                      <label>Basic salary + Dearness Allowance (annual)</label>
                      <input
                        type="number" inputMode="decimal" min="0" step="1000" max={MAX_INPUT}
                        value={f.hraBasic} onChange={setNum("hraBasic")}
                      />
                    </div>
                    <div className="field">
                      <label>HRA received (annual)</label>
                      <input
                        type="number" inputMode="decimal" min="0" step="1000" max={MAX_INPUT}
                        value={f.hraReceived} onChange={setNum("hraReceived")}
                      />
                    </div>
                    <div className="field">
                      <label>Rent paid (annual)</label>
                      <input
                        type="number" inputMode="decimal" min="0" step="1000" max={MAX_INPUT}
                        value={f.hraRent} onChange={setNum("hraRent")}
                      />
                    </div>
                    <div className="field">
                      <label>City of residence</label>
                      <select value={f.hraCity} onChange={setVal("hraCity")}>
                        <option value="metro">Metro city (50% of basic)</option>
                        <option value="nonmetro">Non-metro city (40% of basic)</option>
                      </select>
                    </div>
                  </div>
                  <div className="hint">
                    The metro city category now includes Delhi, Mumbai, Kolkata, Chennai, Bengaluru,
                    Hyderabad, Pune and Ahmedabad.
                  </div>
                </div>
              </div>

              {/* ---------- Other exemptions ---------- */}
              <div className={"card" + (openCards.other ? "" : " collapsed")} id="card-other">
                <div className="card-head" onClick={() => toggleCard("other")}>
                  <div className="card-icon">🎁</div>
                  <div className="card-titles">
                    <div className="card-title">Other exemptions included in salary</div>
                    <div className="card-sub">
                      Under Schedule II (formerly Section 10) · Leave Travel Allowance, allowances and
                      company-specific items
                    </div>
                    <span className="tag tag-old">Old Regime only</span>
                  </div>
                  <span className="card-amt">{fmt(live.otherSum)}</span>
                  <Chev open={openCards.other} />
                </div>
                <div className="card-body">
                  <div className="chip-row">
                    {OTHER_PRESETS.map(([btn, label]) => (
                      <button key={btn} type="button" className="chip" onClick={() => addPreset(label)}>
                        {btn}
                      </button>
                    ))}
                  </div>
                  <div>
                    {otherItems.map((it) => (
                      <div className="exempt-row" key={it.id}>
                        <input
                          type="text" placeholder="Description" value={it.label}
                          onChange={(e) => updateOther(it.id, "label", e.target.value)}
                        />
                        <input
                          type="number" inputMode="decimal" placeholder="Amount" min="0" step="500"
                          max={MAX_INPUT} value={it.amount}
                          onChange={(e) => updateOther(it.id, "amount", e.target.value)}
                        />
                        <button
                          type="button" className="remove" title="Remove"
                          onClick={() => removeOther(it.id)}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="hint">
                    Add any further company-paid exemption item that forms part of your gross salary.
                  </div>
                </div>
              </div>

              {/* ---------- Professional Tax ---------- */}
              <div className={"card" + (openCards.pt ? "" : " collapsed")} id="card-pt">
                <div className="card-head" onClick={() => toggleCard("pt")}>
                  <div className="card-icon">🏛️</div>
                  <div className="card-titles">
                    <div className="card-title">Professional Tax</div>
                    <div className="card-sub">
                      Under Section 19 (formerly Section 16(iii)) · deductible from salary income under
                      the Old Regime only
                    </div>
                    <span className="tag tag-old">Old Regime only</span>
                  </div>
                  <span className="card-amt">{fmt(live.ptCapped)}</span>
                  <Chev open={openCards.pt} />
                </div>
                <div className="card-body">
                  <div className="field">
                    <label>Professional Tax paid</label>
                    <input
                      type="number" inputMode="decimal" min="0" step="100" max={MAX_INPUT}
                      value={f.pt} onChange={setNum("pt")}
                    />
                    <div className="hint">
                      Capped at Rs. 2,500 a year. Levied by the state, not the centre, so it does not
                      apply in Delhi, Haryana, Uttar Pradesh, Rajasthan and other states that do not
                      levy it. Under the New Regime this deduction is not available, and the figure
                      you enter here is ignored on that side of the comparison.
                    </div>
                  </div>
                </div>
              </div>

              {/* ---------- Employer NPS ---------- */}
              <div className={"card" + (openCards.npser ? "" : " collapsed")} id="card-both">
                <div className="card-head" onClick={() => toggleCard("npser")}>
                  <div className="card-icon">🤝</div>
                  <div className="card-titles">
                    <div className="card-title">Employer&apos;s NPS contribution</div>
                    <div className="card-sub">
                      Under Section 124 (formerly Section 80CCD(2)) · the one deduction allowed under
                      both regimes
                    </div>
                    <span className="tag tag-both">Both Regimes</span>
                  </div>
                  <span className="card-amt">{fmt(live.npserAmt)}</span>
                  <Chev open={openCards.npser} />
                </div>
                <div className="card-body">
                  <div className="field">
                    <label>Employer&apos;s National Pension System contribution</label>
                    <input
                      type="number" inputMode="decimal" min="0" step="500" max={MAX_INPUT}
                      value={f.npser} onChange={setNum("npser")}
                    />
                    <div className="hint">
                      Include only if it is already part of the gross salary entered above. No upper cap.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ---------- Calculate ---------- */}
            <div className="calculate-band">
              <button type="button" className="calculate-btn" onClick={handleCalculate}>
                Calculate Tax
              </button>
              <div className="calculate-hint">
                Fills in the comparison below. Tap again any time after changing details.
              </div>
            </div>

            {/* ---------- Comparison ---------- */}
            <div className="compare" id="compare">
              <div className="compare-head">
                <div className="compare-head-title">TAX REGIME COMPARISON - TAX YEAR 2026-27</div>
                <button type="button" className="edit-link" onClick={expandAllAndScrollUp}>
                  ✏️ Edit details
                </button>
              </div>

              <div className="table-scroll">
                <table className="compare-table">
                  <thead>
                    <tr>
                      <th>Parameter</th>
                      <th>New Regime</th>
                      <th>Old Regime</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!r ? (
                      <tr>
                        <td colSpan={3} className="empty">
                          Fill in your details above, then tap <b>Calculate Tax</b> to see your comparison.
                        </td>
                      </tr>
                    ) : (
                      <>
                        <tr className="bar">
                          <td>Gross Total Income</td>
                          <td>{fmt(r.gross)}</td>
                          <td>{fmt(r.gross)}</td>
                        </tr>
                        <tr className="deduction">
                          <td>Standard Deduction</td>
                          <td>{dash(r.new.std)}</td>
                          <td>{dash(r.old.std)}</td>
                        </tr>
                        <tr className="deduction">
                          <td>Employer&apos;s NPS Contribution (Sec. 124)</td>
                          <td>{dash(r.new.npser)}</td>
                          <td>{dash(r.old.npser)}</td>
                        </tr>
                        <tr className="deduction">
                          <td>Professional Tax Exemption (Sec. 19)</td>
                          <td className="muted">----</td>
                          <td>{dash(r.old.pt)}</td>
                        </tr>
                        <tr className="deduction">
                          <td>HRA Exemption</td>
                          <td className="muted">----</td>
                          <td>{dash(r.old.hra)}</td>
                        </tr>
                        <tr className="deduction">
                          <td>Other Exemptions (LTA, allowances)</td>
                          <td className="muted">----</td>
                          <td>{dash(r.old.other)}</td>
                        </tr>
                        <tr className="deduction">
                          <td>Section 123 Basket (formerly 80C)</td>
                          <td className="muted">----</td>
                          <td>{dash(r.old.sec123)}</td>
                        </tr>
                        <tr className="deduction">
                          <td>Own NPS Contribution (Sec. 124)</td>
                          <td className="muted">----</td>
                          <td>{dash(r.old.nps1b)}</td>
                        </tr>
                        <tr className="deduction">
                          <td>Health Insurance (Sec. 126, formerly 80D)</td>
                          <td className="muted">----</td>
                          <td>{dash(r.old.d80)}</td>
                        </tr>
                        <tr className="bar">
                          <td>Taxable Income</td>
                          <td>{fmt(r.new.taxable)}</td>
                          <td>{fmt(r.old.taxable)}</td>
                        </tr>
                        <tr>
                          <td>Tax at Normal Rates</td>
                          <td>{fmt(r.new.r.tax)}</td>
                          <td>{fmt(r.old.r.tax)}</td>
                        </tr>
                        <tr className="dim">
                          <td>Less: Rebate (Sec. 156, formerly 87A)</td>
                          <td>{fmt(r.new.r.rebate)}</td>
                          <td>{fmt(r.old.r.rebate)}</td>
                        </tr>
                        <tr>
                          <td>Net Tax after Rebate</td>
                          <td>{fmt(r.new.r.afterRebate)}</td>
                          <td>{fmt(r.old.r.afterRebate)}</td>
                        </tr>
                        <tr className="dim">
                          <td>Add: Surcharge</td>
                          <td>{fmt(r.new.r.surcharge)}</td>
                          <td>{fmt(r.old.r.surcharge)}</td>
                        </tr>
                        <tr className="dim">
                          <td>Add: Health &amp; Education Cess (4%)</td>
                          <td>{fmt(r.new.r.cess)}</td>
                          <td>{fmt(r.old.r.cess)}</td>
                        </tr>
                        <tr className="highlight">
                          <td>Total Tax on Income</td>
                          <td>{fmt(r.new.r.net)}</td>
                          <td>{fmt(r.old.r.net)}</td>
                        </tr>
                        <tr className="dim">
                          <td>Estimated Monthly TDS (12-month projected basis)</td>
                          <td>{fmt(r.new.r.net / 12)}</td>
                          <td>{fmt(r.old.r.net / 12)}</td>
                        </tr>
                      </>
                    )}
                  </tbody>
                </table>
              </div>

              {r && (
                <>
                  <div className="compare-savings">
                    {r.diff > 0 && r.regime
                      ? `${r.regime} saves ${fmt(r.diff)}/yr · ${fmt(r.diff / 12)}/mo avg`
                      : "Both regimes result in the same annual tax"}
                  </div>
                  <div className={"compare-callout" + (r.regime ? "" : " warn")}>
                    {r.regime === "New Regime"
                      ? `New Regime is optimal - saves ${fmt(r.diff)}/yr (${fmt(r.diff / 12)}/mo). Old Regime may improve with higher Section 123, HRA or Section 126 claims.`
                      : r.regime === "Old Regime"
                      ? `Old Regime is optimal - saves ${fmt(r.diff)}/yr (${fmt(r.diff / 12)}/mo), based on the deductions entered above.`
                      : "Both regimes are evenly matched for this income and these deductions."}
                  </div>
                </>
              )}

              <div className="table-note">
                Figures above show income tax liability only. They don&apos;t account for other salary
                deductions (PF, loan EMIs, insurance premiums deducted at source, etc.), so this
                isn&apos;t your full take-home pay.
              </div>

              {r && (
                <div className="share-block">
                  <div className="share-style-row">
                    <span className="share-label">
                      Share your comparison - edit the message before sending if you like
                    </span>
                  </div>
                  <textarea
                    className="share-preview" rows={6} aria-label="Share message"
                    value={shareMsg} onChange={(e) => setShareMsg(e.target.value)}
                  />
                  <div className="share-row">
                    <a className="share-btn" href={waHref} target="_blank" rel="noopener noreferrer">
                      WhatsApp
                    </a>
                    <a className="share-btn" href={xHref} target="_blank" rel="noopener noreferrer">
                      X
                    </a>
                    <a className="share-btn" href={liHref} target="_blank" rel="noopener noreferrer">
                      LinkedIn
                    </a>
                    <button type="button" className="share-btn" onClick={copyShare}>
                      {copied ? "Copied!" : "Copy message + link"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <FeedbackWidget toolName="Tax Calculator" />

          <div className="disclaimer">
            <h4>Before you rely on these figures</h4>
            <p>
              This calculator gives a quick comparison of your likely tax under the old and new
              regimes for Tax Year 2026-27. It covers the deduction heads shown above and assumes a
              full 12-month year on a single salary income.
            </p>
            <p>
              It does not cover income from house property, capital gains, business or profession, or
              other sources, and it does not account for TDS already deducted, advance tax paid,
              relief under Section 89, or interest and fees for late filing. Your actual liability is
              determined by the Income-tax Act, 2025 and the rules made under it.
            </p>
            <p>
              For filing, or where your situation is not a straightforward salaried one, have the
              numbers confirmed by a chartered accountant.
            </p>
          </div>

        </div>

        <Footer />
      </div>

      <style jsx>{`
        .tc {
          --purple: #7c3aed;
          --purple-deep: #5b21b6;
          --purple-soft: #f1ebfd;
          --green: #059669;
          --green-soft: #e4f5ee;
          --ink: #1e1b2e;
          --ink-soft: #726c87;
          --line: #e6e1f5;
          --danger: #c0392b;
          color: var(--ink);
        }
        .wrap {
          max-width: 1080px;
          margin: 0 auto;
          padding: 0 24px 90px;
        }
        .tc-hero {
          text-align: center;
          padding: 24px 0 8px;
        }
        .tc-hero h1 {
          font-family: "Sora", sans-serif;
          font-size: 34px;
          font-weight: 700;
          margin: 0 0 6px;
          line-height: 1.2;
          color: #1e1b4b;
        }
        .tc-hero h1 span {
          color: #7c3aed;
        }
        .tc-hero p {
          color: #6b7280;
          font-size: 14.5px;
          max-width: 540px;
          margin: 0 auto;
        }
        .layout {
          display: flex;
          flex-direction: column;
          gap: 22px;
          margin-top: 24px;
        }
        .col-left {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .card {
          background: #fff;
          border: 1px solid var(--line);
          border-radius: 16px;
          overflow: hidden;
        }
        .card-head {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 18px 20px;
          cursor: pointer;
        }
        .card-icon {
          width: 34px;
          height: 34px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          background: var(--purple-soft);
          color: var(--purple-deep);
          flex: none;
        }
        .card-titles {
          flex: 1;
        }
        .card-title {
          font-family: "Sora", sans-serif;
          font-weight: 600;
          font-size: 14.5px;
          color: var(--ink);
        }
        .card-sub {
          font-size: 12px;
          color: var(--ink-soft);
          margin-top: 3px;
          line-height: 1.5;
        }
        .card-amt {
          font-family: "DM Sans", sans-serif;
          font-weight: 600;
          font-size: 13.5px;
          color: var(--purple-deep);
          white-space: nowrap;
          margin-top: 2px;
          max-width: 40%;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .collapse-btn {
          min-height: 44px;
          display: inline-flex;
          align-items: center;
          gap: 5px;
          border: none;
          background: none;
          font-family: inherit;
          font-size: 12px;
          font-weight: 500;
          color: var(--purple-deep);
          cursor: pointer;
          padding: 0 6px;
          border-radius: 8px;
          flex: none;
        }
        .chev {
          transition: transform 0.18s;
          font-size: 10px;
          display: inline-block;
        }
        .chev.rot {
          transform: rotate(-90deg);
        }
        .card-body {
          padding: 0 20px 20px;
        }
        .card.collapsed .card-body {
          display: none;
        }
        .tag {
          display: inline-block;
          margin-top: 7px;
          padding: 3px 9px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 500;
        }
        .tag-old {
          background: var(--purple-soft);
          color: var(--purple-deep);
        }
        .tag-both {
          background: var(--green-soft);
          color: var(--green);
        }
        label {
          display: block;
          font-size: 12px;
          font-weight: 500;
          color: var(--ink-soft);
          margin-bottom: 6px;
        }
        .hint {
          font-size: 11.5px;
          color: var(--ink-soft);
          margin-top: 5px;
          line-height: 1.55;
        }
        .field {
          margin-bottom: 14px;
        }
        .row {
          display: grid;
          gap: 14px;
        }
        .row-2 {
          grid-template-columns: 1fr 1fr;
        }
        .row-3 {
          grid-template-columns: 1fr 1fr 1fr;
        }
        .row-4 {
          grid-template-columns: 1fr 1fr 1fr 1fr;
        }
        .toggle-pair {
          display: flex;
          background: #f3f1fb;
          border-radius: 10px;
          padding: 3px;
          gap: 3px;
        }
        .toggle-pair button {
          flex: 1;
          border: none;
          background: none;
          padding: 9px 6px;
          min-height: 44px;
          color: var(--ink-soft);
          font-family: "DM Sans", sans-serif;
          font-weight: 500;
          font-size: 12.5px;
          cursor: pointer;
          border-radius: 8px;
        }
        .toggle-pair button.active {
          background: #fff;
          color: var(--purple-deep);
          font-weight: 600;
          box-shadow: 0 1px 3px rgba(90, 40, 200, 0.1);
        }
        .toggle-3 button {
          flex-direction: column;
          line-height: 1.25;
          padding: 8px 4px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .toggle-3 button small {
          display: block;
          font-size: 10px;
          opacity: 0.75;
          font-weight: 400;
          margin-top: 1px;
        }
        .checkrow {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 8px;
        }
        .checkrow input {
          width: auto;
          min-height: 0;
          accent-color: var(--purple);
        }
        .checkrow span {
          font-size: 12.5px;
          color: var(--ink-soft);
        }
        .slab-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }
        .slab-box {
          border: 1px solid var(--line);
          border-radius: 12px;
          overflow: hidden;
        }
        .slab-box-head {
          padding: 9px 14px;
          font-weight: 600;
          font-size: 12.5px;
          font-family: "Sora", sans-serif;
        }
        .slab-box.old .slab-box-head {
          background: var(--purple-soft);
          color: var(--purple-deep);
        }
        .slab-box.new .slab-box-head {
          background: var(--green-soft);
          color: var(--green);
        }
        table.slabs {
          width: 100%;
          border-collapse: collapse;
        }
        table.slabs td {
          padding: 7px 14px;
          font-size: 12px;
          border-bottom: 1px solid var(--line);
        }
        table.slabs td:last-child {
          text-align: right;
          font-weight: 600;
        }
        .slab-foot {
          padding: 9px 14px;
          font-size: 11px;
          color: var(--ink-soft);
          border-top: 1px solid var(--line);
          background: #fbfafe;
          line-height: 1.6;
        }
        .sub-item {
          display: grid;
          grid-template-columns: 1fr 130px;
          gap: 10px;
          align-items: center;
          padding: 7px 0;
          border-bottom: 1px dashed var(--line);
        }
        .sub-item:last-child {
          border-bottom: none;
        }
        .sub-item .name {
          font-size: 12.5px;
        }
        .cap-note {
          display: flex;
          justify-content: space-between;
          font-size: 11.5px;
          padding: 8px 12px;
          border-radius: 8px;
          background: var(--purple-soft);
          color: var(--purple-deep);
          margin-top: 10px;
        }
        .cap-note.over {
          background: #fbeaea;
          color: var(--danger);
        }
        .exempt-row {
          display: grid;
          grid-template-columns: 1fr 120px 44px;
          gap: 8px;
          align-items: center;
          margin-bottom: 8px;
        }
        .exempt-row button.remove {
          border: 1.5px solid var(--line);
          background: #fff;
          color: var(--danger);
          border-radius: 8px;
          min-height: 44px;
          cursor: pointer;
          font-size: 15px;
        }
        .chip-row {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 12px;
        }
        .chip {
          border: 1.5px solid var(--line);
          background: #fff;
          padding: 10px 14px;
          border-radius: 20px;
          font-size: 12px;
          cursor: pointer;
          font-weight: 500;
          color: var(--ink-soft);
          min-height: 44px;
          font-family: inherit;
        }
        .chip:hover {
          border-color: var(--purple);
          color: var(--purple-deep);
        }
        .calculate-band {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }
        .calculate-btn {
          border: none;
          border-radius: 12px;
          padding: 15px 40px;
          min-height: 44px;
          background: linear-gradient(135deg, var(--purple), var(--purple-deep));
          color: #fff;
          font-family: "Sora", sans-serif;
          font-weight: 600;
          font-size: 15px;
          cursor: pointer;
          box-shadow: 0 6px 18px rgba(90, 40, 200, 0.25);
        }
        .calculate-btn:hover {
          filter: brightness(1.05);
        }
        .calculate-btn:active {
          transform: translateY(1px);
        }
        .calculate-hint {
          font-size: 11.5px;
          color: var(--ink-soft);
        }
        .compare {
          background: #fff;
          border: 1px solid var(--line);
          border-radius: 16px;
          overflow: hidden;
        }
        .compare-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 14px 22px;
          background: #fbfafe;
          border-bottom: 1px solid var(--line);
          flex-wrap: wrap;
        }
        .compare-head-title {
          font-family: "Sora", sans-serif;
          font-weight: 600;
          font-size: 12.5px;
          letter-spacing: 0.05em;
          color: var(--purple-deep);
        }
        .edit-link {
          border: 1.5px solid var(--line);
          background: transparent;
          border-radius: 9px;
          min-height: 38px;
          padding: 0 12px;
          font-size: 12px;
          font-weight: 600;
          color: var(--purple-deep);
          cursor: pointer;
          font-family: inherit;
        }
        .edit-link:hover {
          background: #fff;
        }
        .table-scroll {
          width: 100%;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          overscroll-behavior-x: contain;
        }
        table.compare-table {
          width: 100%;
          min-width: 520px;
          border-collapse: collapse;
        }
        table.compare-table th {
          text-align: right;
          padding: 10px 22px;
          font-size: 11.5px;
          font-weight: 600;
          color: var(--purple-deep);
          background: #fbfafe;
          border-bottom: 1px solid var(--line);
        }
        table.compare-table th:first-child {
          text-align: left;
        }
        table.compare-table td {
          padding: 8px 22px;
          font-size: 12.5px;
          text-align: right;
          border-bottom: 1px solid var(--line);
          font-variant-numeric: tabular-nums;
          color: var(--ink);
        }
        table.compare-table td:first-child {
          text-align: left;
          color: var(--ink-soft);
        }
        table.compare-table td.empty {
          text-align: center;
          color: var(--ink-soft);
          padding: 22px;
        }
        table.compare-table tr.deduction td,
        table.compare-table tr.deduction td:first-child {
          color: var(--purple-deep);
        }
        table.compare-table tr.bar td {
          background: var(--purple-soft);
          font-weight: 700;
          color: var(--purple-deep);
          border-top: 1px solid var(--line);
        }
        table.compare-table tr.bar td:first-child {
          color: var(--purple-deep);
          font-family: "Sora", sans-serif;
        }
        table.compare-table tr.highlight td {
          background: var(--green-soft);
          font-weight: 700;
          color: var(--green);
        }
        table.compare-table tr.highlight td:first-child {
          color: var(--ink);
        }
        table.compare-table tr.dim td {
          color: var(--ink-soft);
        }
        table.compare-table tr:last-child td {
          border-bottom: none;
        }
        table.compare-table td.muted {
          color: #c4bedb;
        }
        .compare-savings {
          text-align: center;
          padding: 12px 20px;
          font-family: "Sora", sans-serif;
          font-weight: 600;
          font-size: 13px;
          color: var(--purple-deep);
          background: var(--purple-soft);
          border-top: 1px solid var(--line);
        }
        .compare-callout {
          margin: 14px 22px 18px;
          padding: 11px 14px;
          border: 1px solid var(--green);
          background: var(--green-soft);
          color: var(--green);
          border-radius: 10px;
          font-size: 12px;
          line-height: 1.55;
        }
        .compare-callout.warn {
          border-color: var(--purple);
          background: var(--purple-soft);
          color: var(--purple-deep);
        }
        .table-note {
          margin: 0 22px 14px;
          font-size: 11px;
          color: var(--ink-soft);
          line-height: 1.6;
        }
        .share-block {
          border-top: 1px solid var(--line);
          padding: 14px 22px 20px;
        }
        .share-style-row {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 10px;
        }
        .share-label {
          font-size: 12px;
          color: var(--ink-soft);
          font-weight: 500;
        }
        .share-preview {
          width: 100%;
          font-family: inherit;
          resize: vertical;
          border: 1.5px solid var(--line);
          border-radius: 10px;
          background: #fbfafe;
          color: var(--ink);
          padding: 10px 12px;
          font-size: 12.5px;
          line-height: 1.6;
          margin-bottom: 10px;
        }
        .share-preview:focus {
          outline: none;
          border-color: var(--purple);
          background: #fff;
        }
        .share-row {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
        }
        .share-btn {
          min-height: 44px;
          display: inline-flex;
          align-items: center;
          border: 1.5px solid var(--line);
          background: #fff;
          border-radius: 10px;
          padding: 0 14px;
          font-size: 12.5px;
          font-weight: 500;
          color: var(--ink);
          cursor: pointer;
          text-decoration: none;
          font-family: inherit;
        }
        .share-btn:hover {
          border-color: var(--purple);
        }
        .disclaimer {
          max-width: 1080px;
          margin: 22px auto 0;
          border: 1px solid var(--line);
          border-left: 3px solid var(--purple);
          background: #fbfafe;
          border-radius: 12px;
          padding: 14px 18px;
        }
        .disclaimer h4 {
          margin: 0 0 6px;
          font-family: "Sora", sans-serif;
          font-size: 13px;
          font-weight: 600;
          color: var(--ink);
        }
        .disclaimer p {
          margin: 0 0 7px;
          font-size: 11.5px;
          color: var(--ink-soft);
          line-height: 1.65;
        }
        .disclaimer p:last-child {
          margin-bottom: 0;
        }
        /* form controls */
        .tc :global(input[type="number"]),
        .tc :global(input[type="text"]),
        .tc :global(select) {
          width: 100%;
          max-width: 100%;
          font-family: "DM Sans", sans-serif;
          font-size: 13.5px;
          padding: 10px 12px;
          min-height: 44px;
          border: 1.5px solid var(--line);
          border-radius: 10px;
          background: #fbfafe;
          color: var(--ink);
          font-variant-numeric: tabular-nums;
          -webkit-appearance: none;
          appearance: none;
        }
        .tc :global(input:focus),
        .tc :global(select:focus),
        .tc :global(textarea:focus) {
          outline: none;
          border-color: var(--purple);
          background: #fff;
        }
        .tc :global(input[type="number"]) {
          -moz-appearance: textfield;
        }
        .tc :global(input[type="number"]::-webkit-outer-spin-button),
        .tc :global(input[type="number"]::-webkit-inner-spin-button) {
          -webkit-appearance: none;
          margin: 0;
        }
        .tc :global(button) {
          -webkit-tap-highlight-color: transparent;
          touch-action: manipulation;
        }

        @media (max-width: 820px) {
          /* iOS Safari zooms the page when a focused field is under 16px */
          .tc :global(input[type="number"]),
          .tc :global(input[type="text"]),
          .tc :global(select) {
            font-size: 16px;
          }
        }
        @media (max-width: 640px) {
          .wrap {
            padding: 0 16px calc(60px + env(safe-area-inset-bottom));
          }
          .tc-hero {
            padding: 18px 0 10px;
          }
          .tc-hero h1 {
            font-size: 26px;
          }
          .row-2,
          .row-3,
          .row-4 {
            grid-template-columns: 1fr;
          }
          .slab-grid {
            grid-template-columns: 1fr;
          }
          .exempt-row {
            grid-template-columns: 1fr 110px 44px;
          }
          table.compare-table th,
          table.compare-table td {
            padding-left: 14px;
            padding-right: 14px;
            font-size: 12px;
          }
        }
      `}</style>
    </>
  );
}
