import Link from 'next/link';

// Plain server-rendered links: no JavaScript cost. Lists live in src/config/related.js.
// Each row: the link on its own line, the note underneath in smaller grey text.
export default function RelatedLinks({ title = 'Also on PayrollTool.in', links }) {
  if (!links || !links.length) return null;
  return (
    <aside className="related-links" aria-label={title}>
      <h2>{title}</h2>
      <ul>
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href}>{l.label}</Link>
            {l.note ? <span className="note">{l.note}</span> : null}
          </li>
        ))}
      </ul>
      <style jsx>{`
        .related-links {
          margin: 48px 0 0;
          padding: 22px 24px;
          border: 1px solid #E7E1F3;
          border-radius: 18px;
          background: #FFFFFF;
          box-shadow: 0 1px 2px rgba(27, 21, 38, 0.04);
        }
        h2 {
          margin: 0 0 14px;
          padding: 0;
          font-family: 'Sora', sans-serif;
          font-size: 1.05rem;
          font-weight: 700;
          color: #1B1526;
        }
        ul {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        li {
          margin: 0;
          padding: 0 0 0 14px;
          line-height: 1.45;
          border-left: 2px solid #E7E1F3;
        }
        li:hover {
          border-left-color: #7C3AED;
        }
        li :global(a) {
          display: inline-block;
          font-weight: 600;
          font-size: 0.97rem;
          color: #6D28D9;
          text-decoration: none;
        }
        li :global(a:hover) {
          text-decoration: underline;
        }
        li :global(a:focus-visible) {
          outline: 2px solid #7C3AED;
          outline-offset: 2px;
          border-radius: 4px;
        }
        .note {
          display: block;
          margin-top: 2px;
          font-size: 0.87rem;
          color: #4A4258;
        }
        :global(html[data-theme='dark']) .related-links {
          background: #1F1830;
          border-color: #3A2F52;
          box-shadow: none;
        }
        :global(html[data-theme='dark']) li {
          border-left-color: #3A2F52;
        }
        :global(html[data-theme='dark']) li:hover {
          border-left-color: #A47DF5;
        }
        :global(html[data-theme='dark']) h2 {
          color: #F3F0FA;
        }
        :global(html[data-theme='dark']) li :global(a) {
          color: #A47DF5;
        }
        :global(html[data-theme='dark']) .note {
          color: #B3AAC7;
        }
      `}</style>
    </aside>
  );
}
