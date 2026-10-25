import Head from 'next/head';
import { SITE, abs } from '../lib/seoSchemas';

// One component sets every tag, once. Use it instead of hand-written <Head> blocks.
export default function SeoHead({ title, description, path = '/', image, noindex = false, type = 'website', published, modified, jsonLd = [] }) {
  const url = abs(path);
  const img = abs(image || SITE.defaultImage);
  const ld = (Array.isArray(jsonLd) ? jsonLd : [jsonLd]).filter(Boolean);
  return (
    <Head>
      <title key="title">{title}</title>
      <meta key="description" name="description" content={description} />
      <link key="canonical" rel="canonical" href={url} />
      <meta key="robots" name="robots" content={noindex ? 'noindex,follow' : 'index,follow,max-image-preview:large'} />
      <meta key="og:title" property="og:title" content={title} />
      <meta key="og:description" property="og:description" content={description} />
      <meta key="og:url" property="og:url" content={url} />
      <meta key="og:type" property="og:type" content={type} />
      <meta key="og:image" property="og:image" content={img} />
      <meta key="og:site_name" property="og:site_name" content={SITE.name} />
      <meta key="og:locale" property="og:locale" content={SITE.locale} />
      <meta key="twitter:card" name="twitter:card" content="summary_large_image" />
      <meta key="twitter:title" name="twitter:title" content={title} />
      <meta key="twitter:description" name="twitter:description" content={description} />
      <meta key="twitter:image" name="twitter:image" content={img} />
      {published ? <meta key="article:published_time" property="article:published_time" content={published} /> : null}
      {modified ? <meta key="article:modified_time" property="article:modified_time" content={modified} /> : null}
      {ld.map((o, i) => (
        <script key={`ld-${i}`} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(o) }} />
      ))}
    </Head>
  );
}
