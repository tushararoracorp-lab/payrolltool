import Head from 'next/head';
import { useEffect, useRef } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { buildMarkup } from '../components/updates/markup';
import initUpdates from '../components/updates/initUpdates';
import UpdatesStyles from '../components/updates/UpdatesStyles';
import { isIndexable } from '../lib/updates/flags';
import { SITE } from '../components/updates/site';
import { buildPublicData } from '../lib/updates/publicData';

// Built from the database. Rebuilt in the background once a day, and immediately after you approve a change
// (pages/api/decision.js calls res.revalidate('/updates')).
export async function getStaticProps() {
  const data = await buildPublicData();
  // the cards only need the summary; the full English and Hindi text is on each notification's own page
  const strip = ({ en, hi, ...rest }) => rest;   // eslint-disable-line no-unused-vars
  const light = { ...data, feed: data.feed.map(strip), mw: data.mw.map(strip),
    pt: { ...data.pt, rows: data.pt.rows.map(strip) }, lwf: { ...data.lwf, rows: data.lwf.rows.map(strip) } };
  return { props: { data: JSON.parse(JSON.stringify(light)), indexable: isIndexable() }, revalidate: 86400 };
}

export default function UpdatesPage({ data, indexable }) {
  const rootRef = useRef(null);
  const markup = buildMarkup(data);

  useEffect(() => {
    const root = rootRef.current;
    root.innerHTML = markup;              // start from clean markup (also keeps React strict mode from double-binding)
    return initUpdates(data, root);
  }, [data, markup]);

  return (
    <>
      <Head>
        <title>Payroll Compliance Updates and State Rates | PayrollTool.in</title>
        <meta name="description" content="Payroll compliance updates for India: EPF, ESI, TDS, PT, LWF and minimum wage notifications explained in English and Hindi, with state-wise rates." />
        <link rel="canonical" href={SITE + '/updates'} />
        <meta name="robots" content={indexable ? 'index,follow' : 'noindex,nofollow'} />
        <meta property="og:title" content="Payroll Compliance Updates and State Rates | PayrollTool.in" />
        <meta property="og:description" content="Payroll compliance updates for India: EPF, ESI, TDS, PT, LWF and minimum wage notifications explained in English and Hindi, with state-wise rates." />
        <meta property="og:url" content={SITE + '/updates'} />
        <meta property="og:type" content="website" />
        <meta property="og:image" content={SITE + '/og-homepage.jpg'} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:site_name" content="PayrollTool.in" />
        <meta property="og:locale" content="en_IN" />
        <meta name="twitter:card" content="summary_large_image" />
      </Head>
      <Header />
      <main className="upd" ref={rootRef} dangerouslySetInnerHTML={{ __html: markup }} suppressHydrationWarning />
      <Footer />
      <UpdatesStyles />
    </>
  );
}
