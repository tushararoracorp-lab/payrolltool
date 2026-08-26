import Head from "next/head";
import Link from "next/link";
import { useState } from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";

const faqGroups = [
  {
    title: "Trust & data",
    items: [
      { q: "Does PayrollTool.in upload or store my employee data?", a: "PayrollTool.in's calculators are designed to process uploaded files in your browser. The payroll data used for a calculation is not sent to PayrollTool.in's servers for calculation." },
      { q: "Do I need to create an account?", a: "No. There's no sign-up or login. Open a tool and start using it immediately." },
      { q: "Does PayrollTool.in send my payroll data to third-party services?", a: "Payroll data entered into the calculators is processed in your browser and is not sent to PayrollTool.in's servers for calculation." },
      {
        q: "Who actually built this?",
        a: "PayrollTool.in is built and maintained by Tushar Arora, a payroll compliance professional with 8+ years of hands-on Indian payroll experience.",
        content: (
          <>
            PayrollTool.in is built and maintained by Tushar Arora, a payroll compliance professional with 8+ years of hands-on Indian payroll experience. Read the full story on the{" "}
            <Link href="/about" style={{ color: "var(--brand-600)", fontWeight: 600 }}>About page</Link>.
          </>
        ),
      },
    ],
  },
  {
    title: "Using the tools",
    items: [
      { q: "What file formats are supported?", a: "Supported formats depend on the calculator. Each calculator page clearly shows its accepted input and output formats." },
      { q: "Is PayrollTool.in an HRMS?", a: "No. PayrollTool.in is a collection of focused payroll utilities. It helps with specific calculations and file-generation tasks alongside the HRMS or payroll system you already use." },
      { q: "Can the tools handle bulk employee data?", a: "Some tools support bulk, multi-employee files. Performance depends on the calculator, file size and device, since processing happens in the browser. They're utilities, not an enterprise HRMS." },
      { q: "Does the Salary Proration Calculator handle state-wise Professional Tax?", a: "Yes, for the states currently supported by the calculator. It applies the relevant state-wise PT logic together with the other rules it supports - check the calculator itself for the current supported-state list." },
      { q: "Do the tools work on mobile?", a: "Yes, the site is responsive. However, file-heavy workflows such as bulk payroll uploads are generally easier to review on a larger screen." },
    ],
  },
  {
    title: "Compliance & accuracy",
    items: [
      { q: "Which financial year are the calculators based on?", a: "The current calculators are built for FY 2026-27, where a financial-year rule set applies. The applicable year or rule set is shown on each calculator where relevant." },
      { q: "How do you keep calculations current?", a: "Applicable tax, EPF, ESI and Professional Tax rules are reviewed when rules change. The calculators are currently maintained for FY 2026-27. If a material rule changes, the affected calculator is updated after the change is confirmed." },
      { q: "Are these calculators a substitute for professional payroll or tax advice?", a: "No. They're calculators, not consultants. For unusual cases, disputes, statutory filings, or situations where the applicable rule is unclear, confirm the treatment with your qualified adviser or compliance team." },
      { q: "Can I rely on PayrollTool.in for statutory filing?", a: "PayrollTool.in can help prepare or check calculations and supported files, but it does not replace your organisation's payroll review, approval, or statutory-filing process. Always review outputs before submission." },
    ],
  },
  {
    title: "Cost & support",
    items: [
      { q: "Are the calculators free?", a: "Core calculators are free to use today. If a future feature becomes paid, the pricing will be shown clearly before use." },
      {
        q: "I found a calculation issue. What should I do?",
        a: "Email support@payrolltool.in with the calculator name, the issue you found, and enough information to reproduce it. Please don't send employee personal data unless it's specifically requested and appropriate.",
        content: (
          <>
            Email <a href="mailto:support@payrolltool.in" style={{ color: "var(--brand-600)", fontWeight: 600 }}>support@payrolltool.in</a> with the calculator name, the issue you found, and enough information to reproduce it. Please don&apos;t send employee personal data unless it&apos;s specifically requested and appropriate.
          </>
        ),
      },
      {
        q: "Can I request a new calculator?",
        a: "Yes. Email support@payrolltool.in and describe what you're trying to calculate, what inputs you have, and where the current process becomes difficult. Product requests are reviewed alongside bug reports.",
        content: (
          <>
            Yes. Email <a href="mailto:support@payrolltool.in" style={{ color: "var(--brand-600)", fontWeight: 600 }}>support@payrolltool.in</a> and describe what you&apos;re trying to calculate, what inputs you have, and where the current process becomes difficult. Product requests are reviewed alongside bug reports.
          </>
        ),
      },
    ],
  },
];

const allQuestions = faqGroups.flatMap((g) => g.items);

export default function Faq() {
  const [openIndex, setOpenIndex] = useState(null);
  let runningIndex = -1;

  return (
    <>
      <Head>
        <title>FAQ &#8212; PayrollTool.in | Answers About Data, Accuracy &amp; Tools</title>
        <meta name="description" content="Answers to common questions about PayrollTool.in's calculators - data privacy, accuracy, supported file formats, and pricing." />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://www.payrolltool.in/faq" />
        <meta name="theme-color" content="#7C3AED" />

        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="PayrollTool.in" />
        <meta property="og:title" content="FAQ - PayrollTool.in" />
        <meta property="og:description" content="Answers to common questions about PayrollTool.in's calculators - data privacy, accuracy, supported file formats, and pricing." />
        <meta property="og:url" content="https://www.payrolltool.in/faq" />
        <meta property="og:locale" content="en_IN" />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="FAQ - PayrollTool.in" />
        <meta name="twitter:description" content="Answers to common questions about PayrollTool.in's calculators - data privacy, accuracy, supported file formats, and pricing." />

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "BreadcrumbList",
              itemListElement: [
                { "@type": "ListItem", position: 1, name: "Home", item: "https://www.payrolltool.in/" },
                { "@type": "ListItem", position: 2, name: "FAQ", item: "https://www.payrolltool.in/faq" },
              ],
            }),
          }}
        />
        {/* FAQ schema - must exactly match the 16 accordion questions below.
            The intro block ("What is PayrollTool.in?") is deliberately
            excluded - it's not presented as a clickable FAQ item, so
            including it here would be the same schema/visible mismatch
            that was fixed once already on this project. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: allQuestions.map((item) => ({
                "@type": "Question",
                name: item.q,
                acceptedAnswer: { "@type": "Answer", text: item.a },
              })),
            }),
          }}
        />
      </Head>

      <Header />

      <section className="hero" style={{ padding: "56px 0 8px" }}>
        <div className="wrap">
          <span className="eyebrow"><span className="dot" />Support</span>
          <h1 style={{ fontSize: "38px", maxWidth: "600px", marginTop: "16px" }}>
            Questions, answered <span className="accent-word">plainly</span>
          </h1>
          <p style={{ fontSize: "16px", color: "var(--ink-soft)", maxWidth: "560px", marginTop: "14px" }}>
            Everything people usually ask before trusting a payroll calculator with real numbers.
          </p>
        </div>
      </section>

      <section style={{ padding: "24px 0 12px" }}>
        <div className="wrap" style={{ maxWidth: "760px" }}>
          <div style={{ background: "var(--brand-50)", borderRadius: "var(--radius-lg)", padding: "32px 36px" }}>
            <h2 style={{ fontSize: "22px", marginBottom: "14px" }}>What is PayrollTool.in?</h2>
            <p style={{ color: "var(--ink)", fontSize: "15px", lineHeight: 1.7, marginBottom: "16px" }}>
              PayrollTool.in is a free, browser-based suite of payroll calculators built specifically for Indian HR and payroll professionals. It was created to replace the spreadsheets, manual formulas, and error-prone online calculators that most payroll teams in India rely on - with tools that are checked against real statutory rules and updated for the current financial year.
            </p>
            <p style={{ color: "var(--ink)", fontSize: "15px", lineHeight: 1.7, marginBottom: "16px" }}>
              The suite currently covers five of the most common payroll calculations in India: a <strong>PF ECR Creator</strong> that prepares files for upload to the EPFO Unified Portal, a <strong>Tax Regime Calculator</strong> that compares Old vs New income tax regimes for FY 2026‑27, a <strong>Salary Proration Calculator</strong> for mid-month joining and exit cases (including state-wise Professional Tax and the EPF wage ceiling), a <strong>LOP Splitter</strong> for Loss of Pay calculations across month boundaries, and a <strong>Final Settlement Calculator</strong> covering gratuity, notice pay, and leave encashment.
            </p>
            <p style={{ color: "var(--ink)", fontSize: "15px", lineHeight: 1.7, marginBottom: 0 }}>
              Every calculator runs entirely in your browser - no employee data is uploaded to any server, no account is required, and there&apos;s no cost to use the core tools. PayrollTool.in is built and maintained by a single payroll compliance professional with 8+ years of hands-on experience in Indian statutory payroll (EPF, ESI, Professional Tax, LWF, NPS, and TDS), not by a generic software team - the goal is to turn recurring, error-prone payroll calculations into small, reliable tools that get the compliance details right the first time.
            </p>
          </div>
        </div>
      </section>

      <section style={{ padding: "24px 0 76px" }}>
        <div className="wrap" style={{ maxWidth: "760px" }}>
          {faqGroups.map((group) => (
            <div key={group.title}>
              <div className="section-head" style={{ marginBottom: "16px" }}>
                <h2 style={{ fontSize: "20px" }}>{group.title}</h2>
              </div>
              <div className="faq-wrap" style={{ marginTop: 0, marginBottom: "48px" }}>
                {group.items.map((item) => {
                  runningIndex += 1;
                  const idx = runningIndex;
                  const isOpen = openIndex === idx;
                  return (
                    <div className={`faq-item${isOpen ? " open" : ""}`} key={item.q}>
                      <button
                        className="faq-q"
                        aria-expanded={isOpen}
                        onClick={() => setOpenIndex(isOpen ? null : idx)}
                      >
                        {item.q}
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M12 5v14M5 12h14" /></svg>
                      </button>
                      <div className="faq-a" style={{ maxHeight: isOpen ? "320px" : "0" }}>
                        <div className="faq-a-inner">{item.content || item.a}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      <Footer />

      <style jsx global>{`
        .hero { position: relative; overflow: hidden; }
        .hero h1 .accent-word { font-style: italic; font-weight: 700; color: var(--amber); }

        .faq-wrap { margin-top: 36px; }
        .faq-item { border-bottom: 1px solid var(--line); }
        .faq-item:last-child { border-bottom: none; }
        .faq-q { width: 100%; text-align: left; padding: 20px 0; font-size: 15.5px; font-weight: 600; color: var(--ink); display: flex; justify-content: space-between; align-items: center; transition: color .2s ease; }
        .faq-q:hover { color: var(--brand-600); }
        .faq-q svg { width: 20px; height: 20px; transition: transform .2s ease; flex-shrink: 0; margin-left: 16px; }
        .faq-item.open .faq-q svg { transform: rotate(45deg); }
        .faq-a { max-height: 0; overflow: hidden; transition: max-height .2s ease; }
        .faq-a-inner { padding-bottom: 16px; color: var(--ink-soft); line-height: 1.6; font-size: 14.5px; }

        @media (max-width: 768px) {
          .hero h1 { font-size: 28px !important; }
        }
      `}</style>
    </>
  );
}
