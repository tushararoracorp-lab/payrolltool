// Answer-first block for the top of a page: the direct answer in 40 to 60 words, a visible review date and a source.
const fmt = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

export default function AnswerBox({ children, reviewed, source }) {
  return (
    <div className="answer-box" role="note">
      <p className="answer-text">{children}</p>
      {reviewed ? (
        <p className="answer-meta">
          Last reviewed: <time dateTime={reviewed}>{fmt(reviewed)}</time>
          {source ? (<> | Source: <a href={source.href} rel="noopener">{source.label}</a></>) : null}
        </p>
      ) : null}
    </div>
  );
}
