// /updates/notifications has no page of its own (the list of notifications is /updates). A permanent redirect avoids a dead end
// for anyone who shortens a notification address, and tells search engines where it went.
export async function getServerSideProps() {
  return { redirect: { destination: '/updates', permanent: true } };
}

export default function NotificationsIndex() { return null; }
