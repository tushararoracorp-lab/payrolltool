import Link from 'next/link';
import { useEffect, useRef } from 'react';

const dtf = (s) => (s ? new Date(s).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }) : '-');
const paras = (t) => String(t || '').split(/\n\n+/).filter(Boolean);
const gt = (name, params) => { try { if (typeof window.gtag === 'function') window.gtag('event', name, params); } catch (e) { /* never break the page for analytics */ } };

export default function NotificationPage({ n, related, stateLink }) {
  const root = useRef(null);
  // Analytics: official-source clicks, and readers who open the Hindi text
  useEffect(() => {
    const el = root.current; if (!el) return undefined;
    const onClick = (e) => {
      const a = e.target.closest('a[href^="http"]'); if (!a) return;
      let host = ''; try { host = new URL(a.href).hostname; } catch (err) { return; }
      if (host === window.location.hostname) return;
      gt('updates_source_click', { link_domain: host.slice(0, 60), from: 'notification_page', topic: 'notifications', item_id: String(n.key).slice(0, 40) });
    };
    const hi = el.querySelector('details.hi');
    const onToggle = () => { if (hi && hi.open) gt('updates_explainer_language', { language: 'hi', item_id: String(n.key).slice(0, 40), item_title: String(n.title).slice(0, 90) }); };
    el.addEventListener('click', onClick); if (hi) hi.addEventListener('toggle', onToggle);
    return () => { el.removeEventListener('click', onClick); if (hi) hi.removeEventListener('toggle', onToggle); };
  }, [n.key, n.title]);

  return (
    <main className="upd" ref={root}>
      <div className="upd-wrap">
        <nav className="crumbs" aria-label="Breadcrumb">
          <Link href="/updates">Updates</Link><span className="sep">&rsaquo;</span>
          <Link href="/updates">Notifications</Link><span className="sep">&rsaquo;</span>
          <span>{n.cat}{n.state ? ' - ' + n.state : ''}</span>
        </nav>
        <div className="np-chips">
          <span className="pill brand">{n.cat}</span><span className="pill">{n.state || 'All India'}</span>
          <span className={'pill ' + (n.flag === 'current' ? 'ok' : '')}>{String(n.flag || '').replace(/_/g, ' ')}</span>
        </div>
        <h1 className="sp-h1">{n.title}</h1>

        <div className="glance np-glance">
          <h5>At a glance</h5>
          <p>{n.short}</p>
          <dl>
            {n.ref ? (<><dt>Reference</dt><dd>{n.ref}</dd></>) : null}
            <dt>Effective</dt><dd>{dtf(n.eff)}</dd>
            {n.src ? (<><dt>Issued by</dt><dd>{n.src}</dd></>) : null}
          </dl>
        </div>

        <section className="sp-sec">
          <h2>The full explanation</h2>
          <div className="np-body">{paras(n.en).map((p, i) => <p key={i}>{p}</p>)}</div>
          <details className="ex hi">
            <summary lang="hi">हिंदी में पढ़ें</summary>
            <div className="ex-body" lang="hi">{paras(n.hi).map((p, i) => <p key={i}>{p}</p>)}</div>
          </details>
          {n.url ? (<div className="srcbox"><h4>Official source</h4><a href={n.url} target="_blank" rel="noopener noreferrer">{n.url}</a></div>) : null}
        </section>

        {stateLink ? (
          <section className="sp-sec">
            <h2>Rates and due dates</h2>
            <div className="statelinks"><Link href={stateLink.href}>{stateLink.label} &rarr;</Link></div>
          </section>
        ) : null}

        {related.length ? (
          <section className="sp-sec">
            <h2>More {n.cat} notifications</h2>
            <ul className="np-related">
              {related.map((r) => (<li key={r.slug}><Link href={'/updates/notifications/' + r.slug}>{r.title}</Link><span>{r.state} - {dtf(r.eff)}</span></li>))}
            </ul>
          </section>
        ) : null}
      </div>

      <div className="foot">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></svg>
        <p>Summaries are for guidance only and are not a substitute for the official notification or professional advice.</p>
      </div>
    </main>
  );
}
