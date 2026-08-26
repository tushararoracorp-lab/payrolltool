import Head from "next/head";
import Link from "next/link";
import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";

const Icon = {
  globe: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15.3 15.3 0 010 20 15.3 15.3 0 010-20z" />
    </svg>
  ),
  lightning: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M13 2L3 14h7v8l11-14h-7z" />
    </svg>
  ),
  users: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" />
    </svg>
  ),
  check: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
      <path d="M9 12l2 2 4-4" /><circle cx="12" cy="12" r="9" />
    </svg>
  ),
  arrowRight: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
      <path d="M5 12h14M13 5l7 7-7 7" />
    </svg>
  ),
  file: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
      <path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z" />
    </svg>
  ),
  download: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
      <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 21h16" />
    </svg>
  ),
  pfEcr: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M7 7h10v10H7z" />
    </svg>
  ),
  tax: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2v20m-7-5h14M3 9h18" />
    </svg>
  ),
  salaryProration: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2L2 7v10c0 5.5 3.6 10.7 8.7 12.9 5.1 2.2 11.1.4 14.3-4.4" />
    </svg>
  ),
  lopSplitter: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 6h18M3 12h18M3 18h18" />
    </svg>
  ),
  finalSettlement: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 11l3 3L22 4M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  shield: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  bolt: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
    </svg>
  ),
  heart: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
  ),
  user: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="8" r="4" /><path d="M4 21v-1a8 8 0 0116 0v1" />
    </svg>
  ),
  mail: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 4h16v16H4z" /><path d="M4 6l8 7 8-7" />
    </svg>
  ),
  plus: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
      <path d="M12 5v14M5 12h14" />
    </svg>
  ),
};

const toolCards = [
  { icon: Icon.pfEcr, name: "PF ECR Creator", href: "/pf-ecr-creator", desc: "Prepares your ECR file for upload to the EPFO Unified Portal. Upload your spreadsheet, verify, download." },
  { icon: Icon.tax, name: "Tax Regime Calculator", href: "/tax-calculator", desc: "Compare Old vs New tax regimes for FY 2026\u201127. See which saves you more with deductions, surcharge, and cess." },
  { icon: Icon.salaryProration, name: "Salary Proration", href: "/salary-proration", desc: "Calculate prorated salary for mid-month joining or exit. Handles partial months, joining/resignation dates, and statutory deductions." },
  { icon: Icon.lopSplitter, name: "LOP Splitter", href: "/lop-splitter", desc: "Determine Loss of Pay for partial month absences. Handles unpaid leave, disciplinary action, and month-boundary calculations." },
  { icon: Icon.finalSettlement, name: "Final Settlement", href: "/final-settlement", desc: "Calculate full and final settlement: gratuity, notice pay, leave encashment, and statutory deductions. Complete F&F in one place." },
];

const scenarioData = {
  joining: {
    label: "New joiner",
    without: ["Rebuilding the proration formula from scratch", "Guessing which PT slab applies for their state", "Manually checking the EPF wage ceiling"],
    with: ["Salary Proration Calculator handles the split", "State-wise PT applied automatically", "EPF ceiling factored in by default"],
  },
  exit: {
    label: "Employee exit",
    without: ["A spreadsheet for gratuity, leave encashment, notice pay", "Re-deriving the same formulas every time", "Second-guessing the final number before payout"],
    with: ["Final Settlement Calculator does all three together", "Same trusted formula, every single time", "One number you can hand off with confidence"],
  },
  tax: {
    label: "Tax season",
    without: ["Manually comparing Old vs New regime by hand", "Missing a deduction that changes the answer", "Explaining the difference to an employee, unsure yourself"],
    with: ["Tax Regime Calculator compares both instantly", "FY 2026\u201127 deductions and slabs built in", "A clear number to actually explain"],
  },
  filing: {
    label: "Compliance filing",
    without: ["An ECR file that bounces back from the portal", "Decoding a cryptic upload error", "Reformatting a spreadsheet by hand"],
    with: ["PF ECR Creator outputs the correct format", "Built for the EPFO Unified Portal directly", "Upload once, done"],
  },
};

const faqItems = [
  { q: "Is my employee data actually safe?", a: "PayrollTool.in's calculators are designed to process your files in your browser. Your uploaded payroll data is not sent to PayrollTool.in's servers for calculation." },
  { q: "Do I need to create an account?", a: "No. There's no sign-up or login. Open a calculator and start using it immediately." },
  { q: "What file formats are supported?", a: "It depends on the tool. Bulk payroll tools can use Excel files, and supported document-based tools may accept PDF input. Each calculator shows the formats it accepts before you start." },
  { q: "Do I have to pay to use these tools?", a: "Core calculators are free to use today. If a future feature becomes paid, the pricing will be shown clearly before you use it." },
  { q: "Who built PayrollTool.in?", a: "PayrollTool.in is built and maintained by a payroll compliance professional with 8+ years of hands-on Indian payroll experience. The goal is simple: turn recurring payroll calculations into small, practical tools." },
];

const blogPosts = [
  { href: "/blog/pf-ecr-file-format", variant: "brand", icon: Icon.pfEcr, tag: "Compliance", title: "How to Fill & Format PF ECR File in EPFO Portal 2026\u201127" },
  { href: "/blog/salary-proration-india", variant: "amber", icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9h12M6 15h12" /></svg>
    ), tag: "How-to", title: "Prorated CTC Calculation India 2026\u201127 | Complete Guide" },
  { href: "/blog/final-settlement-calculator", variant: "brand", icon: Icon.finalSettlement, tag: "Guide", title: "Full & Final Settlement Calculator | Gratuity, Leave Encashment" },
];

const DEFAULT_COUNTRY_DATA = [
  { name: "India", iso: 356, users: 105 },
  { name: "United States", iso: 840, users: 32 },
  { name: "Canada", iso: 124, users: 1 },
  { name: "Germany", iso: 276, users: 1 },
  { name: "Estonia", iso: 233, users: 1 },
  { name: "Hungary", iso: 348, users: 1 },
  { name: "Lithuania", iso: 440, users: 1 },
];

export default function Home() {
  const [scenario, setScenario] = useState("joining");
  const [openFaq, setOpenFaq] = useState(null);
  const [stats, setStats] = useState({ countries: 15, activeUsers: 82, indiaUsers: 105 });
  const [countryData, setCountryData] = useState(DEFAULT_COUNTRY_DATA);
  const [showBackToTop, setShowBackToTop] = useState(false);

  // ---------- Back to top ----------
  useEffect(() => {
    function onScroll() {
      setShowBackToTop(window.scrollY > 480);
    }
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const d3Ready = useRef(false);
  const topoReady = useRef(false);
  const mapInitialized = useRef(false);
  const mapWrapRef = useRef(null);
  const popoverRef = useRef(null);

  // Live stats + country breakdown, falling back to interim figures if the
  // endpoint isn't wired up yet.
  useEffect(() => {
    fetch("/api/stats")
      .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
      .then((data) => {
        if (typeof data.countries === "number") {
          setStats({ countries: data.countries, activeUsers: data.activeUsers, indiaUsers: data.indiaUsers });
        }
        if (Array.isArray(data.byCountry)) {
          setCountryData(data.byCountry);
        }
      })
      .catch((err) => console.warn("Live stats unavailable, keeping interim figures:", err));
  }, []);

  function tryInitMap() {
    if (mapInitialized.current || !d3Ready.current || !topoReady.current) return;
    const wrap = mapWrapRef.current;
    const popoverEl = popoverRef.current;
    if (!wrap || !popoverEl || !window.d3 || !window.topojson) return;
    mapInitialized.current = true;

    const d3 = window.d3;
    const topojson = window.topojson;
    const byIso = {};
    countryData.forEach((c) => { byIso[c.iso] = c; });

    wrap.innerHTML = "";
    const width = wrap.clientWidth || 400;
    const height = wrap.clientHeight || 190;

    const svg = d3.select(wrap).append("svg").attr("viewBox", `0 0 ${width} ${height}`);

    const tooltip = document.createElement("div");
    tooltip.className = "cm-tooltip";
    popoverEl.appendChild(tooltip);

    d3.json("https://unpkg.com/world-atlas@2/countries-110m.json")
      .then((world) => {
        const countries = topojson.feature(world, world.objects.countries).features;
        const projection = d3.geoNaturalEarth1().fitSize([width, height], { type: "Sphere" });
        const path = d3.geoPath(projection);

        svg
          .selectAll("path")
          .data(countries)
          .enter()
          .append("path")
          .attr("d", path)
          .attr("class", (d) => "cm-country" + (byIso[+d.id] ? " active" : ""))
          .on("mousemove", (event, d) => {
            const c = byIso[+d.id];
            if (!c) return;
            const rect = popoverEl.getBoundingClientRect();
            tooltip.textContent = `${c.name} \u2014 ${c.users} user${c.users === 1 ? "" : "s"}`;
            tooltip.style.left = event.clientX - rect.left + "px";
            tooltip.style.top = Math.max(24, event.clientY - rect.top) + "px";
            tooltip.style.opacity = "1";
          })
          .on("mouseleave", (event, d) => {
            if (!byIso[+d.id]) return;
            tooltip.style.opacity = "0";
          });
      })
      .catch(() => {
        wrap.innerHTML = '<div class="cm-loading">Map unavailable \u2014 see list below.</div>';
      });
  }

  const sortedCountries = [...countryData].sort((a, b) => b.users - a.users);
  const scenarioActive = scenarioData[scenario];

  return (
    <>
      <Head>
        <title>PayrollTool.in – Payroll Calculators for HR Teams in India</title>
        <meta name="description" content="PF ECR, income tax, salary proration, LOP and final settlement calculators for Indian HR teams - browser-based, no sign-up required." />
        <meta name="keywords" content="PF ECR generator, payroll calculator India, salary proration calculator, LOP calculator, income tax calculator India, final settlement calculator, EPFO ECR format, payroll compliance tools" />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://www.payrolltool.in/" />
        <meta name="theme-color" content="#7C3AED" />

        {/* TODO: og-homepage.jpg doesn't exist yet — create a real 1200x630
            image and deploy it to /public before relying on link previews. */}
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="PayrollTool.in" />
        <meta property="og:title" content="PayrollTool.in – Payroll Calculators for HR Teams in India" />
        <meta property="og:description" content="PF ECR, income tax, salary proration, LOP and final settlement calculators for Indian HR teams - browser-based, no sign-up required." />
        <meta property="og:url" content="https://www.payrolltool.in/" />
        <meta property="og:image" content="https://www.payrolltool.in/og-homepage.jpg" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:locale" content="en_IN" />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="PayrollTool.in – Payroll Calculators for HR Teams in India" />
        <meta name="twitter:description" content="PF ECR, income tax, salary proration, LOP and final settlement calculators for Indian HR teams - browser-based, no sign-up required." />
        <meta name="twitter:image" content="https://www.payrolltool.in/og-homepage.jpg" />

        <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><circle cx='12' cy='12' r='10' fill='%237C3AED'/><path d='M12 21.593c-5.63-5.539-11-10.297-11-14.402 0-3.791 3.068-5.191 5.281-5.191 1.312 0 4.151.501 5.719 4.457 1.59-3.968 4.464-4.447 5.726-4.447 2.54 0 5.274 1.621 5.274 5.181 0 4.069-5.136 8.625-11 14.402z' fill='white'/></svg>" />

        {/* Organization schema */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "PayrollTool.in",
              url: "https://www.payrolltool.in/",
              logo: "https://www.payrolltool.in/logo.png",
              description: "Browser-based payroll calculators for Indian HR and payroll professionals: PF ECR generation, income tax comparison, salary proration, LOP calculation, and final settlement.",
              founder: { "@type": "Person", name: "Tushar Arora" },
              email: "support@payrolltool.in",
            }),
          }}
        />
        {/* WebSite schema */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "PayrollTool.in",
              url: "https://www.payrolltool.in/",
            }),
          }}
        />
        {/* Person schema (E-E-A-T) */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Person",
              name: "Tushar Arora",
              jobTitle: "Payroll Compliance Expert",
              description: "8+ years of payroll compliance experience across EPF, ESI, PT, LWF, NPS and TDS. Builder of PayrollTool.in.",
              url: "https://www.payrolltool.in/about",
              knowsAbout: ["Payroll Compliance", "EPF", "ESI", "Professional Tax", "TDS", "Indian Labour Law"],
            }),
          }}
        />
        {/* FAQ schema - must match the visible FAQ section below */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: faqItems.map((item) => ({
                "@type": "Question",
                name: item.q,
                acceptedAnswer: { "@type": "Answer", text: item.a },
              })),
            }),
          }}
        />
        {/* SoftwareApplication schema - one per tool.
            NOTE: price is 0 for all five tools below because that's accurate
            today. Update per-tool when the paid plan launches — a schema
            that still claims free after that changes is the same class of
            problem as the earlier FAQ-schema mismatch. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "SoftwareApplication",
                  name: "PF ECR Creator",
                  url: "https://www.payrolltool.in/pf-ecr-creator",
                  applicationCategory: "BusinessApplication",
                  operatingSystem: "Any (browser-based)",
                  description: "Prepares PF ECR files for upload to the EPFO Unified Portal from an uploaded Excel spreadsheet.",
                  offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
                },
                {
                  "@type": "SoftwareApplication",
                  name: "Tax Regime Calculator",
                  url: "https://www.payrolltool.in/tax-calculator",
                  applicationCategory: "BusinessApplication",
                  operatingSystem: "Any (browser-based)",
                  description: "Compares Old vs New income tax regimes for FY 2026\u201127, including deductions, surcharge, and cess.",
                  offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
                },
                {
                  "@type": "SoftwareApplication",
                  name: "Salary Proration Calculator",
                  url: "https://www.payrolltool.in/salary-proration",
                  applicationCategory: "BusinessApplication",
                  operatingSystem: "Any (browser-based)",
                  description: "Calculates prorated salary for mid-month joining or exit, including EPF, ESI, state-wise Professional Tax, and TDS.",
                  offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
                },
                {
                  "@type": "SoftwareApplication",
                  name: "LOP Splitter",
                  url: "https://www.payrolltool.in/lop-splitter",
                  applicationCategory: "BusinessApplication",
                  operatingSystem: "Any (browser-based)",
                  description: "Calculates Loss of Pay for partial-month absences, including month-boundary and multi-employee bulk cases.",
                  offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
                },
                {
                  "@type": "SoftwareApplication",
                  name: "Final Settlement Calculator",
                  url: "https://www.payrolltool.in/final-settlement",
                  applicationCategory: "BusinessApplication",
                  operatingSystem: "Any (browser-based)",
                  description: "Calculates full and final settlement \u2014 gratuity, notice pay, leave encashment, and statutory deductions \u2014 in one place.",
                  offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
                },
              ],
            }),
          }}
        />
      </Head>

      {/* d3 / topojson, loaded lazily - only needed for the country-map hover card */}
      <Script
        src="https://unpkg.com/d3@7/dist/d3.min.js"
        strategy="lazyOnload"
        onLoad={() => { d3Ready.current = true; }}
      />
      <Script
        src="https://unpkg.com/topojson-client@3/dist/topojson-client.min.js"
        strategy="lazyOnload"
        onLoad={() => { topoReady.current = true; }}
      />

      <Header />

      {/* HERO */}
      <section className="hero">
        <div className="wrap">
          <div className="hero-grid">
            <div>
              <span className="eyebrow"><span className="dot" />India Payroll</span>
              <h1>Calculate payroll compliance <span className="accent-word">in seconds</span></h1>
              <p>Powerful, accurate and fast payroll utilities designed for HR &amp; Payroll professionals. Do precise work in less time. Every time.</p>
              <Link href="#tools" className="hero-cta">
                Explore Tools {Icon.arrowRight}
              </Link>
              <div className="trust-row">
                <span className="trust-pill">{Icon.check} No sign-up required</span>
                <span className="trust-pill">{Icon.check} Files never leave your browser</span>
                <span className="trust-pill">{Icon.check} Built for Indian statutory rules</span>
              </div>
            </div>

            <div className="hero-visual">
              <div className="preview-card">
                <div className="preview-topbar">
                  <span className="title">{Icon.file} LOP Splitter - live preview</span>
                  <span className="live-tag"><span className="dot" />Live</span>
                </div>
                <div className="preview-body">
                  <div className="preview-row-label">Employee period entered</div>
                  <div className="input-chip-row">
                    <span className="input-chip">DOJ: 14 Feb 2026</span>
                    <span className="input-chip">LOP: 3 days</span>
                    <span className="input-chip">Payroll month: Feb 2026</span>
                  </div>
                  <table className="preview-table">
                    <thead>
                      <tr><th>Month</th><th>Days</th><th>LOP</th><th>Payable</th></tr>
                    </thead>
                    <tbody>
                      <tr><td>Feb 2026</td><td>28</td><td><span className="badge-days">3.0</span></td><td>25.0</td></tr>
                      <tr><td>Mar 2026</td><td>31</td><td><span className="badge-days">0.0</span></td><td>31.0</td></tr>
                    </tbody>
                  </table>
                </div>
                <div className="preview-footer">
                  <span className="result">Calculated in <b>0.4s</b></span>
                  <span className="mini-btn">Download report {Icon.download}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section style={{ padding: "16px 0 48px" }}>
        <div className="wrap">
          <div className="stats-section">
            <div
              className="stat-item has-map"
              tabIndex={0}
              onMouseEnter={tryInitMap}
              onFocus={tryInitMap}
            >
              <div className="stat-item-icon">{Icon.globe}</div>
              <div>
                <h3>{stats.countries}</h3>
                <p>Countries with active users</p>
              </div>
              <div className="country-map-popover" ref={popoverRef}>
                <div className="country-map-head">
                  <span>Active users by country</span>
                </div>
                <div className="country-map-svg-wrap" ref={mapWrapRef}>
                  <div className="cm-loading">Loading map…</div>
                </div>
                <ul className="country-map-list">
                  {sortedCountries.map((c) => (
                    <li key={c.name}>{c.name} <b>{c.users}</b></li>
                  ))}
                </ul>
                <p className="country-map-note">Top 7 of 15 countries shown</p>
              </div>
            </div>

            <div className="stat-item">
              <div className="stat-item-icon">{Icon.lightning}</div>
              <div>
                <h3>{stats.activeUsers}</h3>
                <p>Active users (30-day)</p>
              </div>
            </div>

            <div className="stat-item">
              <div className="stat-item-icon">{Icon.users}</div>
              <div>
                <h3>{stats.indiaUsers}</h3>
                <p>Users from India</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* WHY THESE TOOLS (narrative) */}
      <section style={{ padding: "40px 0 12px" }}>
        <div className="wrap" style={{ maxWidth: "760px" }}>
          <div className="section-head center" style={{ marginBottom: "44px" }}>
            <span className="eyebrow" style={{ justifyContent: "center" }}><span className="dot" />Why these tools</span>
            <h2>What changes once you stop guessing the formula</h2>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
            <div>
              <h4 style={{ fontSize: "17px", marginBottom: "6px" }}>Stop rebuilding the same spreadsheet every month</h4>
              <p style={{ color: "var(--ink-soft)", fontSize: "14.5px", lineHeight: 1.6 }}>Salary proration, LOP splits, final settlements - the same formulas, done fresh in a spreadsheet every time someone asks. Each calculator here does that math once, correctly, and gives you a number you can trust immediately.</p>
            </div>
            <div>
              <h4 style={{ fontSize: "17px", marginBottom: "6px" }}>PF ECR files that match the portal&apos;s format the first time</h4>
              <p style={{ color: "var(--ink-soft)", fontSize: "14.5px", lineHeight: 1.6 }}>Upload your spreadsheet, get back a file shaped for the EPFO Unified Portal - field order, format, and structure handled, so the upload doesn&apos;t bounce back with an error you have to decode.</p>
            </div>
            <div>
              <h4 style={{ fontSize: "17px", marginBottom: "6px" }}>Old vs New tax regime, compared side by side</h4>
              <p style={{ color: "var(--ink-soft)", fontSize: "14.5px", lineHeight: 1.6 }}>Not a rule of thumb - an actual calculation across both regimes for FY 2026‑27, so the answer to &quot;which one saves more&quot; is a number, not a guess.</p>
            </div>
          </div>
        </div>
      </section>

      {/* TOOLS */}
      <section id="tools" style={{ padding: "48px 0 64px" }}>
        <div className="wrap">
          <div className="section-head center">
            <span className="eyebrow"><span className="dot" />Calculate</span>
            <h2>Payroll compliance, simplified</h2>
            <p>Five powerful calculators for the most common HR calculations in India. No HRMS setup required - just upload a file or enter numbers.</p>
            <p style={{ fontSize: "13.5px", color: "var(--ink-soft)", maxWidth: "640px", margin: "12px auto 0", opacity: 0.85 }}>
              PayrollTool.in is a browser-based suite of payroll calculators for Indian HR and payroll teams - covering PF ECR generation, income tax (Old vs New regime), salary proration, LOP calculation, and final settlement.
            </p>
          </div>
          <div className="tools-grid">
            {toolCards.map((t) => (
              <div className="tool-card" key={t.href}>
                <div className="tool-card-icon">{t.icon}</div>
                <h4>{t.name}</h4>
                <p>{t.desc}</p>
                <Link href={t.href}>Use Tool →</Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SCENARIOS */}
      <section style={{ background: "var(--card-2)", padding: "56px 0 32px" }}>
        <div className="wrap" style={{ maxWidth: "840px" }}>
          <div className="section-head center">
            <span className="eyebrow" style={{ justifyContent: "center" }}><span className="dot" />Every scenario</span>
            <h2>Built for the moment you actually need it</h2>
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: "8px", flexWrap: "wrap", marginBottom: "32px" }}>
            {Object.entries(scenarioData).map(([key, s]) => (
              <button
                key={key}
                className={`scenario-tab${scenario === key ? " active" : ""}`}
                onClick={() => setScenario(key)}
              >
                {s.label}
              </button>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0, border: "1px solid var(--line)", borderRadius: "var(--radius-lg)", overflow: "hidden", background: "var(--card)" }}>
            <div style={{ padding: "32px" }}>
              <h4 style={{ fontSize: "14px", color: "var(--ink-soft)", marginBottom: "16px" }}>Without PayrollTool.in</h4>
              <ul id="scenarioWithout" style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "12px", fontSize: "14px", color: "var(--ink-soft)", padding: 0, margin: 0 }}>
                {scenarioActive.without.map((line) => <li key={line}>{line}</li>)}
              </ul>
            </div>
            <div style={{ padding: "32px", background: "var(--brand-50)", borderLeft: "1px solid var(--line)" }}>
              <h4 style={{ fontSize: "14px", color: "var(--brand-700)", marginBottom: "16px", fontWeight: 700 }}>With PayrollTool.in</h4>
              <ul id="scenarioWith" style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "12px", fontSize: "14px", color: "var(--ink)", padding: 0, margin: 0 }}>
                {scenarioActive.with.map((line) => <li key={line}>{line}</li>)}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section style={{ background: "var(--card-2)", padding: "32px 0 64px" }}>
        <div className="wrap">
          <div className="section-head center">
            <span className="eyebrow" style={{ justifyContent: "center" }}><span className="dot" />Why it works</span>
            <h2>What you get, every time you open a calculator</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", maxWidth: "800px", margin: "0 auto" }}>
            <div className="pastel-card" style={{ background: "var(--brand-50)" }}>
              <div className="pastel-card-icon" style={{ background: "var(--brand-600)" }}>{Icon.shield}</div>
              <h4 style={{ fontSize: "16.5px", marginBottom: "8px" }}>100% client-side</h4>
              <p style={{ color: "var(--ink-soft)", fontSize: "14px", lineHeight: 1.55 }}>No data uploaded to servers. Everything runs in your browser. Close the tab and it&apos;s gone.</p>
            </div>
            <div className="pastel-card" style={{ background: "var(--amber-50)" }}>
              <div className="pastel-card-icon" style={{ background: "var(--amber)" }}>{Icon.bolt}</div>
              <h4 style={{ fontSize: "16.5px", marginBottom: "8px" }}>FY 2026‑27 compliant</h4>
              <p style={{ color: "var(--ink-soft)", fontSize: "14px", lineHeight: 1.55 }}>Updated for latest tax brackets, deductions, exemptions, and statutory limits. Always current.</p>
            </div>
            <div className="pastel-card" style={{ background: "var(--amber-50)" }}>
              <div className="pastel-card-icon" style={{ background: "var(--amber)" }}>{Icon.heart}</div>
              <h4 style={{ fontSize: "16.5px", marginBottom: "8px" }}>Made for humans</h4>
              <p style={{ color: "var(--ink-soft)", fontSize: "14px", lineHeight: 1.55 }}>No clutter, no upsells, no forced sign-ups. Just the calculation you came for.</p>
            </div>
            <div className="pastel-card" style={{ background: "var(--brand-50)" }}>
              <div className="pastel-card-icon" style={{ background: "var(--brand-600)" }}>{Icon.user}</div>
              <h4 style={{ fontSize: "16.5px", marginBottom: "8px" }}>Built by a payroll professional</h4>
              <p style={{ color: "var(--ink-soft)", fontSize: "14px", lineHeight: 1.55 }}>Not a generic template. Rules and edge cases from real, hands-on payroll work.</p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" style={{ background: "var(--card)", borderTop: "1px solid var(--line)", borderBottom: "1px solid var(--line)" }}>
        <div className="wrap">
          <div className="section-head center" style={{ marginBottom: "8px" }}>
            <span className="eyebrow" style={{ justifyContent: "center" }}><span className="dot" />Questions</span>
            <h2>Before you use anything</h2>
          </div>
          <div className="faq-wrap">
            {faqItems.map((item, i) => (
              <div className={`faq-item${openFaq === i ? " open" : ""}`} key={item.q}>
                <button
                  className="faq-q"
                  aria-expanded={openFaq === i}
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  {item.q}{Icon.plus}
                </button>
                <div className="faq-a" style={{ maxHeight: openFaq === i ? "240px" : "0" }}>
                  <div className="faq-a-inner">{item.a}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BLOG */}
      <section id="blog" style={{ padding: "56px 0 64px" }}>
        <div className="wrap">
          <div className="section-head">
            <span className="eyebrow"><span className="dot" />From the blog</span>
            <h2>Payroll compliance, explained without jargon</h2>
            <p>Learn the rules, avoid mistakes, understand edge cases. Updated for FY 2026‑27.</p>
          </div>
          <div className="blog-grid">
            {blogPosts.map((post) => (
              <Link key={post.href} href={post.href} className={`blog-card blog-card-${post.variant}`}>
                <div className="blog-card-icon">{post.icon}</div>
                <span className="tag">{post.tag}</span>
                <h4>{post.title}</h4>
                <span className="read-more">
                  Read more
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6"><path d="M5 12h14M13 5l7 7-7 7" /></svg>
                </span>
              </Link>
            ))}
          </div>
          <div style={{ textAlign: "center", marginTop: "40px" }}>
            <Link href="/blog" className="browse-all">Browse all articles →</Link>
          </div>
        </div>
      </section>

      <button
        className={`back-to-top${showBackToTop ? " visible" : ""}`}
        aria-label="Back to top"
        onClick={scrollToTop}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
          <path d="M12 19V5M5 12l7-7 7 7" />
        </svg>
      </button>

      <Footer />

      <style jsx global>{`
        .hero { padding: 76px 0 64px; position: relative; overflow: hidden; }
        .hero::before {
          content: ""; position: absolute; top: -180px; right: -160px;
          width: 520px; height: 520px; border-radius: 50%;
          background: radial-gradient(circle, rgba(124, 58, 237, 0.10), transparent 70%);
          pointer-events: none;
        }
        /* Dark-mode color overrides.
           Root cause found: globals.css had an entire legacy "HOMEPAGE
           STYLES" section reusing these same class names (.hero, .tool-card,
           etc.) with hardcoded light-only colors — e.g. .hero h1 { color:
           #1E1B4B } directly, not via a variable, so no dark-mode override
           could ever touch it. That section has been removed from
           globals.css. !important is no longer needed here as a result —
           plain specificity is enough now that there's one source of truth. */
        html[data-theme="dark"] {
          --brand-600: #9163F2;
          --brand-700: #A47DF5;
          --brand-800: #C4B0F9;
          --brand-50: #231B33;
          --green: #34D399;
          --green-50: #123027;
          --amber: #FBBF54;
          --amber-50: #332411;
          --ink: #F3F0FA;
          --ink-soft: #B3AAC7;
          --paper: #000000;
          --card: #121016;
          --card-2: #16131C;
          --line: #2A2536;
          --shadow-card: 0 1px 2px rgba(0,0,0,0.3), 0 8px 24px rgba(0,0,0,0.35);
          --shadow-card-hover: 0 4px 10px rgba(0,0,0,0.35), 0 16px 40px rgba(145,99,242,0.18);
        }
        html[data-theme="dark"] .hero::before { background: radial-gradient(circle, rgba(145, 99, 242, 0.16), transparent 70%); }
        .hero-grid { display: grid; grid-template-columns: 1.05fr 0.95fr; gap: 56px; align-items: center; position: relative; }
        .hero h1 { font-size: 48px; line-height: 1.06; font-weight: 800; margin-top: 18px; max-width: 580px; letter-spacing: -0.01em; }
        .hero h1 .accent-word { font-style: italic; font-weight: 700; color: var(--amber); }
        .hero p { font-size: 16.5px; line-height: 1.5; color: var(--ink-soft); margin: 16px 0 32px; max-width: 520px; }
        .hero-cta { display: inline-flex; align-items: center; gap: 10px; padding: 12px 24px; background: var(--brand-600); color: white; border-radius: 100px; font-weight: 600; font-size: 15px; transition: all .2s ease; }
        .hero-cta:hover { background: var(--brand-700); translate: 0 -2px; }
        .trust-row { display: flex; align-items: center; gap: 18px; margin-top: 34px; flex-wrap: wrap; }
        .trust-pill { display: flex; align-items: center; gap: 7px; font-size: 13px; color: var(--ink-soft); font-weight: 500; }
        .trust-pill svg { width: 16px; height: 16px; color: var(--green); flex-shrink: 0; }
        .hero-visual { position: relative; min-height: 420px; background: var(--card-2); border-radius: var(--radius-lg); border: 1px solid var(--line); padding: 32px; display: flex; flex-direction: column; align-items: center; justify-content: center; }

        .preview-card { background: var(--card); border: 1px solid var(--line); border-radius: var(--radius-lg); box-shadow: var(--shadow-card); overflow: hidden; width: 100%; }
        .preview-topbar { display: flex; align-items: center; justify-content: space-between; padding: 14px 18px; border-bottom: 1px solid var(--line); background: var(--brand-50); }
        .preview-topbar .title { display: flex; align-items: center; gap: 8px; font-size: 13.5px; font-weight: 600; color: var(--ink); min-width: 0; flex: 1; }
        .preview-topbar .title svg { width: 16px; height: 16px; color: var(--brand-600); }
        .live-tag { display: flex; align-items: center; gap: 6px; font-size: 11.5px; font-weight: 600; color: var(--green); background: var(--green-50); padding: 4px 10px; border-radius: 100px; }
        .live-tag .dot { width: 6px; height: 6px; border-radius: 50%; background: var(--green); animation: pulse 1.8s infinite; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }
        .preview-body { padding: 20px; }
        .preview-row-label { font-size: 12px; color: var(--ink-soft); font-weight: 500; margin-bottom: 8px; }
        .input-chip-row { display: flex; gap: 8px; margin-bottom: 18px; flex-wrap: wrap; }
        .input-chip { background: var(--paper); border: 1px solid var(--line); border-radius: var(--radius-sm); padding: 9px 12px; font-family: "DM Mono", monospace; font-size: 12.5px; color: var(--ink); }
        .preview-table { width: 100%; border-collapse: collapse; margin-top: 6px; }
        .preview-table th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--ink-soft); font-weight: 600; padding: 0 10px 8px; border-bottom: 1px solid var(--line); }
        .preview-table td { padding: 11px 10px; font-size: 13px; border-bottom: 1px solid var(--line); color: var(--ink); }
        .preview-table tr:last-child td { border-bottom: none; }
        .badge-days { background: var(--amber-50); color: var(--amber); font-family: "DM Mono", monospace; font-size: 12px; font-weight: 600; padding: 2px 8px; border-radius: 6px; }
        .preview-footer { display: flex; align-items: center; justify-content: space-between; padding: 14px 20px; border-top: 1px solid var(--line); background: var(--card-2); }
        .preview-footer .result { font-size: 12.5px; color: var(--ink-soft); }
        .preview-footer .result b { color: var(--ink); font-family: "DM Mono", monospace; font-size: 15px; }
        .mini-btn { background: var(--ink); color: var(--paper); font-size: 12.5px; font-weight: 600; padding: 8px 14px; border-radius: 100px; display: flex; align-items: center; gap: 6px; }

        @media (max-width: 960px) {
          .hero-grid { grid-template-columns: 1fr; gap: 32px; }
          .hero h1 { font-size: 38px; }
          .hero-visual { min-height: auto; }
        }

        .section-head { margin-bottom: 48px; }
        .section-head.center { text-align: center; }
        .section-head .eyebrow { margin-bottom: 12px; display: inline-flex; }
        .section-head h2 { font-size: 36px; line-height: 1.2; margin-top: 8px; }
        .section-head p { color: var(--ink-soft); font-size: 16px; line-height: 1.5; max-width: 580px; margin-top: 12px; }
        .section-head.center p { margin-left: auto; margin-right: auto; }

        .tools-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px; }
        .tool-card { background: var(--card); border: 1px solid var(--line); border-radius: var(--radius-lg); padding: 28px 24px; transition: all .2s ease; }
        .tool-card:hover { border-color: var(--brand-600); box-shadow: var(--shadow-card-hover); translate: 0 -4px; }
        .tool-card-icon { width: 48px; height: 48px; border-radius: 12px; background: var(--brand-50); color: var(--brand-600); display: flex; align-items: center; justify-content: center; margin-bottom: 16px; }
        .tool-card-icon svg { width: 24px; height: 24px; }
        .tool-card h4 { font-size: 18px; margin-bottom: 8px; }
        .tool-card p { color: var(--ink-soft); font-size: 14.5px; line-height: 1.5; margin-bottom: 20px; }
        .tool-card a { display: inline-flex; align-items: center; gap: 8px; color: var(--brand-600); font-weight: 600; font-size: 14px; padding: 8px 0; border-bottom: 2px solid transparent; transition: all .2s ease; }
        .tool-card a:hover { border-bottom-color: var(--brand-600); }

        .stats-section { padding: 0; display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; text-align: left; }
        .stat-item { display: flex; align-items: center; gap: 14px; padding: 20px; border-radius: var(--radius-lg); transition: translate .15s ease, box-shadow .15s ease; position: relative; }
        .stat-item:nth-child(1) { background: var(--brand-50); }
        .stat-item:nth-child(2) { background: var(--amber-50); }
        .stat-item:nth-child(3) { background: var(--brand-50); }
        .stat-item:hover { translate: 0 -3px; box-shadow: var(--shadow-card-hover); }
        .stat-item-icon { width: 40px; height: 40px; border-radius: 10px; background: var(--brand-50); color: var(--brand-600); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .stat-item h3 { font-size: 26px; }
        .stat-item p { color: var(--ink-soft); font-size: 13.5px; margin-top: 2px; }
        .stat-item.has-map { cursor: default; }

        .country-map-popover {
          position: absolute; top: 100%; left: 50%; transform: translate(-50%, 8px); margin-top: 4px;
          width: 340px; background: var(--card); border: 1px solid var(--line); border-radius: var(--radius-lg);
          box-shadow: var(--shadow-card-hover); padding: 16px; text-align: left; z-index: 40;
          opacity: 0; visibility: hidden; pointer-events: none; transition: opacity .2s ease, transform .2s ease;
        }
        .stat-item.has-map:hover .country-map-popover,
        .stat-item.has-map:focus-within .country-map-popover { opacity: 1; visibility: visible; transform: translate(-50%, 0); pointer-events: auto; }
        .country-map-popover::after { content: ""; position: absolute; top: 100%; left: 50%; transform: translateX(-50%); border: 7px solid transparent; border-top-color: var(--card); }
        .country-map-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
        .country-map-head span { font-size: 12.5px; font-weight: 700; color: var(--ink); text-transform: none; }
        .country-map-head small { font-size: 11px; color: var(--ink-soft); font-weight: 500; }
        .country-map-svg-wrap { width: 100%; height: 190px; background: var(--card-2); border-radius: var(--radius-sm); overflow: hidden; position: relative; }
        .country-map-svg-wrap svg { width: 100%; height: 100%; display: block; }
        .country-map-svg-wrap :global(.cm-country) { fill: var(--line); stroke: var(--card); stroke-width: .5; }
        .country-map-svg-wrap :global(.cm-country.active) { fill: var(--brand-600); cursor: pointer; transition: fill .15s ease; }
        .country-map-svg-wrap :global(.cm-country.active:hover) { fill: var(--brand-800); }
        .country-map-svg-wrap .cm-loading { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 12px; color: var(--ink-soft); }
        .country-map-popover :global(.cm-tooltip) {
          position: absolute; background: var(--ink); color: var(--paper); font-size: 11.5px; font-weight: 600;
          padding: 5px 9px; border-radius: 6px; pointer-events: none; white-space: nowrap; z-index: 50;
          opacity: 0; transition: opacity .1s ease; transform: translate(-50%, -130%);
        }
        .country-map-list { list-style: none; padding: 0; margin: 12px 0 0; display: grid; grid-template-columns: 1fr 1fr; gap: 6px 14px; }
        .country-map-list li { display: flex; align-items: center; justify-content: space-between; font-size: 12.5px; color: var(--ink-soft); padding-bottom: 5px; border-bottom: 1px dashed var(--line); }
        .country-map-list li b { color: var(--ink); font-weight: 700; }
        .country-map-note { font-size: 11px; color: var(--ink-soft); margin-top: 10px; font-style: italic; }

        @media (max-width: 768px) {
          .country-map-popover { width: 280px; }
          .country-map-list { grid-template-columns: 1fr; }
          .stats-section { grid-template-columns: 1fr; gap: 24px; }
        }

        .scenario-tab { padding: 10px 20px; border: 1px solid var(--line); border-radius: 100px; background: var(--card); font-size: 13.5px; font-weight: 600; color: var(--ink-soft); transition: all .15s ease; }
        .scenario-tab:hover { border-color: var(--brand-600); color: var(--ink); }
        .scenario-tab.active { background: var(--brand-600); border-color: var(--brand-600); color: white; }
        #scenarioWithout li::before { content: "•"; color: var(--ink-soft); margin-right: 8px; }
        #scenarioWith li::before { content: "✓"; color: var(--brand-600); font-weight: 700; margin-right: 8px; }

        @media (max-width: 768px) {
          section[style*="840px"] div[style*="grid-template-columns: 1fr 1fr"] { grid-template-columns: 1fr !important; }
        }

        .trust-section { background: var(--card); border: 1px solid var(--line); border-radius: var(--radius-lg); padding: 48px 36px; margin: 64px 0; display: grid; grid-template-columns: 1fr 1.2fr; gap: 48px; align-items: center; }
        .trust-left { text-align: center; }
        .trust-photo { width: 120px; height: 120px; border-radius: 50%; background: var(--brand-50); margin: 0 auto 20px; border: 2px solid var(--line); display: flex; align-items: center; justify-content: center; color: var(--brand-600); font-size: 48px; font-family: "Sora", sans-serif; font-weight: 700; }
        .trust-name { font-family: "Sora", sans-serif; font-size: 20px; font-weight: 700; margin-bottom: 4px; }
        .trust-title { color: var(--ink-soft); font-size: 14px; margin-bottom: 16px; }
        .trust-links { display: flex; justify-content: center; gap: 12px; }
        .trust-links a { width: 40px; height: 40px; border-radius: 50%; border: 1px solid var(--line); display: flex; align-items: center; justify-content: center; transition: all .2s ease; }
        .trust-links a:hover { border-color: var(--brand-600); background: var(--brand-50); }
        .trust-right h3 { font-size: 18px; margin-bottom: 12px; }
        .trust-right p { color: var(--ink-soft); line-height: 1.6; margin-bottom: 12px; }
        .trust-bullets { list-style: none; padding: 0; margin: 16px 0; }
        .trust-bullets li { display: flex; gap: 10px; padding: 8px 0; font-size: 14px; color: var(--ink-soft); }
        .trust-bullets li::before { content: "✓"; color: var(--green); font-weight: 700; flex-shrink: 0; }

        @media (max-width: 768px) {
          .trust-section { grid-template-columns: 1fr; gap: 24px; }
        }

        .pastel-card { border-radius: var(--radius-lg); padding: 28px; transition: translate .15s ease, box-shadow .15s ease; }
        .pastel-card:hover { translate: 0 -4px; box-shadow: var(--shadow-card-hover); }
        .pastel-card-icon { width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: 16px; color: white; }

        @media (max-width: 768px) {
          section div[style*="1fr 1fr"][style*="800px"] { grid-template-columns: 1fr !important; }
        }

        .faq-wrap { margin-top: 36px; }
        .faq-item { border-bottom: 1px solid var(--line); }
        .faq-item:last-child { border-bottom: none; }
        .faq-q { width: 100%; text-align: left; padding: 20px 0; font-size: 15.5px; font-weight: 600; color: var(--ink); display: flex; justify-content: space-between; align-items: center; transition: color .2s ease; }
        .faq-q:hover { color: var(--brand-600); }
        .faq-q svg { width: 20px; height: 20px; transition: transform .2s ease; }
        .faq-item.open .faq-q svg { transform: rotate(45deg); }
        .faq-a { max-height: 0; overflow: hidden; transition: max-height .2s ease; }
        .faq-a-inner { padding-bottom: 16px; color: var(--ink-soft); line-height: 1.6; font-size: 14.5px; }

        .blog-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 24px; margin-top: 48px; }
        .blog-card { background: var(--card); border: 1px solid var(--line); border-radius: var(--radius-lg); padding: 28px 24px; transition: all .2s ease; display: flex; flex-direction: column; }
        .blog-card:hover { border-color: var(--brand-600); box-shadow: var(--shadow-card-hover); translate: 0 -4px; }
        .blog-card-brand { background: var(--brand-50); border-color: transparent; }
        .blog-card-amber { background: var(--amber-50); border-color: transparent; }
        .blog-card-icon { width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: 16px; color: white; }
        .blog-card-brand .blog-card-icon { background: var(--brand-600); }
        .blog-card-amber .blog-card-icon { background: var(--amber); }
        .blog-card .tag { display: inline-flex; align-items: center; font-family: "DM Mono", monospace; font-size: 10.5px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; padding: 4px 10px; border-radius: 100px; background: var(--brand-50); color: var(--brand-600); width: fit-content; margin-bottom: 16px; }
        .blog-card-brand .tag, .blog-card-amber .tag { background: rgba(255, 255, 255, 0.6); }
        .blog-card h4 { font-size: 16.5px; line-height: 1.4; margin-bottom: 16px; color: var(--ink); }
        .blog-card .read-more { display: flex; align-items: center; gap: 6px; color: var(--brand-600); font-weight: 600; font-size: 13.5px; margin-top: auto; transition: all .2s ease; }
        .blog-card:hover .read-more { gap: 10px; }
        .blog-card:hover .read-more svg { transform: translateX(2px); }

        .browse-all { display: inline-flex; align-items: center; gap: 8px; color: var(--brand-600); font-weight: 600; padding: 12px 24px; border: 1px solid var(--brand-600); border-radius: 100px; transition: all .2s ease; }
        .browse-all:hover { background: var(--brand-50); }

        .back-to-top {
          position: fixed; bottom: 24px; right: 24px; z-index: 60;
          width: 48px; height: 48px; border-radius: 50%; background: var(--brand-600); color: white;
          display: flex; align-items: center; justify-content: center; box-shadow: var(--shadow-card-hover);
          opacity: 0; translate: 0 12px; pointer-events: none;
          transition: opacity .2s ease, translate .2s ease, background .15s ease;
        }
        .back-to-top:hover { background: var(--brand-700); }
        .back-to-top.visible { opacity: 1; translate: 0 0; pointer-events: auto; }
        @media (max-width: 560px) {
          .back-to-top { width: 42px; height: 42px; bottom: 18px; right: 18px; }
        }
      `}</style>
    </>
  );
}
