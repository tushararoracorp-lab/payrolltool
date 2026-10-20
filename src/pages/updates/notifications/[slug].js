import Header from '../../../components/Header';
import Footer from '../../../components/Footer';
import UpdatesStyles from '../../../components/updates/UpdatesStyles';
import Seo from '../../../components/updates/Seo';
import NotificationPage from '../../../components/updates/NotificationPage';
import { getNotification, listNotificationPaths } from '../../../lib/updates/pageData';
import { isIndexable } from '../../../lib/updates/flags';

// Every notification gets a page. One added later (after an approval) is built the first time it is opened.
export async function getStaticPaths() {
  return { paths: (await listNotificationPaths()).map((p) => ({ params: p })), fallback: 'blocking' };
}

export async function getStaticProps({ params }) {
  const page = await getNotification(params.slug);
  if (!page) return { notFound: true, revalidate: 600 };
  // an old or hand-typed address that still carries the right id goes to the canonical one
  if (page.canonical !== params.slug) return { redirect: { destination: '/updates/notifications/' + page.canonical, permanent: true } };
  return { props: { ...page, indexable: isIndexable() }, revalidate: 600 };
}

const clip = (s, n) => (String(s).length > n ? String(s).slice(0, n - 1).trimEnd() + '\u2026' : String(s));

export default function NotificationRoute(props) {
  const { n, canonical, indexable } = props;
  const path = '/updates/notifications/' + canonical;
  return (
    <>
      <Seo title={clip(n.title, 62) + ' | PayrollTool.in'} description={clip(n.short, 158)} path={path} indexable={indexable}
        crumbs={[{ name: 'Updates', path: '/updates' }, { name: 'Notifications', path: '/updates' }, { name: clip(n.title, 60), path }]} />
      <Header />
      <NotificationPage {...props} />
      <Footer />
      <UpdatesStyles />
    </>
  );
}
