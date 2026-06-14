import Head from "next/head";
import Link from "next/link";
import Header from "../components/Header";
import Footer from "../components/Footer";

export default function Home() {
  return (
    <>
      <Head>
        {/* Primary */}
        <title>PayrollTool – Free Payroll Calculator for HR Teams | LOP Splitter & Salary Proration</title>
        <meta name="description" content="Free payroll tools for HR & Payroll professionals in India. LOP Splitter, Salary Proration Calculator with EPF, ESI, PT, TDS. No login. No downloads. 100% browser-based." />
        <meta name="keywords" content="payroll calculator India, LOP splitter tool, salary proration calculator, loss of pay calculator, EPF calculator, ESI calculator, payroll software free, HRMS upload tool, HR payroll tools" />
        <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
        <meta name="author" content="PayrollTool" />

        {/* Canonical */}
        <link rel="canonical" href="https://www.payrolltool.in/" />

        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://www.payrolltool.in/" />
        <meta property="og:title" content="PayrollTool – Free Payroll Tools for HR Professionals in India" />
        <meta property="og:description" content="LOP Splitter, Salary Proration Calculator with EPF/ESI/PT/TDS. Built for payroll teams. Free, fast, browser-based." />
        <meta property="og:image" content="https://www.payrolltool.in/og-image.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:site_name" content="PayrollTool" />
        <meta property="og:locale" content="en_IN" />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content="https://www.payrolltool.in/" />
        <meta name="twitter:title" content="PayrollTool – Free Payroll Tools for HR Teams" />
        <meta name="twitter:description" content="LOP Splitter, Salary Proration with EPF/ESI/PT. Free, browser-based, no login needed." />
        <meta name="twitter:image" content="https://www.payrolltool.in/og-image.png" />

        {/* Favicon */}
        <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><circle cx='12' cy='12' r='10' fill='%237C3AED'/><path d='M12 21.593c-5.63-5.539-11-10.297-11-14.402 0-3.791 3.068-5.191 5.281-5.191 1.312 0 4.151.501 5.719 4.457 1.59-3.968 4.464-4.447 5.726-4.447 2.54 0 5.274 1.621 5.274 5.181 0 4.069-5.136 8.625-11 14.402z' fill='white'/></svg>" />

        {/* Schema */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              name: "PayrollTool",
              description: "Free online payroll calculator and HRMS tools for HR professionals in India. LOP Splitter, Salary Proration with EPF, ESI, PT, TDS.",
              url: "https://payrolltool.in/",
              applicationCategory: "BusinessApplication",
              operatingSystem: "Web Browser",
              inLanguage: "en-IN",
              offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
              creator: { "@type": "Organization", name: "PayrollTool", url: "https://payrolltool.in/" },
              featureList: ["LOP Splitter", "Salary Proration Calculator", "EPF Calculator", "ESI Calculator", "PT Calculator"],
            }),
          }}
        />
        <script
  type="application/ld+json"
  dangerouslySetInnerHTML={{
    __html: JSON.stringify({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "What is LOP (Loss of Pay) in salary calculation?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Loss of Pay (LOP) refers to the salary deduction applied when an employee takes leave beyond their allotted leave balance or is absent without approval. PayrollTool's LOP Splitter helps calculate and split these deductions accurately across pay periods for HRMS uploads.",
          },
        },
        {
          "@type": "Question",
          name: "How is salary proration calculated for a mid-month joining or exit date?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Salary proration calculates an employee's pay for a partial month based on the number of days worked, using methods like calendar days or actual working days. PayrollTool's Salary Proration Calculator supports multiple proration methods with EPF, ESI, PT, and TDS considerations.",
          },
        },
        {
          "@type": "Question",
          name: "What is a PF ECR file and why is it needed?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "PF ECR (Electronic Challan cum Return) is the standard file format required by EPFO for monthly Provident Fund contribution filings. PayrollTool's PF ECR Generator creates EPFO-compliant ECR files instantly for bulk employee processing.",
          },
        },
        {
          "@type": "Question",
          name: "Is PayrollTool free to use?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes, all PayrollTool calculators including the LOP Splitter, Salary Proration Calculator, and PF ECR Generator are completely free, browser-based, and require no sign-up or downloads.",
          },
        },
        {
          "@type": "Question",
          name: "Do I need to create an account to use these tools?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "No account or login is required. All PayrollTool calculators run directly in your browser, and your data is processed locally without being uploaded to any server.",
          },
        },
      ],
    }),
  }}
/>
      </Head>


      <Header />     

      {/* HERO */}
      <section className="hero" id="home">
        <div className="hero-inner">
          <div className="badge">SMART PAYROLL. ZERO HEADACHE.</div>
          <h1>Payroll tools that just <em>make sense.</em></h1>
          <p>Powerful, accurate and fast payroll utilities designed for HR & Payroll professionals. Do precise work in less time. Every time.</p>
          <div className="hero-cta">
            <Link href="/lop-splitter" className="btn-primary">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <rect x="3" y="3" width="18" height="18" rx="2" /><line x1="9" y1="9" x2="15" y2="15" />
                <line x1="15" y1="9" x2="9" y2="15" />
              </svg>
              Explore Tools
            </Link>
            <Link href="#tools" className="btn-secondary">Learn More</Link>
          </div>
          <div className="benefits">
            <div className="benefit-item"><span className="benefit-icon">🔒</span> 100% Secure</div>
            <div className="benefit-item"><span className="benefit-icon">⚡</span> Browser Based</div>
            <div className="benefit-item"><span className="benefit-icon">💾</span> Your Data, Your Control</div>
          </div>
        </div>
      </section>

      {/* TOOLS SECTION */}
      <section id="tools">
        <div className="container">
          <p className="section-sub">One platform. Many powerful tools. Built by someone who&apos;s been in your shoes.</p>

          <div className="tools-grid">

            {/* LOP SPLITTER */}
            <div className="tool-card">
              <div className="tool-icon">📊</div>
              <div className="tool-badge">● Live</div>
              <h3 className="tool-name">LOP Splitter</h3>
              <p className="tool-desc">Split Loss of Pay for multiple date ranges in seconds. HRMS upload ready.</p>
              <ul className="tool-features">
                <li>Capped to month boundaries</li>
                <li>DOJ & DOL aware</li>
                <li>Decimal day support</li>
                <li>Observation report</li>
              </ul>
              <Link href="/lop-splitter" className="tool-btn">Try Now →</Link>
            </div>

            {/* SALARY PRORATION */}
            <div className="tool-card">
              <div className="tool-icon">💰</div>
              <div className="tool-badge">● Live</div>
              <h3 className="tool-name">Salary Proration Calculator</h3>
              <p className="tool-desc">Calculate precise salary for partial months, mid-month joining or exit.</p>
              <ul className="tool-features">
                <li>PDF appointment letter upload</li>
                <li>Auto-extract pay heads</li>
                <li>Fully editable structure</li>
                <li>3 proration methods</li>
              </ul>
              <Link href="/salary-proration" className="tool-btn">Try Now →</Link>
            </div>

            {/* PF ECR CREATOR */}
            <div className="tool-card">
              <div className="tool-icon">📋</div>
              <div className="tool-badge">● Live</div>
              <h3 className="tool-name">PF ECR File Generator</h3>
              <p className="tool-desc">Generate PF ECR files instantly. Perfect format, EPFO compliant.</p>
              <ul className="tool-features">
                <li>Bulk employee processing</li>
                <li>EPFO standard format</li>
                <li>Auto-validation</li>
                <li>Download ready</li>
              </ul>
              <Link href="/pf-ecr-creator" className="tool-btn">Try Now →</Link>
            </div>

            {/* FINAL SETTLEMENT */}
            <div className="tool-card">
              <div className="tool-icon">✅</div>
              <div className="tool-badge coming">○ Coming Soon</div>
              <h3 className="tool-name">Final Settlement Calculator</h3>
              <p className="tool-desc">Full & final settlement computation. Gratuity, notice, arrears in one place.</p>
              <ul className="tool-features">
                <li>Gratuity calculation</li>
                <li>Notice period recovery</li>
                <li>Leave encashment</li>
                <li>Compliance ready</li>
              </ul>
              <button className="tool-btn coming">Coming Soon</button>
            </div>

            {/* NOTICE RECOVERY */}
            <div className="tool-card">
              <div className="tool-icon">⏱️</div>
              <div className="tool-badge coming">○ Coming Soon</div>
              <h3 className="tool-name">Notice Recovery Calculator</h3>
              <p className="tool-desc">Calculate notice pay recovery with accuracy and ease.</p>
              <ul className="tool-features">
                <li>Short notice recovery</li>
                <li>Legal compliance</li>
                <li>Instant calculation</li>
                <li>Report generation</li>
              </ul>
              <button className="tool-btn coming">Coming Soon</button>
            </div>

          </div>
        </div>
      </section>

      {/* WHY PAYROLLTOOL */}
      <section className="why-section" id="about">
        <div className="container">
          <p className="section-sub">Built with the real needs of payroll and HR teams in mind.</p>
          <div className="why-grid">
            <div className="why-item">
              <div className="why-icon">🔒</div>
              <h3 className="why-title">Private & Secure</h3>
              <p className="why-text">Your files never leave your device. All processing happens in your browser.</p>
            </div>
            <div className="why-item">
              <div className="why-icon">⚡</div>
              <h3 className="why-title">Fast & Accurate</h3>
              <p className="why-text">Built for precision. Calculations you can trust. Every time.</p>
            </div>
            <div className="why-item">
              <div className="why-icon">👤</div>
              <h3 className="why-title">Payroll Expert Built</h3>
              <p className="why-text">Real-world experience. Real solutions. Built by someone in your shoes.</p>
            </div>
            <div className="why-item">
              <div className="why-icon">❤️</div>
              <h3 className="why-title">Made for Humans</h3>
              <p className="why-text">No clutter. No fluff. Just what you need. Clear and simple.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA SECTION */}
      <div className="container">
        <div className="cta-section">
          <h2>Ready to save time on payroll?</h2>
          <p>Start with LOP Splitter or Salary Proration. No sign-up. No credit card. No downloads.</p>
          <Link href="/lop-splitter" className="btn-white">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
            Get Started Now
          </Link>
        </div>
      </div>

<Footer />
    </>
  );
}
