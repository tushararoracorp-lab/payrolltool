import Head from "next/head";
import Link from "next/link";
import { useEffect, useRef } from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { CSS } from "../lib/compliance-calendar/styles";
import { APP_HTML } from "../lib/compliance-calendar/markup";
import { buildFor, userBasis, STATES, FYM, MONTHS, DOW, NO_PT, NO_LWF, parse, FY_LABEL } from "../lib/compliance-calendar/data";

const PAGE_URL = "https://www.payrolltool.in/compliance-calendar";
const TITLE = "Payroll Compliance Calendar FY 2026-27 - EPF, ESI, TDS, PT and LWF Due Dates";
const DESCRIPTION =
  "Every EPF, ESI, TDS, professional tax and LWF due date for FY 2026-27 in one free calendar. Pick your states, set reminders and download a printable wall calendar.";
const UPDATED = "29 October 2026";

const FAQ = [
  {
    q: "What are the EPF and ESI due dates?",
    a: "The EPF contribution and ECR, and the ESI contribution, are due by the 15th of the following month. October wages are due by 15 November.",
  },
  {
    q: "When is TDS on salary deposited?",
    a: "By the 7th of the following month. Tax deducted in March is deposited by 30 April (Income-tax Rules, 2026, rule 218).",
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

export async function getStaticProps() {
  const fmt = (k) => {
    const d = parse(k);
    return { day: d.getDate(), dow: DOW[d.getDay()] };
  };
  const central = ["epf", "esi", "tds"].flatMap((t) => buildFor(t, "IN"));
  const months = FYM.map(({ y, m }) => ({
    label: `${MONTHS[m]} ${y}`,
    items: central
      .filter((e) => e.date.slice(0, 7) === `${y}-${String(m + 1).padStart(2, "0")}`)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((e) => ({ date: e.date, ...fmt(e.date), title: e.title })),
  }));
  const states = STATES.map((s) => {
    const sections = [
      ["Professional Tax", buildFor("pt", s)],
      ["Labour Welfare Fund", buildFor("lwf", s)],
    ]
      .filter(([, ev]) => ev.length)
      .map(([label, ev]) => ({
        label,
        basis: userBasis(ev[0]) || "",
        items: ev
          .slice()
          .sort((a, b) => a.date.localeCompare(b.date))
          .map((e) => {
            const d = parse(e.date);
            return { date: e.date, text: `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`, title: e.title };
          }),
      }));
    return { state: s, sections };
  }).filter((x) => x.sections.length);
  return { props: { months, states, noLwf: NO_LWF } };
}

export default function ComplianceCalendarPage({ months, states, noLwf }) {
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

          <p className="disc">
            Last updated {UPDATED}. Due dates are general rules and can change by notification, extension or holiday. This is information, not legal or tax advice.
          </p>

          <section className="seo">
            <h2>EPF, ESI and TDS due dates {FY_LABEL}</h2>
            <div className="seo-months">
              {months.map((mo) => (
                <div key={mo.label} className="seo-m">
                  <h3>{mo.label}</h3>
                  <ul>
                    {mo.items.map((it) => (
                      <li key={it.date + it.title}>
                        <b>
                          {it.day} {it.dow}
                        </b>{" "}
                        {it.title}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <h2>Professional Tax and LWF due dates by state</h2>
            <p className="seo-note">
              Each state sets its own dates. Open a state to see every due date for {FY_LABEL} and the law it comes from. For slabs and rates, read the{" "}
              <Link prefetch={false} href="/blog/professional-tax-india-state-wise-guide">
                state-wise professional tax guide
              </Link>
              .
            </p>
            {states.map((st) => (
              <details key={st.state} className="seo-st">
                <summary>
                  {st.state}: {st.sections.map((s) => s.label).join(" and ")}
                </summary>
                {st.sections.map((sec) => (
                  <div key={sec.label} className="seo-sec">
                    <h3>
                      {st.state} {sec.label}
                    </h3>
                    {sec.basis && <p className="seo-basis">Basis: {sec.basis}</p>}
                    <ul>
                      {sec.items.map((it) => (
                        <li key={it.date + it.title}>
                          <b>{it.text}</b> {it.title}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </details>
            ))}
            <p className="seo-note">
              No professional tax in {NO_PT.join(", ")}. No Labour Welfare Fund in {noLwf.join(", ")}.
            </p>

            <h2>Frequently asked questions</h2>
            <div className="seo-faq">
              {FAQ.map(({ q, a }) => (
                <details key={q}>
                  <summary>{q}</summary>
                  <p>{a}</p>
                </details>
              ))}
            </div>
            <p className="seo-note">
              Preparing the monthly PF return? Read{" "}
              <Link prefetch={false} href="/blog/pf-ecr-file-format">
                the ECR file format guide
              </Link>
              .
            </p>
          </section>
        </main>
      </div>

      <Footer />

      <style jsx>{`
        .seo { margin: 40px 0 24px; }
        .seo h2 { font-size: 22px; margin: 32px 0 12px; }
        .seo h3 { font-size: 15px; margin: 0 0 8px; }
        .seo-months { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 12px; }
        .seo-m, .seo-st, .seo-faq details { background: var(--card); border: 1px solid var(--line); border-radius: 12px; padding: 12px 14px; }
        .seo ul { margin: 0; padding-left: 18px; font-size: 14px; line-height: 1.6; }
        .seo-st { margin: 8px 0; }
        .seo-st summary, .seo-faq summary { cursor: pointer; font-weight: 600; }
        .seo-sec { margin-top: 12px; }
        .seo-basis { font-size: 13px; color: var(--ink-soft); margin: 0 0 6px; }
        .seo-note { font-size: 14px; color: var(--ink-soft); margin: 12px 0; }
        .seo-faq { display: grid; gap: 8px; }
        .seo-faq p { margin: 8px 0 0; font-size: 14px; }
      `}</style>
    </>
  );
}
