import Head from "next/head";
import Link from "next/link";
import Header from "../components/Header";
import Footer from "../components/Footer";

export default function About() {
  return (
    <>
      <Head>
        <title>About - PayrollTool.in | Built by a Payroll Compliance Professional</title>
        <meta name="description" content="The story behind PayrollTool.in - payroll calculators for PF ECR, salary proration, tax, LOP and final settlement, built from 8+ years of hands-on Indian payroll compliance experience." />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://www.payrolltool.in/about" />
        <meta name="theme-color" content="#7C3AED" />

        <meta property="og:type" content="profile" />
        <meta property="og:site_name" content="PayrollTool.in" />
        <meta property="og:title" content="About - PayrollTool.in | Built by a Payroll Compliance Professional" />
        <meta property="og:description" content="The story behind PayrollTool.in - payroll calculators built from 8+ years of hands-on Indian payroll compliance experience." />
        <meta property="og:url" content="https://www.payrolltool.in/about" />
        <meta property="og:locale" content="en_IN" />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="About - PayrollTool.in" />
        <meta name="twitter:description" content="The story behind PayrollTool.in - built from 8+ years of hands-on Indian payroll compliance experience." />

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "BreadcrumbList",
              itemListElement: [
                { "@type": "ListItem", position: 1, name: "Home", item: "https://www.payrolltool.in/" },
                { "@type": "ListItem", position: 2, name: "About", item: "https://www.payrolltool.in/about" },
              ],
            }),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "AboutPage",
              mainEntity: {
                "@type": "Person",
                name: "Tushar Arora",
                jobTitle: "Payroll Compliance Expert",
                description: "8+ years of payroll compliance experience across EPF, ESI, PT, LWF, NPS and TDS. Founder of PayrollTool.in.",
                knowsAbout: ["Payroll Compliance", "EPF", "ESI", "Professional Tax", "TDS", "Indian Labour Law"],
              },
            }),
          }}
        />
      </Head>

      <Header />

      <section className="hero" style={{ padding: "64px 0 48px" }}>
        <div className="wrap">
          <span className="eyebrow"><span className="dot" />About</span>
          <h1 style={{ fontSize: "40px", maxWidth: "680px", marginTop: "16px" }}>
            A payroll professional, tired of tools that get compliance wrong, <span className="accent-word">built his own</span>.
          </h1>
          <p style={{ fontSize: "16.5px", lineHeight: 1.6, color: "var(--ink-soft)", maxWidth: "620px", marginTop: "18px" }}>
            PayrollTool.in is a browser-based suite of calculators for Indian HR and payroll teams.
          </p>
        </div>
      </section>

      <section style={{ padding: "16px 0 64px" }}>
        <div className="wrap" style={{ maxWidth: "760px" }}>

          <div style={{
            display: "flex", gap: "20px", alignItems: "center", padding: "28px",
            background: "var(--card)", border: "1px solid var(--line)", borderRadius: "var(--radius-lg)",
            boxShadow: "var(--shadow-card)", marginBottom: "56px",
          }}>
            <div className="trust-photo" style={{ width: "88px", height: "88px", fontSize: "34px", margin: 0, flexShrink: 0 }}>TA</div>
            <div>
              <div className="trust-name" style={{ fontSize: "22px" }}>Tushar Arora</div>
              <div className="trust-title" style={{ marginBottom: 0 }}>Payroll Compliance Professional · Founder, PayrollTool.in</div>
              <div className="trust-links" style={{ display: "flex", justifyContent: "flex-start", gap: "10px", marginTop: "10px" }}>
                <a href="mailto:support@payrolltool.in" aria-label="Email">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 4h16v16H4z" /><path d="M4 6l8 7 8-7" />
                  </svg>
                </a>
                <a href="https://www.linkedin.com/in/tushararorafna/" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="9" width="4" height="12" /><circle cx="4" cy="4" r="2" />
                    <path d="M10 21v-7a3 3 0 0 1 6 0v7M10 9v12" />
                  </svg>
                </a>
                <a href="https://x.com/TusharArora89" target="_blank" rel="noopener noreferrer" aria-label="X (Twitter)">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.9 2H22l-7.6 8.7L23.3 22H16.6l-5.2-6.8L5.4 22H2.3l8.1-9.3L1.3 2h6.9l4.7 6.2L18.9 2Zm-1.2 18h1.7L7.4 3.9H5.6L17.7 20Z" />
                  </svg>
                </a>
              </div>
            </div>
          </div>

          <h2 style={{ fontSize: "26px", marginBottom: "16px" }}>Why this exists</h2>
          <p style={{ color: "var(--ink-soft)", lineHeight: 1.7, fontSize: "15.5px", marginBottom: "20px" }}>
            I&apos;ve spent 8+ years in the weeds of Indian payroll compliance - EPF, ESI, Professional Tax, LWF, NPS, and TDS - working hands-on with statutory payroll across multiple client accounts, and closely with product, testing, and development teams when a payroll calculation needs to behave correctly across real employee data.
          </p>
          <p style={{ color: "var(--ink-soft)", lineHeight: 1.7, fontSize: "15.5px", marginBottom: "20px" }}>
            Over time, the same small problems kept coming up. Someone would need a quick salary-proration check, an LOP split, a final-settlement calculation or a payroll file in the right format, and the fastest option was often another spreadsheet, another formula, or another online calculator that didn&apos;t quite match how the payroll actually worked.
          </p>
          <p style={{ color: "var(--ink-soft)", lineHeight: 1.7, fontSize: "15.5px", marginBottom: "20px" }}>
            So the tools here were built to solve that directly. Take the rules and edge cases that matter in real payroll work, and turn them into small, focused utilities that are easy to use when you need them.
          </p>
          <p style={{ color: "var(--ink-soft)", lineHeight: 1.7, fontSize: "15.5px", marginBottom: "20px" }}>
            PayrollTool.in is not an HRMS, and it&apos;s not trying to replace one. It&apos;s a collection of practical payroll tools, built from hands-on payroll experience, for the people who actually have to get these calculations right.
          </p>

          <h2 style={{ fontSize: "26px", margin: "48px 0 16px" }}>What&apos;s live today</h2>
          <ul className="trust-bullets" style={{ margin: "0 0 20px" }}>
            <li><Link href="/pf-ecr-creator" style={{ color: "var(--brand-600)", fontWeight: 600 }}>PF ECR Creator</Link> - prepares ECR files for upload to the EPFO Unified Portal</li>
            <li><Link href="/tax-calculator" style={{ color: "var(--brand-600)", fontWeight: 600 }}>Tax Regime Calculator</Link> - compares Old vs New regime for FY 2026‑27</li>
            <li><Link href="/salary-proration" style={{ color: "var(--brand-600)", fontWeight: 600 }}>Salary Proration Calculator</Link> - handles mid-month joining and exit, state-wise PT, EPF ceiling</li>
            <li><Link href="/lop-splitter" style={{ color: "var(--brand-600)", fontWeight: 600 }}>LOP Splitter</Link> - loss-of-pay calculations across month boundaries</li>
            <li><Link href="/final-settlement" style={{ color: "var(--brand-600)", fontWeight: 600 }}>Final Settlement Calculator</Link> - gratuity, notice pay, leave encashment, and deductions in one place</li>
          </ul>

          <h2 style={{ fontSize: "26px", margin: "48px 0 16px" }}>How it&apos;s built</h2>
          <p style={{ color: "var(--ink-soft)", lineHeight: 1.7, fontSize: "15.5px", marginBottom: "20px" }}>
            Every calculator is designed to process your payroll data in your browser. Your uploaded files are not sent to PayrollTool.in&apos;s servers for calculation. The statutory logic used by each calculator is based on the applicable rules and is reviewed as those rules change.
          </p>

          <div style={{
            marginTop: "56px", padding: "28px", background: "var(--brand-50)",
            borderRadius: "var(--radius-lg)", textAlign: "center",
          }}>
            <h3 style={{ fontSize: "19px", marginBottom: "10px" }}>Have a calculator you wish existed?</h3>
            <p style={{ color: "var(--ink-soft)", fontSize: "14.5px", marginBottom: "18px" }}>Tell me what&apos;s missing - I read every message.</p>
            <a
              href="mailto:support@payrolltool.in"
              className="hero-cta"
              style={{ display: "inline-flex" }}
            >
              Get in touch
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M5 12h14M13 5l7 7-7 7" /></svg>
            </a>
          </div>

        </div>
      </section>

      <Footer />

      <style jsx global>{`
        .hero { position: relative; overflow: hidden; }
        .hero h1 .accent-word { font-style: italic; font-weight: 700; color: var(--amber); }
        .hero-cta { display: inline-flex; align-items: center; gap: 10px; padding: 12px 24px; background: var(--brand-600); color: white; border-radius: 100px; font-weight: 600; font-size: 15px; transition: all .2s ease; }
        .hero-cta:hover { background: var(--brand-700); translate: 0 -2px; }

        .trust-photo {
          border-radius: 50%; background: var(--brand-50); border: 2px solid var(--line);
          display: flex; align-items: center; justify-content: center; color: var(--brand-600);
          font-family: "Sora", sans-serif; font-weight: 700;
        }
        .trust-name { font-family: "Sora", sans-serif; font-weight: 700; margin-bottom: 4px; }
        .trust-title { color: var(--ink-soft); font-size: 14px; }
        .trust-links a {
          width: 36px; height: 36px; border-radius: 50%; border: 1px solid var(--line);
          display: flex; align-items: center; justify-content: center; transition: all .2s ease;
        }
        .trust-links a:hover { border-color: var(--brand-600); background: var(--brand-50); color: var(--brand-600); }
        .trust-bullets { list-style: none; padding: 0; margin: 16px 0; }
        .trust-bullets li { display: flex; gap: 10px; padding: 8px 0; font-size: 15px; color: var(--ink-soft); }

        @media (max-width: 768px) {
          .hero h1 { font-size: 30px !important; }
        }
      `}</style>
    </>
  );
}
