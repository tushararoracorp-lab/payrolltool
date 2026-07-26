import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import Link from 'next/link'
import Head from 'next/head'
import Header from '../../components/Header'
import Footer from '../../components/Footer'

export default function BlogIndex({ posts }) {
  return (
    <>
      <Head>
        <title>Payroll Guides & Resources | PayrollTool</title>
        <meta
          name="description"
          content="Practical, free guides on LOP calculation, salary proration, PF ECR filing, and Indian payroll compliance."
        />
        <link rel="canonical" href="https://www.payrolltool.in/blog" />

        <meta property="og:type" content="website" />
        <meta property="og:title" content="Payroll Guides & Resources | PayrollTool" />
        <meta
          property="og:description"
          content="Practical, free guides on LOP calculation, salary proration, PF ECR filing, and Indian payroll compliance."
        />
        <meta property="og:url" content="https://www.payrolltool.in/blog" />
        <meta property="og:image" content="https://www.payrolltool.in/icon.png" />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Payroll Guides & Resources | PayrollTool" />
        <meta
          name="twitter:description"
          content="Practical, free guides on LOP calculation, salary proration, PF ECR filing, and Indian payroll compliance."
        />
      </Head>

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
              <span className="text-xs text-gray-400 mt-3 block">{post.date}</span>
            </Link>
          ))}
        </div>
      </main>
      <Footer />
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
