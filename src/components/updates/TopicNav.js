import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useRef, useState } from 'react';

// At the top of every state and topic page: switch topic (tabs) or state (dropdown) without scrolling.
// A click or tap on a state goes straight there. Moving through the list with the arrow keys (or the mouse wheel) does NOT load
// every state you pass: it waits until you stop for a moment or press Enter, so each visit is one page view.
export default function TopicNav({ topics, currentTopic, stateSlug, stateName, options, pickLabel }) {
  const router = useRouter();
  const hrefFor = (t) => '/updates/' + t.slug + (stateSlug && t.available ? '/' + stateSlug : '');
  const [pick, setPick] = useState(stateSlug || '');
  const viaKeys = useRef(false);
  const timer = useRef(null);
  useEffect(() => { setPick(stateSlug || ''); }, [stateSlug]);
  useEffect(() => () => clearTimeout(timer.current), []);
  const go = (value) => { clearTimeout(timer.current); if (value && value !== stateSlug) router.push('/updates/' + currentTopic + '/' + value); };
  return (
    <div className="sp-nav">
      <nav className="sp-tabs" aria-label="Topic">
        {topics.map((t) => (t.available
          ? <Link key={t.slug} href={hrefFor(t)} className={'sp-tab' + (t.slug === currentTopic ? ' on' : '')} aria-current={t.slug === currentTopic ? 'page' : undefined}>{t.label}</Link>
          : <span key={t.slug} className="sp-tab off" title={'Not applicable in ' + stateName}>{t.label}</span>))}
      </nav>
      <label className="sp-pick">
        <span>{pickLabel}</span>
        <select
          value={pick}
          onPointerDown={() => { viaKeys.current = false; }}
          onKeyDown={(e) => { if (e.key === 'Enter') go(e.currentTarget.value); else viaKeys.current = true; }}
          onChange={(e) => {
            const value = e.target.value; setPick(value);
            clearTimeout(timer.current);
            if (viaKeys.current) timer.current = setTimeout(() => go(value), 900); else go(value);
          }}
        >
          {!stateSlug ? <option value="">Choose a state</option> : null}
          {options.map((o) => <option key={o.slug} value={o.slug}>{o.name}</option>)}
        </select>
      </label>
    </div>
  );
}
