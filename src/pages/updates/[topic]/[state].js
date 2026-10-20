import Header from '../../../components/Header';
import Footer from '../../../components/Footer';
import UpdatesStyles from '../../../components/updates/UpdatesStyles';
import Seo from '../../../components/updates/Seo';
import StatePage, { stateCopy } from '../../../components/updates/StatePage';
import { getStatePage, listStatePaths } from '../../../lib/updates/pageData';
import { isIndexable } from '../../../lib/updates/flags';

// Every state that has data gets a page at build time. A state added later (after an approval) is built the first time it is requested.
export async function getStaticPaths() {
  const paths = (await listStatePaths()).map((p) => ({ params: p }));
  return { paths, fallback: 'blocking' };
}

export async function getStaticProps({ params }) {
  const page = await getStatePage(params.topic, params.state);
  if (!page) return { notFound: true, revalidate: 600 };
  return { props: { ...page, indexable: isIndexable() }, revalidate: 600 };
}

export default function StateRoute(props) {
  const { topic, state, indexable } = props;
  const copy = stateCopy(topic.key, state.name);
  const path = '/updates/' + topic.slug + '/' + state.slug;
  return (
    <>
      <Seo title={copy.title} description={copy.desc} path={path} indexable={indexable}
        crumbs={[{ name: 'Updates', path: '/updates' }, { name: topic.label, path: '/updates/' + topic.slug }, { name: state.name, path }]} />
      <Header />
      <StatePage {...props} />
      <Footer />
      <UpdatesStyles />
    </>
  );
}
