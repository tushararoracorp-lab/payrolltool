import Head from "next/head";
import Link from "next/link";
import Header from "../components/Header";
import Footer from "../components/Footer";

export default function PrivacyPolicy() {
  return (
    <>
      <Head>
        <title>Privacy Policy – PayrollTool</title>
        <meta
          name="description"
          content="How PayrollTool.in handles your data. Your payroll numbers never leave your browser - read exactly what we collect and why."
        />
        <meta name="robots" content="index, follow" />
        <meta property="og:title" content="Privacy Policy – PayrollTool" />
        <meta property="og:url" content="https://www.payrolltool.in/privacy-policy" />
        <meta property="og:type" content="website" />
        <link rel="canonical" href="https://www.payrolltool.in/privacy-policy" />
      </Head>

      <Header />

      <main className="policy-wrap">
        <div className="wrap">
          <p className="eyebrow">LEGAL</p>
          <h1>Privacy Policy</h1>
          <p className="updated">Last updated: 25 October 2026</p>

          <p className="lede">
            PayrollTool.in is built around one promise: your payroll numbers are yours.
            This page explains exactly what we collect, what we never touch, and why -
            in plain language, not legal filler.
          </p>

          <section>
            <h2>What never leaves your browser</h2>
            <p>
              Every calculator and file generator on PayrollTool.in runs entirely on your
              device. The salary figures, employee details, and dates you enter are
              processed in your browser using JavaScript and are never transmitted to
              our servers, never stored in a database, and never seen by us. Closing the
              tab clears everything. No sign-up is required to use any tool, and we have
              no accounts or login system for visitors.
            </p>
          </section>

          <section>
            <h2>What we do collect</h2>

            <h3>Site analytics</h3>
            <p>
              We use Google Analytics to understand how people use the site - which
              pages are visited, which tools are opened, approximate location (city and
              country level, derived from IP address), device and browser type, and how
              you arrived at the site (search, direct, referral). This is aggregate
              usage data. It is not tied to your name or identity, and it never includes
              anything you typed into a calculator.
            </p>

            <h3>Feedback you choose to send</h3>
            <p>
              If you use the feedback form on the site, the text you submit is stored
              privately so we can read and act on it. If you voluntarily
              include your name or email in that message, we retain that too, only to
              follow up if needed. Nothing here is public, sold, or shared with
              advertisers.
            </p>

            <h3>Contact via email</h3>
            <p>
              If you email support@payrolltool.in, we receive and store that message
              like any normal email, for as long as needed to respond and keep a record
              of the conversation.
            </p>
          </section>

          <section>
            <h2>Cookies and advertising</h2>
            <p>
              Google Analytics sets first-party cookies on this site to distinguish
              returning visitors and measure usage, as described above.
            </p>
            <p>
              PayrollTool.in displays or plans to display advertising through Google
              AdSense. Third-party vendors, including Google, use cookies to serve ads
              based on a user&apos;s prior visits to this website or other websites.
              Google&apos;s use of advertising cookies enables it and its partners to
              show ads that are more relevant to you based on your visits to this site
              and other sites on the internet.
            </p>
            <p>
              You can opt out of personalised advertising by visiting{" "}
              <a
                href="https://adssettings.google.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                Google Ads Settings
              </a>
              . You can also opt out of some third-party vendors&apos; use of cookies
              for personalised advertising by visiting{" "}
              <a
                href="https://www.aboutads.info"
                target="_blank"
                rel="noopener noreferrer"
              >
                www.aboutads.info
              </a>
              . None of this is required to use the calculators - every tool on this
              site works fully with cookies blocked or an ad blocker running.
            </p>
          </section>

          <section>
            <h2>Service providers</h2>
            <p>
              We rely on a small number of established providers for hosting, site
              analytics, advertising, fonts and email delivery. Each has its own privacy
              policy, and we share only the minimum each one needs for its purpose.
            </p>
            <details className="providers">
              <summary>See the list of providers</summary>
              <ul>
                <li><strong>Google Analytics</strong> - site usage measurement</li>
                <li><strong>Google AdSense</strong> - advertising, which may set cookies as described above</li>
                <li><strong>Google Fonts</strong> - typefaces used on this site</li>
                <li><strong>Vercel</strong> - website hosting</li>
                <li><strong>Resend</strong> - email delivery</li>
                <li><strong>Google Sheets</strong> - storage for feedback submissions</li>
              </ul>
            </details>
          </section>

          <section>
            <h2>How long we keep data</h2>
            <p>
              Analytics data is retained according to our Google Analytics settings.
              Feedback and support emails are kept as long as useful for improving the
              site, and are deleted on request - email support@payrolltool.in and we
              will remove anything associated with you.
            </p>
          </section>

          <section>
            <h2>Your choices</h2>
            <p>
              You can use any PayrollTool.in calculator without any data ever leaving
              your device. If you prefer not to be counted in site analytics or served
              personalised ads, most browsers let you block third-party cookies or use
              an ad-blocker/analytics opt-out extension - the site works identically
              either way. To have any feedback or contact data deleted, email
              support@payrolltool.in.
            </p>
          </section>

          <section>
            <h2>Your rights under Indian data protection law</h2>
            <p>
              We handle personal data in line with the Digital Personal Data Protection
              Act, 2023. The only personal data we hold is what you choose to send us:
              feedback text and emails, together with any name or email address you
              include in them. Calculator inputs and uploaded files are never collected,
              so there is nothing to access or erase for them.
            </p>
            <p>
              For the data we do hold, you can ask us for a summary of what we have and
              how it is used, ask us to correct, complete or update it, ask us to erase
              it, and nominate another person to exercise these rights for you. Write to{" "}
              <a href="mailto:support@payrolltool.in">support@payrolltool.in</a> with
              the subject &quot;Data request&quot;. The same address handles grievances
              about how your data is processed. If we do not resolve a grievance, you
              can approach the Data Protection Board of India.
            </p>
          </section>

          <section>
            <h2>Children&apos;s privacy</h2>
            <p>
              PayrollTool.in is a professional tool for HR and payroll practitioners
              and is not directed at, or knowingly used to collect information from,
              children.
            </p>
          </section>

          <section>
            <h2>Changes to this policy</h2>
            <p>
              If how we handle data changes, this page will be updated and the
              last-updated date above will change. We will not make material changes
              without updating this page first.
            </p>
          </section>

          <section>
            <h2>Contact</h2>
            <p>
              Questions about this policy or your data:{" "}
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
        h3 {
          font-family: "Sora", sans-serif;
          font-weight: 600;
          font-size: 17px;
          color: var(--ink);
          margin: 20px 0 8px;
        }
        p {
          font-size: 15px;
          line-height: 1.7;
          color: var(--ink-soft);
          margin-bottom: 12px;
        }
        p strong {
          color: var(--ink);
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
        .providers {
          margin-top: 4px;
        }
        .providers summary {
          cursor: pointer;
          font-size: 14px;
          color: var(--ink-soft);
          list-style-position: inside;
        }
        .providers summary:hover {
          color: var(--brand-600);
        }
        .providers ul {
          margin-top: 10px;
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