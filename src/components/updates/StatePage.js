import Link from 'next/link';
import { useEffect, useRef } from 'react';
import TopicNav from './TopicNav';

const dtf = (s) => (s ? new Date(s).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }) : '-');
const fmt = (n) => (n == null ? '-' : Number(n).toLocaleString('en-IN'));

function Kf({ l, v, wide }) {
  return (<div className={'kf' + (wide ? ' wide' : '')}><span className="kf-l">{l}</span><span className="kf-v">{v || '-'}</span></div>);
}
function Slabs({ tables }) {
  return (tables || []).map((t, i) => (
    <div className="slab" key={i}>
      {t.title ? <h3 className="slab-t">{t.title}</h3> : null}
      <div className="scroller">
        <table>
          <thead><tr><th>{t.unit || 'Salary'}</th><th className="num">Tax</th></tr></thead>
          <tbody>{t.rows.map((r, j) => (<tr key={j} style={{ cursor: 'default' }}><td>{r.band}</td><td className="num">{r.amt}</td></tr>))}</tbody>
        </table>
      </div>
    </div>
  ));
}
function Dl({ items }) {
  return (<dl className="dl">{items.map(([k, v]) => (<span key={k} style={{ display: 'contents' }}><dt>{k}</dt><dd>{v || '-'}</dd></span>))}</dl>);
}
function Watch({ text, strong }) {
  if (!text) return null;
  return (
    <div className={strong ? 'pend' : 'srcbox'} style={{ marginTop: 16 }}>
      <h4 style={{ fontSize: '.74rem', textTransform: 'uppercase', letterSpacing: '.6px', color: 'var(--ink-soft)', marginBottom: 7 }}>What to watch</h4>
      <div style={{ fontSize: '.92rem', lineHeight: 1.7, color: 'var(--ink)' }}>{text}</div>
    </div>
  );
}

function PtBody({ row }) {
  return (
    <>
      <div className="keyfacts">
        <Kf l="Cycle" v={row.cycle} wide={(row.cycle || '').length > 28} />
        <Kf l="Basis" v={row.basis} wide={(row.basis || '').length > 28} />
        <Kf l="Due" v={row.due} wide />
      </div>
      <Slabs tables={row.tables} />
      <Dl items={[['Governing instrument', row.act], ['Annual ceiling', row.cap]]} />
      <Watch text={row.notes} />
    </>
  );
}
function LwfBody({ row }) {
  return (
    <>
      <div className="keyfacts">
        <Kf l="Employee" v={row.emp} /><Kf l="Employer" v={row.empr} /><Kf l="Frequency" v={row.freq} /><Kf l="Due" v={row.due} wide />
      </div>
      <Dl items={[['Ratio (employee : employer)', row.ratio], ['Governing instrument', row.act]]} />
      <Watch text={row.notes} strong={/Widest ratio/.test(row.notes || '')} />
    </>
  );
}
function MwBody({ row }) {
  const cats = row.categories && row.categories.length ? row.categories
    : [['Unskilled', row.uns], ['Semi-skilled', row.semi], ['Skilled', row.sk], ['Highly skilled', row.hs]].filter((x) => x[1]).map((x) => ({ name: x[0], month: x[1], day: null }));
  const hist = (row.hist || []);
  return (
    <>
      {cats.length ? (
        <div className="rate-box">
          <div className="rate-h">In force from {dtf(row.eff)}{row.struct ? <span className="rate-s"> ({row.struct})</span> : null}</div>
          {cats.map((c) => (
            <div className="rate-row" key={c.name}>
              <span className="rate-name">{c.name}</span>
              <span className="rate-val">Rs. {fmt(c.month)} <small>per month</small>{c.day ? <span className="rate-day"> (Rs. {fmt(c.day)} per day)</span> : null}</span>
            </div>
          ))}
          {row.ref ? <div className="rate-ref">{row.ref}</div> : null}
        </div>
      ) : null}
      <Dl items={[['Zone structure', row.zones], ['Revision cadence', row.cad], ['Authority', row.auth]]} />
      {row.notes ? <p style={{ marginTop: 14, fontSize: '.92rem', lineHeight: 1.7 }}>{row.notes}</p> : null}
      {row.url ? (<div className="srcbox"><h4>Official source</h4><a href={row.url} target="_blank" rel="noopener noreferrer">{row.url}</a></div>) : null}
      {hist.length > 1 ? (
        <div className="hist" style={{ marginTop: 18 }}>
          <div className="hist-h">Rate history - {hist.length} cycles</div>
          {hist.map((h, i) => (
            <div className="hist-r" key={i}>
              <b>{h.eff ? dtf(h.eff) : 'Date not established'}{h.label ? ' - ' + h.label : ''}</b>
              {h.uns ? (<div style={{ marginTop: 7, fontSize: '.87rem', color: 'var(--ink-soft)' }}>Unskilled {fmt(h.uns)} &middot; Semi {fmt(h.semi)} &middot; Skilled {fmt(h.sk)} &middot; Highly skilled {fmt(h.hs)}</div>) : null}
              {h.ref ? <div style={{ marginTop: 5, fontSize: '.79rem', color: 'var(--ink-soft)' }}><b>{h.ref}</b></div> : null}
            </div>
          ))}
        </div>
      ) : null}
    </>
  );
}

const COPY = {
  key: {
    pt: (s) => ({ h1: s + ' Professional Tax: slab rates, due dates and rules', lead: 'How Professional Tax works in ' + s + ': the slab rates, when the tax is due, the annual ceiling and the law behind it, taken from the official notifications and explained in plain English.', title: s + ' Professional Tax: Slab Rates, Due Dates and Rules | PayrollTool.in', desc: s + ' Professional Tax: slab rates, payment cycle, due dates, annual ceiling and governing law, with the latest notifications explained in English and Hindi.' }),
    lwf: (s) => ({ h1: s + ' Labour Welfare Fund: contribution rates and due dates', lead: 'What employers and employees contribute to the Labour Welfare Fund in ' + s + ', how often it is paid, when it is due and which law applies.', title: s + ' Labour Welfare Fund: Rates and Due Dates | PayrollTool.in', desc: s + ' Labour Welfare Fund: employee and employer contribution, frequency, due dates and governing law, with the latest notifications in English and Hindi.' }),
    mw: (s) => ({ h1: s + ' minimum wages: current rates and revision history', lead: 'The minimum wage rates in force in ' + s + ' by skill category, how they have been revised over time and the official notification behind them.', title: s + ' Minimum Wages: Current Rates and History | PayrollTool.in', desc: s + ' minimum wages: current monthly rates by category, revision history and the official notification, explained in English and Hindi.' }),
  },
};
export function stateCopy(key, state) { return COPY.key[key](state); }

export default function StatePage({ topic, state, row, notifications, others, topics, options }) {
  const copy = stateCopy(topic.key, state.name);
  const root = useRef(null);
  // official-source clicks are counted in Google Analytics (does nothing if Analytics is not on the page)
  useEffect(() => {
    const el = root.current; if (!el) return undefined;
    const onClick = (e) => {
      const a = e.target.closest('a[href^="http"]'); if (!a) return;
      let host = ''; try { host = new URL(a.href).hostname; } catch (err) { return; }
      if (host === window.location.hostname) return;
      const ev = { link_domain: host.slice(0, 60), from: 'state_page', topic: topic.slug, state: state.name.slice(0, 40) };
      try { if (typeof window.gtag === 'function') window.gtag('event', 'updates_source_click', ev); } catch (err) { /* never break the page for analytics */ }
    };
    el.addEventListener('click', onClick);
    return () => el.removeEventListener('click', onClick);
  }, [topic.slug, state.name]);

  return (
    <main className="upd" ref={root}>
      <div className="upd-wrap">
        <nav className="crumbs" aria-label="Breadcrumb">
          <Link href="/updates">Updates</Link><span className="sep">&rsaquo;</span>
          <Link href={'/updates/' + topic.slug}>{topic.label}</Link><span className="sep">&rsaquo;</span>
          <span>{state.name}</span>
        </nav>
        <TopicNav topics={topics} currentTopic={topic.slug} stateSlug={state.slug} stateName={state.name} options={options} pickLabel="State" />
        <h1 className="sp-h1">{copy.h1}</h1>
        <p className="sp-lead">{copy.lead}</p>

        <div className="sp-card">
          {topic.key === 'pt' ? <PtBody row={row} /> : topic.key === 'lwf' ? <LwfBody row={row} /> : <MwBody row={row} />}
        </div>

        {notifications.length ? (
          <section className="sp-sec">
            <h2>Latest {topic.label} notifications for {state.name}</h2>
            {notifications.map((n) => (
              <article className="art" key={n.id}>
                <div className="meta"><span className={'pill ' + (n.flag === 'current' ? 'ok' : '')}>{String(n.flag || '').replace(/_/g, ' ')}</span> &nbsp;{[n.eff ? 'Effective ' + dtf(n.eff) : '', n.src].filter(Boolean).join(' - ')}</div>
                <h3><Link href={'/updates/notifications/' + n.slug} className="card-link">{n.title}</Link></h3>
                <p className="sum">{n.short}</p>
                <Link href={'/updates/notifications/' + n.slug} className="btn">Read the full explanation</Link>
              </article>
            ))}
          </section>
        ) : null}

        <details className="ex" style={{ marginTop: 34 }}>
          <summary>{topic.label} in other states</summary>
          <div className="ex-body"><div className="statelinks">{others.map((o) => (<Link key={o.slug} href={'/updates/' + topic.slug + '/' + o.slug}>{o.name}</Link>))}</div></div>
        </details>
      </div>

      <div className="foot">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></svg>
        <p>Summaries are for guidance only and are not a substitute for the official notification or professional advice.</p>
      </div>
    </main>
  );
}
