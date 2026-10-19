import Head from 'next/head';
import { useEffect, useRef } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { buildMarkup } from '../components/updates/markup';
import initUpdates from '../components/updates/initUpdates';
import { buildPublicData } from '../lib/updates/publicData';

// Built from the database. Rebuilt in the background at most every 10 minutes, and immediately after you approve a change
// (pages/api/decision.js calls res.revalidate('/updates')).
export async function getStaticProps() {
  const data = await buildPublicData();
  return { props: { data: JSON.parse(JSON.stringify(data)) }, revalidate: 600 };
}

export default function UpdatesPage({ data }) {
  const rootRef = useRef(null);
  const markup = buildMarkup(data);

  useEffect(() => {
    const root = rootRef.current;
    root.innerHTML = markup;              // start from clean markup (also keeps React strict mode from double-binding)
    return initUpdates(data, root);
  }, [data, markup]);

  return (
    <>
      <Head>
        <title>Payroll Compliance Updates, Minimum Wage Rates, PT and LWF by State | PayrollTool.in</title>
        <meta name="description" content="Statutory notifications that affect Indian payroll (wages, EPF, ESI, PT, LWF, NPS, TDS) explained in plain English and Hindi, with minimum wage rates and Professional Tax and Labour Welfare Fund details for every state and a link to the official source." />
        <link rel="canonical" href="https://payrolltool.in/updates" />
      </Head>
      <Header />
      <main className="upd" ref={rootRef} dangerouslySetInnerHTML={{ __html: markup }} suppressHydrationWarning />
      <Footer />
      <style jsx global>{`
.upd{--radius:var(--radius-md);--red:#B91C1C;--red-50:#FEF2F2;--shadow-lg:0 24px 64px rgba(30,27,75,.18);font-family:'DM Sans',sans-serif;color:var(--ink);position:relative}
html[data-theme="dark"] .upd{--red:#F87171;--red-50:#331A1A;--shadow-lg:0 24px 64px rgba(0,0,0,.55)}
.upd *,.upd *::before,.upd *::after{box-sizing:border-box}
.upd h1,.upd h2,.upd h3,.upd h4,.upd h5{margin:0}
.upd a{color:var(--brand-600);text-decoration:none}
.upd button,.upd select,.upd input{font-family:'DM Sans',sans-serif}
.upd .intro{padding:44px 20px 26px;text-align:center;position:relative;overflow:hidden}
.upd .intro::before{content:"";position:absolute;top:-180px;right:-160px;width:520px;height:520px;border-radius:50%;
background:radial-gradient(circle,rgba(124,58,237,.10),transparent 70%);pointer-events:none}
html[data-theme="dark"] .upd .intro::before{background:radial-gradient(circle,rgba(145,99,242,.16),transparent 70%)}
.upd .intro h1{font-family:'Sora',sans-serif;font-size:2.1rem;font-weight:800;letter-spacing:-.01em;margin-bottom:10px;position:relative}
.upd .intro p{color:var(--ink-soft);max-width:640px;margin:0 auto;font-size:1rem;line-height:1.5;position:relative}
.upd .upd-wrap{max-width:1200px;margin:0 auto;padding:0 20px 8px}
.upd .tabs{display:flex;gap:6px;justify-content:center;margin:24px 0 8px;flex-wrap:wrap}
.upd .tab{padding:10px 22px;border-radius:100px;border:1px solid var(--line);background:var(--card);
color:var(--ink-soft);font-weight:600;font-size:.9rem;cursor:pointer;transition:all .2s ease}
.upd .tab:hover{border-color:var(--brand-600);color:var(--ink)}
.upd .tab.active{background:var(--brand-600);color:#fff;border-color:var(--brand-600)}
.upd .panel{display:none}
.upd .panel.on{display:block}
.upd .toolbar{display:flex;gap:9px;flex-wrap:wrap;margin:18px 0 14px;align-items:center}
.upd .toolbar input,.upd .toolbar select{padding:10px 13px;border:1px solid var(--line);border-radius:var(--radius-sm);
font-size:.88rem;color:var(--ink);background:var(--card)}
.upd .toolbar input{flex:1;min-width:200px}
.upd .count{font-size:.83rem;color:var(--ink-soft);margin-left:auto;white-space:nowrap}
.upd .seg{display:inline-flex;border:1px solid var(--line);border-radius:100px;overflow:hidden;background:var(--card)}
.upd .seg button{border:none;background:none;padding:9px 16px;font-size:.83rem;font-weight:600;color:var(--ink-soft);cursor:pointer}
.upd .seg button.on{background:var(--brand-50);color:var(--brand-700)}
.upd .stats{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px}
.upd .stat{background:var(--card-2);border:1px solid var(--line);border-radius:var(--radius-sm);padding:8px 14px;font-size:.78rem;color:var(--ink-soft)}
.upd .stat b{color:var(--ink);font-size:1rem;display:block;font-family:'Sora',sans-serif;font-weight:700}
.upd table{width:100%;border-collapse:collapse;font-size:.86rem}
.upd thead th{background:var(--card-2);color:var(--ink-soft);text-align:left;padding:11px 10px;font-weight:600;
font-size:.72rem;text-transform:uppercase;letter-spacing:.05em;white-space:nowrap;border-bottom:1px solid var(--line)}
.upd thead th.num{text-align:right}
.upd tbody td{padding:11px 10px;border-bottom:1px solid var(--line);vertical-align:top;color:var(--ink)}
.upd tbody tr{cursor:pointer}
.upd tbody tr:hover{background:var(--card-2)}
.upd .num{text-align:right;font-variant-numeric:tabular-nums;font-weight:600;white-space:nowrap}
.upd .sub{font-size:.74rem;color:var(--ink-soft);line-height:1.45;display:block;margin-top:3px;font-weight:400}
.upd .pill{display:inline-block;padding:3px 9px;border-radius:100px;font-size:.68rem;font-weight:600;letter-spacing:.02em;white-space:nowrap;
border:1px solid var(--line);background:var(--card-2);color:var(--ink-soft)}
.upd .pill.ok{background:var(--green-50);color:var(--green);border-color:transparent}
.upd .pill.warn{background:var(--amber-50);color:var(--amber);border-color:transparent}
.upd .pill.bad{background:var(--red-50);color:var(--red);border-color:transparent}
.upd .pill.brand{background:var(--brand-50);color:var(--brand-700);border-color:transparent}
.upd .cardlist{display:grid;gap:12px}
.upd .card{border:1px solid var(--line);border-radius:var(--radius);padding:18px 20px;background:var(--card);
box-shadow:var(--shadow-card);transition:all .2s ease}
.upd .card:hover{border-color:var(--brand-600);box-shadow:var(--shadow-card-hover)}
.upd .card-top{display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-bottom:9px}
.upd .card h3{font-family:'Sora',sans-serif;font-size:1rem;font-weight:600;line-height:1.42;margin-bottom:7px;color:var(--ink)}
.upd .card .short{color:var(--ink-soft);font-size:.9rem;line-height:1.55;margin-bottom:12px}
.upd .meta{display:flex;gap:16px;flex-wrap:wrap;font-size:.78rem;color:var(--ink-soft);margin-bottom:12px}
.upd .meta b{color:var(--ink);font-weight:600}
.upd .actions{display:flex;gap:8px;flex-wrap:wrap}
.upd .btn{padding:9px 18px;border-radius:100px;border:1px solid var(--brand-600);background:var(--brand-600);
color:#fff;font-weight:600;font-size:.83rem;cursor:pointer;transition:all .2s ease}
.upd .btn:hover{background:var(--brand-700);border-color:var(--brand-700)}
.upd .btn.ghost{background:var(--card);color:var(--brand-600)}
.upd .btn.ghost:hover{background:var(--brand-50)}
.upd .linkrow{margin-top:11px;padding-top:10px;border-top:1px solid var(--line);font-size:.76rem;color:var(--ink-soft)}
.upd .rnote{background:var(--card-2);border-left:2px solid var(--green);padding:9px 12px;border-radius:0 var(--radius-sm) var(--radius-sm) 0;
font-size:.8rem;color:var(--ink-soft);margin-bottom:11px;line-height:1.5}
.upd .more{display:block;margin:22px auto 0;padding:11px 28px;border-radius:100px;border:1px solid var(--line);
background:var(--card);color:var(--brand-600);font-weight:600;font-size:.88rem;cursor:pointer}
.upd .banner{border-radius:var(--radius);padding:13px 16px;font-size:.85rem;line-height:1.55;margin-bottom:16px;
background:var(--card-2);border:1px solid var(--line);color:var(--ink-soft)}
.upd .banner b{color:var(--ink)}
.upd .banner.alert{background:var(--red-50);border-color:transparent}
.upd .banner.alert b{color:var(--red)}
.upd .jgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:10px}
.upd .ghead{grid-column:1/-1;font-size:.72rem;text-transform:uppercase;letter-spacing:.06em;font-weight:700;
color:var(--ink-soft);padding:14px 2px 2px;border-bottom:1px solid var(--line);margin-bottom:2px}
.upd .ghead:first-child{padding-top:2px}
.upd .muted{color:var(--ink-soft);font-style:italic;font-size:.85rem}
.upd .jlink{color:var(--brand-600);text-decoration:none;font-weight:600;cursor:pointer}
.upd .jlink:hover{text-decoration:underline}
.upd .seo{background:var(--card-2);border:1px solid var(--line);border-radius:var(--radius);padding:20px 22px;margin-bottom:16px}
.upd .seo h2{font-family:'Sora',sans-serif;font-size:1.15rem;margin-bottom:8px;color:var(--ink)}
.upd .seo h3{font-family:'Sora',sans-serif;font-size:.95rem;margin:14px 0 4px;color:var(--ink)}
.upd .seo p{font-size:.9rem;line-height:1.55;color:var(--ink-soft);margin-bottom:8px}
.upd .seo details{margin-top:6px}
.upd .seo summary{cursor:pointer;font-size:.85rem;font-weight:600;color:var(--brand-600);margin-bottom:6px}
.upd .jcard{border:1px solid var(--line);border-radius:var(--radius);padding:14px 16px;background:var(--card);
cursor:pointer;transition:all .18s ease;position:relative}
.upd .jcard:hover{border-color:var(--brand-600);box-shadow:var(--shadow-card-hover)}
.upd .jcard.off{background:var(--card-2);cursor:default;opacity:.72}
.upd .jcard.off:hover{border-color:var(--line);box-shadow:none}
.upd .jcard h4{font-family:'Sora',sans-serif;font-size:.92rem;font-weight:600;margin-bottom:5px;color:var(--ink);
display:flex;align-items:center;gap:7px}
.upd .dot{width:7px;height:7px;border-radius:50%;flex-shrink:0}
.upd .dot.y{background:var(--green)}
.upd .dot.n{background:var(--ink-soft);opacity:.45}
.upd .dot.w{background:var(--amber)}
.upd .dot.r{background:var(--red)}
.upd .jcard .l1{font-size:.8rem;color:var(--ink-soft);line-height:1.45}
.upd .tapme{margin-top:9px;font-size:.74rem;font-weight:600;color:var(--brand-600)}
.upd .jcard .l2{font-size:.73rem;color:var(--ink-soft);margin-top:6px;opacity:.85}
.upd .modal{display:none;position:fixed;inset:0;background:rgba(30,27,75,.45);backdrop-filter:blur(2px);z-index:500;padding:16px;overflow-y:auto}
html[data-theme="dark"] .upd .modal{background:rgba(0,0,0,.7)}
.upd .modal.on{display:block}
.upd .sheet{max-width:760px;margin:20px auto;background:var(--card);border:1px solid var(--line);
border-radius:var(--radius-lg);box-shadow:var(--shadow-lg);overflow:hidden}
.upd .sheet-head{padding:20px 26px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;gap:14px;align-items:flex-start}
.upd .sheet-head h2{font-family:'Sora',sans-serif;font-size:1.05rem;font-weight:600;line-height:1.45;color:var(--ink)}
.upd .x{background:none;border:none;font-size:1.5rem;color:var(--ink-soft);cursor:pointer;line-height:1}
.upd .sheet-tabs{display:flex;gap:4px;padding:12px 26px 0;border-bottom:1px solid var(--line);flex-wrap:wrap}
.upd .st{padding:9px 14px;border:none;background:none;font-weight:600;font-size:.85rem;color:var(--ink-soft);cursor:pointer;border-bottom:2px solid transparent}
.upd .st.on{color:var(--brand-600);border-bottom-color:var(--brand-600)}
.upd .sheet-body{padding:22px 26px 26px;max-height:70vh;overflow-y:auto}
.upd .glance{background:var(--card-2);border:1px solid var(--line);border-radius:var(--radius);padding:16px 18px;margin-bottom:16px}
.upd .glance h5{font-size:.72rem;text-transform:uppercase;letter-spacing:.06em;color:var(--ink-soft);font-weight:700;margin-bottom:10px}
.upd .glance p{font-size:.93rem;line-height:1.6;color:var(--ink);margin-bottom:10px}
.upd .glance dl{display:grid;grid-template-columns:auto 1fr;gap:5px 14px;font-size:.83rem;margin:0}
.upd .glance dt{color:var(--ink-soft);font-weight:600}
.upd .glance dd{color:var(--ink)}
.upd .disclose{width:100%;padding:11px 16px;border:1px solid var(--line);background:var(--card);border-radius:100px;
color:var(--brand-600);font-weight:600;font-size:.85rem;cursor:pointer;margin-bottom:4px}
.upd .disclose:hover{background:var(--brand-50)}
.upd .full{display:none;margin-top:16px}
.upd .full.on{display:block}
.upd .langbar{display:flex;gap:6px;margin-bottom:12px}
.upd .lang{padding:6px 15px;border-radius:100px;border:1px solid var(--line);background:var(--card);
font-size:.79rem;font-weight:600;color:var(--ink-soft);cursor:pointer}
.upd .lang.on{background:var(--brand-50);color:var(--brand-700);border-color:transparent}
.upd .sheet-body p{font-size:.94rem;line-height:1.75;margin-bottom:13px;color:var(--ink)}
.upd .wc{font-size:.73rem;color:var(--ink-soft);margin-bottom:13px}
.upd .pend{background:var(--amber-50);border-radius:var(--radius);padding:14px 16px;color:var(--amber);font-size:.85rem;line-height:1.6;margin-bottom:14px}
.upd .srcbox{background:var(--card-2);border:1px solid var(--line);border-radius:var(--radius);padding:14px 16px;margin-top:14px}
.upd .srcbox h4{font-size:.72rem;text-transform:uppercase;letter-spacing:.06em;color:var(--ink-soft);margin-bottom:7px}
.upd .srcbox a{font-weight:600;word-break:break-all;font-size:.85rem}
.upd .dl{display:grid;grid-template-columns:190px 1fr;gap:7px 16px;font-size:.88rem}
.upd .dl dt{color:var(--ink-soft);font-weight:600}
.upd .dl dd{color:var(--ink)}
.upd .hist{border:1px solid var(--line);border-radius:var(--radius);overflow:hidden;margin-bottom:14px}
.upd .hist-h{background:var(--card-2);padding:10px 14px;font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--ink-soft)}
.upd .hist-r{padding:12px 14px;border-top:1px solid var(--line);font-size:.86rem;color:var(--ink)}
.upd .hist-r.now{background:var(--green-50)}
.upd .hist-r.bad{background:var(--red-50)}
.upd .hist-r.gapr{background:var(--card-2)}
.upd .hist-r b{font-family:'Sora',sans-serif}
.upd .foot{display:flex;align-items:center;justify-content:center;gap:12px;width:calc(100% - 40px);max-width:1160px;margin:24px auto 0;padding:16px 20px;background:var(--brand-50);border:1px solid var(--line);border-radius:var(--radius);color:var(--ink);font-size:.9rem;line-height:1.6;text-align:center}
.upd .foot svg{flex-shrink:0;width:20px;height:20px;color:var(--brand-600)}
.upd .foot p{margin:0}
.upd{margin-bottom:-40px}
.upd .scroller{overflow-x:auto;border:1px solid var(--line);border-radius:var(--radius)}
@media(max-width:860px){.upd .intro h1{font-size:1.55rem}.upd .dl{grid-template-columns:1fr;gap:2px 0}.upd .dl dd{margin-bottom:7px}.upd .count{margin-left:0;width:100%}.upd .jgrid{grid-template-columns:1fr}}
.upd .jlists{display:grid;grid-template-columns:1fr 1fr;gap:20px;align-items:start;margin-top:18px}
.upd .jcol{background:var(--card);border:1px solid var(--line);border-radius:var(--radius);overflow:hidden}
.upd .jcol-h{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:14px 18px;background:var(--card-2);
border-bottom:1px solid var(--line);font-family:'Sora',sans-serif;font-size:.92rem;font-weight:600;color:var(--ink)}
.upd .jn{font-family:'DM Sans',sans-serif;font-size:.74rem;font-weight:700;color:var(--brand-700);background:var(--brand-50);
border-radius:100px;padding:2px 10px}
.upd .jlist{list-style:none;margin:0;padding:0}
.upd .jlist li+li{border-top:1px solid var(--line)}
.upd .jrow{display:flex;justify-content:space-between;align-items:center;gap:10px;width:100%;padding:12px 18px;border:none;
background:none;color:var(--ink);font-size:.92rem;font-weight:500;text-align:left;cursor:pointer;font-family:'DM Sans',sans-serif}
.upd .jrow:hover{background:var(--brand-50);color:var(--brand-700)}
.upd .jrow:focus-visible{outline:2px solid var(--brand-600);outline-offset:-2px}
.upd .jrow{min-height:46px}
.upd .jrow.link{color:var(--brand-600);font-weight:600;text-decoration:underline;text-decoration-color:transparent;text-underline-offset:3px;transition:text-decoration-color .15s}
.upd .jrow.link:hover{text-decoration-color:var(--brand-600);background:var(--brand-50);color:var(--brand-700)}
.upd .slab{margin-bottom:16px}
.upd .slab-t{font-family:'Sora',sans-serif;font-size:.86rem;font-weight:600;color:var(--ink);margin:0 0 8px}
.upd .slab table td.num{white-space:normal;text-align:right}
.upd .rate-box{border:1px solid var(--line);border-radius:var(--radius);overflow:hidden;margin-bottom:16px;background:var(--card)}
.upd .rate-h{padding:13px 18px;background:var(--brand-50);font-family:'Sora',sans-serif;font-size:.92rem;font-weight:700;color:var(--brand-700)}
.upd .rate-s{font-family:'DM Sans',sans-serif;font-weight:500;font-size:.78rem;color:var(--ink-soft)}
.upd .rate-row{display:flex;justify-content:space-between;align-items:baseline;gap:14px;padding:13px 18px;border-top:1px solid var(--line)}
.upd .rate-name{font-weight:700;color:var(--ink);font-size:.95rem}
.upd .rate-val{font-family:'Sora',sans-serif;font-weight:700;color:var(--ink);font-size:1rem;text-align:right}
.upd .rate-val small{font-family:'DM Sans',sans-serif;font-weight:500;color:var(--ink-soft);font-size:.78rem}
.upd .rate-day{font-family:'DM Sans',sans-serif;font-weight:500;color:var(--ink-soft);font-size:.82rem}
.upd .rate-ref{padding:10px 18px;border-top:1px solid var(--line);font-size:.78rem;color:var(--ink-soft);background:var(--card-2)}
@media(max-width:560px){.upd .rate-row{flex-direction:column;gap:3px}.upd .rate-val{text-align:left}}
.upd li.jrow.off{cursor:default;color:var(--ink-soft);font-weight:400;display:flex;align-items:center}
.upd li.jrow.off:hover{background:none;color:var(--ink-soft)}
.upd .jtag{font-size:.68rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--red);background:var(--red-50);
border-radius:100px;padding:2px 9px}
.upd .keyfacts{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-bottom:18px}
.upd .kf{background:var(--card-2);border:1px solid var(--line);border-radius:var(--radius-sm);padding:12px 14px}
.upd .kf.wide{grid-column:1/-1}
.upd .kf-l{display:block;font-size:.68rem;text-transform:uppercase;letter-spacing:.06em;color:var(--ink-soft);font-weight:700;margin-bottom:5px}
.upd .kf-v{display:block;font-size:.95rem;color:var(--ink);line-height:1.5;font-weight:600}
@media(max-width:860px){.upd .jlists{grid-template-columns:1fr}}
      `}</style>
    </>
  );
}
