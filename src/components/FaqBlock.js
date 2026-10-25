import { faqSchema } from '../lib/seoSchemas';

// Visible FAQ and its FAQPage JSON-LD come from the SAME array, so they can never disagree.
export default function FaqBlock({ faqs, title = 'Frequently asked questions' }) {
  if (!faqs || !faqs.length) return null;
  return (
    <section className="faq-block" aria-labelledby="faq-heading">
      <h2 id="faq-heading">{title}</h2>
      {faqs.map((f) => (
        <div className="faq-item" key={f.q}>
          <h3>{f.q}</h3>
          <p>{f.a}</p>
        </div>
      ))}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema(faqs)) }} />
    </section>
  );
}
