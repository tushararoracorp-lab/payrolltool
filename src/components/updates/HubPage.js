import Link from 'next/link';
import TopicNav from './TopicNav';

const COPY = {
  pt: { h1: 'Professional Tax by state', lead: 'Which Indian states levy Professional Tax, how each one collects it and when it is due. Open a state for its slab rates, due dates and the latest notifications.', title: 'Professional Tax by State: Slabs and Due Dates | PayrollTool.in', desc: 'Professional Tax in every Indian state: who levies it, the payment cycle, slab rates and due dates, with the official notifications.', no: 'States that do not levy Professional Tax' },
  lwf: { h1: 'Labour Welfare Fund by state', lead: 'Which states run a Labour Welfare Fund, what employees and employers contribute and when it is paid. Open a state for the rates, due dates and the law behind them.', title: 'Labour Welfare Fund by State: Rates and Due Dates | PayrollTool.in', desc: 'Labour Welfare Fund in every Indian state: contribution rates, frequency, due dates and governing law, with the official notifications.', no: 'States with no Labour Welfare Fund' },
  mw: { h1: 'Minimum wages by state', lead: 'Current minimum wage rates for every state and union territory, with revision history and the official notification. Open a state for the full rate list.', title: 'Minimum Wages by State: Current Rates | PayrollTool.in', desc: 'Current minimum wage rates for every Indian state and union territory by skill category, with revision history, explained in plain English.', no: '' },
};
export function hubCopy(key) { return COPY[key]; }

export default function HubPage({ hub }) {
  const c = COPY[hub.topic.key];
  return (
    <main className="upd">
      <div className="upd-wrap">
        <nav className="crumbs" aria-label="Breadcrumb">
          <Link href="/updates">Updates</Link><span className="sep">&rsaquo;</span><span>{hub.topic.label}</span>
        </nav>
        <TopicNav topics={hub.topics} currentTopic={hub.topic.slug} stateSlug={null} stateName="" options={hub.options} pickLabel="Jump to a state" />
        <h1 className="sp-h1">{c.h1}</h1>
        <p className="sp-lead">{c.lead}</p>
        <div className="hubgrid">
          {hub.items.map((it) => (
            <Link key={it.slug} href={'/updates/' + hub.topic.slug + '/' + it.slug} className="jcard">
              <h4>{it.name}</h4>
              <div className="l1">{it.line}</div>
            </Link>
          ))}
        </div>
        {hub.notApplicable.length ? (
          <p className="hubnote"><b>{c.no}:</b> {hub.notApplicable.join(', ')}.</p>
        ) : null}
      </div>
    </main>
  );
}
