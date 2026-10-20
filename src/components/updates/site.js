// The address every canonical link and breadcrumb uses. It matches siteUrl in next-sitemap.config.js.
// Override with NEXT_PUBLIC_SITE_URL if the live site ever moves between www and non-www.
export const SITE = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.payrolltool.in').replace(/\/$/, '');
