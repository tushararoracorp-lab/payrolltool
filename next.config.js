/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      // The calculator used to be a standalone HTML page; its old address goes to the current one.
      { source: '/salary-proration-tool.html', destination: '/salary-proration', permanent: true },
      // Google picked up the page templates from the site's code and reports them as 404s. Send them to the hubs.
      { source: '/blog/%5Bslug%5D', destination: '/blog', permanent: true },
      { source: '/blog/\\[slug\\]', destination: '/blog', permanent: true },
      { source: '/updates/notifications/%5Bslug%5D', destination: '/updates', permanent: true },
      { source: '/updates/notifications/\\[slug\\]', destination: '/updates', permanent: true },
      { source: '/updates/%5Btopic%5D/%5Bstate%5D', destination: '/updates', permanent: true },
      { source: '/updates/\\[topic\\]/\\[state\\]', destination: '/updates', permanent: true },
      { source: '/updates/%5Btopic%5D', destination: '/updates', permanent: true },
      { source: '/updates/\\[topic\\]', destination: '/updates', permanent: true },
    ];
  },
};

module.exports = nextConfig;
