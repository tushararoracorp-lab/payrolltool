import Link from 'next/link';

// Plain server-rendered links: no JavaScript cost. Lists live in src/config/related.js.
export default function RelatedLinks({ title = 'Also on PayrollTool.in', links }) {
  if (!links || !links.length) return null;
  return (
    <aside className="related-links" aria-label={title}>
      <h2>{title}</h2>
      <ul>
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href}>{l.label}</Link>
            {l.note ? <span> {l.note}</span> : null}
          </li>
        ))}
      </ul>
    </aside>
  );
}
