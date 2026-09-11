import Head from "next/head";
import Link from "next/link";
import Header from "../components/Header";
import Footer from "../components/Footer";

export default function TermsOfService() {
  return (
    <>
      <Head>
        <title>Terms of Service – PayrollTool</title>
        <meta
          name="description"
          content="The terms for using PayrollTool.in's free payroll calculators - what they're for, what they're not, and what we're each responsible for."
        />
        <meta name="robots" content="index, follow" />
        <meta property="og:title" content="Terms of Service – PayrollTool" />
        <meta property="og:url" content="https://www.payrolltool.in/terms-of-service" />
        <meta property="og:type" content="website" />
        <link rel="canonical" href="https://www.payrolltool.in/terms-of-service" />
      </Head>

      <Header />

      <main className="policy-wrap">
        <div className="wrap">
          <p className="eyebrow">LEGAL</p>
          <h1>Terms of Service</h1>
          <p className="updated">Last updated: 10 September 2026</p>

          <p className="lede">
            By using PayrollTool.in, you agree to these terms. They are written to be
            read in a few minutes, not a few hours - here is exactly what using this
            site means for you and for us.
          </p>

          <section>
            <h2>Who this is for</h2>
            <p>
              PayrollTool.in is built for HR, payroll, and finance professionals doing
              real payroll work in India. The tools assume you understand your
              organisation&apos;s payroll data and are using the results as part of
              your own professional judgement, not as a replacement for it. You must be
              at least 18 years old to use this site.
            </p>
          </section>

          <section>
            <h2>What PayrollTool.in is</h2>
            <p>
              PayrollTool.in is an independently operated project - a set of free,
              browser-based calculators built by one person with hands-on Indian
              payroll experience, outside of any employer. It is not a company product,
              and using it does not create any employment, agency, or business
              relationship between you and anyone else.
            </p>
          </section>

          <section>
            <h2>The tools are informational, not professional advice</h2>
            <p>
              Every calculator on this site - Salary Proration, LOP Splitter, PF ECR
              Creator, Final Settlement, and the Tax Calculator - is provided to help
              you work faster and check your own numbers. The outputs are for
              informational purposes only and are not a substitute for professional
              payroll, tax, or legal advice.
            </p>
            <p>
              Statutory rules, rates, and thresholds change. We do our best to keep the
              underlying formulas current, but you are responsible for verifying any
              result against the applicable law, your organisation&apos;s policies, and
              official government sources before relying on it - especially for
              anything that affects an employee&apos;s pay, statutory filings, or
              compliance.
            </p>
          </section>

          <section>
            <h2>No accounts, nothing stored</h2>
            <p>
              There is no sign-up and no login on PayrollTool.in. The salary figures,
              dates, and employee details you enter into a calculator are processed
              entirely in your browser and are never sent to our servers or stored
              anywhere by us. Full details are in our{" "}
              <Link href="/privacy-policy">Privacy Policy</Link>.
            </p>
          </section>

          <section>
            <h2>Using the site</h2>
            <p>You agree to use PayrollTool.in only for lawful purposes. Specifically, you agree not to:</p>
            <ul>
              <li>scrape, crawl, or systematically extract content from the site using automated tools;</li>
              <li>attempt to disrupt, overload, or interfere with the site&apos;s normal operation;</li>
              <li>reverse-engineer, decompile, or copy the underlying code of the calculators for use in a competing product; or</li>
              <li>use the site in any way that could damage, disable, or impair it for other users.</li>
            </ul>
          </section>

          <section>
            <h2>Ownership</h2>
            <p>
              The design, branding, written content, and code of PayrollTool.in belong
              to the person who built it. Using the calculators does not give you any
              ownership or licence over the site itself - you are free to use the
              tools and share the results they produce, but not to copy or republish
              the site or its code as your own.
            </p>
          </section>

          <section>
            <h2>Third-party services</h2>
            <p>
              PayrollTool.in uses Google Analytics, Google AdSense, Google Fonts,
              Vercel, Resend, and Google Sheets to run and improve the site. Each of
              these operates under its own terms and privacy policy. Details of what
              each is used for are in our <Link href="/privacy-policy">Privacy Policy</Link>.
            </p>
          </section>

          <section>
            <h2>No warranty</h2>
            <p>
              PayrollTool.in is provided as-is and as-available, free of charge. We do
              not guarantee that the tools will be error-free, uninterrupted, or fit
              for any particular purpose, and we do not warrant the accuracy of any
              calculation beyond reasonable, good-faith effort to keep formulas correct
              and current.
            </p>
          </section>

          <section>
            <h2>Limitation of liability</h2>
            <p>
              To the fullest extent permitted by law, PayrollTool.in and its operator
              are not liable for any loss or damage arising from your use of the site
              or reliance on its calculators - including any payroll error, statutory
              non-compliance, or financial loss - where that loss results from using
              a tool&apos;s output without independent verification. Nothing in these
              terms limits any liability that cannot lawfully be excluded.
            </p>
          </section>

          <section>
            <h2>Changes to these terms</h2>
            <p>
              We may update these terms from time to time. Material changes will be
              reflected by updating the date at the top of this page. Continuing to
              use PayrollTool.in after a change means you accept the updated terms.
            </p>
          </section>

          <section>
            <h2>Governing law</h2>
            <p>
              These terms are governed by the laws of India. Any dispute arising from
              your use of this site will be subject to the jurisdiction of the courts
              of India.
            </p>
          </section>

          <section>
            <h2>Contact</h2>
            <p>
              Questions about these terms:{" "}
              <a href="mailto:support@payrolltool.in">support@payrolltool.in</a>
            </p>
          </section>

          <p className="back">
            <Link href="/">← Back to Homepage</Link>
          </p>
        </div>
      </main>

      <Footer />

      <style jsx>{`
        .policy-wrap {
          padding: 64px 24px 48px;
        }
        .wrap {
          max-width: 720px;
          margin: 0 auto;
        }
        .eyebrow {
          font-family: "DM Sans", sans-serif;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--brand-600);
          margin-bottom: 8px;
        }
        h1 {
          font-family: "Sora", sans-serif;
          font-weight: 800;
          font-size: 40px;
          letter-spacing: -0.01em;
          color: var(--ink);
          margin-bottom: 8px;
        }
        .updated {
          color: var(--ink-soft);
          font-size: 14px;
          margin-bottom: 32px;
        }
        .lede {
          font-size: 17px;
          line-height: 1.65;
          color: var(--ink);
          margin-bottom: 48px;
        }
        section {
          margin-bottom: 40px;
        }
        h2 {
          font-family: "Sora", sans-serif;
          font-weight: 700;
          font-size: 22px;
          color: var(--ink);
          margin-bottom: 14px;
          padding-top: 8px;
          border-top: 1px solid var(--line);
        }
        p {
          font-size: 15px;
          line-height: 1.7;
          color: var(--ink-soft);
          margin-bottom: 12px;
        }
        ul {
          margin: 0 0 12px;
          padding-left: 20px;
        }
        li {
          font-size: 15px;
          line-height: 1.8;
          color: var(--ink-soft);
        }
        a {
          color: var(--brand-600);
          font-weight: 600;
        }
        .back {
          margin-top: 8px;
        }
        .back a {
          font-size: 14px;
        }
      `}</style>
    </>
  );
}