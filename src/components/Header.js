import Link from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";

export default function Header() {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/lop-splitter", label: "LOP Splitter" },
    { href: "/salary-proration", label: "Salary Proration" },
  ];

  const moreLinks = [
    { href: "/pf-ecr-creator", label: "📋 PF ECR Creator" },
  ];

  return (
    <>
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="mx-auto grid h-14 max-w-7xl px-4" style={{ gridTemplateColumns: "1fr auto 1fr" }}>

          {/* Logo — left */}
          <Link href="/" className="flex items-center gap-2 no-underline">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-violet-600 text-white shadow">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                <path d="M12 21.593c-5.63-5.539-11-10.297-11-14.402 0-3.791 3.068-5.191 5.281-5.191 1.312 0 4.151.501 5.719 4.457 1.59-3.968 4.464-4.447 5.726-4.447 2.54 0 5.274 1.621 5.274 5.181 0 4.069-5.136 8.625-11 14.402z" />
              </svg>
            </div>
            <span className="text-base font-extrabold text-violet-700 tracking-tight">PayrollTool</span>
          </Link>

          {/* Desktop Nav — perfectly centered */}
          <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
            {navLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  router.pathname === href
                    ? "text-violet-700 font-bold bg-violet-50"
                    : "text-gray-600 hover:text-violet-700 hover:bg-violet-50"
                }`}
              >
                {label}
              </Link>
            ))}

            {/* More Tools dropdown */}
            <div className="relative">
              <button
                onClick={() => setMoreOpen(!moreOpen)}
                className={`px-4 py-2 rounded-lg transition-colors text-sm font-medium flex items-center gap-1 ${
                  moreLinks.some(l => router.pathname === l.href)
                    ? "text-violet-700 font-bold bg-violet-50"
                    : "text-gray-600 hover:text-violet-700 hover:bg-violet-50"
                }`}
              >
                More Tools
                <span style={{ fontSize: "10px", marginTop: "1px" }}>▾</span>
              </button>

              {moreOpen && (
                <>
                  {/* click-away backdrop */}
                  <div className="fixed inset-0 z-40" onClick={() => setMoreOpen(false)} />
                  <div className="absolute top-full left-0 mt-2 w-52 bg-white border border-gray-200 rounded-xl shadow-lg z-50 py-1 overflow-hidden">
                    {moreLinks.map(({ href, label }) => (
                      <Link
                        key={href}
                        href={href}
                        onClick={() => setMoreOpen(false)}
                        className={`block px-4 py-3 text-sm transition-colors ${
                          router.pathname === href
                            ? "text-violet-700 font-bold bg-violet-50"
                            : "text-gray-700 hover:text-violet-700 hover:bg-violet-50"
                        }`}
                      >
                        {label}
                      </Link>
                    ))}
                  </div>
                </>
              )}
            </div>
          </nav>

          {/* Right spacer — keeps nav centered */}
          <div className="hidden md:flex items-center justify-end">
            {/* reserved for future CTA button */}
          </div>

          {/* Hamburger — mobile only */}
          <div className="md:hidden flex items-center justify-end col-start-3">
            <button
              className="flex flex-col gap-1.5 p-2 rounded-lg border border-gray-200"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Toggle menu"
            >
              <span className={`block w-5 h-0.5 bg-gray-600 transition-all duration-200 ${menuOpen ? "rotate-45 translate-y-2" : ""}`} />
              <span className={`block w-5 h-0.5 bg-gray-600 transition-all duration-200 ${menuOpen ? "opacity-0" : ""}`} />
              <span className={`block w-5 h-0.5 bg-gray-600 transition-all duration-200 ${menuOpen ? "-rotate-45 -translate-y-2" : ""}`} />
            </button>
          </div>

        </div>

        {/* Mobile Dropdown */}
        {menuOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white px-4 py-3 flex flex-col gap-1">
            {navLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMenuOpen(false)}
                className={`px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                  router.pathname === href
                    ? "text-violet-700 font-bold bg-violet-50"
                    : "text-gray-600 hover:text-violet-700 hover:bg-violet-50"
                }`}
              >
                {label}
              </Link>
            ))}
            {moreLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMenuOpen(false)}
                className={`px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                  router.pathname === href
                    ? "text-violet-700 font-bold bg-violet-50"
                    : "text-gray-600 hover:text-violet-700 hover:bg-violet-50"
                }`}
              >
                {label}
              </Link>
            ))}
          </div>
        )}
      </header>
    </>
  );
}