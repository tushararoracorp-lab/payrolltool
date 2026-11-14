/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The calculator used to be a standalone HTML page; its old address goes to the current one.
  async redirects() {
    return [{ source: '/salary-proration-tool.html', destination: '/salary-proration', permanent: true }];
  },
};

module.exports = nextConfig;
