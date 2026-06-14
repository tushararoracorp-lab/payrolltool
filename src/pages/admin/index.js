import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';

const PERIODS = [
  { label: 'Today', value: 'today' },
  { label: '7 Days', value: '7daysAgo' },
  { label: '30 Days', value: '30daysAgo' },
  { label: '90 Days', value: '90daysAgo' },
  { label: '1 Year', value: '365daysAgo' },
];

const PRIMARY   = '#7C3AED';
const PRIMARY_L = '#EDE9FE';
const PRIMARY_D = '#5B21B6';
const NAVY      = '#1E1B4B';
const SUCCESS   = '#059669';
const DANGER    = '#DC2626';

const CHART_COLORS  = [PRIMARY,'#2563eb','#d97706','#0891b2','#db2777',SUCCESS,'#7c2d12','#166634'];
const DEVICE_COLORS = [PRIMARY,'#2563eb','#d97706'];
const OS_COLORS     = [NAVY, PRIMARY_D, '#2563eb','#d97706','#0891b2','#059669'];
const FLAG          = {'United States':'🇺🇸','India':'🇮🇳','United Kingdom':'🇬🇧','Canada':'🇨🇦','France':'🇫🇷','Germany':'🇩🇪','Spain':'🇪🇸','Australia':'🇦🇺','Singapore':'🇸🇬','Japan':'🇯🇵'};
const COUNTRY_FLAG  = {'US':'🇺🇸','IN':'🇮🇳','GB':'🇬🇧','CA':'🇨🇦','FR':'🇫🇷','DE':'🇩🇪','ES':'🇪🇸','AU':'🇦🇺','SG':'🇸🇬','JP':'🇯🇵','AE':'🇦🇪','NL':'🇳🇱','PK':'🇵🇰'};
const S             = { fontFamily: "'DM Sans', system-ui, sans-serif" };

export default function AdminDashboard() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [period, setPeriod] = useState('7daysAgo');
  const [summary, setSummary] = useState('');
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [realtime, setRealtime] = useState(null);

  const fetchRealtime = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/realtime');
      if (res.ok) setRealtime(await res.json());
    } catch {}
  }, []);

  useEffect(() => {
    fetchRealtime();
    const interval = setInterval(fetchRealtime, 60000);
    return () => clearInterval(interval);
  }, [fetchRealtime]);

  const fetchSummary = useCallback(async (analyticsData, p) => {
    setSummaryLoading(true);
    setSummary('');
    try {
      const res = await fetch('/api/admin/ai-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: analyticsData,
          period: PERIODS.find(x => x.value === p)?.label,
        }),
      });
      const json = await res.json();
      setSummary(json.summary || '');
    } catch {
      setSummary('Could not generate summary.');
    }
    setSummaryLoading(false);
  }, []);

  const fetchAnalytics = useCallback(async (p) => {
    setLoading(true); setError('');
    try {
      const res = await fetch(`/api/admin/analytics?period=${p}`);
      if (res.status === 401) { router.push('/admin/login'); return; }
      const json = await res.json();
      setData(json);
      fetchSummary(json, p);
    } catch { setError('Failed to load. Please refresh.'); }
    setLoading(false);
  }, [router, fetchSummary]);

  useEffect(() => { fetchAnalytics(period); }, [period]);

  function fmt(sec) {
    const s = parseInt(sec) || 0;
    return `${Math.floor(s/60)}m ${s%60}s`;
  }

  const totalDev    = data?.devices?.reduce((s,d) => s+d.sessions, 0) || 1;
  const periodLabel = PERIODS.find(p => p.value === period)?.label;

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{ background:'#fff', border:`1px solid ${PRIMARY_L}`, borderRadius:8, padding:'10px 14px', fontSize:12, ...S, boxShadow:'0 4px 16px rgba(124,58,237,0.1)' }}>
        {label && <div style={{ fontWeight:600, color:NAVY, marginBottom:4 }}>{label}</div>}
        {payload.map((p,i) => (
          <div key={i} style={{ color:p.color, marginTop:2 }}>{p.name}: <strong>{p.value}</strong></div>
        ))}
      </div>
    );
  };

  const Card = ({ label, value, sub, color=PRIMARY }) => (
    <div style={{ background:'#fff', border:'1px solid #ede9fe', borderRadius:10, padding:'16px 18px', position:'relative', overflow:'hidden' }}>
      <div style={{ position:'absolute', top:0, left:0, width:3, height:'100%', background:color, borderRadius:'10px 0 0 10px' }} />
      <div style={{ fontSize:11, color:'#8b5cf6', fontWeight:600, letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:6, ...S }}>{label}</div>
      <div style={{ fontSize:26, fontWeight:700, color:NAVY, letterSpacing:'-0.5px', ...S }}>{value}</div>
      {sub && <div style={{ fontSize:11, color:'#a78bfa', marginTop:3, ...S }}>{sub}</div>}
    </div>
  );

  const Section = ({ title, sub, right, children }) => (
    <div style={{ background:'#fff', border:'1px solid #ede9fe', borderRadius:10, padding:'20px 24px' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16, paddingBottom:14, borderBottom:`1px solid ${PRIMARY_L}` }}>
        <div>
          <div style={{ fontSize:14, fontWeight:600, color:NAVY, ...S }}>{title}</div>
          {sub && <div style={{ fontSize:12, color:'#a78bfa', marginTop:2, ...S }}>{sub}</div>}
        </div>
        {right && <div style={{ fontSize:12, color:'#a78bfa', ...S }}>{right}</div>}
      </div>
      {children}
    </div>
  );

  return (
    <>
      <Head><title>Admin - PayrollTool</title></Head>

      <div style={{ background:'#fff', borderBottom:'1px solid #ede9fe', padding:'0 32px', display:'flex', alignItems:'center', justifyContent:'space-between', height:56, position:'sticky', top:0, zIndex:100, boxShadow:'0 1px 8px rgba(124,58,237,0.06)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ width:28, height:28, background:PRIMARY, borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <span style={{ color:'#fff', fontSize:14 }}>♥</span>
            </div>
            <span style={{ fontSize:15, fontWeight:700, color:NAVY, ...S }}>PayrollTool</span>
          </div>
          <span style={{ color:'#ddd6fe' }}>›</span>
          <span style={{ fontSize:14, color:'#7c3aed', fontWeight:500, ...S }}>Admin Dashboard</span>
          <span style={{ background:PRIMARY_L, color:PRIMARY, fontSize:11, padding:'2px 10px', borderRadius:20, fontWeight:600, ...S }}>● Live · GA4</span>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={() => fetchAnalytics(period)} style={{ background:PRIMARY_L, border:'none', borderRadius:6, padding:'7px 16px', fontSize:13, cursor:'pointer', color:PRIMARY, fontWeight:500, ...S }}>↻ Refresh</button>
          <button onClick={async () => { await fetch('/api/admin/logout',{method:'POST'}); router.push('/admin/login'); }} style={{ background:'none', border:`1px solid ${PRIMARY_L}`, borderRadius:6, padding:'7px 16px', fontSize:13, cursor:'pointer', color:'#8b5cf6', ...S }}>Sign out</button>
        </div>
      </div>

      <div style={{ padding:'28px 32px', background:'#faf9ff', minHeight:'100vh' }}>
        <div style={{ maxWidth:1200, margin:'0 auto' }}>

          <div style={{ background:'#fff', border:'1px solid #ede9fe', borderRadius:10, padding:'12px 20px', marginBottom:16, display:'flex', alignItems:'center', gap:16, flexWrap:'wrap' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
              <div style={{ width:8, height:8, borderRadius:'50%', background:'#16a34a', boxShadow:'0 0 0 3px #dcfce7' }} />
              <span style={{ fontSize:12, fontWeight:600, color:NAVY, ...S }}>Live right now</span>
              <span style={{ fontSize:20, fontWeight:700, color:PRIMARY, ...S }}>{realtime?.activeUsers ?? '—'}</span>
              <span style={{ fontSize:12, color:'#a78bfa', ...S }}>active user{realtime?.activeUsers !== 1 ? 's' : ''}</span>
            </div>
            <div style={{ width:1, height:20, background:'#ede9fe', flexShrink:0 }} />
            {realtime?.pages?.length > 0 && (
              <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                <span style={{ fontSize:11, color:'#a78bfa', ...S }}>Pages:</span>
                {realtime.pages.map((p, i) => (
                  <span key={i} style={{ fontSize:12, background:PRIMARY_L, color:PRIMARY, padding:'2px 8px', borderRadius:20, ...S }}>
                    {p.page} ({p.users})
                  </span>
                ))}
              </div>
            )}
            {realtime?.countries?.length > 0 && (
              <>
                <div style={{ width:1, height:20, background:'#ede9fe', flexShrink:0 }} />
                <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                  {realtime.countries.map((c, i) => (
                    <span key={i} style={{ fontSize:16 }} title={c.code}>
                      {COUNTRY_FLAG[c.code] || '🌐'}
                    </span>
                  ))}
                </div>
              </>
            )}
            <div style={{ marginLeft:'auto', fontSize:11, color:'#d1d5db', ...S, flexShrink:0 }}>
              ↻ updates every 60s
            </div>
          </div>

          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
            <div>
              <h1 style={{ fontSize:22, fontWeight:700, color:NAVY, margin:'0 0 4px', ...S, letterSpacing:'-0.4px' }}>Analytics Overview</h1>
              <p style={{ fontSize:13, color:'#a78bfa', margin:0, ...S }}>payrolltool.in · {periodLabel} · Google Analytics 4</p>
            </div>
            <div style={{ display:'flex', gap:4, background:'#ede9fe', padding:4, borderRadius:8 }}>
              {PERIODS.map(p => (
                <button key={p.value} onClick={() => setPeriod(p.value)} style={{ padding:'6px 14px', fontSize:12, fontWeight:period===p.value?600:400, border:'none', borderRadius:6, cursor:'pointer', background:period===p.value?PRIMARY:'transparent', color:period===p.value?'#fff':'#7c3aed', boxShadow:period===p.value?'0 2px 8px rgba(124,58,237,0.25)':'none', ...S, transition:'all 0.15s' }}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {error && <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:8, padding:'12px 16px', color:DANGER, fontSize:13, marginBottom:20, ...S }}>{error}</div>}

          {loading && (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 }}>
              {[...Array(8)].map((_,i) => <div key={i} style={{ background:'#ede9fe', borderRadius:10, height:88, opacity:0.5 }} />)}
            </div>
          )}

          {data && !loading && (<>

            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 }}>
              <Card label="Active Users"     value={data.summary.activeUsers.toLocaleString()}    sub={`${data.summary.newUsers.toLocaleString()} new users`}                                              color={PRIMARY}   />
              <Card label="Sessions"         value={data.summary.sessions.toLocaleString()}        sub={`${data.summary.engagedSessions.toLocaleString()} engaged`}                                        color="#2563eb"   />
              <Card label="Page Views"       value={data.summary.pageViews.toLocaleString()}       sub={`${(data.summary.pageViews/Math.max(data.summary.sessions,1)).toFixed(1)} per session`}            color="#d97706"   />
              <Card label="Avg. Session"     value={fmt(data.summary.avgSessionDuration)}          sub="time on site"                                                                                      color="#0891b2"   />
              <Card label="New Users"        value={data.summary.newUsers.toLocaleString()}        sub={`of ${data.summary.activeUsers} total`}                                                            color={PRIMARY_D} />
              <Card label="Engaged Sessions" value={data.summary.engagedSessions.toLocaleString()} sub={`${data.summary.engagementRate}% rate`}                                                           color={SUCCESS}   />
              <Card label="Engagement Rate"  value={`${data.summary.engagementRate}%`}             sub="of all sessions"                                                                                   color={PRIMARY}   />
              <Card label="Bounce Rate"      value={`${data.summary.bounceRate}%`}                 sub={parseFloat(data.summary.bounceRate)<40?'✓ Healthy':'↑ Review'} color={parseFloat(data.summary.bounceRate)>50?DANGER:SUCCESS} />
            </div>

            <div style={{ background:`linear-gradient(135deg, ${PRIMARY_D} 0%, ${PRIMARY} 100%)`, borderRadius:12, padding:'24px 28px', marginBottom:20, position:'relative', overflow:'hidden' }}>
              <div style={{ position:'absolute', top:-20, right:-20, width:140, height:140, background:'rgba(255,255,255,0.05)', borderRadius:'50%' }} />
              <div style={{ position:'absolute', bottom:-40, right:80, width:100, height:100, background:'rgba(255,255,255,0.04)', borderRadius:'50%' }} />
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
                <div style={{ width:30, height:30, background:'rgba(255,255,255,0.15)', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0 }}>✨</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:14, fontWeight:600, color:'#fff', ...S }}>AI Analytics Summary</div>
                  <div style={{ fontSize:11, color:'rgba(255,255,255,0.6)', ...S }}>Smart insights · {periodLabel}</div>
                </div>
                <button onClick={() => fetchSummary(data, period)} style={{ background:'rgba(255,255,255,0.15)', border:'1px solid rgba(255,255,255,0.2)', borderRadius:6, padding:'5px 14px', fontSize:12, color:'#fff', cursor:'pointer', ...S, flexShrink:0 }}>
                  ↻ Regenerate
                </button>
              </div>
              {summaryLoading ? (
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  {[0,1,2].map(i => <div key={i} style={{ width:7, height:7, background:'rgba(255,255,255,0.5)', borderRadius:'50%' }} />)}
                  <span style={{ fontSize:13, color:'rgba(255,255,255,0.7)', marginLeft:4, ...S }}>Analysing your data...</span>
                </div>
              ) : (
                <div style={{ fontSize:14, color:'rgba(255,255,255,0.92)', lineHeight:1.8, ...S, whiteSpace:'pre-line', position:'relative', zIndex:1 }}>
                  {summary}
                </div>
              )}
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'3fr 2fr', gap:14, marginBottom:14 }}>
              <Section title="Traffic Channels" sub={`Sessions by source · ${periodLabel}`} right={`${data.summary.sessions} total`}>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={data.channels} layout="vertical" margin={{ left:90, right:20, top:0, bottom:0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f5f3ff" />
                    <XAxis type="number" tick={{ fontSize:11, fill:'#a78bfa', fontFamily:'DM Sans, sans-serif' }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize:12, fill:NAVY, fontFamily:'DM Sans, sans-serif' }} axisLine={false} tickLine={false} width={90} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="sessions" name="Sessions" radius={[0,4,4,0]}>
                      {data.channels.map((_,i) => <Cell key={i} fill={CHART_COLORS[i%CHART_COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Section>

              <Section title="Device Split" sub="Sessions by device type">
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={data.devices} dataKey="sessions" nameKey="name" cx="50%" cy="50%" outerRadius={72} innerRadius={42} paddingAngle={3}>
                      {data.devices.map((_,i) => <Cell key={i} fill={DEVICE_COLORS[i%DEVICE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display:'flex', flexDirection:'column', gap:8, marginTop:4 }}>
                  {data.devices.map((d,i) => {
                    const pct = Math.round((d.sessions/totalDev)*100);
                    return (
                      <div key={d.name} style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <div style={{ width:10, height:10, borderRadius:2, background:DEVICE_COLORS[i] }} />
                          <span style={{ fontSize:13, color:'#374151', textTransform:'capitalize', ...S }}>{d.name}</span>
                        </div>
                        <span style={{ fontSize:13, fontWeight:600, color:NAVY, ...S }}>{pct}% <span style={{ color:'#a78bfa', fontWeight:400 }}>({d.sessions})</span></span>
                      </div>
                    );
                  })}
                </div>
              </Section>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:14, marginBottom:14 }}>
              <Section title="Countries" sub="Active users by country" right={`${data.countries.length} countries`}>
                {data.countries.map((c) => (
                  <div key={c.name} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 0', borderBottom:`1px solid ${PRIMARY_L}` }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <span style={{ fontSize:18 }}>{FLAG[c.name]||'🌐'}</span>
                      <div>
                        <div style={{ fontSize:13, color:NAVY, ...S, fontWeight:500 }}>{c.name}</div>
                        <div style={{ fontSize:11, color:'#a78bfa', ...S }}>{c.engagementRate}% engagement</div>
                      </div>
                    </div>
                    <div style={{ textAlign:'right' }}>
                      <div style={{ fontSize:14, fontWeight:700, color:PRIMARY, ...S }}>{c.users}</div>
                      <div style={{ fontSize:11, color:'#a78bfa', ...S }}>users</div>
                    </div>
                  </div>
                ))}
              </Section>

              <Section title="Browsers" sub="Active users by browser">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={data.browsers} margin={{ left:0, right:10, top:0, bottom:40 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f3ff" />
                    <XAxis dataKey="name" tick={{ fontSize:11, fill:'#a78bfa', fontFamily:'DM Sans, sans-serif' }} axisLine={false} tickLine={false} angle={-30} textAnchor="end" />
                    <YAxis tick={{ fontSize:11, fill:'#a78bfa', fontFamily:'DM Sans, sans-serif' }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="users" name="Users" radius={[4,4,0,0]}>
                      {data.browsers.map((_,i) => <Cell key={i} fill={CHART_COLORS[i%CHART_COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Section>

              <Section title="Operating Systems" sub="Active users by OS">
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={data.os} dataKey="users" nameKey="name" cx="50%" cy="50%" outerRadius={75} paddingAngle={2}>
                      {data.os.map((_,i) => <Cell key={i} fill={OS_COLORS[i%OS_COLORS.length]} />)}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display:'flex', flexWrap:'wrap', gap:'6px 14px', marginTop:8 }}>
                  {data.os.map((o,i) => (
                    <div key={o.name} style={{ display:'flex', alignItems:'center', gap:6 }}>
                      <div style={{ width:8, height:8, borderRadius:2, background:OS_COLORS[i]||NAVY }} />
                      <span style={{ fontSize:12, color:'#6b7280', ...S }}>{o.name} ({o.users})</span>
                    </div>
                  ))}
                </div>
              </Section>
            </div>

            <Section title="Top Pages" sub={`${periodLabel} · sorted by page views`} right={`${data.topPages.length} pages`}>
              <table style={{ width:'100%', borderCollapse:'collapse', ...S }}>
                <thead>
                  <tr style={{ borderBottom:`2px solid ${PRIMARY_L}` }}>
                    {['#','Page','Views','Users','Avg. Time','Engagement','Bounce'].map(h => (
                      <th key={h} style={{ textAlign:h==='Page'||h==='#'?'left':'right', padding:'0 8px 10px', fontSize:11, color:'#a78bfa', fontWeight:600, letterSpacing:'0.05em', textTransform:'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.topPages.map((page,i) => (
                    <tr key={i} style={{ borderBottom:`1px solid #f5f3ff`, background:i%2===0?'#fff':'#faf9ff' }}>
                      <td style={{ padding:'10px 8px', color:'#c4b5fd', fontSize:12 }}>{i+1}</td>
                      <td style={{ padding:'10px 8px', color:NAVY, fontSize:13, fontWeight:500, maxWidth:260 }}>
                        <div style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{page.path}</div>
                      </td>
                      <td style={{ padding:'10px 8px', textAlign:'right', color:NAVY, fontSize:13, fontWeight:700 }}>{page.views.toLocaleString()}</td>
                      <td style={{ padding:'10px 8px', textAlign:'right', color:'#6b7280', fontSize:13 }}>{page.users.toLocaleString()}</td>
                      <td style={{ padding:'10px 8px', textAlign:'right', color:'#6b7280', fontSize:13 }}>{fmt(page.avgTime)}</td>
                      <td style={{ padding:'10px 8px', textAlign:'right' }}>
                        <span style={{ background:PRIMARY_L, color:PRIMARY, padding:'2px 8px', borderRadius:20, fontSize:11, fontWeight:600 }}>{page.engagementRate}%</span>
                      </td>
                      <td style={{ padding:'10px 8px', textAlign:'right' }}>
                        <span style={{ background:parseFloat(page.bounceRate)>50?'#fef2f2':'#ecfdf5', color:parseFloat(page.bounceRate)>50?DANGER:SUCCESS, padding:'2px 8px', borderRadius:20, fontSize:11, fontWeight:600 }}>{page.bounceRate}%</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>

          </>)}
        </div>
      </div>
    </>
  );
}
