import Head from "next/head";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { useState, useRef, useCallback, useEffect } from "react";
import ReactDOM from "react-dom";
import * as XLSX from "xlsx";
import FeedbackWidget from "../components/FeedbackWidget";
import SeoHead from "../components/SeoHead";
import AnswerBox from "../components/AnswerBox";
import RelatedLinks from "../components/RelatedLinks";
import { webApplicationSchema, faqSchema, breadcrumbSchema } from "../lib/seoSchemas";
import SEO_PAGES from "../config/seoPages";
import RELATED from "../config/related";

const PAGE_SEO = SEO_PAGES["/esic-mc-creator"];

/* ══════════════════════════════════════════════════════════════════════════
   ESIC MC Creator (pages/esic-mc-creator.js)
   Rebuilt to match pf-ecr-creator.js conventions exactly: portal-positioned
   Tooltip/InfoIcon, dark-theme mirroring wrapper + styled-jsx override
   block, full SEO Head (OG/Twitter/JSON-LD), info cards + FAQ accordion,
   GA4 tool_download_completed events on the two real download buttons.
   Core validation/contribution logic is unchanged from the reviewed build.
   ══════════════════════════════════════════════════════════════════════════
   REQUIRED before deploying:
     1. Place ESIC_MC_Template.xlsx at public/esic-mc-template.xlsx
     2. Place esic-portal-template.xls at public/esic-portal-template.xls
        (decoded from the REVIEW build's PORTAL_TEMPLATE_B64 constant —
        this one MUST stay a fetched real binary, unlike PF ECR's template,
        because it preserves the ESIC portal's dropdown validation and
        merged-cell formatting byte-for-byte; it can't be rebuilt with
        XLSX.utils the way buildTemplateWorkbook() does for PF ECR)
     3. Confirm `xlsx` is already a project dependency (it is, elsewhere)
     4. Wire the homepage tool card + Header "More Tools" dropdown + nav
   ══════════════════════════════════════════════════════════════════════════ */

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const C = {
  ip:     "IP Number (10 Digits)",
  name:   "IP Name",
  days:   "No. of Days Paid/Payable",
  wages:  "Total Monthly Wages",
  status: "Employee Status",
  lwd:    "Last Working Day (DD/MM/YYYY)",
};

const ALIASES = {
  ip:     [C.ip, "ESI/IP Number", "IP Number", "IP No", "Insurance Number", "ESI Number", "ESIC Number", "IP", "ESI No", "ip number"],
  name:   [C.name, "Name", "Employee Name", "Insured Person", "Emp Name", "IPName"],
  days:   [C.days, "Payable Days in the month", "No of Days", "Days", "Paid Days", "Payable Days", "Working Days", "Days Paid"],
  wages:  [C.wages, "Gross Salary Paid", "ESI Wages", "Wages", "Gross", "ESI Gross", "Total Wages", "Monthly Wages"],
  status: [C.status, "Status", "Reason Code", "Reason", "Employee Status", "Code"],
  lwd:    [C.lwd, "Last Working Day", "LWD", "Date of Exit", "Date of Leaving", "DOE", "Relieving Date", "Exit Date"],
};

const STATUS = [
  { code: 0,  label: "Active - wages paid",              portal: "No Reason (days and wages provided)", date: false },
  { code: 1,  label: "On Leave",                         portal: "On Leave",                            date: false },
  { code: 2,  label: "Left Service",                     portal: "Left Service",                        date: true, drops: true },
  { code: 3,  label: "Retired",                          portal: "Retired",                             date: true, drops: true },
  { code: 4,  label: "Out of Coverage",                  portal: "Out of Coverage",                     date: true, drops: true },
  { code: 5,  label: "Expired",                          portal: "Expired",                             date: true, drops: true },
  { code: 6,  label: "Non-Implemented Area",             portal: "Non Implemented Area",                date: true },
  { code: 7,  label: "Compliance by Immediate Employer", portal: "Compliance by Immediate Employer",    date: false },
  { code: 8,  label: "Suspension of Work",               portal: "Suspension of work",                  date: false },
  { code: 9,  label: "Strike / Lockout",                 portal: "Strike/Lockout",                      date: false },
  { code: 10, label: "Retrenchment",                     portal: "Retrenchment",                        date: true, drops: true },
  { code: 11, label: "No Work",                          portal: "No Work",                             date: false },
  { code: 12, label: "Doesnt Belong To This Employer",   portal: "Doesnt Belong To This Employer",      date: false },
  { code: 13, label: "Duplicate IP",                     portal: "Duplicate IP",                        date: false },
];
const ST = {}; STATUS.forEach(s => { ST[s.code] = s; });

const EE_RATE = 0.0075, ER_RATE = 0.0325, WAGE_CEILING = 21000;
const OBS_PER_PAGE = 10;
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const YEARS  = ["2024","2025","2026","2027","2028","2029","2030"];

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function getVal(row, aliases) {
  for (const a of aliases) { if (row[a] !== undefined && row[a] !== null && row[a] !== "") return row[a]; }
  const la = aliases.map(a => a.toLowerCase().trim());
  for (const key of Object.keys(row)) { if (la.includes(key.toLowerCase().trim()) && row[key] !== undefined && row[key] !== null && row[key] !== "") return row[key]; }
  return "";
}
function hasCol(rows, aliases) {
  if (!rows.length) return false;
  const la = aliases.map(a => a.toLowerCase().trim());
  const fr = rows[0];
  return aliases.some(a => fr[a] !== undefined) || Object.keys(fr).some(k => la.includes(k.toLowerCase().trim()));
}
function num(v) { const n = parseFloat(String(v).replace(/[^0-9.\-]/g, "")); return isNaN(n) ? 0 : n; }
function fmt(v) { return "Rs. " + Math.ceil(v).toLocaleString("en-IN"); }
function stripHtml(h) { return h.replace(/<[^>]+>/g, ""); }
const pad = n => String(n).padStart(2, "0");

const eeOf = w => Math.ceil(w * EE_RATE);
// Verified against a real ESIC portal contribution-history export (117
// employees): plain ceil(wage*0.75%) matches 114/117 exactly, including
// every employee above the ₹21,000 ceiling (uncapped - contribution runs
// on full actual wages once covered, past the ceiling, until the
// contribution period ends; capping was a wrong earlier hypothesis).
// The only 3 mismatches were employees at exactly ₹21,067 wages, where the
// portal showed ₹158 vs ceiling's ₹159 - a ~1/4-paisa fractional overage
// almost certainly lost when the portal exported whole-rupee wages, not a
// formula issue (a different employee at ₹16,424, fraction 0.18, still
// rounds UP to ₹124, which rules out plain "round to nearest" as the rule).
// Employer leg is NOT rounded per employee - see erOf below and totEr in
// buildSummaryOutput.
const erOf = w => w * ER_RATE;

const keyOf = s => String(s || "").toLowerCase().replace(/[^a-z]/g, "");
const SYNONYMS = {
  active:0, working:0, present:0, paid:0, continuing:0, onroll:0, onrolls:0, activewagespaid:0,
  onleave:1, leave:1, absent:1, lwp:1,
  left:2, leftservice:2, resigned:2, resignation:2, separated:2, exit:2, exited:2, terminated:2,
  retired:3, retirement:3, superannuated:3, superannuation:3,
  outofcoverage:4, outofcover:4, notcovered:4, abovelimit:4, crossedlimit:4, exceedslimit:4,
  expired:5, deceased:5, death:5, died:5,
  nonimplementedarea:6, nonimplemented:6,
  immediateemployer:7, contractor:7,
  suspensionofwork:8, suspension:8, suspended:8,
  strikelockout:9, strike:9, lockout:9,
  retrenchment:10, retrenched:10, layoff:10, laidoff:10,
  nowork:11, nojob:11,
  doesnotbelong:12, notouremployee:12, wrongip:12,
  duplicateip:13, duplicate:13,
};
function toCode(v) {
  const s = String(v == null ? "" : v).trim();
  if (s === "") return null;
  if (/^\d+$/.test(s)) return (+s in ST) ? +s : null;
  const k = keyOf(s);
  const byLabel  = STATUS.find(x => keyOf(x.label)  === k); if (byLabel)  return byLabel.code;
  const byPortal = STATUS.find(x => keyOf(x.portal) === k); if (byPortal) return byPortal.code;
  return SYNONYMS[k] !== undefined ? SYNONYMS[k] : null;
}
function toDate(v) {
  const s = String(v == null ? "" : v).trim();
  if (!s) return "";
  let d, m, y, mt;
  if ((mt = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/)))    { d=+mt[1]; m=+mt[2]; y=+mt[3]; }
  else if ((mt = s.match(/^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})$/))) { y=+mt[1]; m=+mt[2]; d=+mt[3]; }
  else if ((mt = s.match(/^(\d{1,2})[\-\s]([A-Za-z]{3,})[\-\s](\d{2,4})$/))) {
    d=+mt[1]; y=+mt[3];
    m = MONTHS.findIndex(n => n.toLowerCase().startsWith(mt[2].toLowerCase().slice(0,3))) + 1;
  }
  else if (/^\d{5}(\.\d+)?$/.test(s)) {
    const dt = new Date(Date.UTC(1899,11,30) + Math.floor(+s)*864e5);
    d = dt.getUTCDate(); m = dt.getUTCMonth()+1; y = dt.getUTCFullYear();
  }
  if (!d || !m || !y) return s;
  if (y < 100) y += 2000;
  return `${pad(d)}/${pad(m)}/${y}`;
}

// ─── CORE PROCESSING (unchanged from reviewed build) ───────────────────────
function processWorkbook(buffer, month, year) {
  const wb   = XLSX.read(buffer, { type: "array" });
  const ws   = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { defval: "", raw: false });
  // Dates: Excel stores a date as a serial number, but raw:false renders Excel's built-in date
  // formats US-style (month first) - 19 Aug 2026 comes back as "8/19/26" and 1 Aug as "8/1/26".
  // toDate() reads text day-first, so the first becomes an error and the second silently becomes
  // 8 January. The Last Working Day is therefore read from the stored serial instead of the text.
  const rawRows = XLSX.utils.sheet_to_json(ws, { defval: "", raw: true });
  const dateOffset = wb.Workbook && wb.Workbook.WBProps && wb.Workbook.WBProps.date1904 ? 1462 : 0;

  const mcData = [], obsData = [], infoBanners = [];
  let cntValid = 0, cntError = 0, cntZero = 0;

  const mi = MONTHS.indexOf(month);
  const havePeriod = mi >= 0 && !!year;
  const lastDay = havePeriod ? new Date(+year, mi + 1, 0) : null;
  const maxDays = havePeriod ? lastDay.getDate() : 31;

  const colStatus = hasCol(rows, ALIASES.status);
  const colLwd    = hasCol(rows, ALIASES.lwd);
  if (!colStatus)  infoBanners.push({ type:"info", text:"<strong>Employee Status column not found</strong> - every row treated as <strong>Active</strong> (code 0)." });
  if (!colLwd)     infoBanners.push({ type:"info", text:"<strong>Last Working Day column not found</strong> - treated as <strong>blank</strong> for all employees." });
  if (!havePeriod) infoBanners.push({ type:"info", text:"<strong>Wage month not selected</strong> - day-count and April/October checks are skipped." });

  const ipMap = {};
  rows.forEach((row, i) => {
    const ip = String(getVal(row, ALIASES.ip)).trim().replace(/\D/g, "");
    if (ip) { ipMap[ip] = ipMap[ip] || []; ipMap[ip].push(i); }
  });
  const dupIP = new Map();
  Object.entries(ipMap).forEach(([ip, idxs]) => {
    if (idxs.length < 2) return;
    idxs.forEach(idx => dupIP.set(idx, { ip, others: idxs.filter(x => x !== idx).map(x => x + 2).join(", ") }));
  });

  rows.forEach((row, i) => {
    const rowNo   = i + 2;
    const ipRaw   = String(getVal(row, ALIASES.ip)).trim();
    const ip      = ipRaw.replace(/\D/g, "");
    const nameRaw = String(getVal(row, ALIASES.name)).trim();
    const name    = nameRaw || `Row ${rowNo}`;
    const tag     = `<span class="font-semibold">${name}</span>`;

    const daysRaw  = getVal(row, ALIASES.days);
    const wagesRaw = getVal(row, ALIASES.wages);
    const days     = Math.ceil(num(daysRaw));
    const wages    = Math.round(num(wagesRaw));
    let   code     = colStatus ? toCode(getVal(row, ALIASES.status)) : 0;
    const lwdStored = colLwd ? getVal(rawRows[i] || {}, ALIASES.lwd) : "";
    let   lwd      = colLwd ? toDate(typeof lwdStored === "number" ? lwdStored + dateOffset : getVal(row, ALIASES.lwd)) : "";

    let status = "VALID";
    const remarks = [];
    const err  = t => { remarks.push({ type:"error", text:t }); if (status !== "ERROR") { status = "ERROR"; cntError++; } };
    const warn = t => remarks.push({ type:"warn", text:t });
    const note = t => remarks.push({ type:"note", text:t });   // routine automatic adjustment - nothing for the user to fix
    const suggest = t => remarks.push({ type:"suggestion", text:t });   // optional follow-up for a later filing - the file itself is fine

    if (!ip) err(`${tag}: Missing IP number - fix before upload.`);
    else if (ip.length !== 10) err(`${tag}: IP number <strong>${ipRaw}</strong> is ${ip.length} digit(s), must be exactly 10.`);
    if (dupIP.has(i)) {
      const { ip: d, others } = dupIP.get(i);
      err(`${tag}: Duplicate IP <strong>${d}</strong> - also at row(s) ${others}. The portal takes one row per IP.`);
    }
    if (!nameRaw) err(`Row ${rowNo}: Missing IP name.`);
    else if (!/^[A-Za-z ]+$/.test(nameRaw)) {
      const cleaned = nameRaw.replace(/[^A-Za-z ]+/g, " ").replace(/\s+/g, " ").trim();
      if (cleaned) warn(`${tag}: Name cleaned to <strong>${cleaned}</strong> - ESIC accepts letters and spaces only.`);
      else err(`Row ${rowNo}: Name has no usable letters.`);
    }

    if (num(daysRaw) !== days) note(`${tag}: Days rounded up ${num(daysRaw)} → ${days}.`);
    if (days < 0) err(`${tag}: Days cannot be negative.`);
    if (havePeriod && days > maxDays) err(`${tag}: ${days} days, but ${month} ${year} has ${maxDays}.`);
    if (wages < 0) err(`${tag}: Wages cannot be negative.`);
    if (days === 0 && wages > 0) err(`${tag}: Zero days must carry zero wages (currently Rs. ${wages.toLocaleString("en-IN")}).`);
    if (days > 0 && wages === 0) warn(`${tag}: Days are paid but wages are 0 - confirm this is intended.`);
    if (days > 0 && wages > WAGE_CEILING) suggest(`${tag}: Wages Rs. ${wages.toLocaleString("en-IN")} exceed the Rs. ${WAGE_CEILING.toLocaleString("en-IN")} coverage limit. Contribution still runs to the end of the contribution period; use Out of Coverage from the next April or October.`);
    if (days === 0) cntZero++;

    if (code === null) {
      if (colStatus && String(getVal(row, ALIASES.status)).trim() !== "")
        err(`${tag}: Status <strong>${String(getVal(row, ALIASES.status)).trim()}</strong> not recognised - pick one from the template dropdown.`);
      else if (days > 0) { code = 0; }
      else err(`${tag}: Zero days with no status - pick a status so the portal knows why.`);
    }
    if (code !== null && days > 0 && code !== 0) {
      warn(`${tag}: Days are paid, so status corrected from <strong>${ST[code].label}</strong> to <strong>Active</strong>${lwd ? " and last working day removed" : ""}. Their exit goes in next month's return.`);
      code = 0; lwd = "";
    }
    if (code === 0 && days === 0) warn(`${tag}: Zero days filed as Active. If they left, retired or are out of coverage, pick that status instead.`);
    if (code === 4 && havePeriod && mi !== 3 && mi !== 9)
      warn(`${tag}: Out of Coverage only takes effect in an April or October wage period. Filed in ${month} the IP stays on your list.`);

    const needsDate = code !== null && ST[code] && ST[code].date;
    if (days > 0 && lwd) {
      warn(`${tag}: Last working day removed - a date belongs only on a zero-days row. Their exit goes in next month's return.`);
      lwd = "";
    } else if (days === 0 && needsDate && !lwd) {
      err(`${tag}: <strong>${ST[code].label}</strong> needs a last working day.`);
    } else if (days === 0 && code !== null && ST[code] && !ST[code].date && lwd) {
      warn(`${tag}: Last working day removed - <strong>${ST[code].label}</strong> must leave it blank.`);
      lwd = "";
    }
    if (lwd) {
      if (!/^\d{2}\/\d{2}\/\d{4}$/.test(lwd)) {
        err(`${tag}: Last working day <strong>${lwd}</strong> is not DD/MM/YYYY with padded digits (02/05/2026, not 2/5/2026).`);
      } else {
        const [dd, mm, yy] = lwd.split("/").map(Number);
        const dt = new Date(yy, mm - 1, dd);
        if (dt.getDate() !== dd || dt.getMonth() !== mm - 1) err(`${tag}: Last working day <strong>${lwd}</strong> is not a real date.`);
        else if (havePeriod && dt > lastDay) warn(`${tag}: Last working day falls after ${month} ${year} ends.`);
      }
    }
    if (code !== null && ST[code] && ST[code].drops && days === 0 && lwd)
      warn(`${tag}: Filed as ${ST[code].label} - this IP drops off your list from the next wage period.`);

    if (status === "VALID") {
      cntValid++;
      const cleanName = nameRaw.replace(/[^A-Za-z ]+/g, " ").replace(/\s+/g, " ").trim();
      mcData.push({ ip, name: cleanName.toUpperCase(), days, wages, code: code === null ? 0 : code, lwd, ee: eeOf(wages), er: erOf(wages) });
    }
    obsData.push(...remarks);
  });

  if (cntZero > 0) {
    const l = cntZero === rows.length ? "All employees" : `${cntZero} employee(s)`;
    obsData.push({ type:"warn", text:`<strong>Zero payable days</strong> for ${l}. Each needs a status that explains why.` });
  }
  obsData.push({ type:"warn", text:`<strong>Coverage check:</strong> the portal accepts the file only when every IP currently mapped to your employer code is present. This file carries <strong>${rows.length}</strong> row(s) - reconcile against the portal's IP list before uploading.` });

  return { mcData, obsData, infoBanners, total: rows.length, cntValid, cntError, cntZero };
}

// ─── PORTAL XLS BYTE INJECTION (unchanged logic) ───────────────────────────
const R_BOF=0x0809, R_BOUNDSHEET=0x0085, R_INDEX=0x020B, R_DBCELL=0x00D7,
      R_DIMENSIONS=0x0200, R_WINDOW2=0x023E, R_LABEL=0x0204;
// NOTE: DATA_XF assumes the portal template's 6 data columns keep this exact
// style-index order. If ESIC ever reissues the template with a different
// column layout, this mapping needs re-deriving from the new file's XF table.
const DATA_XF = [78, 78, 70, 70, 70, 78];

function labelRec(rw, col, xf, str) {
  const wide = /[^\u0000-\u00ff]/.test(str), n = str.length;
  const body = 4 + 9 + (wide ? n*2 : n);
  const b = new Uint8Array(body), v = new DataView(b.buffer);
  v.setUint16(0, R_LABEL, true); v.setUint16(2, body-4, true);
  v.setUint16(4, rw, true); v.setUint16(6, col, true); v.setUint16(8, xf, true);
  v.setUint16(10, n, true); b[12] = wide ? 1 : 0;
  for (let i = 0; i < n; i++) {
    const c = str.charCodeAt(i);
    if (wide) v.setUint16(13+i*2, c, true); else b[13+i] = c & 0xFF;
  }
  return b;
}
function injectRows(templateBytes, dataRows) {
  const cfb = XLSX.CFB.read(templateBytes, { type:"array" });
  const entry = XLSX.CFB.find(cfb, "/Workbook") || XLSX.CFB.find(cfb, "Workbook");
  const st = new Uint8Array(entry.content);
  const dv = new DataView(st.buffer, st.byteOffset, st.byteLength);

  const recs = []; let sheet = -1, globals = false;
  for (let p = 0; p+4 <= st.length;) {
    const id = dv.getUint16(p,true), len = dv.getUint16(p+2,true);
    if (id === R_BOF) { const dt = dv.getUint16(p+6,true); if (dt === 0x0005) globals = true; else if (globals) sheet++; }
    recs.push({ id, sheet, buf: st.slice(p, p+4+len) });
    p += 4 + len;
  }
  const out = [];
  for (const r of recs) {
    if (r.sheet === 0 && (r.id === R_INDEX || r.id === R_DBCELL)) continue;
    if (r.sheet === 0 && r.id === R_DIMENSIONS) {
      const b = r.buf.slice(), v = new DataView(b.buffer);
      v.setUint32(4,0,true); v.setUint32(8, dataRows.length+1, true);
      v.setUint16(12,0,true); v.setUint16(14,6,true);
      out.push({ id:r.id, sheet:r.sheet, buf:b }); continue;
    }
    if (r.sheet === 0 && r.id === R_WINDOW2) {
      dataRows.forEach((row,i) => row.forEach((val,c) => {
        const s = String(val == null ? "" : val);
        if (s !== "") out.push({ id:R_LABEL, sheet:0, buf: labelRec(i+1, c, DATA_XF[c], s) });
      }));
    }
    out.push(r);
  }
  let n = 0; out.forEach(r => { n += r.buf.length; });
  const merged = new Uint8Array(n); let o = 0;
  out.forEach(r => { merged.set(r.buf, o); o += r.buf.length; });
  const mv = new DataView(merged.buffer);
  const bs = [], bofs = [];
  for (let p = 0; p+4 <= merged.length;) {
    const id = mv.getUint16(p,true), len = mv.getUint16(p+2,true);
    if (id === R_BOUNDSHEET) bs.push(p);
    if (id === R_BOF && mv.getUint16(p+6,true) === 0x0010) bofs.push(p);
    p += 4 + len;
  }
  bs.forEach((pos,k) => { if (bofs[k] !== undefined) mv.setUint32(pos+4, bofs[k], true); });
  entry.content = merged; entry.size = merged.length;
  return new Uint8Array(XLSX.CFB.write(cfb, { type:"array" }));
}
function saveBytes(bytes, name, mime) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([bytes], { type: mime }));
  a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
async function buildXlsOutput(mcData, month, year) {
  const res = await fetch("/esic-portal-template.xls");
  if (!res.ok) throw new Error(`the ESIC portal template could not be loaded from the site (HTTP ${res.status}).`);
  const templateBytes = new Uint8Array(await res.arrayBuffer());
  // A real .xls is an OLE2 compound file and starts with D0 CF 11 E0. Anything else
  // (e.g. an HTML error page served in its place) would crash the row injector with
  // an unreadable message, so fail early with a clear one instead.
  if (templateBytes.length < 8 || templateBytes[0] !== 0xD0 || templateBytes[1] !== 0xCF || templateBytes[2] !== 0x11 || templateBytes[3] !== 0xE0) {
    throw new Error("the ESIC portal template on the site is not a valid .xls file.");
  }
  const rows = mcData.map(r => [r.ip, r.name, String(r.days), String(r.wages), String(r.code), r.lwd]);
  saveBytes(injectRows(templateBytes, rows), `ESIC_MC_${month}_${year}.xls`, "application/vnd.ms-excel");
}
function buildSummaryOutput(mcData, month, year) {
  const totWage = mcData.reduce((a,r)=>a+r.wages,0);
  const totEe   = mcData.reduce((a,r)=>a+r.ee,0);
  const totEr   = Math.ceil(mcData.reduce((a,r)=>a+r.er,0)); // sum raw per-employee amounts, round UP once (verified against real portal export: 66039.09 -> 66040)
  const byStatus = {}; mcData.forEach(r => { byStatus[r.code] = (byStatus[r.code]||0)+1; });

  const head = [
    ["ESIC Monthly Contribution - Cost Summary"],
    ["Wage Period", `${month} ${year}`],
    ["Generated", new Date().toLocaleString("en-IN")],
    [],
    ["Insured Persons Filed", mcData.length],
    ["Total Wages", totWage],
    ["Employee Contribution @0.75%", totEe],
    ["Employer Contribution @3.25%", totEr],
    ["Total Payable by Company", totEe + totEr],
    [],
    ["Employee contribution is rounded up per employee, then summed. Employer contribution sums the raw per-employee amounts first, then rounds the total UP once - the method the ESIC portal uses."],
    [],
    ["Headcount by Status"],
    ["Code","Status","Employees"],
    ...Object.keys(byStatus).sort((a,b)=>a-b).map(c => [Number(c), ST[c].label, byStatus[c]]),
  ];
  const ws1 = XLSX.utils.aoa_to_sheet(head);
  ws1["!cols"] = [{wch:34},{wch:34},{wch:14}];

  const detail = [["IP Number","IP Name","Payable Days","ESI Wages","Code","Status","Last Working Day","Employee 0.75%","Employer 3.25%","Total"]];
  mcData.forEach(r => { const erDisplay = Math.round(r.er); detail.push([r.ip, r.name, r.days, r.wages, r.code, ST[r.code].label, r.lwd, r.ee, erDisplay, r.ee+erDisplay]); });
  detail.push([]);
  detail.push(["Total","","",totWage,"","","",totEe,totEr,totEe+totEr]);
  const ws2 = XLSX.utils.aoa_to_sheet(detail);
  ws2["!cols"] = [{wch:14},{wch:28},{wch:13},{wch:12},{wch:8},{wch:30},{wch:17},{wch:15},{wch:15},{wch:12}];

  [[ws1,3],[ws2,10]].forEach(([ws,cols]) => {
    for (let c = 0; c < cols; c++) {
      const addr = XLSX.utils.encode_cell({ r:0, c });
      if (ws[addr]) ws[addr].s = { fill:{ patternType:"solid", fgColor:{ rgb:"EDE9FE" } }, font:{ bold:true } };
    }
  });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws1, "Summary");
  XLSX.utils.book_append_sheet(wb, ws2, "Employee Detail");
  XLSX.writeFile(wb, `ESIC_MC_Summary_${month}_${year}.xlsx`);
}
function buildObsTxt(obsData, month, year) {
  const header = `ESIC MC CREATOR - OBSERVATIONS\nWage Month: ${month} ${year}\nGenerated: ${new Date().toLocaleString("en-IN")}\n${"─".repeat(80)}\n`;
  const lines = obsData.map((o,i) =>
    `${String(i+1).padStart(4,"0")}  ${({error:"[ERROR]     ",warn:"[WARNING]   ",suggestion:"[SUGGESTION]"}[o.type] || "[NOTE]      ")}  ${stripHtml(o.text)}`);
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([header + lines.join("\n")], { type: "text/plain" }));
  a.download = `ESIC_MC_Observations_${month}_${year}.txt`;
  a.click();
}

// ─── TOOLTIP (ported verbatim from pf-ecr-creator.js) ──────────────────────
function Tooltip({ text, children, position = "top" }) {
  const [show, setShow]             = useState(false);
  const [tooltipPos, setTooltipPos] = useState({ left: 0, top: 0 });
  const wrapperRef                  = useRef(null);
  const tooltipWidth                = 220;

  const updatePosition = useCallback(() => {
    if (!wrapperRef.current || typeof window === "undefined") return;
    const rect = wrapperRef.current.getBoundingClientRect();
    let left, top;
    if (position === "bottom-left") {
      left = Math.min(Math.max(rect.right - tooltipWidth, 8), window.innerWidth - tooltipWidth - 8);
      top  = rect.bottom + 8;
    } else if (position === "bottom") {
      left = Math.min(Math.max(rect.left + rect.width / 2 - tooltipWidth / 2, 8), window.innerWidth - tooltipWidth - 8);
      top  = rect.bottom + 8;
    } else {
      left = Math.min(Math.max(rect.left + rect.width / 2, 8 + tooltipWidth / 2), window.innerWidth - tooltipWidth / 2 - 8);
      top  = Math.max(8, rect.top);
    }
    setTooltipPos({ left, top });
  }, [position]);

  const showTooltip = useCallback(() => { updatePosition(); setShow(true); }, [updatePosition]);
  const hideTooltip = useCallback(() => setShow(false), []);

  const tooltipElement =
    show && typeof document !== "undefined"
      ? ReactDOM.createPortal(
          <span
            className="fixed z-50 rounded-lg bg-gray-900 text-white text-xs px-3 py-2 shadow-xl pointer-events-none max-w-[220px] whitespace-normal break-words"
            style={{
              left: tooltipPos.left,
              top:  tooltipPos.top,
              width: tooltipWidth,
              transform:
                position === "top"
                  ? "translateX(-50%) translateY(-100%)"
                  : position === "bottom"
                  ? "translateX(-50%)"
                  : "translateX(0)",
            }}
          >
            {text}
            {position === "bottom-left" ? (
              <span className="absolute top-0 -translate-y-full right-3 border-4 border-transparent border-b-gray-900" />
            ) : (
              <span className="absolute left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" style={{ top: "100%" }} />
            )}
          </span>,
          document.body
        )
      : null;

  return (
    <span
      className="relative inline-flex items-center"
      ref={wrapperRef}
      tabIndex={0}
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onFocus={showTooltip}
      onBlur={hideTooltip}
    >
      {children}
      {tooltipElement}
    </span>
  );
}

function InfoIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" className="inline ml-1 cursor-help" aria-label="info">
      <circle cx="7.5" cy="7.5" r="7.5" fill="#A78BFA" fillOpacity="0.18" />
      <circle cx="7.5" cy="7.5" r="6.5" stroke="#A78BFA" strokeWidth="1.1" />
      <circle cx="7.5" cy="4.8" r="0.85" fill="#A78BFA" />
      <rect x="6.85" y="6.5" width="1.3" height="3.8" rx="0.65" fill="#A78BFA" />
    </svg>
  );
}

// ─── MAIN PAGE ──────────────────────────────────────────────────────────────
const MC_INFO_CARDS = [
  {
    icon: "📄",
    title: "What is an MC file?",
    body: "The Monthly Contribution file every employer uploads to the ESIC portal each wage period, reporting payable days, wages, and status for every Insured Person mapped to the employer code.",
  },
  {
    icon: "🧮",
    title: "What this tool does",
    body: "Reads your payroll Excel sheet, validates IP numbers, statuses and dates against ESIC's rules, computes Employee (0.75%) and Employer (3.25%) contributions, and writes the rows directly into the blank portal template - byte-identical to what ESIC issues.",
  },
  {
    icon: "📝",
    title: "Worked Example",
    body: "An employee on Rs. 18,500 ESI wages: Employee contribution is 0.75% of Rs. 18,500 rounded up = Rs. 139. Employer contribution is 3.25% = Rs. 601.25, rounded up to Rs. 602 on a one-person file (across many employees it is summed first, then rounded once). Total payable: Rs. 741.",
  },
  {
    icon: "⚖️",
    title: "Common rejection reasons",
    body: "An IP not currently mapped to your employer code, a duplicate IP number in the file, an exit status (Left Service, Retired, etc.) filed without a last working day, and uploading a file that isn't the exact portal template are the most common reasons ESIC rejects an MC file.",
  },
  {
    icon: "🔒",
    title: "100% Browser Processing",
    body: "Your payroll sheet is never uploaded to any server - the entire file is read, validated, and converted inside your own browser, then discarded the moment you close the tab.",
  },
];

const MC_FAQ = [
  {
    q: "Why does the ESIC portal keep rejecting my MC file?",
    a: "The most common causes are an IP number that isn't currently mapped to your employer code, a duplicate IP appearing twice in the same file, an exit status like Left Service, Retired or Expired filed without a last working day, or uploading a file that isn't the exact blank template downloaded from the portal. This tool checks for all of these automatically before letting you download.",
  },
  {
    q: "What is the Rs. 21,000 wage ceiling, and does it change how I file?",
    a: "Rs. 21,000 is the ESI coverage wage ceiling - employees earning up to that are covered. It doesn't change how contributions are calculated (both legs are still a percentage of actual wages, uncapped), but once an employee crosses it, they can only be moved to Out of Coverage from the next April or October contribution period, not immediately.",
  },
  {
    q: "Why are Employee and Employer contributions rounded the way they are?",
    a: "The two legs round differently. The employee's 0.75% is rounded UP for each employee individually, then those rounded figures are summed - this is what gets deducted from each employee's pay, so it has to be a whole rupee per person. The employer's 3.25% is kept as the exact per-employee amount, summed across everyone, and rounded UP only once at the total - since no individual employer amount is ever deducted from a person's pay, only the final payable figure needs to be a whole rupee. This tool applies both rules exactly as the portal does, verified against a real ESIC contribution-history export.",
  },
  {
    q: "Does this tool submit the MC file to ESIC for me?",
    a: "No. This tool prepares a correctly formatted, portal-ready MC file from your payroll data. You still need to log in to the ESIC portal yourself, upload the generated file, and complete the challan and payment there.",
  },
  {
    q: "What format does my payroll sheet need to be in?",
    a: "An Excel file (.xlsx or .xls) with one row per Insured Person, including ESI/IP Number, Employee Name, Payable Days in the month, Gross Salary Paid, Employee Status and Last Working Day. Use the Download Template button above to get a ready-made sheet - Employee Status is a dropdown, and statuses marked * need a Last Working Day. Common alternative column names (for example IP Number, Paid Days or Wages) are also recognised.",
  },
  {
    q: "Is my payroll data safe if I upload it here?",
    a: "Your file never leaves your browser. All reading, validation, and MC file generation happens locally on your device using JavaScript - nothing is sent to, or stored on, any PayrollTool.in server.",
  },
];

// One FAQ list for the page: the tool FAQs plus the "ESI file" questions from the SEO config.
// The visible FAQ and the FAQPage schema both come from this array, so they always match.
const ALL_FAQ = [
  ...MC_FAQ,
  ...(PAGE_SEO.faqs || []).filter((f) => !MC_FAQ.some((m) => m.q === f.q)),
];

export default function EsicMcCreator() {
  // Mirror <html data-theme> onto this page's own wrapper - same pattern
  // as pf-ecr-creator.js. This file is built entirely with Tailwind
  // utility classes with no CSS-variable system of its own, so nothing
  // here can respond to a theme change without the explicit override
  // layer below (see .esic-wrapper[data-theme="dark"] rules).
  const [theme, setTheme] = useState("light");
  useEffect(() => {
    const root = document.documentElement;
    setTheme(root.getAttribute("data-theme") || "light");
    const observer = new MutationObserver(() => {
      setTheme(root.getAttribute("data-theme") || "light");
    });
    observer.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  const [file, setFile]           = useState(null);
  const [dragOver, setDragOver]   = useState(false);
  const [processing, setProcessing] = useState(false);
  const [result, setResult]       = useState(null);
  const [obsPage, setObsPage]     = useState(1);
  const [obsVisible, setObsVisible] = useState(false);
  const [month, setMonth]         = useState("");
  const [year, setYear]           = useState("");
  const fileInputRef = useRef(null);

  function validateFile(f) {
    if (!f) return false;
    const ext = f.name.split(".").pop().toLowerCase();
    return ext === "xlsx" || ext === "xls";
  }

  function onPickFile(f) {
    if (!f) return;
    if (!validateFile(f)) { alert("Only .xlsx or .xls files are accepted."); return; }
    setFile(f);
    setResult(null);
    setObsPage(1);
    setObsVisible(false);
  }

  async function handleProcess() {
    if (!file) return;
    if (!month || !year) {
      alert("Please select the Wage Month and Year before generating - the day-count and April/October Out-of-Coverage checks depend on it.");
      return;
    }
    setProcessing(true);
    try {
      const buffer = await file.arrayBuffer();
      const res = processWorkbook(buffer, month, year);
      setResult(res);
      setObsPage(1);
    } catch (err) {
      alert("Error reading file: " + err.message);
    }
    setProcessing(false);
  }

  async function handleDownloadTemplate(e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    try {
      const res = await fetch("/esic-mc-template.xlsx");
      if (!res.ok) throw new Error("HTTP " + res.status);
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "ESIC_MC_Template.xlsx";
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    } catch (err) {
      alert("The ESIC template could not be downloaded right now. Please try again shortly, or email support@payrolltool.in.");
    }
  }

  const hasResult  = !!result;
  const blocked    = hasResult && result.cntError > 0;
  const wageLabel  = month && year ? `${month} ${year}` : month || year || "Month Year";
  const hasObs     = hasResult && result.obsData.length > 0;
  const totalObsPages = hasObs ? Math.ceil(result.obsData.length / OBS_PER_PAGE) : 0;
  const obsSlice   = hasObs ? result.obsData.slice((obsPage-1)*OBS_PER_PAGE, obsPage*OBS_PER_PAGE) : [];
  const sum = k => hasResult ? result.mcData.reduce((a,x)=>a+x[k],0) : 0;

  const stats = hasResult ? [
    { label:"Imported",  value:result.total,    color:"text-gray-700",  bg:"bg-white border-gray-100", tip:"Total rows imported from the file." },
    { label:"Valid",     value:result.cntValid, color:"text-green-600", bg:"bg-white border-gray-100", tip:"Rows that pass every ESI rule and will be written to the upload file." },
    { label:"Errors",    value:result.cntError, color:"text-red-600",   bg:result.cntError>0?"bg-red-50 border-red-200":"bg-white border-gray-100", tip:"Rows with an invalid IP, duplicate IP, day/wage conflict, or a missing last working day." },
    { label:"Zero Days", value:result.cntZero,  color:"text-amber-600", bg:result.cntZero>0?"bg-amber-50 border-amber-200":"bg-white border-gray-100", tip:"Employees with no payable days. Each needs a status explaining why." },
  ] : [];

  const selectCls = "w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 bg-white focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition appearance-none";

  // NOTE: PeriodSelects and DropZone are deliberately CALLED as plain functions
  // ({PeriodSelects({ size: 12 })}), not rendered as <PeriodSelects />. A component
  // defined inside another component gets a new identity on every render, so React
  // unmounts and remounts it - recreating the <select>s and the drop zone while the
  // user is mid-interaction (focus loss, drag flicker). Plain calls keep the DOM stable.
  const PeriodSelects = ({ size }) => (
    <>
      <div>
        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Wage Month</label>
        <select className={selectCls} value={month} onChange={(e) => setMonth(e.target.value)}>
          <option value="">{size === 12 ? "Select Month" : "Month"}</option>
          {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">{size === 12 ? "Calendar Year" : "Year"}</label>
        <select className={selectCls} value={year} onChange={(e) => setYear(e.target.value)}>
          <option value="">{size === 12 ? "Select Year" : "Year"}</option>
          {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>
    </>
  );

  const DropZone = ({ minH }) => (
    <div
      className={`border-2 border-dashed rounded-2xl flex flex-col items-center justify-center py-8 px-4 transition-colors cursor-pointer ${dragOver ? "border-violet-400 bg-violet-50" : "border-gray-200 bg-gray-50/50 hover:border-violet-300 hover:bg-violet-50/30"}`}
      style={{ userSelect: "none", ...(minH ? { minHeight: minH } : {}) }}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => { e.preventDefault(); setDragOver(false); try { onPickFile(e.dataTransfer?.files?.[0]); } catch (_) {} }}
      onClick={() => fileInputRef.current?.click()}
    >
      <div className="w-20 h-20 rounded-full bg-white shadow flex items-center justify-center mb-3 border border-gray-100">
        <svg width="38" height="38" viewBox="0 0 38 38" fill="none">
          <rect x="7" y="4" width="18" height="23" rx="2" stroke="#7C3AED" strokeWidth="1.6" fill="none" />
          <path d="M25 4v6h6" stroke="#7C3AED" strokeWidth="1.4" strokeLinejoin="round" />
          <path d="M13 27h12M13 22h8" stroke="#7C3AED" strokeWidth="1.3" strokeLinecap="round" />
          <circle cx="28" cy="28" r="7" fill="#7C3AED" fillOpacity="0.12" stroke="#7C3AED" strokeWidth="1.5" />
          <path d="M28 25v6M25 28h6" stroke="#7C3AED" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>
      {file ? (
        <>
          <p className="text-sm font-semibold text-violet-700 text-center break-all px-2">{file.name}</p>
          <p className="text-xs text-gray-400 mt-1">{(file.size / 1024).toFixed(1)} KB · Ready{minH ? "" : " to process"}</p>
          <button
            type="button"
            className="mt-2 text-xs text-gray-400 hover:text-red-500 transition-colors underline"
            onClick={(e) => { e.stopPropagation(); setFile(null); setResult(null); }}
          >
            Remove
          </button>
        </>
      ) : (
        <>
          <p className="text-sm font-semibold text-violet-600">Drop file here</p>
          <p className="text-xs text-gray-400 mt-1">Accepts .xlsx or .xls only</p>
        </>
      )}
    </div>
  );

  return (
    <>
      <SeoHead
        title={PAGE_SEO.title}
        description={PAGE_SEO.description}
        path="/esic-mc-creator"
        jsonLd={[
          webApplicationSchema({ name: "ESI File Creator", path: "/esic-mc-creator", description: PAGE_SEO.description, features: PAGE_SEO.features }),
          faqSchema(ALL_FAQ),
          breadcrumbSchema([{ name: "Home", path: "/" }, { name: "ESI File Creator", path: "/esic-mc-creator" }]),
        ]}
      />
      <Head>
        <meta key="viewport" name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div
        className="esic-wrapper min-h-screen flex flex-col"
        data-theme={theme}
        style={{ fontFamily: "'DM Sans', sans-serif", background: theme === "dark" ? "#15111F" : "#EEEAF8" }}
      >
        <Header />

        {/* ── HERO ── */}
        <div className={`pt-6 pb-4 px-4 mx-auto w-full scroll-mt-24 transition-all duration-300 ${hasResult ? "max-w-4xl" : "max-w-lg"}`}>
          <div className="flex flex-col items-center text-center">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-gray-900 whitespace-nowrap">
              ESI File <span className="text-violet-500">Creator</span>
            </h1>
            <p className="mt-3 text-sm text-gray-500 max-w-sm mx-auto leading-relaxed">
              Upload your ESI sheet and generate the ESIC MC (Monthly Contribution) file - ready for portal upload.
            </p>
            <div className="w-full flex justify-end mt-3 pr-1">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="rounded-full border border-violet-200 bg-white px-4 py-2 text-xs font-semibold text-violet-700 hover:bg-violet-50 transition shadow-sm"
                >
                  ⬇ Download Template
                </button>
                <Tooltip position="bottom" text="Download the ESI template (.xlsx) - ESI/IP Number, Employee Name, Payable Days in the month, Gross Salary Paid, Employee Status (dropdown) and Last Working Day. Statuses marked * need a Last Working Day. The Instructions sheet explains every column and lists each status with its portal code.">
                  <InfoIcon />
                </Tooltip>
              </div>
            </div>
          </div>
        </div>

        {/* ── MAIN CONTENT ── */}
        <main className="flex-1 flex flex-col items-center justify-start px-4 pb-8">
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onPickFile(f); e.target.value = ""; }} />

          {!hasResult ? (
            <div className="w-full max-w-lg bg-white rounded-3xl shadow-xl p-8 mt-2">
              <div className="grid grid-cols-2 gap-3 mb-5">{PeriodSelects({ size: 12 })}</div>
              {DropZone({ minH: null })}
              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px bg-gray-100" /><span className="text-xs text-gray-400 font-medium">or select from</span><div className="flex-1 h-px bg-gray-100" />
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-3.5 rounded-xl font-semibold text-sm text-white transition-all active:scale-95"
                style={{ background: "linear-gradient(135deg,#6D28D9 0%,#7C3AED 100%)" }}
              >
                Select ESI File
              </button>
              <p className="text-center text-xs text-gray-400 mt-3">
                Supports <span className="font-semibold text-gray-500">.XLSX</span> &amp; <span className="font-semibold text-gray-500">.XLS</span>
                <Tooltip text="Use the ESI template. Columns: ESI/IP Number, Employee Name, Payable Days in the month, Gross Salary Paid, Employee Status, Last Working Day.">
                  <InfoIcon />
                </Tooltip>
              </p>
              {file && (
                <button
                  type="button"
                  disabled={processing}
                  onClick={handleProcess}
                  className="w-full mt-4 py-3 rounded-xl font-semibold text-sm text-white transition-all active:scale-95 disabled:opacity-60"
                  style={{ background: "linear-gradient(135deg,#059669 0%,#10B981 100%)" }}
                >
                  {processing ? "Processing…" : "⚡ Generate MC Export"}
                </button>
              )}
            </div>
          ) : (
            <div className="w-full max-w-4xl mt-2 flex flex-col gap-4">
              <div className="flex flex-col md:flex-row gap-4 items-start">
                <div className="w-full md:w-80 md:flex-shrink-0 bg-white rounded-3xl shadow-xl p-6">
                  <div className="grid grid-cols-2 gap-2 mb-4">{PeriodSelects({ size: 10 })}</div>
                  {DropZone({ minH: "180px" })}
                  <div className="flex items-center gap-2 my-4">
                    <div className="flex-1 h-px bg-gray-100" /><span className="text-xs text-gray-400 font-medium">or select from</span><div className="flex-1 h-px bg-gray-100" />
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-3.5 rounded-xl font-semibold text-sm text-white transition-all active:scale-95"
                    style={{ background: "linear-gradient(135deg,#6D28D9 0%,#7C3AED 100%)" }}
                  >
                    Select ESI File
                  </button>
                  <p className="text-center text-xs text-gray-400 mt-2">
                    Supports <span className="font-semibold text-gray-500">.XLSX</span> &amp; <span className="font-semibold text-gray-500">.XLS</span>
                    <Tooltip text="Use the ESI template. Columns: ESI/IP Number, Employee Name, Payable Days in the month, Gross Salary Paid, Employee Status, Last Working Day.">
                      <InfoIcon />
                    </Tooltip>
                  </p>
                  {file && (
                    <button
                      type="button"
                      disabled={processing}
                      onClick={handleProcess}
                      className="w-full mt-3 py-3 rounded-xl font-semibold text-sm text-white transition-all active:scale-95 disabled:opacity-60"
                      style={{ background: "linear-gradient(135deg,#059669 0%,#10B981 100%)" }}
                    >
                      {processing ? "Processing…" : "⚡ Re-generate MC"}
                    </button>
                  )}
                </div>

                <div className="flex-1 min-w-0 flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <span className={`${blocked ? "text-red-500" : "text-green-500"} text-lg`}>{blocked ? "!" : "✓"}</span>
                    <span className="text-base font-bold text-gray-800">
                      {blocked ? `${result.cntError} error(s) to fix - ${wageLabel}` : `MC Ready - ${wageLabel}`}
                    </span>
                  </div>

                  {blocked && (
                    <div className="rounded-xl bg-red-50 border border-red-200 p-3 flex items-start gap-2">
                      <span className="text-red-500 text-sm flex-shrink-0">❌</span>
                      <p className="text-xs text-red-800"><strong>Download is held back until these are fixed.</strong> Unlike PF, ESIC needs every mapped IP in one file - dropping the bad rows would make the upload fail, so fix them at source and re-generate.</p>
                    </div>
                  )}

                  {result.infoBanners.length > 0 && (
                    <div className="flex flex-col gap-2">
                      {result.infoBanners.map((b, i) => (
                        <div key={i} className="rounded-xl bg-blue-50 border border-blue-200 p-3 flex items-start gap-2">
                          <span className="text-blue-500 text-sm flex-shrink-0">ℹ️</span>
                          <p className="text-xs text-blue-700" dangerouslySetInnerHTML={{ __html: b.text }} />
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {stats.map((s) => (
                      <div key={s.label} className={`rounded-xl p-3 text-center border ${s.bg}`}>
                        <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                        <p className="text-xs text-gray-500">{s.label}<Tooltip text={s.tip}><InfoIcon /></Tooltip></p>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-xl bg-white border border-gray-100 p-4">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                      Contribution Summary
                      <Tooltip text="Employee contribution rounds up per employee, then sums. Employer contribution sums the raw per-employee amounts first, then rounds the total UP once - the method the ESIC portal uses.">
                        <InfoIcon />
                      </Tooltip>
                    </p>
                    <table className="w-full text-xs"><tbody>
                      <tr className="border-b border-gray-50"><td className="py-1.5 text-gray-500">Insured Persons</td><td className="py-1.5 text-right font-medium text-gray-800 tabular-nums">{result.mcData.length}</td></tr>
                      <tr className="border-b border-gray-50"><td className="py-1.5 text-gray-500">Total Wages</td><td className="py-1.5 text-right font-medium text-gray-800 tabular-nums">{fmt(sum("wages"))}</td></tr>
                      <tr className="border-b border-gray-50"><td className="py-1.5 text-gray-500">Employee Contribution @0.75%</td><td className="py-1.5 text-right font-medium text-gray-800 tabular-nums">{fmt(sum("ee"))}</td></tr>
                      <tr className="border-b border-gray-50"><td className="py-1.5 text-gray-500">Employer Contribution @3.25%</td><td className="py-1.5 text-right font-medium text-gray-800 tabular-nums">{fmt(sum("er"))}</td></tr>
                      <tr className="border-t-2 border-gray-200"><td className="pt-2.5 pb-1 font-bold text-gray-900">Total Payable by Company</td><td className="pt-2.5 pb-1 text-right font-extrabold text-violet-700 tabular-nums text-sm">{fmt(sum("ee")+sum("er"))}</td></tr>
                    </tbody></table>
                  </div>

                  {hasObs && (
                    <div className="border border-amber-200 rounded-xl bg-amber-50/60 p-3">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold text-amber-700">
                          {(() => {
                            const notes = result.obsData.filter(o => o.type === "note").length;
                            const tips  = result.obsData.filter(o => o.type === "suggestion").length;
                            const attn  = result.obsData.length - notes - tips;
                            const quiet = [notes > 0 && `${notes} ${notes === 1 ? "note" : "notes"}`, tips > 0 && `${tips} ${tips === 1 ? "suggestion" : "suggestions"}`].filter(Boolean);
                            if (attn > 0) return <>Observations ({attn}){quiet.length > 0 && <span className="font-normal text-amber-600"> · {quiet.join(" · ")}</span>}</>;
                            return <>{notes > 0 && tips > 0 ? "Notes & suggestions" : tips > 0 ? "Suggestions" : "Notes"} ({notes + tips})</>;
                          })()}
                          <Tooltip text="Flags invalid or duplicate IP numbers, day/wage conflicts, unrecognised statuses, missing or misplaced last working days, wage-ceiling breaches and April/October coverage rules. Notes (blue) are routine automatic adjustments, such as rounding part-days up. Suggestions (blue) are optional follow-ups for a later filing, such as using Out of Coverage from the next April or October. Neither needs fixing before upload.">
                            <InfoIcon />
                          </Tooltip>
                        </p>
                        <div className="flex gap-2 items-center">
                          <button onClick={() => buildObsTxt(result.obsData, month, year)} className="text-xs text-amber-600 hover:underline">⬇ .txt</button>
                          <button onClick={() => setObsVisible(v => !v)} className="text-xs text-amber-600 hover:underline">{obsVisible ? "Hide" : "Preview"}</button>
                        </div>
                      </div>
                      {obsVisible && (
                        <>
                          <div className="flex flex-col gap-1.5 mb-2 max-h-48 overflow-y-auto">
                            {obsSlice.map((o, i) => (
                              <div key={i} className={`flex items-start gap-2 px-3 py-2 rounded-lg text-xs leading-relaxed ${o.type === "error" ? "bg-red-50 border border-red-100 text-red-800" : (o.type === "note" || o.type === "suggestion") ? "bg-blue-50 border border-blue-200 text-blue-700" : "bg-amber-50 border border-amber-100 text-amber-800"}`}>
                                <span className="flex-shrink-0 mt-0.5">{o.type === "error" ? "❌" : o.type === "note" ? "ℹ️" : o.type === "suggestion" ? "💡" : "⚠️"}</span>
                                <span dangerouslySetInnerHTML={{ __html: o.text }} />
                              </div>
                            ))}
                          </div>
                          {totalObsPages > 1 && (
                            <div className="flex items-center justify-between mt-1">
                              <span className="text-xs text-gray-400">{(obsPage-1)*OBS_PER_PAGE+1}–{Math.min(obsPage*OBS_PER_PAGE, result.obsData.length)} of {result.obsData.length}</span>
                              <div className="flex gap-1">
                                <button onClick={() => setObsPage(p => Math.max(1, p-1))} disabled={obsPage===1} className="w-7 h-7 rounded-md border border-gray-200 text-xs text-gray-500 hover:bg-gray-50 disabled:opacity-40">‹</button>
                                {Array.from({length:totalObsPages},(_,i)=>i+1)
                                  .filter(p=>p===1||p===totalObsPages||Math.abs(p-obsPage)<=1)
                                  .reduce((acc,p,idx,arr)=>{ if(idx>0 && p-arr[idx-1]>1) acc.push("…"); acc.push(p); return acc; },[])
                                  .map((p,i)=> p==="…"
                                    ? <span key={`e${i}`} className="w-7 h-7 flex items-center justify-center text-xs text-gray-400">…</span>
                                    : <button key={p} onClick={() => setObsPage(p)} className={`w-7 h-7 rounded-md border text-xs transition-colors ${p===obsPage?"bg-violet-600 border-violet-600 text-white":"border-gray-200 text-gray-500 hover:bg-gray-50"}`}>{p}</button>)}
                                <button onClick={() => setObsPage(p => Math.min(totalObsPages, p+1))} disabled={obsPage===totalObsPages} className="w-7 h-7 rounded-md border border-gray-200 text-xs text-gray-500 hover:bg-gray-50 disabled:opacity-40">›</button>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* ── BOTTOM: download buttons centred + reset ── */}
              <div className="flex flex-col items-center gap-3 pt-1">
                <div className="flex gap-3 justify-center flex-wrap">
                  <button
                    disabled={blocked}
                    onClick={async () => {
                      try {
                        await buildXlsOutput(result.mcData, month || "Month", year || "Year");
                      } catch (err) {
                        alert("Could not generate the .xls file: " + err.message + " Please try again, or email support@payrolltool.in if it keeps happening.");
                        return;
                      }
                      if (typeof window !== "undefined" && window.gtag) {
                        window.gtag("event", "tool_download_completed", { tool_name: "ESIC MC Creator", file_type: "xls" });
                      }
                    }}
                    className="px-8 py-3 rounded-xl font-semibold text-sm text-white transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ background: "linear-gradient(135deg,#059669 0%,#10B981 100%)" }}
                  >
                    ⬇ Download .xls
                  </button>
                  <button
                    onClick={() => {
                      buildSummaryOutput(result.mcData, month || "Month", year || "Year");
                      if (typeof window !== "undefined" && window.gtag) {
                        window.gtag("event", "tool_download_completed", { tool_name: "ESIC MC Creator", file_type: "xlsx" });
                      }
                    }}
                    className="px-8 py-3 rounded-xl font-semibold text-sm text-white transition-all active:scale-95"
                    style={{ background: "linear-gradient(135deg,#6D28D9 0%,#7C3AED 100%)" }}
                  >
                    ⬇ Download Summary
                  </button>
                </div>
                <button onClick={() => { setFile(null); setResult(null); setObsPage(1); setObsVisible(false); }} className="text-xs text-gray-400 hover:text-violet-600 transition-colors">
                  ↺ Process another file
                </button>
              </div>

              <FeedbackWidget toolName="ESIC MC Creator" />

            </div>
          )}

          {/* ── Feature pills ── */}
          <div className="flex flex-wrap justify-center gap-4 mt-6 text-xs text-gray-500">
            {[
              { label: "Portal template preserved", tip: "Your rows are written into the blank template downloaded from the ESIC portal. Header row and instructions sheet stay byte-identical - fonts, colours, wrap, merged cells and all." },
              { label: "Status dropdown",            tip: "The template carries an Excel dropdown of all 14 ESI statuses. Pick a status and the numeric code the portal wants is filled in for you." },
              { label: "Contribution summary",       tip: "Employee 0.75% rounds up per employee then sums; employer 3.25% sums raw per-employee amounts and rounds the total UP once - exactly as the portal does, so the total matches the challan before you submit." },
              { label: "100% browser processing",    tip: "All processing happens in your browser. No data sent to any server." },
            ].map(({ label, tip }) => (
              <span key={label} className="flex items-center gap-1">
                <span className="text-violet-500">●</span> {label}
                <Tooltip text={tip}><InfoIcon /></Tooltip>
              </span>
            ))}
          </div>

          <div className="w-full max-w-3xl mx-auto mt-10">
            <AnswerBox reviewed={PAGE_SEO.reviewed} source={{ href: "https://www.esic.gov.in/", label: "ESIC portal" }}>
              {PAGE_SEO.answer}
            </AnswerBox>
          </div>

          <div className="max-w-5xl mx-auto mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {MC_INFO_CARDS.map((c) => (
              <div key={c.title} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
                <div className="text-lg mb-1.5">{c.icon}</div>
                <h2 className="text-xs font-bold text-violet-700 mb-1.5">{c.title}</h2>
                <p className="text-xs leading-relaxed text-gray-500">{c.body}</p>
              </div>
            ))}
          </div>

          <div className="max-w-3xl mx-auto mt-6 bg-white border border-gray-100 rounded-2xl p-6">
            <h4 className="text-sm font-bold text-gray-900 mb-3">
              Worked example - Rs. 18,500 ESI wages
            </h4>
            <p className="text-sm leading-relaxed text-gray-500 mb-4">
              An Insured Person with Rs. 18,500 ESI wages for the month has both legs of the
              contribution calculated as a straight percentage of wages. Treated as a
              one-person file, the employee leg rounds up for that person and the employer
              leg rounds up once, on the file total.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <h5 className="text-xs font-bold text-violet-700 mb-2">Employee (0.75%)</h5>
                <p className="text-xs leading-relaxed text-gray-500">
                  0.75% of Rs. 18,500 is Rs. 138.75, rounded up to{" "}
                  <b className="text-gray-900">Rs. 139</b> - deducted from the employee&apos;s pay
                  each month.
                </p>
              </div>
              <div className="bg-violet-50 rounded-lg p-4">
                <h5 className="text-xs font-bold text-violet-700 mb-2">Employer (3.25%)</h5>
                <p className="text-xs leading-relaxed text-gray-500">
                  3.25% of Rs. 18,500 is Rs. 601.25, which rounds up to{" "}
                  <b className="text-gray-900">Rs. 602</b> once, on the file total - borne by the employer on top of wages.
                </p>
              </div>
            </div>
            <p className="text-sm font-medium text-gray-900">
              Total payable for that employee is Rs. 741. Across a full file, the employee leg
              rounds up per employee and sums; the employer leg sums the exact per-employee
              amounts first and rounds only the final total - exactly how the ESIC portal
              calculates it, and this tool applies both rules automatically.
            </p>
          </div>

          <div className="max-w-3xl mx-auto mt-6 mb-10 bg-white border border-gray-100 rounded-2xl p-6">
            <h4 className="text-sm font-bold text-gray-900 mb-4">Frequently asked questions</h4>
            {ALL_FAQ.map((f, i) => (
              <div key={f.q} className={`py-3 ${i > 0 ? "border-t border-gray-100" : "pt-0"}`}>
                <h5 className="text-sm font-semibold text-violet-700 mb-1.5">{f.q}</h5>
                <p className="text-sm leading-relaxed text-gray-500">{f.a}</p>
              </div>
            ))}
          </div>

          <div className="w-full max-w-3xl mx-auto">
            <RelatedLinks links={RELATED.esic} />
          </div>

        </main>

        <Footer />
      </div>

      <style jsx>{`
        /* Dark-mode overrides for this page's Tailwind utility classes.
           The class part of each rule is wrapped in :global() because the
           month/year selects and the drop zone are rendered by helper
           functions (PeriodSelects, the drop zone), and styled-jsx only
           scopes rules to elements written directly in this component's
           return. Without :global() those elements never turned dark.
           Ported rule-for-rule from pf-ecr-creator.js's .pf-wrapper block -
           same color tokens, same [class~="..."] attribute-selector
           approach for hover:/focus:/opacity-slash modifiers (Tailwind
           compiles those into distinct literal class names that escaped
           selectors have repeatedly mishandled inside styled-jsx). */
        .esic-wrapper[data-theme="dark"] :global(.bg-white) { background: #1c1730 !important; }
        .esic-wrapper[data-theme="dark"] :global(.bg-gray-50) { background: #16131c !important; }
        .esic-wrapper[data-theme="dark"] :global(.bg-gray-100) { background: #221c3a !important; }
        .esic-wrapper[data-theme="dark"] :global(.text-gray-400) { color: #b3aac7 !important; }
        .esic-wrapper[data-theme="dark"] :global(.text-gray-500) { color: #b3aac7 !important; }
        .esic-wrapper[data-theme="dark"] :global(.text-gray-600) { color: #d6cfe8 !important; }
        .esic-wrapper[data-theme="dark"] :global(.text-gray-700) { color: #f3f0fa !important; }
        .esic-wrapper[data-theme="dark"] :global(.text-gray-800) { color: #f3f0fa !important; }
        .esic-wrapper[data-theme="dark"] :global(.text-gray-900) { color: #f3f0fa !important; }
        .esic-wrapper[data-theme="dark"] :global(.border-gray-50) { border-color: #2a2536 !important; }
        .esic-wrapper[data-theme="dark"] :global(.border-gray-100) { border-color: #2a2536 !important; }
        .esic-wrapper[data-theme="dark"] :global(.border-gray-200) { border-color: #2a2536 !important; }
        .esic-wrapper[data-theme="dark"] :global(.bg-violet-50) { background: #2c2147 !important; }
        .esic-wrapper[data-theme="dark"] :global(.text-violet-500) { color: #9163f2 !important; }
        .esic-wrapper[data-theme="dark"] :global(.text-violet-600) { color: #9163f2 !important; }
        .esic-wrapper[data-theme="dark"] :global(.text-violet-700) { color: #a47df5 !important; }
        .esic-wrapper[data-theme="dark"] :global(.border-violet-300) { border-color: #9163f2 !important; }
        .esic-wrapper[data-theme="dark"] :global(.border-violet-400) { border-color: #9163f2 !important; }
        .esic-wrapper[data-theme="dark"] :global(.bg-amber-50),
        .esic-wrapper[data-theme="dark"] :global([class~="bg-amber-50/60"]) { background: #332411 !important; --tw-bg-opacity: 1 !important; }
        .esic-wrapper[data-theme="dark"] :global(.text-amber-600) { color: #fbbf54 !important; }
        .esic-wrapper[data-theme="dark"] :global(.text-amber-700) { color: #fbbf54 !important; }
        .esic-wrapper[data-theme="dark"] :global(.text-amber-800) { color: #fbbf54 !important; }
        .esic-wrapper[data-theme="dark"] :global(.border-amber-100) { border-color: #5c4a1f !important; }
        .esic-wrapper[data-theme="dark"] :global(.border-amber-200) { border-color: #5c4a1f !important; }
        .esic-wrapper[data-theme="dark"] :global(.bg-red-50) { background: #3d1f1f !important; }
        .esic-wrapper[data-theme="dark"] :global(.text-red-500) { color: #f87171 !important; }
        .esic-wrapper[data-theme="dark"] :global(.text-red-800) { color: #f87171 !important; }
        .esic-wrapper[data-theme="dark"] :global(.border-red-100) { border-color: #5c2e2e !important; }

        .esic-wrapper[data-theme="dark"] :global([class~="bg-gray-50/50"]) { background: #16131c !important; --tw-bg-opacity: 1 !important; }
        .esic-wrapper[data-theme="dark"] :global([class~="bg-violet-50/30"]) { background: #2c2147 !important; --tw-bg-opacity: 1 !important; }
        .esic-wrapper[data-theme="dark"] :global([class~="hover:bg-gray-50"]:hover) { background: #221c3a !important; }
        .esic-wrapper[data-theme="dark"] :global([class~="hover:bg-violet-50"]:hover) { background: #2c2147 !important; }
        .esic-wrapper[data-theme="dark"] :global([class~="hover:bg-violet-50/30"]:hover) { background: #2c2147 !important; --tw-bg-opacity: 1 !important; }
        .esic-wrapper[data-theme="dark"] :global([class~="hover:border-violet-300"]:hover) { border-color: #9163f2 !important; }
        .esic-wrapper[data-theme="dark"] :global([class~="hover:text-red-500"]:hover) { color: #f87171 !important; }
        .esic-wrapper[data-theme="dark"] :global([class~="hover:text-violet-600"]:hover) { color: #9163f2 !important; }

        .esic-wrapper[data-theme="dark"] :global([class~="focus:border-violet-400"]:focus) { border-color: #9163f2 !important; }
        .esic-wrapper[data-theme="dark"] :global([class~="focus:ring-violet-100"]:focus) { --tw-ring-color: rgba(145, 99, 242, 0.35) !important; }

        .esic-wrapper[data-theme="dark"] :global(.border-violet-200) { border-color: #3d3654 !important; }
        .esic-wrapper[data-theme="dark"] :global(.text-green-500) { color: #34d399 !important; }
        .esic-wrapper[data-theme="dark"] :global(.text-green-600) { color: #34d399 !important; }
        .esic-wrapper[data-theme="dark"] :global(.text-red-600) { color: #f87171 !important; }
        .esic-wrapper[data-theme="dark"] :global(.border-red-200) { border-color: #5c2e2e !important; }

        .esic-wrapper[data-theme="dark"] :global(.bg-blue-50) { background: #172033 !important; }
        .esic-wrapper[data-theme="dark"] :global(.border-blue-200) { border-color: #2d4a6b !important; }
        .esic-wrapper[data-theme="dark"] :global(.text-blue-500) { color: #60a5fa !important; }
        .esic-wrapper[data-theme="dark"] :global(.text-blue-700) { color: #60a5fa !important; }
      `}</style>
    </>
  );
}
