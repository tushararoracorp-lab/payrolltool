import Head from 'next/head';

const SITE = 'https://payrolltool.in';

// title, description, canonical, robots (noindex until indexing is switched on) and breadcrumb markup for one page
export default function Seo({ title, description, path, crumbs, indexable }) {
  const url = SITE + path;
  const ld = crumbs && crumbs.length ? JSON.stringify({
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: SITE + c.path })),
  }) : null;
  return (
    <Head>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      <meta name="robots" content={indexable ? 'index,follow' : 'noindex,nofollow'} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content="website" />
      <meta property="og:image" content={SITE + '/og-image.jpg'} />
      {ld && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ld }} />}
    </Head>
  );
}
