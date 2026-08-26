import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import Link from 'next/link'
import Head from 'next/head'
import { useState, useEffect } from 'react'
import Header from '../../components/Header'
import Footer from '../../components/Footer'

function formatDate(isoDate) {
  const d = new Date(isoDate)
  if (isNaN(d.getTime())) return isoDate
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function BlogIndex({ posts }) {
  // Mirror <html data-theme> onto this page's own wrapper - same pattern
  // as the five tool pages. This file had zero dark-mode awareness before -
  // pure Tailwind utility classes (bg-white, text-gray-900, etc.) with no
  // connection to the theme toggle at all.
  const [theme, setTheme] = useState("light")
  useEffect(() => {
    const root = document.documentElement
    setTheme(root.getAttribute("data-theme") || "light")
    const observer = new MutationObserver(() => {
      setTheme(root.getAttribute("data-theme") || "light")
    })
    observer.observe(root, { attributes: true, attributeFilter: ["data-theme"] })
    return () => observer.disconnect()
  }, [])

  return (
    <>
      <Head>
        <title>Payroll Guides & Resources | PayrollTool.in</title>
        <meta
          name="description"
          content="Practical guides on LOP calculation, salary proration, PF ECR filing, and Indian payroll compliance."
        />
        <meta name="robots" content="index, follow" />
        <meta name="author" content="PayrollTool.in" />
        <link rel="canonical" href="https://www.payrolltool.in/blog" />

        <meta property="og:type" content="website" />
        <meta property="og:title" content="Payroll Guides & Resources | PayrollTool.in" />
        <meta
          property="og:description"
          content="Practical guides on LOP calculation, salary proration, PF ECR filing, and Indian payroll compliance."
        />
        <meta property="og:url" content="https://www.payrolltool.in/blog" />
        <meta property="og:image" content="https://www.payrolltool.in/icon.png" />
        <meta property="og:site_name" content="PayrollTool.in" />
        <meta property="og:locale" content="en_IN" />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Payroll Guides & Resources | PayrollTool.in" />
        <meta
          name="twitter:description"
          content="Practical guides on LOP calculation, salary proration, PF ECR filing, and Indian payroll compliance."
        />

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "BreadcrumbList",
              itemListElement: [
                { "@type": "ListItem", position: 1, name: "Home", item: "https://www.payrolltool.in/" },
                { "@type": "ListItem", position: 2, name: "Blog", item: "https://www.payrolltool.in/blog" },
              ],
            }),
          }}
        />
        {/* Generated directly from the same `posts` array the page renders,
            so this can never drift out of sync with what's visible - same
            principle applied to the FAQ page's schema earlier. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Blog",
              name: "PayrollTool.in Blog",
              url: "https://www.payrolltool.in/blog",
              description: "Practical guides on LOP calculation, salary proration, PF ECR filing, and Indian payroll compliance.",
              blogPost: posts.map((post) => ({
                "@type": "BlogPosting",
                headline: post.title,
                description: post.description,
                url: `https://www.payrolltool.in/blog/${post.slug}`,
                datePublished: post.date,
                author: { "@type": "Person", name: "Tushar Arora" },
                publisher: { "@type": "Organization", name: "PayrollTool.in" },
              })),
            }),
          }}
        />
      </Head>

      <div className="blog-wrapper" data-theme={theme} style={{ minHeight: "100vh" }}>
        <Header />
        <main className="max-w-3xl mx-auto px-4 py-16">
          <div className="mb-10">
            <span className="text-xs font-bold text-violet-700 bg-violet-50 px-3 py-1 rounded-full">
              RESOURCES
            </span>
            <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 mt-4">
              Payroll Guides &amp; Resources
            </h1>
            <p className="text-gray-500 mt-2">
              Practical guides for HR and payroll professionals in India.
            </p>
          </div>

          <div className="flex flex-col gap-8">
            {posts.map((post) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="block p-6 rounded-2xl border border-gray-100 hover:border-violet-200 hover:bg-violet-50/40 transition-colors no-underline"
              >
                <h2 className="text-xl font-bold text-gray-900">{post.title}</h2>
                <p className="text-gray-500 mt-2">{post.description}</p>
                <span className="text-xs text-gray-400 mt-3 block">{formatDate(post.date)}</span>
              </Link>
            ))}
          </div>
        </main>
        <Footer />
      </div>

      <style jsx>{`
        /* Dark-mode overrides. Written as attribute selectors from the
           start for any hover:/opacity-suffixed class - see PF ECR
           Creator and LOP Splitter's fix history for why escaped class
           selectors (.hover\\:bg-x) are unreliable in this codebase. */
        .blog-wrapper[data-theme="dark"] { background: #15111F; }
        .blog-wrapper[data-theme="dark"] .bg-violet-50 { background: #2c2147 !important; }
        .blog-wrapper[data-theme="dark"] .text-violet-700 { color: #a47df5 !important; }
        .blog-wrapper[data-theme="dark"] .text-gray-900 { color: #f3f0fa !important; }
        .blog-wrapper[data-theme="dark"] .text-gray-500 { color: #b3aac7 !important; }
        .blog-wrapper[data-theme="dark"] .text-gray-400 { color: #b3aac7 !important; }
        .blog-wrapper[data-theme="dark"] .border-gray-100 { border-color: #2a2536 !important; }
        .blog-wrapper[data-theme="dark"] [class~="hover:border-violet-200"]:hover { border-color: #3d3654 !important; }
        .blog-wrapper[data-theme="dark"] [class~="hover:bg-violet-50/40"]:hover { background: #2c2147 !important; --tw-bg-opacity: 1 !important; }
      `}</style>
    </>
  )
}

export async function getStaticProps() {
  const postsDir = path.join(process.cwd(), 'content/blog')
  const files = fs.readdirSync(postsDir)

  const posts = files.map((filename) => {
    const filePath = path.join(postsDir, filename)
    const fileContent = fs.readFileSync(filePath, 'utf8')
    const { data } = matter(fileContent)
    return { ...data, slug: data.slug || filename.replace('.md', '') }
  })

  posts.sort((a, b) => new Date(b.date) - new Date(a.date))

  return { props: { posts } }
}
