module.exports = {
  siteUrl: "https://www.payrolltool.in",
  generateRobotsTxt: false,
  changefreq: "weekly",
  priority: 0.8,
  exclude: ["/admin", "/admin/*", "/api/*"],
  transform: async (config, path) => {
    let priority = 0.7;
    if (path === "/") priority = 1.0;
    if (["/salary-proration", "/lop-splitter", "/pf-ecr-creator", "/final-settlement", "/tax-calculator"].includes(path)) {
      priority = 0.9;
    }
    return {
      loc: path,
      changefreq: config.changefreq,
      priority,
      lastmod: new Date().toISOString(),
    };
  },
};