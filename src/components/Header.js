import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useRef, useState } from "react";

// Icon set matching the new inline-SVG style used across the redesigned
// site (payrolltool-homepage-icons-synced.html). No lucide/emoji.
const ICONS = {
  chevron: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 9l6 6 6-6" />
    </svg>
  ),
  pfEcr: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M7 7h10v10H7z" />
    </svg>
  ),
  esicMc: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2l8 3v6c0 5-3.4 9.3-8 11-4.6-1.7-8-6-8-11V5l8-3z" /><path d="M12 8v6M9 11h6" />
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
  dashboard: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" />
    </svg>
  ),
  sun: (
    <svg className="icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="5" /><path d="M12 1v6m0 6v6M4.22 4.22l4.24 4.24m3.08 3.08l4.24 4.24M1 12h6m6 0h6M4.22 19.78l4.24-4.24m3.08-3.08l4.24-4.24" />
    </svg>
  ),
  moon: (
    <svg className="icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  ),
  article: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z" />
    </svg>
  ),
  arrowRight: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
      <path d="M5 12h14M13 5l7 7-7 7" />
    </svg>
  ),
};

const toolLinks = [
  { href: "/pf-ecr-creator", label: "PF ECR Creator", icon: ICONS.pfEcr },
  { href: "/esic-mc-creator", label: "ESIC MC Creator", icon: ICONS.esicMc },
  { href: "/tax-calculator", label: "Tax Calculator", icon: ICONS.tax },
];
const toolLinksCol2 = [
  { href: "/salary-proration", label: "Salary Proration", icon: ICONS.salaryProration },
  { href: "/lop-splitter", label: "LOP Splitter", icon: ICONS.lopSplitter },
  { href: "/final-settlement", label: "Final Settlement", icon: ICONS.finalSettlement },
];

// Blog links are fetched dynamically from /public/blog-meta.json
// This allows infinite blog posts without manual header updates

export default function Header() {
  const router = useRouter();
  const [theme, setTheme] = useState("light");
  const [openMenu, setOpenMenu] = useState(null); // null | "tools" | "blog"
  const [blogCols, setBlogCols] = useState([[], [], []]); // 3 columns of blog links
  const toolsRef = useRef(null);
  const blogRef = useRef(null);

  // Fetch blog posts from blog-meta.json on component mount
  useEffect(() => {
    fetch("/blog-meta.json")
      .then((res) => res.json())
      .then((posts) => {
        // Take top 12 posts, split into 3 columns of 4
        const top12 = posts.slice(0, 12);
        const col1 = top12.slice(0, 4).map((p) => ({
          href: `/blog/${p.slug}`,
          label: p.title,
          icon: ICONS[p.icon] || ICONS.article,
        }));
        const col2 = top12.slice(4, 8).map((p) => ({
          href: `/blog/${p.slug}`,
          label: p.title,
          icon: ICONS[p.icon] || ICONS.article,
        }));
        const col3 = [
          ...top12.slice(8, 12).map((p) => ({
            href: `/blog/${p.slug}`,
            label: p.title,
            icon: ICONS[p.icon] || ICONS.article,
          })),
          { href: "/blog", label: "Browse all articles", icon: ICONS.arrowRight },
        ];
        setBlogCols([col1, col2, col3]);
      })
      .catch((err) => console.error("Failed to load blog meta:", err));
  }, []);

  // Read the user's last saved choice first; only fall back to system
  // preference if they've never toggled it. Without this, navigating to
  // any other page (which mounts a fresh Header instance, since there's
  // no shared layout in _app.js) silently reset the theme every time.
  useEffect(() => {
    const saved = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initial = saved || (prefersDark ? "dark" : "light");
    setTheme(initial);
    document.documentElement.setAttribute("data-theme", initial);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  // Touch devices: tap toggles the mega menu instead of relying on :hover.
  // Click outside closes it.
  useEffect(() => {
    function handleOutsideClick(e) {
      const insideTools = toolsRef.current && toolsRef.current.contains(e.target);
      const insideBlog = blogRef.current && blogRef.current.contains(e.target);
      if (!insideTools && !insideBlog) {
        setOpenMenu(null);
      }
    }
    document.addEventListener("click", handleOutsideClick);
    return () => document.removeEventListener("click", handleOutsideClick);
  }, []);

  const toolsActive = [...toolLinks, ...toolLinksCol2].some((l) => router.pathname === l.href);
  const blogActive = router.pathname === "/blog" || router.pathname.startsWith("/blog/");

  function handleToolsClick(e) {
    if (window.matchMedia("(hover: none)").matches) {
      e.preventDefault();
      setOpenMenu((v) => (v === "tools" ? null : "tools"));
    }
  }

  function handleBlogClick(e) {
    if (window.matchMedia("(hover: none)").matches) {
      e.preventDefault();
      setOpenMenu((v) => (v === "blog" ? null : "blog"));
    }
  }

  return (
    <>
      <header>
        <div className="nav">
          <Link prefetch={false} href="/" className="logo">
            <span className="mark">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                <path d="M12 21s-7.5-4.6-10.2-9.3C0.1 8.9 1.4 5 5 4.1c2.2-.5 4.2.5 5.5 2.3l1.5 2 1.5-2C14.8 4.6 16.8 3.6 19 4.1c3.6.9 4.9 4.8 3.2 7.6C19.5 16.4 12 21 12 21z" />
              </svg>
            </span>
            <span className="word">
              PayrollTool<span className="tld">.in</span>
            </span>
          </Link>

          <div className="nav-center">
            <div className={`nav-item${toolsActive ? " active" : ""}${openMenu === "tools" ? " mega-open" : ""}`} ref={toolsRef}>
              <a href="#tools" className="nav-link" onClick={handleToolsClick}>
                Tools {ICONS.chevron}
              </a>
              <div className="mega">
                <div className="mega-col">
                  <h5>Calculate</h5>
                  {toolLinks.map(({ href, label, icon }) => (
                    <Link prefetch={false} key={href} href={href} className="mega-link" onClick={() => setOpenMenu(null)}>
                      <span className="mega-icon">{icon}</span>{label}
                    </Link>
                  ))}
                </div>
                <div className="mega-col">
                  <h5>&nbsp;</h5>
                  {toolLinksCol2.map(({ href, label, icon }) => (
                    <Link prefetch={false} key={href} href={href} className="mega-link" onClick={() => setOpenMenu(null)}>
                      <span className="mega-icon">{icon}</span>{label}
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            <div className={`nav-item${blogActive ? " active" : ""}${openMenu === "blog" ? " mega-open" : ""}`} ref={blogRef}>
              <Link prefetch={false} href="/blog" className="nav-link" onClick={handleBlogClick}>
                Blog {ICONS.chevron}
              </Link>
              <div className="mega">
                {blogCols.map((col, idx) => (
                  <div key={`blog-col-${idx}`} className="mega-col">
                    <h5>{idx === 0 ? "GUIDES" : "\u00A0"}</h5>
                    {col.map(({ href, label, icon }) => (
                      <Link prefetch={false} key={href} href={href} className={`mega-link${href === router.pathname ? " active" : ""}`}>
                        <div className="mega-icon">{icon}</div>
                        {label}
                      </Link>
                    ))}
                  </div>
                ))}
              </div>
            </div>                
              
            <div className={`nav-item${router.pathname.startsWith("/updates") ? " active" : ""}`}>
              <Link prefetch={false} href="/updates" className="nav-link">Updates</Link>
            </div>

            <div className="nav-item">
              <Link prefetch={false} href="/faq" className={`nav-link${router.pathname === "/faq" ? " active" : ""}`}>FAQ</Link>
            </div>
          </div>

          <div className="nav-right">
            <button
              id="themeToggle"
              className="theme-toggle"
              title="Toggle dark mode"
              aria-label="Toggle dark mode"
              onClick={() => setTheme((t) => {
                const next = t === "dark" ? "light" : "dark";
                localStorage.setItem("theme", next);
                return next;
              })}
            >
              {ICONS.sun}
              {ICONS.moon}
            </button>
          </div>
        </div>
      </header>

      <style jsx global>{`
        :root {
          --brand-600: #7c3aed;
          --brand-700: #6d28d9;
          --brand-800: #5b21b6;
          --brand-50: #f4f0fd;
          --green: #059669;
          --green-50: #eaf7f1;
          --amber: #d97706;
          --amber-50: #fdf3e7;
          --ink: #1b1526;
          --ink-soft: #4a4258;
          --paper: #fbfafd;
          --card: #ffffff;
          --card-2: #faf9fd;
          --line: #e7e1f3;
          --header-bg: rgba(251, 250, 253, 0.86);
          --radius-lg: 18px;
          --radius-md: 14px;
          --radius-sm: 10px;
          --shadow-card: 0 1px 2px rgba(27, 21, 38, 0.04), 0 8px 24px rgba(91, 33, 182, 0.06);
          --shadow-card-hover: 0 4px 10px rgba(27, 21, 38, 0.06), 0 16px 40px rgba(91, 33, 182, 0.12);
          color-scheme: light;
        }
        html[data-theme="dark"] {
          --brand-600: #9163f2;
          --brand-700: #a47df5;
          --brand-800: #c4b0f9;
          --brand-50: #231b33;
          --green: #34d399;
          --green-50: #123027;
          --amber: #fbbf54;
          --amber-50: #332411;
          --ink: #f3f0fa;
          --ink-soft: #b3aac7;
          --paper: #000000;
          --card: #121016;
          --card-2: #16131c;
          --line: #2a2536;
          --header-bg: rgba(0, 0, 0, 0.72);
          --shadow-card: 0 1px 2px rgba(0, 0, 0, 0.3), 0 8px 24px rgba(0, 0, 0, 0.35);
          --shadow-card-hover: 0 4px 10px rgba(0, 0, 0, 0.35), 0 16px 40px rgba(145, 99, 242, 0.18);
          color-scheme: dark;
        }
        * { box-sizing: border-box; }
        html { scroll-behavior: smooth; }
        body {
          margin: 0;
          font-family: "DM Sans", sans-serif;
          color: var(--ink);
          background: var(--paper);
          -webkit-font-smoothing: antialiased;
          transition: background .25s ease, color .25s ease;
        }
        h1, h2, h3, h4 {
          font-family: "Sora", sans-serif;
          color: var(--ink);
          margin: 0;
          letter-spacing: -0.01em;
        }
        a { color: inherit; text-decoration: none; }
        .mono { font-family: "DM Mono", monospace; }
        img, svg { display: block; }
        .wrap { max-width: 1180px; margin: 0 auto; padding: 0 24px; }
        .eyebrow {
          display: inline-flex; align-items: center; gap: 8px;
          font-family: "DM Mono", monospace; font-size: 12.5px; letter-spacing: 0.08em; text-transform: uppercase;
          color: var(--brand-600); font-weight: 500;
        }
        .eyebrow .dot { width: 6px; height: 6px; border-radius: 50%; background: var(--green); }
        button { font-family: inherit; cursor: pointer; border: none; background: none; }

        header {
          position: sticky; top: 0; z-index: 60;
          background: var(--header-bg);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid var(--line);
        }
        .nav {
          display: flex; align-items: center; justify-content: space-between;
          padding: 14px 24px; max-width: 1180px; margin: 0 auto;
        }
        .logo { display: flex; align-items: center; gap: 9px; }
        .logo .mark {
          width: 30px; height: 30px; border-radius: 50%;
          background: linear-gradient(135deg, var(--brand-600), var(--brand-800));
          display: flex; align-items: center; justify-content: center;
          color: white; flex-shrink: 0;
        }
        .logo .word { font-family: "Sora", sans-serif; font-weight: 700; font-size: 19px; color: var(--brand-600); }
        .logo .word .tld { color: var(--ink-soft); font-weight: 600; }
        html[data-theme="dark"] .logo .word { color: var(--brand-700); }

        .nav-center { display: flex; align-items: center; gap: 6px; }
        .nav-item { position: relative; }
        .nav-link {
          display: flex; align-items: center; gap: 5px;
          font-size: 14.5px; font-weight: 500; color: var(--ink-soft);
          padding: 9px 14px; border-radius: 100px;
        }
        .nav-link:hover, .nav-item.active .nav-link { color: var(--brand-600); background: var(--brand-50); }
        .nav-link svg { width: 14px; height: 14px; transition: transform .18s ease; }
        .nav-item:hover .nav-link svg { transform: rotate(180deg); }
        .soon-badge {
          font-family: "DM Mono", monospace; font-size: 9.5px; font-weight: 600; letter-spacing: 0.03em;
          background: var(--amber-50); color: var(--amber); padding: 2px 6px; border-radius: 100px; margin-left: 2px;
        }
        .nav-link.disabled { cursor: default; }
        .nav-link.disabled:hover { color: var(--ink-soft); background: none; }

        .nav-right { display: flex; align-items: center; gap: 10px; }
        .theme-toggle {
          width: 40px; height: 40px; border-radius: 50%;
          border: 1px solid var(--line); background: var(--card);
          display: flex; align-items: center; justify-content: center;
          color: var(--ink-soft); position: relative; flex-shrink: 0;
        }
        .theme-toggle:hover { border-color: var(--brand-600); color: var(--brand-600); }
        .theme-toggle svg { position: absolute; width: 18px; height: 18px; transition: opacity .2s ease, transform .3s ease; }
        .icon-sun { opacity: 1; transform: scale(1) rotate(0deg); }
        .icon-moon { opacity: 0; transform: scale(0.5) rotate(-40deg); }
        html[data-theme="dark"] .icon-sun { opacity: 0; transform: scale(0.5) rotate(40deg); }
        html[data-theme="dark"] .icon-moon { opacity: 1; transform: scale(1) rotate(0deg); }

        .mega {
          position: absolute; top: calc(100% + 10px); left: 50%; transform: translateX(-50%);
          background: var(--card); border: 1px solid var(--line); border-radius: var(--radius-lg);
          box-shadow: var(--shadow-card-hover); padding: 22px;
          display: flex; gap: 36px; min-width: 460px; align-items: flex-start;
          opacity: 0; visibility: hidden; translate: 0 6px;
          transition: opacity .16s ease, translate .16s ease, visibility .16s;
        }

        .nav-item:hover .mega, .nav-item.mega-open .mega { opacity: 1; visibility: visible; translate: 0 0; }
        .mega-col { min-width: 190px; }
        .mega-col h5 {
          font-family: "DM Mono", monospace; font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em;
          color: var(--brand-600); font-weight: 600; margin-bottom: 12px;
        }
        .mega-link {
          display: flex; align-items: center; gap: 10px; padding: 8px 8px; border-radius: var(--radius-sm);
          font-size: 13.5px; font-weight: 500; color: var(--ink); margin: 0 -8px 2px;
        }
        .mega-link:hover { background: var(--brand-50); color: var(--brand-600); }
        .mega-link .mega-icon {
          width: 28px; height: 28px; border-radius: 8px; background: var(--brand-50); color: var(--brand-600);
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .mega-link .mega-icon svg { width: 14px; height: 14px; }
        .mega-link.soon { opacity: 0.6; cursor: default; }
        .mega-link.soon:hover { background: none; color: var(--ink); }
        .mega-link.soon .mega-icon { background: var(--amber-50); color: var(--amber); }

        .cooking-panel {
          position: absolute; top: calc(100% + 10px); left: 50%; transform: translateX(-50%);
          background: var(--card); border: 1px solid var(--line); border-radius: var(--radius-lg);
          box-shadow: var(--shadow-card-hover); padding: 18px 22px 16px; min-width: 200px; text-align: center;
          opacity: 0; visibility: hidden; translate: 0 6px;
          transition: opacity .16s ease, translate .16s ease, visibility .16s;
        }
        .nav-item:hover .cooking-panel, .nav-item.mega-open .cooking-panel { opacity: 1; visibility: visible; translate: 0 0; }
        .cooking-panel .ck-caption { font-family: "DM Mono", monospace; font-size: 12px; color: var(--brand-600); font-weight: 600; margin-top: 6px; }
        .cooking-panel .ck-sub { font-size: 11.5px; color: var(--ink-soft); margin-top: 3px; }
        @keyframes ckFlicker { 0%, 100% { opacity: 1; transform: scaleY(1); } 50% { opacity: .7; transform: scaleY(.82); } }
        @keyframes ckSteam { 0% { opacity: 0; transform: translateY(4px) scale(.7); } 35% { opacity: .9; } 100% { opacity: 0; transform: translateY(-22px) scale(1.25); } }
        @keyframes ckWhistle { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-2.5px); } }
        .nav-item:hover .ck-flame { animation: ckFlicker .9s ease-in-out infinite; }
        .nav-item:hover .ck-flame.f2 { animation-delay: .15s; }
        .nav-item:hover .ck-flame.f3 { animation-delay: .3s; }
        .nav-item:hover .ck-whistle { animation: ckWhistle 1.4s ease-in-out infinite; }
        .nav-item:hover .ck-steam-path { animation: ckSteam 1.6s ease-out infinite; }
        .nav-item:hover .ck-steam-path.s2 { animation-delay: .5s; }

        @media (max-width: 768px) {
          .nav-center { gap: 0; }
          .nav-link { padding: 8px 10px; font-size: 13.5px; }
          h2 { font-size: 24px; }
          body { font-size: 16px; }
        }
      `}</style>
    </>
  );
}
