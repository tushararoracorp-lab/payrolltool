import Link from 'next/link';
import { useRouter } from 'next/router';

// At the top of every state and topic page: switch topic (tabs) or state (dropdown) without scrolling.
export default function TopicNav({ topics, currentTopic, stateSlug, stateName, options, pickLabel }) {
  const router = useRouter();
  const hrefFor = (t) => '/updates/' + t.slug + (stateSlug && t.available ? '/' + stateSlug : '');
  return (
    <div className="sp-nav">
      <nav className="sp-tabs" aria-label="Topic">
        {topics.map((t) => (t.available
          ? <Link key={t.slug} href={hrefFor(t)} className={'sp-tab' + (t.slug === currentTopic ? ' on' : '')} aria-current={t.slug === currentTopic ? 'page' : undefined}>{t.label}</Link>
          : <span key={t.slug} className="sp-tab off" title={'Not applicable in ' + stateName}>{t.label}</span>))}
      </nav>
      <label className="sp-pick">
        <span>{pickLabel}</span>
        <select value={stateSlug || ''} onChange={(e) => { if (e.target.value) router.push('/updates/' + currentTopic + '/' + e.target.value); }}>
          {!stateSlug ? <option value="">Choose a state</option> : null}
          {options.map((o) => <option key={o.slug} value={o.slug}>{o.name}</option>)}
        </select>
      </label>
    </div>
  );
}
