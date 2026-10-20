// Pages under /updates are noindex until UPDATES_INDEXABLE=1 is set in Production (see SUBPAGES.md).
// Keep them out of the sitemap until then: Google reports "submitted URL marked noindex" for pages that are in a sitemap but hidden.
const updatesIndexable = process.env.VERCEL_ENV === "production" && process.env.UPDATES_INDEXABLE === "1";

module.exports = {
  siteUrl: "https://www.payrolltool.in",
  generateRobotsTxt: false,
  changefreq: "weekly",
  priority: 0.8,
  exclude: ["/admin", "/admin/*", "/api/*", ...(updatesIndexable ? [] : ["/updates", "/updates/*"])],
  transform: async (config, path) => {
    let priority = 0.7;
    if (path === "/") priority = 1.0;
    if (["/salary-proration", "/lop-splitter", "/pf-ecr-creator", "/final-settlement", "/tax-calculator"].includes(path)) {
      priority = 0.9;
    }
    if (path === "/updates") priority = 0.8;
    return {
      loc: path,
      changefreq: config.changefreq,
      priority,
      lastmod: new Date().toISOString(),
    };
  },
};
