// Usage: node scripts/check-seo.js   (add to package.json: "seo:check": "node scripts/check-seo.js")
// Fails (exit 1) when a page breaks the SEO rules, so mistakes cannot ship.
const SEO = require('../src/config/seoPages');
const RELATED = require('../src/config/related');
const words = (s) => s.trim().split(/\s+/).length;
const errs = []; const titles = new Map(); const qs = new Set();
for (const [path, p] of Object.entries(SEO)) {
  const e = (m) => errs.push(`${path}: ${m}`);
  if (!p.title) e('missing title'); else {
    if (p.title.length > 60) e(`title is ${p.title.length} chars (max 60)`);
    if (titles.has(p.title)) e(`duplicate title, also used by ${titles.get(p.title)}`); titles.set(p.title, path);
  }
  if (!p.description) e('missing description'); else if (p.description.length < 110 || p.description.length > 160) e(`description is ${p.description.length} chars (110 to 160)`);
  if (p.answer) { const n = words(p.answer); if (n < 35 || n > 70) e(`answer block is ${n} words (35 to 70)`); if (!p.reviewed) e('answer block needs a reviewed date'); }
  (p.faqs || []).forEach((f) => {
    const n = words(f.a); if (n < 30 || n > 70) e(`FAQ "${f.q}" answer is ${n} words (30 to 70)`);
    if (qs.has(f.q)) e(`duplicate FAQ question "${f.q}"`); qs.add(f.q);
    if (!/[?]$/.test(f.q)) e(`FAQ "${f.q}" should end with ?`);
  });
  if (p.related && !RELATED[p.related]) e(`related group "${p.related}" not found in src/config/related.js`);
  if (p.howTo && (!p.howTo.steps || p.howTo.steps.length < 2)) e('howTo needs 2 or more steps');
}

// Every related link must point to a page or blog post that exists in this repo (no broken internal links).
const fs = require('fs'); const pathMod = require('path');
const ROOT = pathMod.join(__dirname, '..');
const exists = (rel) => fs.existsSync(pathMod.join(ROOT, rel));
function pageExists(href) {
  const clean = href.split(/[?#]/)[0].replace(/\/$/, '') || '/';
  if (clean === '/') return ['src/pages/index.js', 'pages/index.js'].some(exists);
  const m = clean.match(/^\/blog\/([^/]+)$/);
  if (m && ['md', 'mdx'].some((x) => exists(`content/blog/${m[1]}.${x}`))) return true;
  const base = clean.slice(1);
  return ['src/pages', 'pages'].some((dir) =>
    ['.js', '.jsx', '.tsx', '.mdx', '/index.js', '/index.jsx', '/index.tsx'].some((x) => exists(`${dir}/${base}${x}`)));
}
for (const [group, links] of Object.entries(RELATED)) {
  links.forEach((l) => { if (l.href.startsWith('/') && !pageExists(l.href)) errs.push(`related.js [${group}]: ${l.href} does not exist in this repo`); });
}
if (errs.length) { console.error('SEO check FAILED:\n - ' + errs.join('\n - ')); process.exit(1); }
console.log(`SEO check passed: ${Object.keys(SEO).length} pages, ${[...qs].length} FAQs, ${titles.size} unique titles.`);
