// Tell Bing and other IndexNow search engines that pages have changed.
// Run AFTER the deployment is live on www.payrolltool.in.
//
//   node scripts/indexnow.js /gratuity-calculator /blog/labour-welfare-fund-india
//   node scripts/indexnow.js --all        (every URL in the live sitemap)
//
// Submit only pages that were added or changed. Use --all rarely.

const HOST = "www.payrolltool.in";
const KEY = "dcdf15f272af7f5e6d71ae3e38b8e197";
const KEY_LOCATION = `https://${HOST}/${KEY}.txt`;
const ENDPOINT = "https://api.indexnow.org/indexnow";

async function getText(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} returned ${res.status}`);
  return res.text();
}

function locs(xml) {
  return [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1]);
}

async function sitemapUrls() {
  const root = await getText(`https://${HOST}/sitemap.xml`);
  if (!root.includes("<sitemapindex")) return locs(root);
  const all = [];
  for (const child of locs(root)) all.push(...locs(await getText(child)));
  return all;
}

function toUrl(arg) {
  if (/^https?:\/\//i.test(arg)) return arg;
  return `https://${HOST}${arg.startsWith("/") ? "" : "/"}${arg}`;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.log("Usage: node scripts/indexnow.js <path> [path...]   or   node scripts/indexnow.js --all");
    process.exit(1);
  }

  const keyText = (await getText(KEY_LOCATION)).trim();
  if (keyText !== KEY) throw new Error(`Key file at ${KEY_LOCATION} does not match. Deploy first.`);

  let urls = args.includes("--all") ? await sitemapUrls() : args.map(toUrl);
  urls = [...new Set(urls)];
  const foreign = urls.filter((u) => new URL(u).host !== HOST);
  if (foreign.length) throw new Error(`These are not on ${HOST}: ${foreign.join(", ")}`);
  if (urls.length === 0) throw new Error("No URLs to submit.");

  for (let i = 0; i < urls.length; i += 10000) {
    const batch = urls.slice(i, i + 10000);
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ host: HOST, key: KEY, keyLocation: KEY_LOCATION, urlList: batch }),
    });
    const body = await res.text();
    if (res.status === 200 || res.status === 202) {
      console.log(`Submitted ${batch.length} URL(s). Status ${res.status}.`);
    } else {
      throw new Error(`IndexNow returned ${res.status}: ${body}`);
    }
  }
  urls.slice(0, 20).forEach((u) => console.log("  " + u));
  if (urls.length > 20) console.log(`  ...and ${urls.length - 20} more`);
}

main().catch((err) => {
  console.error("IndexNow failed: " + err.message);
  process.exit(1);
});
