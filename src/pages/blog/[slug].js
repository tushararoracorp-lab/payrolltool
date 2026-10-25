import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import { remark } from 'remark'
import html from 'remark-html'
import Head from 'next/head'
import { useState, useEffect } from 'react'
import Header from '../../components/Header'
import Footer from '../../components/Footer'
import SeoHead from '../../components/SeoHead'
import AnswerBox from '../../components/AnswerBox'
import FaqBlock from '../../components/FaqBlock'
import RelatedLinks from '../../components/RelatedLinks'
import { articleSchema, breadcrumbSchema } from '../../lib/seoSchemas'
import SEO_PAGES from '../../config/seoPages'
import RELATED from '../../config/related'

// Front matter dates are DD-MM-YYYY; schema.org needs ISO 8601 (YYYY-MM-DD).
function toIsoDate(value) {
  const v = String(value || '').trim()
  const dmy = v.match(/^(\d{2})-(\d{2})-(\d{4})$/)
  if (dmy) return `${dmy[3]}-${dmy[2]}-${dmy[1]}`
  if (/^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10)
  return undefined
}

function formatDate(isoDate) {
  const d = new Date(isoDate)
  if (isNaN(d.getTime())) return isoDate
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function BlogPost({ frontmatter, contentHtml, slug }) {
  const canonicalUrl = `https://www.payrolltool.in/blog/${slug}`
  // Posts listed in src/config/seoPages.js get their title, H1, answer box, FAQs and related
  // links from there. Every other post keeps the front-matter title exactly as before.
  const seo = SEO_PAGES[`/blog/${slug}`]
  const publishedIso = toIsoDate(frontmatter.date)

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
      {seo ? (
        <SeoHead
          title={seo.title}
          description={seo.description}
          path={`/blog/${slug}`}
          type="article"
          published={publishedIso}
          modified={seo.reviewed}
          jsonLd={[
            breadcrumbSchema([
              { name: 'Home', path: '/' },
              { name: 'Blog', path: '/blog' },
              { name: seo.h1 || seo.title, path: `/blog/${slug}` },
            ]),
            articleSchema({
              headline: seo.h1 || seo.title,
              path: `/blog/${slug}`,
              description: seo.description,
              datePublished: publishedIso,
              dateModified: seo.reviewed,
            }),
          ]}
        />
      ) : (
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
        {publishedIso ? <meta property="article:published_time" content={publishedIso} /> : null}

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
              datePublished: publishedIso,
              author: { "@type": "Person", name: "Tushar Arora" },
              publisher: { "@type": "Organization", name: "PayrollTool.in", url: "https://www.payrolltool.in/" },
              mainEntityOfPage: { "@type": "WebPage", "@id": canonicalUrl },
            }),
          }}
        />
      </Head>
      )}

      <div className="post-wrapper" data-theme={theme} style={{ minHeight: "100vh" }}>
        <Header />
        <main className="max-w-3xl mx-auto px-4 py-16">
          <span className="text-xs font-bold text-violet-700 bg-violet-50 px-3 py-1 rounded-full">
            GUIDE
          </span>
          <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 mt-4">
            {seo?.h1 || frontmatter.title}
          </h1>
          <span className="text-xs text-gray-400 mt-3 block mb-10">{formatDate(frontmatter.date)}</span>

          {seo?.answer ? (
            <AnswerBox reviewed={seo.reviewed}>{seo.answer}</AnswerBox>
          ) : null}

          <article
            className={`prose prose-violet max-w-none prose-headings:font-bold prose-a:text-violet-700${theme === "dark" ? " prose-invert" : ""}`}
            dangerouslySetInnerHTML={{ __html: contentHtml }}
          />

          {seo?.faqs ? <FaqBlock faqs={seo.faqs} /> : null}
          {seo?.related ? <RelatedLinks links={RELATED[seo.related]} /> : null}
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
