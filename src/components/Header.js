import Link from "next/link";
import { useRouter } from "next/router";

export default function Header() {
  const router = useRouter();

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/lop-splitter", label: "LOP Splitter" },
    { href: "/salary-proration", label: "Salary Proration" },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 no-underline">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-violet-600 text-white shadow">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
              <path d="M12 21.593c-5.63-5.539-11-10.297-11-14.402 0-3.791 3.068-5.191 5.281-5.191 1.312 0 4.151.501 5.719 4.457 1.59-3.968 4.464-4.447 5.726-4.447 2.54 0 5.274 1.621 5.274 5.181 0 4.069-5.136 8.625-11 14.402z" />
            </svg>
          </div>
          <span className="text-lg font-extrabold text-violet-700 tracking-tight">PayrollTool</span>
        </Link>

        {/* Nav */}
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
          <span
            className="px-4 py-2 rounded-lg text-gray-300 cursor-not-allowed select-none text-sm"
            title="Coming Soon"
          >
            More Tools ▾
          </span>
        </nav>

        {/* Right placeholder to keep nav centered */}
        <div className="w-36" />
      </div>
    </header>
  );
}
