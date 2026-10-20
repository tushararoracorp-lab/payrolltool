import Header from '../../../components/Header';
import Footer from '../../../components/Footer';
import UpdatesStyles from '../../../components/updates/UpdatesStyles';
import Seo from '../../../components/updates/Seo';
import HubPage, { hubCopy } from '../../../components/updates/HubPage';
import { getHub, TOPICS } from '../../../lib/updates/pageData';
import { isIndexable } from '../../../lib/updates/flags';

export async function getStaticPaths() {
  return { paths: Object.keys(TOPICS).map((topic) => ({ params: { topic } })), fallback: false };
}

export async function getStaticProps({ params }) {
  const hub = await getHub(params.topic);
  if (!hub) return { notFound: true };
  return { props: { hub, indexable: isIndexable() }, revalidate: 600 };
}

export default function TopicHub({ hub, indexable }) {
  const c = hubCopy(hub.topic.key);
  const path = '/updates/' + hub.topic.slug;
  return (
    <>
      <Seo title={c.title} description={c.desc} path={path} indexable={indexable}
        crumbs={[{ name: 'Updates', path: '/updates' }, { name: hub.topic.label, path }]} />
      <Header />
      <HubPage hub={hub} />
      <Footer />
      <UpdatesStyles />
    </>
  );
}
