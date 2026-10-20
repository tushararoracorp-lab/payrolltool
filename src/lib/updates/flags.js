// Search engines may index /updates pages only on the live site AND only after UPDATES_INDEXABLE=1 is set in Production.
// UAT, previews and local runs are always noindex. This lets you merge to main without publishing unverified data to Google.
function isIndexable() {
  return process.env.VERCEL_ENV === 'production' && process.env.UPDATES_INDEXABLE === '1';
}
module.exports = { isIndexable };
