import { jwtVerify } from 'jose';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const token = req.cookies?.admin_session;
  if (!token) return res.status(401).json({ error: 'Not authenticated' });

  try {
    const secret = new TextEncoder().encode(process.env.ADMIN_SESSION_SECRET);
    await jwtVerify(token, secret);
  } catch {
    return res.status(401).json({ error: 'Invalid session' });
  }

  const { data, period } = req.body;
  const s = data.summary;
  const bounce = parseFloat(s.bounceRate);
  const engagement = parseFloat(s.engagementRate);
  const avgSec = parseInt(s.avgSessionDuration);
  const avgMin = Math.floor(avgSec / 60);
  const avgSecRem = avgSec % 60;
  const topCountry = data.countries?.[0]?.name || 'your region';
  const topChannel = data.channels?.[0]?.name || 'Direct';
  const countryCount = data.countries?.length || 1;
  const pagesPerSession = (s.pageViews / Math.max(s.sessions, 1)).toFixed(1);

  const wins = [];
  const pains = [];

  if (s.activeUsers > 0) wins.push(`PayrollTool attracted ${s.activeUsers} active user${s.activeUsers > 1 ? 's' : ''} over this period — real HR professionals finding your tools.`);
  if (s.newUsers > 0) wins.push(`${s.newUsers} brand new visitor${s.newUsers > 1 ? 's' : ''} discovered PayrollTool — your discoverability is growing.`);
  if (countryCount > 1) wins.push(`Your reach spans ${countryCount} countries including ${data.countries?.slice(0,3).map(c => c.name).join(', ')} — Indian payroll compliance tools are clearly needed globally.`);
  if (avgSec > 120) wins.push(`Users spend an average of ${avgMin}m ${avgSecRem}s per session — a strong sign they find real value in your tools.`);
  if (bounce < 30) wins.push(`An impressive bounce rate of ${s.bounceRate}% means visitors are genuinely exploring your suite.`);
  if (engagement > 50) wins.push(`Your ${s.engagementRate}% engagement rate is excellent — users are actively interacting, not just browsing.`);
  if (topChannel === 'Organic Search') wins.push(`Organic search is driving traffic — your SEO foundations are paying off.`);
  if (s.engagedSessions > 0) wins.push(`${s.engagedSessions} engaged sessions show users are going beyond a quick glance.`);

  if (bounce > 50) pains.push(`Your bounce rate of ${s.bounceRate}% suggests visitors may not immediately find what they need — consider clearer CTAs on the homepage.`);
  if (engagement < 30) pains.push(`An engagement rate of ${s.engagementRate}% means many visitors aren't interacting deeply — try adding tooltips, sample files, or quick-start guides.`);
  if (avgSec < 60) pains.push(`Sessions averaging under a minute may mean navigation isn't intuitive enough — a prominent tool selector could help.`);
  if (topChannel === 'Direct' || topChannel === 'Unassigned') pains.push(`Most traffic is direct — you're likely relying on word of mouth. Sharing on LinkedIn, HR communities, or payroll forums could unlock organic growth.`);
  if (parseFloat(pagesPerSession) < 1.5) pains.push(`Users view only ${pagesPerSession} pages per session — cross-linking between LOP Splitter, Salary Proration, and PF ECR Creator could increase tool discovery.`);
  if (s.newUsers === s.activeUsers) pains.push(`All your users are new visitors — there are no return users yet. Adding bookmarkable features or email updates could improve retention.`);

  if (wins.length === 0) wins.push(`PayrollTool is live and collecting real data — that's the crucial first step every successful product takes.`);
  if (pains.length === 0) pains.push(`Your metrics look healthy — keep monitoring as traffic grows and focus on adding more tools to the suite.`);

  const encouragement = s.activeUsers >= 50
    ? `With ${s.activeUsers} users across ${countryCount} countries, PayrollTool is clearly solving a real problem. The foundation is strong — keep shipping and the growth curve will follow.`
    : s.activeUsers >= 10
    ? `${s.activeUsers} users in ${countryCount} countr${countryCount > 1 ? 'ies' : 'y'} is a meaningful start. Every successful SaaS product looked exactly like this at this stage — keep building.`
    : `Every great product starts with the first few users. You have real people using PayrollTool — that's validation that matters. Stay consistent and growth will follow.`;

  const summary = `🎉 ${wins.slice(0,2).join(' ')}\n\n⚡ ${pains.slice(0,2).join(' ')}\n\n🚀 ${encouragement}`;

  return res.status(200).json({ summary });
}