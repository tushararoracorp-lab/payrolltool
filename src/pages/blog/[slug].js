import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import { remark } from 'remark'
import html from 'remark-html'
import Header from '../../components/Header'
import Footer from '../../components/Footer'

export default function BlogPost({ frontmatter, contentHtml }) {
  return (
    <>
      <Header />
      <main className="max-w-3xl mx-auto px-4 py-16">
        <span className="text-xs font-bold text-violet-700 bg-violet-50 px-3 py-1 rounded-full">
          GUIDE
        </span>
        <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 mt-4">
          {frontmatter.title}
        </h1>
        <span className="text-xs text-gray-400 mt-3 block mb-10">{frontmatter.date}</span>

        <article
          className="prose prose-violet max-w-none prose-headings:font-bold prose-a:text-violet-700"
          dangerouslySetInnerHTML={{ __html: contentHtml }}
        />
      </main>
      <Footer />
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

  return { props: { frontmatter: data, contentHtml } }
}