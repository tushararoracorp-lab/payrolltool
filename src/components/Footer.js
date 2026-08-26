import Link from "next/link";
import { useEffect, useState } from "react";

export default function Footer() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function onScroll() {
      setVisible(window.scrollY > 480);
    }
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <button
        className={`back-to-top${visible ? " visible" : ""}`}
        aria-label="Back to top"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
          <path d="M12 19V5M5 12l7-7 7 7" />
        </svg>
      </button>

      <footer>
        <div className="wrap">
          <div className="footer-grid">
            <div className="footer-brand">
              <Link href="/" className="logo">
                <span className="mark">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="white" stroke="none">
                    <path d="M12 21s-7.5-4.6-10.2-9.3C0.1 8.9 1.4 5 5 4.1c2.2-.5 4.2.5 5.5 2.3l1.5 2 1.5-2C14.8 4.6 16.8 3.6 19 4.1c3.6.9 4.9 4.8 3.2 7.6C19.5 16.4 12 21 12 21z" />
                  </svg>
                </span>
                <span className="word">
                  PayrollTool<span className="tld">.in</span>
                </span>
              </Link>
              <p>Browser-based payroll calculators for HR &amp; payroll professionals in India. Built by someone who&apos;s been in your shoes.</p>
            </div>

            <div className="footer-links">
              <div className="footer-col">
                <h5>Tools</h5>
                <Link href="/pf-ecr-creator">PF ECR Creator</Link>
                <Link href="/tax-calculator">Tax Calculator</Link>
                <Link href="/salary-proration">Salary Proration</Link>
                <Link href="/lop-splitter">LOP Splitter</Link>
                <Link href="/final-settlement">Final Settlement</Link>
              </div>
              <div className="footer-col">
                <h5>Company</h5>
                <Link href="/about">About</Link>
                <Link href="/blog">Blog</Link>
                <a href="mailto:support@payrolltool.in">Contact</a>
                <Link href="/faq">FAQ</Link>
              </div>
            </div>
          </div>

          <div className="footer-bottom">
            <span>© PayrollTool.in 2026 - Your Payroll Helper</span>
            <a
              href="mailto:support@payrolltool.in"
              style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "inherit" }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="4" width="20" height="16" rx="2" /><path d="M2 6l10 7 10-7" />
              </svg>
              support@payrolltool.in
            </a>
          </div>
        </div>
      </footer>

      <style jsx global>{`
        .back-to-top {
          position: fixed; bottom: 24px; right: 24px; z-index: 60;
          width: 48px; height: 48px; border-radius: 50%; background: var(--brand-600); color: white;
          display: flex; align-items: center; justify-content: center; box-shadow: var(--shadow-card-hover);
          opacity: 0; translate: 0 12px; pointer-events: none; transition: opacity .2s ease, translate .2s ease, background .15s ease;
        }
        .back-to-top:hover { background: var(--brand-700); }
        .back-to-top.visible { opacity: 1; translate: 0 0; pointer-events: auto; }
        @media (max-width: 560px) {
          .back-to-top { width: 42px; height: 42px; bottom: 18px; right: 18px; }
        }

        footer {
          background: var(--card-2); border-top: 1px solid var(--line); padding: 64px 24px 32px;
          margin-top: 96px;
        }
        .footer-grid {
          display: grid; grid-template-columns: 1.2fr 1fr; gap: 64px; max-width: 1180px; margin: 0 auto 48px;
        }
        .footer-brand { max-width: 360px; }
        .footer-brand .logo { margin-bottom: 16px; }
        .footer-brand p { color: var(--ink-soft); font-size: 14px; line-height: 1.6; }
        .footer-links { display: grid; grid-template-columns: 1fr 1fr; gap: 48px; }
        .footer-col h5 { font-size: 13px; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 700; margin-bottom: 16px; color: var(--ink); }
        .footer-col a {
          display: block; padding: 6px 0; color: var(--ink-soft); font-size: 14px; transition: color .2s ease;
        }
        .footer-col a:hover { color: var(--brand-600); }
        .footer-bottom {
          border-top: 1px solid var(--line); padding-top: 24px; max-width: 1180px; margin: 0 auto;
          display: flex; justify-content: center; align-items: center; gap: 24px; font-size: 13px; color: var(--ink-soft);
        }

        @media (max-width: 768px) {
          .footer-grid { grid-template-columns: 1fr; gap: 32px; }
          .footer-links { grid-template-columns: 1fr; }
          .footer-bottom { flex-direction: column; gap: 12px; text-align: center; }
        }
      `}</style>
    </>
  );
}
