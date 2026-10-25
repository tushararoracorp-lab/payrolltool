// Schema.org builders. All return plain objects; SeoHead / FaqBlock turn them into JSON-LD.
export const SITE = {
  url: 'https://www.payrolltool.in',
  name: 'PayrollTool.in',
  logo: 'https://www.payrolltool.in/icon.png',
  defaultImage: '/og-homepage.jpg', // 1200x630; confirm the file exists (audit command e)
  locale: 'en_IN',
  // Set these to match the About page exactly before publishing Article schema.
  author: { name: 'Tushar Arora', url: 'https://www.payrolltool.in/about' },
};
export const abs = (p) => (/^https?:/.test(p) ? p : SITE.url + (p === '/' ? '' : p));
// Financial year label from the build date, e.g. 2026-27. No manual yearly edits.
export function fy(date = new Date()) {
  const y = date.getFullYear();
  const start = date.getMonth() >= 3 ? y : y - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, '0')}`;
}
export const year = (date = new Date()) => date.getFullYear();
const CTX = 'https://schema.org';
const publisher = () => ({ '@type': 'Organization', name: SITE.name, url: SITE.url, logo: { '@type': 'ImageObject', url: SITE.logo } });

export const organizationSchema = (sameAs = []) => ({ '@context': CTX, '@type': 'Organization', name: SITE.name, url: SITE.url, logo: SITE.logo, ...(sameAs.length ? { sameAs } : {}) });
export const websiteSchema = () => ({ '@context': CTX, '@type': 'WebSite', name: SITE.name, url: SITE.url, inLanguage: 'en-IN' });
export const breadcrumbSchema = (items) => ({
  '@context': CTX, '@type': 'BreadcrumbList',
  itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: abs(it.path) })),
});
export const faqSchema = (faqs) => ({
  '@context': CTX, '@type': 'FAQPage',
  mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
});
export const howToSchema = ({ name, description, steps }) => ({
  '@context': CTX, '@type': 'HowTo', name, description,
  step: steps.map((s, i) => ({ '@type': 'HowToStep', position: i + 1, name: s.name, text: s.text })),
});
export const webApplicationSchema = ({ name, path, description, features = [] }) => ({
  '@context': CTX, '@type': 'WebApplication', name, url: abs(path), description,
  applicationCategory: 'BusinessApplication', operatingSystem: 'Web', browserRequirements: 'Requires JavaScript',
  inLanguage: 'en-IN', isAccessibleForFree: true,
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' },
  ...(features.length ? { featureList: features } : {}), publisher: publisher(),
});
export const articleSchema = ({ headline, path, description, datePublished, dateModified, image, citation }) => ({
  '@context': CTX, '@type': 'Article', headline, description, mainEntityOfPage: abs(path), url: abs(path), inLanguage: 'en-IN',
  datePublished, dateModified: dateModified || datePublished,
  author: { '@type': 'Person', name: SITE.author.name, url: SITE.author.url },
  publisher: publisher(), image: [abs(image || SITE.defaultImage)],
  ...(citation ? { citation } : {}),
});
export const itemListSchema = (name, items) => ({
  '@context': CTX, '@type': 'ItemList', name,
  itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, url: abs(it.path) })),
});
