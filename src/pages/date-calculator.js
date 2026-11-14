import Head from "next/head";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { useEffect, useRef, useState } from "react";
import FeedbackWidget from "../components/FeedbackWidget";
import { signalResult } from "../lib/resultPrompt";

const TOOL_NAME = "Date Calculator";
const PAGE_URL = "https://www.payrolltool.in/date-calculator";
const PAGE_TITLE = "Payroll Date Calculator: Days, Notice Period, Working Days | PayrollTool.in";
const PAGE_DESC =
  "Count days between dates, add months with the month-end rule, find the last working day of a notice period, count working days with Saturday offs and holidays, and work out retirement dates, the way payroll counts them.";

const DAY = 86400000;

// Explanations shown under the calculator, one per tab.
const CONTENT = {
  "between": {
    "t": "Counting the days between two dates",
    "p": [
      "Most payroll date errors are exactly one day out, and the cause is nearly always the same: whether the first and the last day are both counted. Payroll counts both. An employee absent from 28 March to 3 April has 7 days of loss of pay, not 6, because 28 March and 3 April are each a day the employee did not work. Leave, attendance, notice served and service length all follow the same rule. Counting only the gap, which gives 6, is the right answer to a different question: how many days after the first date the second one falls.",
      "Service length is the same count expressed in years, months and days, which is how gratuity, full and final settlement and long-service policies read it. Someone who joined on 1 March 2021 and left on 15 December 2025 served 4 years, 9 months and 15 days, counting both days. For gratuity, that final part-year of more than six months matters, and so do the days in it, because 240 days worked in the fifth year makes service count as five years.",
      "Calendar quirks change the count more often than expected. February has 28 days, or 29 in a leap year such as 2028, so a period running across February is shorter than the same dates in another month. Months of 30 and 31 days also change how many days a \"month\" holds when a period starts and ends mid-month.",
      "The result also shows how many Sundays and Saturdays fall in the range. That is a quick check before working out payable days, because the weekly offs inside an absence decide whether those days are treated as leave without pay under your policy."
    ]
  },
  "add": {
    "t": "Adding days, months and years to a date",
    "p": [
      "Probation ends, confirmation dates, contract renewals and fixed-term end dates are all found by adding a period to a start date, and most of them are written in months. Adding months is where spreadsheets and quick mental arithmetic go wrong, because months have different lengths.",
      "The calculator keeps the day of the month whenever that day exists in the result month. Six months from 15 March is 15 September. When the day does not exist, it moves to the last day of that month: one month from 31 January is 28 February, or 29 February in a leap year, and six months from 31 August is 28 or 29 February too. This is the same month-end rule HR systems and most contracts use, and the result shows when it has been applied.",
      "Whether the start date counts as day one changes the answer by a day. A six-month probation from a joining date of 1 April ends on 30 September if 1 April is the first day of probation, and on 1 October if the six months are added in full. Contracts usually mean the first, so the option to count the start date as day one is there for exactly that case.",
      "Adding days counts calendar days, including Sundays and holidays. A 90-day contract from 1 January ends on 31 March, or on 1 April when the start date is not counted as day one, whatever weekly offs fall in between. If a policy counts working days instead, the working days tab gives that answer.",
      "Subtracting works the same way in reverse. It is useful for back-dating, such as finding the date on which an employee completed one year before a given day, or the latest joining date that still qualifies for an annual bonus."
    ]
  },
  "notice": {
    "t": "Working out the last working day of a notice period",
    "p": [
      "A notice period sets the last working day, and two choices in the policy decide it: whether notice starts on the day of resignation or the day after, and whether the period is counted in days or in months.",
      "When notice starts on the resignation date, that date is day one. A 60-day notice from 12 November 2026 then ends on 10 January 2027. When it starts the next day, everything moves one day later. Many appointment letters say \"with effect from the date of resignation\", which points to the first reading, but the letter decides.",
      "Notice in months is counted to the day before the same date of the final month. Two months from 15 January ends on 14 March. When the start date does not exist in the final month, the month-end rule applies, so one month from 31 January ends on 28 February. Payroll teams often treat \"two months\" and \"60 days\" as the same, but over February they can differ by two or three days.",
      "Days the employee has already served, or days the employer waives or settles by a notice payment, bring the last working day forward. Enter them in the optional field, and the date moves earlier by that many days. The result also shows the weekday of the last working day, because a notice period ending on a Sunday or a holiday is still a valid last working day under most policies, but the relieving letter and the full and final settlement date should match it.",
      "The number of notice days actually served is what the shortfall recovery in a full and final settlement is based on. A shortfall is usually recovered at the daily rate the appointment letter names, on wages or on gross salary."
    ]
  },
  "work": {
    "t": "Counting working days between two dates",
    "p": [
      "Working days are the calendar days in a period minus the weekly offs and the holidays. Payroll needs this number for attendance-based pay, for converting an absence into loss-of-pay days under a working-day policy, and for checking that a timesheet total is possible for the month.",
      "Weekly offs differ between employers, so the calculator offers the four common patterns: Sundays only; Sundays with the second and fourth Saturdays; Sundays with the first and third Saturdays; and both Saturdays and Sundays. The second Saturday is the one falling between the 8th and the 14th of the month and the fourth between the 22nd and the 28th, whatever weekday the month starts on. November 2026, for example, has five Sundays and its second and fourth Saturdays fall on the 14th and the 28th.",
      "Holidays are entered one per line as DD-MM-YYYY. A holiday that falls on a weekly off is counted once, as a weekly off, so it does not reduce the working days twice. Dates that cannot be read are listed, so nothing is silently dropped.",
      "The working-day count is not the divisor for every salary calculation. Salary proration and loss of pay usually divide the monthly salary by the calendar days of the month, by a fixed 30 or by 26, as the policy states, and not by working days. Working days matter where pay itself is earned per day worked, as with daily-rated staff, or where a policy defines leave and loss of pay in working days.",
      "For a period crossing two months, the count runs across both months as one range. If payroll is processed month by month, run each month separately, so each month's working days match that month's attendance sheet."
    ]
  },
  "retire": {
    "t": "Finding the retirement date",
    "p": [
      "Retirement dates are set by the retirement age in the employer's policy, commonly 58 or 60, and by one point of law that is easy to miss: a person attains an age on the day before the birthday, not on the birthday. The Supreme Court settled this in Prabhu Dayal Sesma v. State of Rajasthan (1986), and payroll and service records follow it.",
      "Under the most common rule, the employee retires on the last day of the month in which the retirement age is attained. Central Government employees retire this way under FR 56, and many companies have copied it. Someone born on 15 December 1968 attains 58 on 14 December 2026 and retires on 31 December 2026. Someone born on 1 December 1968 attains 58 on 30 November 2026, so the month of attaining the age is November, and they retire on 30 November 2026, a month earlier than a quick reading of the birthday would suggest. That is why staff born on the 1st of a month always retire at the end of the previous month.",
      "Some employers retire employees on the day the age is attained instead. The calculator offers both rules, and shows the birthday, the date the age is attained and the retirement date, so the reasoning can be checked against the policy.",
      "The result also shows how long remains until retirement from today. That figure drives succession planning, the timing of the final gratuity and leave encashment, and the cut-off for employer contributions that stop at retirement.",
      "The date of birth should be the one in the service record, usually from the matriculation certificate or another document accepted at joining. Policies rarely allow a change of recorded date of birth close to retirement, so the date in the records is the one that counts."
    ]
  }
};

// Each calculator has its own link (#days-between, #notice-period ...) and its own GA4 parameter.
const MODES = [
  { key: "between", hash: "days-between", name: "Days between dates", label: "Days between dates" },
  { key: "add", hash: "add-subtract", name: "Add or subtract", label: "Add or subtract" },
  { key: "notice", hash: "notice-period", name: "Notice period", label: "Notice period" },
  { key: "work", hash: "working-days", name: "Working days", label: "Working days" },
  { key: "retire", hash: "retirement-date", name: "Retirement date", label: "Retirement date" },
];
const byHash = (h) => (MODES.find((m) => m.hash === h) || {}).key;
const modeOf = (k) => MODES.find((m) => m.key === k);

// Whole numbers may be typed as sums: 60-15. Only + and - are used.
function evalAmt(raw) {
  const s = String(raw || "").replace(/[\s,]/g, "");
  if (s === "") return { ok: true, val: 0 };
  if (!/^[+-]?\d+(\.\d+)?([+-]\d+(\.\d+)?)*$/.test(s)) return { ok: false, val: 0 };
  const parts = s.match(/[+-]?\d+(\.\d+)?/g) || [];
  return { ok: true, val: parts.reduce((a, b) => a + parseFloat(b), 0) };
}
const parse = (s) => {
  if (!s) return null;
  const p = s.split("-").map(Number);
  return Date.UTC(p[0], p[1] - 1, p[2]);
};
const parseDMY = (raw) => {
  let s = String(raw).trim();
  const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (iso) s = iso[3] + "-" + iso[2] + "-" + iso[1];
  const m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (!m) return null;
  const t = Date.UTC(+m[3], +m[2] - 1, +m[1]);
  const d = new Date(t);
  return d.getUTCDate() === +m[1] && d.getUTCMonth() === +m[2] - 1 ? t : null;
};
const show = (t) => new Date(t).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
const wd = (t) => new Date(t).toLocaleDateString("en-IN", { weekday: "long", timeZone: "UTC" });
const dim = (y, m) => new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
const addMonths = (t, n) => {
  const d = new Date(t);
  const y = d.getUTCFullYear(), m = d.getUTCMonth() + n;
  const ty = y + Math.floor(m / 12), tm = ((m % 12) + 12) % 12;
  return Date.UTC(ty, tm, Math.min(d.getUTCDate(), dim(ty, tm)));
};
const pl = (k, w) => Number(k).toLocaleString("en-IN") + " " + w + (k === 1 ? "" : "s");
const short = (t) => t.split(", ").filter((x) => !/^0 /.test(x)).join(", ") || "0 days";
const ymd = (a, b) => {
  let y = 0;
  while (addMonths(a, 12 * (y + 1)) <= b) y++;
  let m = 0;
  while (addMonths(a, 12 * y + m + 1) <= b) m++;
  const d = Math.round((b - addMonths(a, 12 * y + m)) / DAY);
  return pl(y, "year") + ", " + pl(m, "month") + ", " + pl(d, "day");
};
const today = () => {
  const n = new Date();
  return Date.UTC(n.getFullYear(), n.getMonth(), n.getDate());
};
const count = (lo, hi, fn) => {
  let c = 0;
  for (let t = lo; t <= hi; t += DAY) if (fn(new Date(t))) c++;
  return c;
};
const err = (e) => ({ err: e });

function calcDates(mode, f) {
  if (mode === "between") {
    const a = parse(f.b1), b = parse(f.b2);
    if (a == null || b == null) return err("Enter both dates.");
    const lo = Math.min(a, b), hi = Math.max(a, b), incl = f.bIncl;
    const days = Math.round((hi - lo) / DAY) + (incl ? 1 : 0);
    const suns = count(lo, hi, (d) => d.getUTCDay() === 0), sats = count(lo, hi, (d) => d.getUTCDay() === 6);
    return {
      tiles: [[pl(days, "day"), "Days"], [pl(Math.floor(days / 7), "week") + (days % 7 ? " + " + pl(days % 7, "day") : ""), "Weeks"], [suns + " / " + sats, "Sundays / Saturdays"]],
      rows: [
        ["From", show(lo), wd(lo)], ["To", show(hi), wd(hi)],
        ["Days", pl(days, "day"), incl ? "Both days counted, as for leave, loss of pay and service." : "Gap only: the days after the first date."],
        ["As service", ymd(lo, hi + (incl ? DAY : 0)), "Years, months and days, as gratuity and settlements read it."],
        ["Sundays in range", String(suns)], ["Saturdays in range", String(sats)],
      ],
      note: a > b ? ["no", "The dates were in reverse order, so they were swapped."] : null,
    };
  }
  if (mode === "add") {
    const a = parse(f.a1), r0 = evalAmt(f.aN), u = f.aU;
    if (a == null) return err("Enter a start date.");
    if (String(f.aN).trim() === "") return err("Enter how many days, weeks, months or years to add.");
    if (!r0.ok || !Number.isInteger(r0.val)) return err("Use a whole number, with - to subtract.");
    const k = Math.trunc(r0.val), op = k < 0 ? -1 : 1, abs = Math.abs(k);
    let r = u === "d" ? a + k * DAY : u === "w" ? a + k * 7 * DAY : u === "m" ? addMonths(a, k) : addMonths(a, 12 * k);
    const raw = r;
    // Start date as day one: one day back, except when the start day does not exist in the end month (31 Jan + 1 month = 28 Feb)
    const clamped = (u === "m" || u === "y") && new Date(raw).getUTCDate() !== new Date(a).getUTCDate();
    if (f.aLess && k !== 0 && !clamped) r -= op * DAY;
    const covered = pl(Math.round(Math.abs(r - a) / DAY) + (f.aLess ? 1 : 0), "day");
    const rows = [["Start", show(a), wd(a)], [k < 0 ? "Subtract" : "Add", pl(abs, { d: "day", w: "week", m: "month", y: "year" }[u])]];
    if (clamped) rows.push(["Month end", "Adjusted", "Day " + new Date(a).getUTCDate() + " does not exist in that month, so its last day is used."]);
    if (f.aLess && k !== 0 && !clamped) rows.push(["Start date is day one", k < 0 ? "One day later" : "One day earlier"]);
    rows.push(["Result", show(r), wd(r)], ["Calendar days covered", covered]);
    return { tiles: [[show(r), "Result date"], [wd(r), "Weekday"], [covered, "Days covered"]], rows };
  }
  if (mode === "notice") {
    const a = parse(f.n1), r0 = evalAmt(f.nN), u = f.nU, s0 = evalAmt(f.nServed);
    if (a == null) return err("Enter the resignation date.");
    if (String(f.nN).trim() === "") return err("Enter the notice period.");
    if (!r0.ok || !s0.ok || !Number.isInteger(r0.val) || !Number.isInteger(s0.val)) return err("Use whole numbers for the notice period.");
    const k = Math.max(0, Math.trunc(r0.val)), served = Math.max(0, Math.trunc(s0.val));
    const start = f.nStart === "next" ? a + DAY : a;
    const fm = addMonths(start, k), fmClamped = new Date(fm).getUTCDate() !== new Date(start).getUTCDate();
    const full = u === "d" ? start + (k - 1) * DAY : fmClamped ? fm : fm - DAY;
    const last = Math.max(a, full - served * DAY);
    const fullDays = Math.round((full - start) / DAY) + 1;
    const days = Math.max(0, Math.min(fullDays - served, Math.round((last - start) / DAY) + 1));
    const rows = [
      ["Resignation", show(a), wd(a)],
      ["Notice starts", show(start), f.nStart === "next" ? "The day after resignation." : "The resignation date is day one."],
      ["Notice period", pl(k, u === "d" ? "day" : "month"), u === "m" ? "Counted to the day before the same date of the final month: " + pl(fullDays, "day") + "." : ""],
    ];
    if (served) rows.push(["Served or waived", pl(served, "day"), last === a && full - served * DAY < a ? "Covers the whole notice, so the last working day is the resignation date." : "Brings the last working day forward."]);
    rows.push(["Last working day", show(last), wd(last)], ["Notice days served", pl(days, "day")]);
    const note = new Date(last).getUTCDay() === 0 ? ["no", "The last working day falls on a Sunday. Use this date on the relieving letter and in the full and final settlement."] : null;
    return { tiles: [[show(last), "Last working day"], [wd(last), "Weekday"], [pl(days, "day"), "Notice served"]], rows, note };
  }
  if (mode === "work") {
    const a = parse(f.w1), b = parse(f.w2);
    if (a == null || b == null) return err("Enter both dates.");
    const lo = Math.min(a, b), hi = Math.max(a, b), pol = f.wSun, hol = new Set(), bad = [];
    f.wHol.split(/\n+/).map((s) => s.trim()).filter(Boolean).forEach((s) => {
      const t = parseDMY(s);
      if (t == null) bad.push(s); else hol.add(t);
    });
    let total = 0, suns = 0, sats = 0, hc = 0, hOff = 0;
    for (let t = lo; t <= hi; t += DAY) {
      total++;
      const d = new Date(t), w = d.getUTCDay(), nth = Math.ceil(d.getUTCDate() / 7);
      const satOff = w === 6 && (pol === "satsun" || (pol === "sun24" && (nth === 2 || nth === 4)) || (pol === "sun13" && (nth === 1 || nth === 3)));
      if (w === 0) { suns++; if (hol.has(t)) hOff++; continue; }
      if (satOff) { sats++; if (hol.has(t)) hOff++; continue; }
      if (hol.has(t)) hc++;
    }
    const work = total - suns - sats - hc;
    return {
      tiles: [[pl(work, "day"), "Working days"], [pl(suns + sats, "day"), "Weekly offs"], [pl(hc, "day"), "Holidays"]],
      rows: [
        ["Calendar days", pl(total, "day"), show(lo) + " to " + show(hi) + ", both included."], ["Sundays", String(suns)],
        ["Saturdays off", String(sats), WEEKLY_OFFS[pol] + "."],
        ["Holidays on working days", String(hc), hOff ? pl(hOff, "holiday") + " fell on a weekly off and were not counted again." : ""],
        ["Working days", pl(work, "day")],
      ],
      note: bad.length ? ["no", "Not read as dates: " + bad.join(", ") + ". Use DD-MM-YYYY or YYYY-MM-DD."] : null,
    };
  }
  // retire
  const dob = parse(f.r1), age = parseInt(f.rAge, 10);
  if (dob == null) return err("Enter the date of birth.");
  const db = new Date(dob), leapBorn = db.getUTCMonth() === 1 && db.getUTCDate() === 29;
  let bday = addMonths(dob, 12 * age);
  // Born on 29 February: in a year without one, the birthday is taken as 1 March, so the age is attained on 28 February.
  if (leapBorn && new Date(bday).getUTCDate() !== 29) bday += DAY;
  const attain = bday - DAY, d = new Date(attain);
  const ord = (n) => n + (n % 100 >= 11 && n % 100 <= 13 ? "th" : ({ 1: "st", 2: "nd", 3: "rd" }[n % 10] || "th"));
  const eom = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), dim(d.getUTCFullYear(), d.getUTCMonth()));
  const r = f.rRule === "eom" ? eom : attain, now = today();
  const left = r >= now ? short(ymd(now, r + DAY)) : "Retired on " + show(r);
  return {
    tiles: [[show(r), "Retirement date"], [wd(r), "Weekday"], [r >= now ? short(ymd(now, r + DAY)) : "Past", "Time left"]],
    rows: [
      ["Date of birth", show(dob)], [ord(age) + " birthday", show(bday)],
      ["Age attained on", show(attain), "A person attains an age on the day before the birthday."],
      ["Retires on", show(r), f.rRule === "eom" ? "The last day of the month in which the age is attained." : "The day the age is attained."],
      ["From today", left],
    ],
  };
}

const WEEKLY_OFFS = {
  sun: "Sundays",
  sun24: "Sundays, 2nd and 4th Saturdays",
  sun13: "Sundays, 1st and 3rd Saturdays",
  satsun: "Saturdays and Sundays",
};

const DC_INFO_CARDS = [
  { icon: "📅", title: "Both days count", body: "Payroll counts the first and the last day. An absence from 28 March to 3 April is 7 days of loss of pay, not 6." },
  { icon: "📆", title: "The month-end rule", body: "When a day does not exist in the result month, its last day is used: one month from 31 January is 28 February, or 29 in a leap year." },
  { icon: "⏳", title: "Notice in months", body: "Two months from 15 January ends on 14 March. Two months and 60 days are not the same over February." },
  { icon: "🎂", title: "Retirement age", body: "An age is attained on the day before the birthday, so someone born on the 1st of a month retires at the end of the previous month." },
];

const DC_MISTAKES = [
  { t: "Counting the gap instead of the days", d: "28 March to 3 April is 7 days when both days count, as for leave, loss of pay and service. Subtracting the dates gives 6, which is one day short." },
  { t: "Treating a month as 30 days", d: "Adding 30 days to 31 January gives 2 March; adding one month gives 28 February. Probation and notice written in months follow the month-end rule, not a fixed day count." },
  { t: "Starting the notice on the wrong day", d: "Whether notice starts on the resignation date or the day after moves the last working day by one day. Follow the wording of the appointment letter." },
  { t: "Taking the 2nd Saturday as the second weekend", d: "The second Saturday is the one between the 8th and the 14th of the month, and the fourth is between the 22nd and the 28th, whatever weekday the month starts on." },
  { t: "Counting a holiday on a Sunday twice", d: "A holiday that falls on a weekly off is already a non-working day. Subtracting it again understates the working days." },
  { t: "Retiring on the birthday", d: "A person attains an age on the day before the birthday. Someone born on 1 December 1968 attains 58 on 30 November 2026 and, under the month-end rule, retires on 30 November 2026, not 31 December." },
];

const DC_FAQ = [
  { q: "Are both the start date and the end date counted?", a: "For leave, loss of pay, notice served and service length, yes. 28 March to 3 April counts as 7 days. The option to count both days is on by default, and turning it off gives the gap between the dates instead." },
  { q: "What is one month from 31 January?", a: "28 February, or 29 February in a leap year. When the day of the start date does not exist in the result month, the last day of that month is used. The result shows when this month-end rule has been applied." },
  { q: "When does a 60-day notice period end?", a: "When notice starts on the resignation date, that date is day one. A 60-day notice from 12 November 2026 ends on 10 January 2027. When it starts the day after, the last working day moves one day later." },
  { q: "How are the 2nd and 4th Saturdays found?", a: "By the date, not by counting weekends: the 2nd Saturday falls between the 8th and the 14th, and the 4th between the 22nd and the 28th. In November 2026 they are the 14th and the 28th." },
  { q: "When does an employee born on the 1st of a month retire?", a: "At the end of the previous month, under the rule of retiring on the last day of the month in which the age is attained. The age is attained on the day before the birthday, which falls in the previous month." },
];

const INITIAL = {
  b1: "", b2: "", bIncl: true,
  a1: "", aN: "", aU: "m", aLess: true,
  n1: "", nN: "", nU: "d", nStart: "same", nServed: "",
  w1: "", w2: "", wSun: "sun24", wHol: "",
  r1: "", rAge: "58", rRule: "eom",
};

export default function DateCalculator() {
  const [theme, setTheme] = useState("light");
  useEffect(() => {
    const root = document.documentElement;
    setTheme(root.getAttribute("data-theme") || "light");
    const observer = new MutationObserver(() => setTheme(root.getAttribute("data-theme") || "light"));
    observer.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  const [mode, setMode] = useState("between");
  const [f, setF] = useState(INITIAL);
  const [result, setResult] = useState(null);
  const [stale, setStale] = useState(false);
  const resultRef = useRef(null);
  const tabRefs = useRef([]);

  // Open the tab named in the link (#notice-period ...), and follow later hash changes.
  useEffect(() => {
    const fromHash = () => {
      const k = byHash(window.location.hash.slice(1));
      if (k) { setMode(k); setResult(null); setStale(false); }
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, []);

  const choose = (k) => {
    setMode(k);
    setResult(null);
    setStale(false);
    try { window.history.replaceState(null, "", "#" + modeOf(k).hash); } catch (e) {}
    if (typeof window !== "undefined" && window.gtag) {
      window.gtag("event", "date_tab_view", { tool_name: TOOL_NAME, calculator: modeOf(k).hash });
    }
  };
  const onTabKey = (i) => (e) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const n = (i + (e.key === "ArrowRight" ? 1 : MODES.length - 1)) % MODES.length;
    if (tabRefs.current[n]) tabRefs.current[n].focus();
    choose(MODES[n].key);
  };

  const set = (k) => (e) => {
    const v = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setF((s) => ({ ...s, [k]: v }));
    if (result) setStale(true);
  };

  const handleCalculate = () => {
    setResult(calcDates(mode, f));
    setStale(false);
    if (typeof window !== "undefined" && window.gtag) {
      window.gtag("event", "tool_calculate_click", { tool_name: TOOL_NAME, calculator: modeOf(mode).hash });
    }
    signalResult(TOOL_NAME, "calc");
    if (typeof window !== "undefined" && window.innerWidth < 900 && resultRef.current) {
      setTimeout(() => resultRef.current && resultRef.current.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    }
  };
  const onKeyDown = (e) => {
    if (e.key === "Enter" && e.target.tagName !== "TEXTAREA" && e.target.tagName !== "BUTTON") {
      e.preventDefault();
      handleCalculate();
    }
  };

  const m = modeOf(mode);

  return (
    <>
      <Head>
        <title>{PAGE_TITLE}</title>
        <meta name="description" content={PAGE_DESC} />
        <meta name="robots" content="index, follow" />
        <meta name="author" content="PayrollTool.in" />
        <link rel="canonical" href={PAGE_URL} />
        <meta property="og:title" content={PAGE_TITLE} />
        <meta property="og:description" content={PAGE_DESC} />
        <meta property="og:url" content={PAGE_URL} />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="PayrollTool.in" />
        <meta property="og:locale" content="en_IN" />
        <meta property="og:image" content="https://www.payrolltool.in/icon.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={PAGE_TITLE} />
        <meta name="twitter:description" content={PAGE_DESC} />
        <meta name="twitter:image" content="https://www.payrolltool.in/icon.png" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              name: "Payroll Date Calculator",
              url: PAGE_URL,
              applicationCategory: "BusinessApplication",
              operatingSystem: "Any (browser-based)",
              description: "Counts days between dates, adds months with the month-end rule, finds notice period end dates, counts working days and works out retirement dates.",
              offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
            }),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: DC_FAQ.map((x) => ({ "@type": "Question", name: x.q, acceptedAnswer: { "@type": "Answer", text: x.a } })),
            }),
          }}
        />
      </Head>

      <div className="dc-wrapper" data-theme={theme}>
        <Header />

        <div className="dc-hero">
          <h1>Payroll <span>Date Calculator</span></h1>
          <p>Days between dates, probation and notice end dates, working days and retirement dates, counted the way payroll counts them.</p>
        </div>

        <div className="dc-tabs" role="tablist" aria-label="Calculator">
          {MODES.map((x, i) => (
            <button
              key={x.key}
              type="button"
              role="tab"
              aria-selected={mode === x.key}
              ref={(el) => { tabRefs.current[i] = el; }}
              onClick={() => choose(x.key)}
              onKeyDown={onTabKey(i)}
            >
              {x.label}
            </button>
          ))}
        </div>

        <div className="dc-grid" onKeyDown={onKeyDown}>
          <div className="dc-col">
            {mode === "between" && (
              <section className="dc-card">
                <div className="dc-ch"><span>1</span><h2>Dates</h2></div>
                <div className="dc-row">
                  <div className="dc-f"><label htmlFor="b1">From</label><input type="date" id="b1" value={f.b1} onChange={set("b1")} /></div>
                  <div className="dc-f"><label htmlFor="b2">To</label><input type="date" id="b2" value={f.b2} onChange={set("b2")} /></div>
                </div>
                <label className="dc-check"><input type="checkbox" checked={f.bIncl} onChange={set("bIncl")} /> Count both the first and the last day</label>
              </section>
            )}

            {mode === "add" && (
              <section className="dc-card">
                <div className="dc-ch"><span>1</span><h2>Start date and period</h2></div>
                <div className="dc-f"><label htmlFor="a1">Start date</label><input type="date" id="a1" value={f.a1} onChange={set("a1")} /></div>
                <div className="dc-row">
                  <div className="dc-f"><label htmlFor="aN">Add (use - to subtract)</label><input type="text" id="aN" placeholder="e.g. 6" value={f.aN} onChange={set("aN")} /></div>
                  <div className="dc-f">
                    <label htmlFor="aU">Unit</label>
                    <select id="aU" value={f.aU} onChange={set("aU")}><option value="d">Days</option><option value="w">Weeks</option><option value="m">Months</option><option value="y">Years</option></select>
                  </div>
                </div>
                <label className="dc-check"><input type="checkbox" checked={f.aLess} onChange={set("aLess")} /> Count the start date as day one</label>
              </section>
            )}

            {mode === "notice" && (
              <section className="dc-card">
                <div className="dc-ch"><span>1</span><h2>Resignation and notice</h2></div>
                <div className="dc-f"><label htmlFor="n1">Resignation date</label><input type="date" id="n1" value={f.n1} onChange={set("n1")} /></div>
                <div className="dc-row">
                  <div className="dc-f"><label htmlFor="nN">Notice period</label><input type="text" id="nN" inputMode="numeric" placeholder="e.g. 60" value={f.nN} onChange={set("nN")} /></div>
                  <div className="dc-f">
                    <label htmlFor="nU">Unit</label>
                    <select id="nU" value={f.nU} onChange={set("nU")}><option value="d">Days</option><option value="m">Months</option></select>
                  </div>
                </div>
                <div className="dc-f">
                  <label htmlFor="nStart">Notice starts</label>
                  <select id="nStart" value={f.nStart} onChange={set("nStart")}><option value="same">On the resignation date</option><option value="next">The day after</option></select>
                </div>
                <details className="dc-more">
                  <summary>Days already served or waived (optional)</summary>
                  <div className="dc-inner dc-f"><input type="text" inputMode="numeric" placeholder="0" value={f.nServed} onChange={set("nServed")} aria-label="Days already served or waived" /></div>
                </details>
              </section>
            )}

            {mode === "work" && (
              <section className="dc-card">
                <div className="dc-ch"><span>1</span><h2>Period and offs</h2></div>
                <div className="dc-row">
                  <div className="dc-f"><label htmlFor="w1">From</label><input type="date" id="w1" value={f.w1} onChange={set("w1")} /></div>
                  <div className="dc-f"><label htmlFor="w2">To</label><input type="date" id="w2" value={f.w2} onChange={set("w2")} /></div>
                </div>
                <div className="dc-f">
                  <label htmlFor="wSun">Weekly offs</label>
                  <select id="wSun" value={f.wSun} onChange={set("wSun")}>
                    {Object.keys(WEEKLY_OFFS).map((k) => <option key={k} value={k}>{WEEKLY_OFFS[k]}</option>)}
                  </select>
                </div>
                <div className="dc-f dc-last">
                  <label htmlFor="wHol">Holidays, one per line (DD-MM-YYYY)</label>
                  <textarea id="wHol" placeholder={"e.g. 09-11-2026\n24-11-2026"} value={f.wHol} onChange={set("wHol")} />
                </div>
              </section>
            )}

            {mode === "retire" && (
              <section className="dc-card">
                <div className="dc-ch"><span>1</span><h2>Date of birth and policy</h2></div>
                <div className="dc-row">
                  <div className="dc-f"><label htmlFor="r1">Date of birth</label><input type="date" id="r1" value={f.r1} onChange={set("r1")} /></div>
                  <div className="dc-f">
                    <label htmlFor="rAge">Retirement age</label>
                    <select id="rAge" value={f.rAge} onChange={set("rAge")}>{["55", "58", "60", "62", "65"].map((a) => <option key={a}>{a}</option>)}</select>
                  </div>
                </div>
                <div className="dc-f dc-last">
                  <label htmlFor="rRule">Retire on</label>
                  <select id="rRule" value={f.rRule} onChange={set("rRule")}>
                    <option value="eom">Last day of the month the age is attained</option>
                    <option value="day">The day the age is attained</option>
                  </select>
                </div>
              </section>
            )}

            <button type="button" className="dc-btn" id="calcBtn" onClick={handleCalculate}>Calculate {m.name}</button>
          </div>

          <section className="dc-card dc-result" ref={resultRef} aria-live="polite">
            <div className="dc-rh"><h2>&#128197; Result</h2></div>
            {!result && <div className="dc-empty">Choose the dates, then select Calculate.</div>}
            {result && result.err && <p className="dc-err">{result.err}</p>}
            {result && !result.err && (
              <>
                {stale && <div className="dc-stale">Inputs changed. Select Calculate to update.</div>}
                <div className="dc-tiles">
                  {result.tiles.map((t, i) => (
                    <div className={`dc-tile${i === 0 ? " p" : ""}`} key={t[1]}><b>{t[0]}</b><span>{t[1]}</span></div>
                  ))}
                </div>
                {result.note && <div className={`dc-note ${result.note[0]}`}>{result.note[1]}</div>}
                <div className="dc-tbl">
                  <table>
                    <thead><tr><th>Detail</th><th>Result</th></tr></thead>
                    <tbody>
                      {result.rows.map((r) => (
                        <tr key={r[0]}><td>{r[0]}{r[2] && <small>{r[2]}</small>}</td><td>{r[1]}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>
        </div>

        <div className="dc-feedback">
          <FeedbackWidget toolName={TOOL_NAME} />
        </div>

        <div className="dc-info">
          {DC_INFO_CARDS.map((c) => (
            <div className="dc-info-card" key={c.title}>
              <div className="dc-info-icon">{c.icon}</div>
              <h2>{c.title}</h2>
              <p>{c.body}</p>
            </div>
          ))}
        </div>

        <div className="dc-box">
          <h4>How each calculation works</h4>
          {MODES.map((x) => (
            <details className="dc-acc" key={x.key + (mode === x.key ? "-open" : "")} open={mode === x.key}>
              <summary><h5>{CONTENT[x.key].t}</h5></summary>
              {CONTENT[x.key].p.map((p, i) => <p key={i}>{p}</p>)}
            </details>
          ))}
        </div>

        <div className="dc-box">
          <h4>Common mistakes</h4>
          {DC_MISTAKES.map((x) => (
            <details className="dc-acc" key={x.t}>
              <summary><h5>{x.t}</h5></summary>
              <p>{x.d}</p>
            </details>
          ))}
        </div>

        <div className="dc-box dc-lastbox">
          <h4>Frequently asked questions</h4>
          {DC_FAQ.map((x) => (
            <details className="dc-acc" key={x.q}>
              <summary><h5>{x.q}</h5></summary>
              <p>{x.a}</p>
            </details>
          ))}
        </div>

        <Footer />
      </div>

      <style jsx>{`
        .dc-wrapper {
          --surface: #fff;
          --surface-alt: #faf9fc;
          --ink: #1e1b29;
          --ink-soft: #6b6785;
          --line: #e7e4f0;
          --brand: #7c3aed;
          --brand-deep: #6d28d9;
          --brand-tint: #f5f3ff;
          --green: #059669;
          --green-tint: #ecfdf5;
          --amber: #b45309;
          --amber-tint: #fffbeb;
          --red: #b91c1c;
          --red-tint: #fef2f2;
          font-family: "DM Sans", sans-serif;
          background: #eeeaf8;
          color: var(--ink);
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }
        .dc-wrapper[data-theme="dark"] {
          --surface: #1c1730;
          --surface-alt: #16131c;
          --ink: #f3f0fa;
          --ink-soft: #b3aac7;
          --line: #2a2536;
          --brand: #9163f2;
          --brand-deep: #a47df5;
          --brand-tint: #2c2147;
          --green: #34d399;
          --green-tint: #123027;
          --amber: #fbbf54;
          --amber-tint: #332411;
          --red: #f87171;
          --red-tint: #3d1f1f;
          background: #15111f;
        }
        .dc-hero,
        .dc-grid,
        .dc-card,
        .dc-info,
        .dc-feedback,
        .dc-box,
        .dc-btn,
        .dc-f input,
        .dc-f select,
        .dc-f textarea,
        .dc-tabs,
        .dc-tiles {
          box-sizing: border-box;
        }
        .dc-hero {
          text-align: center;
          padding: 24px 16px 18px;
          max-width: 680px;
          margin: 0 auto;
        }
        .dc-hero h1 {
          font-size: clamp(1.9rem, 5vw, 3rem);
          font-weight: 700;
          letter-spacing: -0.02em;
          margin: 0 0 10px;
          color: var(--ink);
        }
        .dc-hero h1 span {
          color: #8b5cf6;
        }
        .dc-hero p {
          font-size: 14px;
          line-height: 1.6;
          color: var(--ink-soft);
          margin: 0;
        }
        .dc-grid {
          max-width: 1100px;
          width: 100%;
          margin: 0 auto;
          padding: 0 16px;
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(0, 1.08fr);
          gap: 18px;
          align-items: start;
        }
        .dc-col {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .dc-card {
          background: var(--surface);
          border: 1px solid var(--line);
          border-radius: 16px;
          padding: 18px;
          box-shadow: 0 2px 10px rgba(124, 58, 237, 0.07);
        }
        .dc-ch {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 14px;
        }
        .dc-ch span {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: var(--brand-tint);
          color: var(--brand-deep);
          display: grid;
          place-items: center;
          font-size: 12px;
          font-weight: 600;
        }
        .dc-ch h2 {
          font-family: "Sora", sans-serif;
          font-size: 15px;
          font-weight: 700;
          margin: 0;
        }
        .dc-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        .dc-f {
          margin-bottom: 12px;
        }
        .dc-f label {
          display: block;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--ink-soft);
          margin-bottom: 6px;
        }
        .dc-f input,
        .dc-f select {
          width: 100%;
          font: inherit;
          font-size: 14px;
          color: var(--ink);
          background: var(--surface);
          border: 1px solid var(--line);
          border-radius: 12px;
          padding: 10px 12px;
          min-height: 44px;
          color-scheme: light;
        }
        .dc-wrapper[data-theme="dark"] .dc-f input,
        .dc-wrapper[data-theme="dark"] .dc-f select {
          color-scheme: dark;
        }
        .dc-f input:focus,
        .dc-f select:focus {
          outline: none;
          border-color: var(--brand);
          box-shadow: 0 0 0 3px var(--brand-tint);
        }
        .dc-help {
          font-size: 12px;
          color: var(--ink-soft);
          margin-top: 5px;
        }
        .dc-sum {
          font-size: 12px;
          color: var(--brand-deep);
          margin-top: 5px;
          min-height: 1.2em;
        }
        .dc-sum.bad {
          color: var(--amber);
        }
        .dc-more {
          border-top: 1px solid var(--line);
          margin-top: 4px;
          padding-top: 10px;
        }
        .dc-more.dc-flat {
          border-top: 0;
          margin: 0;
          padding: 0;
        }
        .dc-more > summary {
          cursor: pointer;
          font-weight: 600;
          color: var(--brand-deep);
          font-size: 14px;
          list-style: none;
        }
        .dc-more > summary::-webkit-details-marker {
          display: none;
        }
        .dc-more > summary::before {
          content: "▸  ";
        }
        .dc-more[open] > summary::before {
          content: "▾  ";
        }
        .dc-inner {
          padding-top: 12px;
        }
        .dc-check {
          display: flex;
          gap: 9px;
          align-items: flex-start;
          font-size: 14px;
          color: var(--ink);
        }
        .dc-check input {
          margin-top: 3px;
          width: 17px;
          height: 17px;
          accent-color: var(--brand);
        }
        .dc-btn {
          width: 100%;
          height: 48px;
          border: 0;
          border-radius: 12px;
          font: inherit;
          font-size: 15px;
          font-weight: 600;
          color: #fff;
          background: #7c3aed;
          cursor: pointer;
        }
        .dc-btn:hover {
          background: #6d28d9;
        }
        .dc-result {
          position: sticky;
          top: 84px;
          scroll-margin-top: 84px;
        }
        .dc-rh {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 14px;
        }
        .dc-rh h2 {
          font-family: "Sora", sans-serif;
          font-size: 16px;
          margin: 0;
        }
        .dc-rh small {
          color: var(--brand-deep);
          font-size: 12px;
          text-align: right;
        }
        .dc-empty {
          color: var(--ink-soft);
          text-align: center;
          padding: 28px 10px;
          font-size: 14px;
        }
        .dc-err {
          color: var(--red);
          background: var(--red-tint);
          border: 1px solid var(--red);
          border-radius: 8px;
          padding: 8px 12px;
          font-size: 14px;
          margin: 0;
        }
        .dc-stale {
          font-size: 13px;
          color: var(--amber);
          background: var(--amber-tint);
          border: 1px solid var(--amber);
          border-radius: 8px;
          padding: 6px 10px;
          margin-bottom: 12px;
        }
        .dc-tiles {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
          margin-bottom: 14px;
        }
        .dc-tile {
          border: 1px solid var(--line);
          border-radius: 12px;
          padding: 12px 10px;
          text-align: center;
          background: var(--surface-alt);
        }
        .dc-tile b {
          display: block;
          font-size: 17px;
          font-weight: 600;
          word-break: break-word;
          color: var(--ink);
        }
        .dc-tile span {
          display: block;
          font-size: 10.5px;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--ink-soft);
          margin-top: 4px;
        }
        .dc-tile.p {
          background: var(--brand-tint);
          border-color: var(--brand);
        }
        .dc-tile.p b {
          color: var(--brand-deep);
        }
        .dc-tile.g {
          background: var(--green-tint);
          border-color: var(--green);
        }
        .dc-tile.g b {
          color: var(--green);
        }
        .dc-note {
          border-radius: 12px;
          padding: 10px 12px;
          font-size: 14px;
          margin-bottom: 14px;
          border: 1px solid;
        }
        .dc-note.ok {
          background: var(--green-tint);
          color: var(--green);
          border-color: var(--green);
        }
        .dc-note.no {
          background: var(--amber-tint);
          color: var(--amber);
          border-color: var(--amber);
        }
        .dc-tbl {
          overflow-x: auto;
        }
        .dc-tbl table {
          width: 100%;
          border-collapse: collapse;
          font-size: 14px;
        }
        .dc-tbl th {
          background: var(--brand-tint);
          color: var(--brand-deep);
          font-size: 10.5px;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          text-align: left;
          padding: 9px 10px;
        }
        .dc-tbl th:last-child,
        .dc-tbl td:last-child {
          text-align: right;
        }
        .dc-tbl td {
          padding: 10px;
          border-bottom: 1px solid var(--line);
          vertical-align: top;
          color: var(--ink);
        }
        .dc-tbl td small {
          display: block;
          color: var(--ink-soft);
          font-size: 12px;
          margin-top: 2px;
          text-align: left;
        }
        .dc-tbl td:last-child {
          font-weight: 600;
          white-space: nowrap;
        }
        .dc-feedback {
          max-width: 768px;
          width: 100%;
          margin: 18px auto 0;
          padding: 0 16px;
        }
        .dc-info {
          max-width: 1100px;
          width: 100%;
          margin: 28px auto 0;
          padding: 0 16px;
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
        }
        .dc-info-card {
          background: var(--surface);
          border: 1px solid var(--line);
          border-radius: 12px;
          padding: 14px 15px;
          box-shadow: 0 2px 10px rgba(124, 58, 237, 0.07);
        }
        .dc-info-icon {
          font-size: 18px;
          margin-bottom: 6px;
        }
        .dc-info-card h2 {
          font-family: "Sora", sans-serif;
          font-size: 12.5px;
          font-weight: 700;
          color: var(--brand-deep);
          margin: 0 0 6px;
        }
        .dc-info-card p {
          font-size: 12px;
          line-height: 1.6;
          color: var(--ink-soft);
          margin: 0;
        }
        .dc-box {
          max-width: 768px;
          width: calc(100% - 32px);
          margin: 18px auto 0;
          background: var(--surface);
          border-radius: 16px;
          padding: 22px 24px;
        }
        .dc-box.dc-lastbox {
          margin-bottom: 40px;
        }
        .dc-box h4 {
          font-size: 14px;
          font-weight: 700;
          margin: 0 0 12px;
          color: var(--ink);
        }
        .dc-box p {
          font-size: 14px;
          line-height: 1.7;
          color: var(--ink-soft);
          margin: 0 0 12px;
        }
        .dc-box b {
          color: var(--ink);
        }
        .dc-we-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 12px;
        }
        .dc-we-col {
          background: var(--surface-alt);
          border-radius: 10px;
          padding: 14px;
        }
        .dc-we-col.alt {
          background: var(--brand-tint);
        }
        .dc-we-col h5 {
          font-size: 12px;
          font-weight: 700;
          color: var(--brand-deep);
          margin: 0 0 6px;
        }
        .dc-we-col p {
          font-size: 13px;
          margin: 0;
        }
        .dc-we-verdict {
          color: var(--ink) !important;
          font-weight: 500;
          margin: 0 !important;
        }
        .dc-acc {
          padding: 12px 0;
          border-top: 1px solid var(--line);
        }
        .dc-acc:first-of-type {
          border-top: 0;
          padding-top: 0;
        }
        .dc-acc > summary {
          list-style: none;
          cursor: pointer;
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
        }
        .dc-acc > summary::-webkit-details-marker {
          display: none;
        }
        .dc-acc > summary::after {
          content: "+";
          color: #8b5cf6;
          font-weight: 700;
          font-size: 16px;
          line-height: 1.2;
        }
        .dc-acc[open] > summary::after {
          content: "−";
        }
        .dc-acc h5 {
          flex: 1;
          font-size: 14px;
          font-weight: 600;
          color: var(--brand-deep);
          margin: 0;
        }
        .dc-acc p {
          margin: 6px 0 0;
        }
        .dc-tabs {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          justify-content: center;
          margin: 0 auto 18px;
          padding: 0 16px;
        }
        .dc-tabs button {
          font: inherit;
          font-size: 14px;
          font-weight: 600;
          color: var(--ink-soft);
          background: var(--surface);
          border: 1px solid var(--line);
          border-radius: 999px;
          padding: 8px 15px;
          cursor: pointer;
          min-height: 40px;
        }
        .dc-tabs button:hover {
          border-color: var(--brand);
        }
        .dc-tabs button[aria-selected="true"] {
          border-color: #7c3aed;
          background: #7c3aed;
          color: #fff;
        }
        .dc-f textarea {
          width: 100%;
          font-family: "DM Mono", ui-monospace, monospace;
          font-size: 13px;
          color: var(--ink);
          background: var(--surface);
          border: 1px solid var(--line);
          border-radius: 12px;
          padding: 10px 12px;
          min-height: 88px;
          resize: vertical;
        }
        .dc-f textarea:focus {
          outline: none;
          border-color: var(--brand);
          box-shadow: 0 0 0 3px var(--brand-tint);
        }
        .dc-f.dc-last {
          margin-bottom: 0;
        }
        .dc-check {
          margin-top: 2px;
        }
        @media (max-width: 900px) {
          .dc-grid {
            grid-template-columns: 1fr;
          }
          .dc-result {
            position: static;
          }
          .dc-info {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (max-width: 560px) {
          .dc-row,
          .dc-we-grid,
          .dc-info {
            grid-template-columns: 1fr;
          }
          .dc-tiles {
            grid-template-columns: 1fr;
          }
          .dc-box {
            padding: 18px 16px;
          }
        }
      `}</style>
    </>
  );
}
