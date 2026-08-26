import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import { remark } from 'remark'
import html from 'remark-html'
import Head from 'next/head'
import { useState, useEffect } from 'react'
import Header from '../../components/Header'
import Footer from '../../components/Footer'

function formatDate(isoDate) {
  const d = new Date(isoDate)
  if (isNaN(d.getTime())) return isoDate
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function BlogPost({ frontmatter, contentHtml, slug }) {
  const canonicalUrl = `https://www.payrolltool.in/blog/${slug}`

  // Mirror <html data-theme> onto this page - same pattern as every other
  // page in this project. The article body uses Tailwind's typography
  // plugin (prose prose-violet), which generates its own extensive set of
  // internal styles for headings/links/lists/code blocks - completely
  // separate from anything fixed elsewhere. Tailwind Typography does have
  // a built-in dark:prose-invert variant, but this project's theme toggle
  // sets a data-theme attribute rather than Tailwind's own dark class/media
  // convention, and the actual tailwind.config.js dark-mode strategy isn't
  // visible here - so dark: variants aren't something to rely on activating
  // correctly. Applying prose-invert directly from React state instead
  // guarantees it works regardless of that config.
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
        <title>{frontmatter.title} | PayrollTool.in Blog</title>
        <meta name="description" content={frontmatter.description} />
        <meta name="robots" content="index, follow" />
        <meta name="author" content="PayrollTool.in" />
        <link rel="canonical" href={canonicalUrl} />

        <meta property="og:type" content="article" />
        <meta property="og:title" content={frontmatter.title} />
        <meta property="og:description" content={frontmatter.description} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:image" content="https://www.payrolltool.in/icon.png" />
        <meta property="og:site_name" content="PayrollTool.in" />
        <meta property="og:locale" content="en_IN" />
        <meta property="article:published_time" content={frontmatter.date} />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={frontmatter.title} />
        <meta name="twitter:description" content={frontmatter.description} />

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "BreadcrumbList",
              itemListElement: [
                { "@type": "ListItem", position: 1, name: "Home", item: "https://www.payrolltool.in/" },
                { "@type": "ListItem", position: 2, name: "Blog", item: "https://www.payrolltool.in/blog" },
                { "@type": "ListItem", position: 3, name: frontmatter.title, item: canonicalUrl },
              ],
            }),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Article",
              headline: frontmatter.title,
              description: frontmatter.description,
              url: canonicalUrl,
              datePublished: frontmatter.date,
              author: { "@type": "Person", name: "Tushar Arora" },
              publisher: { "@type": "Organization", name: "PayrollTool.in", url: "https://www.payrolltool.in/" },
              mainEntityOfPage: { "@type": "WebPage", "@id": canonicalUrl },
            }),
          }}
        />
      </Head>

      <div className="post-wrapper" data-theme={theme} style={{ minHeight: "100vh" }}>
        <Header />
        <main className="max-w-3xl mx-auto px-4 py-16">
          <span className="text-xs font-bold text-violet-700 bg-violet-50 px-3 py-1 rounded-full">
            GUIDE
          </span>
          <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 mt-4">
            {frontmatter.title}
          </h1>
          <span className="text-xs text-gray-400 mt-3 block mb-10">{formatDate(frontmatter.date)}</span>

          <article
            className={`prose prose-violet max-w-none prose-headings:font-bold prose-a:text-violet-700${theme === "dark" ? " prose-invert" : ""}`}
            dangerouslySetInnerHTML={{ __html: contentHtml }}
          />
        </main>
        <Footer />
      </div>

      <style jsx>{`
        .post-wrapper[data-theme="dark"] { background: #15111F; }
        .post-wrapper[data-theme="dark"] .bg-violet-50 { background: #2c2147 !important; }
        .post-wrapper[data-theme="dark"] .text-violet-700 { color: #a47df5 !important; }
        .post-wrapper[data-theme="dark"] .text-gray-900 { color: #f3f0fa !important; }
        .post-wrapper[data-theme="dark"] .text-gray-400 { color: #b3aac7 !important; }
      `}</style>
    </>
  )
}

export async function getStaticPaths() {
  const postsDir = path.join(process.cwd(), 'content/blog')
  const files = fs.readdirSync(postsDir)

  const paths = files.map((filename) => ({
    params: { slug: filename.replace('.md', '') },
  }))

  return { paths, fallback: false }
}

export async function getStaticProps({ params }) {
  const filePath = path.join(process.cwd(), 'content/blog', `${params.slug}.md`)
  const fileContent = fs.readFileSync(filePath, 'utf8')
  const { data, content } = matter(fileContent)

  const processedContent = await remark().use(html).process(content)
  const contentHtml = processedContent.toString()

  return { props: { frontmatter: data, contentHtml, slug: params.slug } }
}
