import Head from "next/head";
import Link from "next/link";
import { useEffect, useRef } from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { CSS } from "../lib/compliance-calendar/styles";
import { APP_HTML } from "../lib/compliance-calendar/markup";
import { NO_PT, FY_LABEL } from "../lib/compliance-calendar/data";

const PAGE_URL = "https://www.payrolltool.in/compliance-calendar";
const TITLE = "Payroll Compliance Calendar FY 2026-27 - EPF, ESI, TDS, PT and LWF Due Dates";
const DESCRIPTION =
  "Every EPF, ESI, TDS, professional tax and LWF due date for FY 2026-27 in one free calendar. Pick your states, set reminders and download a printable wall calendar.";

const FAQ = [
  {
    q: "What are the EPF and ESI due dates?",
    a: "The EPF contribution and ECR, and the ESI contribution, are due by the 15th of the following month. October wages are due by 15 November.",
    more: (
      <>
        Prepare the files with the{" "}
        <Link prefetch={false} href="/pf-ecr-creator">PF ECR Creator</Link> and the{" "}
        <Link prefetch={false} href="/esic-mc-creator">ESI File Creator</Link>.
      </>
    ),
  },
  {
    q: "When is TDS on salary deposited?",
    a: "By the 7th of the following month. Tax deducted in March is deposited by 30 April (Income-tax Rules, 2026, rule 218).",
    more: (
      <>
        Work out the tax with the <Link prefetch={false} href="/tax-calculator">Tax Calculator</Link>.
      </>
    ),
  },
  {
    q: "What are the salary TDS return due dates for FY 2026-27?",
    a: "Form 138, which replaces Form 24Q, is due on 31 July, 31 October, 31 January and 31 May (Income-tax Rules, 2026, rule 219).",
  },
  {
    q: "What if a due date falls on a Saturday or Sunday?",
    a: "The calendar lists weekend due dates in a note for that month. Complete the payment or filing before the due date to avoid penalty and interest.",
  },
  {
    q: "Which states do not levy professional tax?",
    a: `${NO_PT.join(", ")}. Odisha abolished professional tax from 1 April 2026, and Punjab levies the State Development Tax instead.`,
    more: (
      <>
        See rates and changes by state in <Link prefetch={false} href="/updates/professional-tax">Professional Tax updates</Link>.
      </>
    ),
  },
  {
    q: "When is Labour Welfare Fund paid?",
    a: "Most states collect it twice a year, around July and January. Some collect it once a year: Haryana and Tamil Nadu by 31 December, and Karnataka by 15 January. Pick your state above to see its exact dates.",
    more: (
      <>
        See rates and changes by state in <Link prefetch={false} href="/updates/labour-welfare-fund">Labour Welfare Fund updates</Link>.
      </>
    ),
  },
  {
    q: "How do the reminders work?",
    a: "Schedule reminders creates one calendar file with the dates you picked. Choose how many days before and at what time, then open the file in Google Calendar, Outlook or Apple Calendar.",
  },
  {
    q: "Where are my choices saved?",
    a: "Your topics, states and own events are stored only in this browser.",
  },
];

export default function ComplianceCalendarPage() {
  const hostRef = useRef(null);

  useEffect(() => {
    const host = hostRef.current;
    let stop = null;
    let alive = true;
    import("../lib/compliance-calendar/app").then(({ startCalendar }) => {
      if (!alive) return;
      stop = startCalendar();
    });
    return () => {
      alive = false;
      if (stop) stop();
      host.innerHTML = APP_HTML; // fresh markup drops the old listeners (React strict mode runs effects twice in dev)
    };
  }, []);

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: FAQ.map(({ q, a }) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: "https://www.payrolltool.in/" },
        { "@type": "ListItem", position: 2, name: "Compliance calendar", item: PAGE_URL },
      ],
    },
  ];

  return (
    <>
      <Head>
        <title>{TITLE}</title>
        <meta name="description" content={DESCRIPTION} />
        <link rel="canonical" href={PAGE_URL} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={TITLE} />
        <meta property="og:description" content={DESCRIPTION} />
        <meta property="og:url" content={PAGE_URL} />
        <meta name="twitter:card" content="summary" />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      </Head>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <Header />

      <div className="ptcal">
        <main className="wrap">
          <section className="intro">
            <h1>
              Payroll compliance calendar <span>{FY_LABEL}</span>
            </h1>
            <p>
              Choose what you handle and your states, add them to the calendar, then schedule reminders in your own calendar app. April 2026 to March 2027.
            </p>
          </section>

          <div ref={hostRef} dangerouslySetInnerHTML={{ __html: APP_HTML }} />

          <section className="seo">
            <h2>Frequently asked questions</h2>
            <div className="seo-faq">
              {FAQ.map(({ q, a, more }) => (
                <details key={q}>
                  <summary>{q}</summary>
                  <p>{a}</p>
                  {more && <p className="faq-more">{more}</p>}
                </details>
              ))}
            </div>
          </section>
        </main>
      </div>

      <Footer />

      <style jsx>{`
        .seo { margin: 40px 0 24px; }
        .seo h2 { font-size: 22px; margin: 32px 0 12px; }
        .seo-faq details { background: var(--card); border: 1px solid var(--line); border-radius: 12px; padding: 12px 14px; }
        .seo-faq summary { cursor: pointer; font-weight: 600; }
        .seo-note { font-size: 14px; color: var(--ink-soft); margin: 12px 0; }
        .seo-faq { display: grid; gap: 8px; }
        .seo-faq p { margin: 8px 0 0; font-size: 14px; }
        .seo-faq .faq-more { margin-top: 6px; color: var(--ink-soft); }
      `}</style>
    </>
  );
}
