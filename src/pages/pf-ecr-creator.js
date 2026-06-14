import Head from "next/head";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { useState, useRef, useCallback } from "react";
import ReactDOM from "react-dom";
import * as XLSX from "xlsx";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const C = {
  uan:      "Universal Account No.",
  name:     "Employee Name(As per EPFO/UIDAI)",
  gross:    "Gross Wages",
  pfWages:  "PF Wages",
  penWages: "Pension Wages",
  edli:     "EDLI Wages",
  empPF:    "Employee PF",
  volPF:    "Voluntary PF",
  ncpDays:  "NCP/LOP Days",
  refund:   "Refund of Advances",
};

const ALIASES = {
  uan:      [C.uan, "UAN", "uan", "Universal Account No"],
  name:     [C.name, "Employee Name", "Name", "Member Name"],
  gross:    [C.gross, "Gross", "Gross Salary", "GROSS"],
  pfWages:  [C.pfWages, "EPF Wages", "PF WAGES"],
  penWages: [C.penWages, "EPS Wages", "PENSION WAGES"],
  edli:     [C.edli, "EDLI", "EDLI WAGES"],
  empPF:    [C.empPF, "Employee PF Contribution", "EPF Contribution", "EMP PF"],
  volPF:    [C.volPF, "VPF", "VOLUNTARY PF"],
  ncpDays:  [C.ncpDays, "NCP Days", "NCP / LOP Days", "LOP Days", "LOP", "NCP", "ncp/lop days", "ncp days", "lop days"],
  refund:   [C.refund, "Refund of Advance", "Refund", "REFUND", "refund of advances", "refund of advance"],
};

const EPS_CEIL = 15000;
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
function getRaw(row, aliases) {
  for (const a of aliases) { if (Object.prototype.hasOwnProperty.call(row, a)) return row[a]; }
  const lower = aliases.map(a => a.toLowerCase().trim());
  for (const key of Object.keys(row)) { if (lower.includes(key.toLowerCase().trim())) return row[key]; }
  return undefined;
}
function num(v)  { const n = parseFloat(v); return isNaN(n) ? 0 : n; }
function rnd(v)  { return Math.round(v); }
function fmt(v)  { return "₹" + rnd(v).toLocaleString("en-IN"); }
function stripHtml(h) { return h.replace(/<[^>]+>/g, ""); }

// ─── CORE PROCESSING ──────────────────────────────────────────────────────────
function processWorkbook(buffer) {
  const wb   = XLSX.read(buffer, { type: "array" });
  const ws   = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { defval: "" });

  const ecrData = [], obsData = [];
  let cntValid = 0, cntError = 0, cntExcluded = 0;
  const infoBanners = [];

  const colNcp    = hasCol(rows, ALIASES.ncpDays);
  const colRefund = hasCol(rows, ALIASES.refund);
  const colVolPF  = hasCol(rows, ALIASES.volPF);
  if (!colNcp)    infoBanners.push({ type: "info", text: "<strong>NCP/LOP Days column not found</strong> - treated as <strong>0</strong> for all employees." });
  if (!colRefund) infoBanners.push({ type: "info", text: "<strong>Refund of Advances column not found</strong> - treated as <strong>0</strong> for all employees." });

  // uanMap: uan -> [{idx, nameUC}]
  // nameMap: nameUC -> [idx]
  const uanMap = {}, nameMap = {};
  rows.forEach((row, i) => {
    const uan    = String(getVal(row, ALIASES.uan)).trim();
    const nameUC = String(getVal(row, ALIASES.name)).trim().toUpperCase();
    if (uan)    { uanMap[uan]     = uanMap[uan]     || []; uanMap[uan].push({ idx: i, nameUC }); }
    if (nameUC) { nameMap[nameUC] = nameMap[nameUC] || []; nameMap[nameUC].push(i); }
  });

  // For each UAN with multiple rows, classify:
  //   - all same name  → dupUANSameName  (double-entry)
  //   - mixed names    → dupUANDiffName  (name mismatch - more serious)
  const dupUANSameName = new Map();  // idx -> {uan, otherRows}
  const dupUANDiffName = new Map();  // idx -> {uan, names: [{idx,nameUC}]}
  Object.entries(uanMap).forEach(([uan, entries]) => {
    if (entries.length < 2) return;
    const uniqueNames = new Set(entries.map(e => e.nameUC));
    if (uniqueNames.size === 1) {
      // All same name - simple duplicate
      entries.forEach(({ idx }) => {
        const others = entries.filter(e => e.idx !== idx).map(e => e.idx + 2).join(", ");
        dupUANSameName.set(idx, { uan, others });
      });
    } else {
      // Different names under same UAN - name mismatch
      entries.forEach(({ idx }) => {
        dupUANDiffName.set(idx, { uan, entries });
      });
    }
  });

  // Name-only duplicates (same name, different UANs)
  const dupNameRows = new Map();  // idx -> {nameUC, otherRows}
  Object.entries(nameMap).forEach(([nameUC, idxs]) => {
    if (idxs.length < 2) return;
    // Only flag if these rows do NOT already share a UAN
    idxs.forEach(idx => {
      const myUAN = String(getVal(rows[idx], ALIASES.uan)).trim();
      const others = idxs.filter(x => x !== idx).filter(x => {
        const theirUAN = String(getVal(rows[x], ALIASES.uan)).trim();
        return theirUAN !== myUAN; // only flag cross-UAN name duplicates
      });
      if (others.length > 0) dupNameRows.set(idx, { nameUC, others });
    });
  });

  const zeroNcp = [], zeroRefund = [];

  rows.forEach((row, i) => {
    const empNo  = i + 1;
    const uan    = String(getVal(row, ALIASES.uan)).trim();
    const name   = String(getVal(row, ALIASES.name)).trim() || `Employee ${empNo}`;
    const gross  = num(getVal(row, ALIASES.gross));
    const nameUC = name.toUpperCase();
    let epfWages  = num(getVal(row, ALIASES.pfWages));
    let epsWages  = num(getVal(row, ALIASES.penWages));
    let edliWages = num(getVal(row, ALIASES.edli));
    let empPFin   = num(getVal(row, ALIASES.empPF));
    let volPF     = colVolPF ? num(getVal(row, ALIASES.volPF)) : 0;
    let ncpRaw    = getRaw(row, ALIASES.ncpDays);
    let ncpDays   = (colNcp && ncpRaw !== undefined) ? num(ncpRaw) : 0;
    let refundRaw = getRaw(row, ALIASES.refund);
    let refund    = (colRefund && refundRaw !== undefined) ? num(refundRaw) : 0;

    let status = "VALID";
    const remarks = [];
    let hasModification = false;

    // ── NCP DAYS rounding ──
    if (colNcp && ncpRaw !== undefined) {
      const ncpDecimal = num(ncpRaw);
      const ncpRounded = rnd(ncpDecimal);
      if (ncpDecimal !== ncpRounded) {
        remarks.push({ type: "warn", text: `<span class="font-semibold">${name}</span>: NCP/LOP Days rounded ${ncpDecimal} → ${ncpRounded}.` });
        ncpDays = ncpRounded;
        hasModification = true;
      }
    }

    if (dupUANDiffName.has(i)) {
      const { uan: dupUAN, entries } = dupUANDiffName.get(i);
      const nameList = entries.map(e => `Row ${e.idx + 2}: <strong>${e.nameUC}</strong>`).join(", ");
      remarks.push({ type: "warn", text: `UAN <strong>${dupUAN}</strong> appears with different names - ${nameList}. Possible name mismatch. Included but please verify.` });
    } else if (dupUANSameName.has(i)) {
      const { uan: dupUAN, others } = dupUANSameName.get(i);
      remarks.push({ type: "warn", text: `<span class="font-semibold">${name}</span>: Duplicate UAN <strong>${dupUAN}</strong> - also at data row(s) ${others}. Included but please verify.` });
    }
    if (dupNameRows.has(i)) {
      const { others } = dupNameRows.get(i);
      const otherLabel = others.map(x => x + 2).join(", ");
      remarks.push({ type: "warn", text: `<span class="font-semibold">${name}</span>: Same name found at row(s) ${otherLabel} under a different UAN. Included but please verify.` });
    }
    if (!uan || !/^\d{12}$/.test(uan)) {
      remarks.push({ type: "error", text: `<span class="font-semibold">${name}</span>: Missing or invalid UAN (must be 12 digits) - excluded.` });
      status = "ERROR"; cntError++;
    }
    if (status !== "ERROR" && gross > 0 && epfWages > gross) {
      remarks.push({ type: "error", text: `<span class="font-semibold">${name}</span>: EPF Wages (₹${epfWages.toLocaleString()}) exceeds Gross (₹${gross.toLocaleString()}) - excluded.` });
      status = "ERROR"; cntError++;
    }
    if (status !== "ERROR") {
      // ── Check if EPS or EDLI > EPF ──
      if (epsWages > epfWages) {
        remarks.push({ type: "warn", text: `<span class="font-semibold">${name}</span>: EPS Wages (₹${epsWages.toLocaleString()}) exceeds EPF Wages (₹${epfWages.toLocaleString()}) - adjusted to EPF Wages.` });
        epsWages = epfWages;
        hasModification = true;
      }
      if (edliWages > epfWages) {
        remarks.push({ type: "warn", text: `<span class="font-semibold">${name}</span>: EDLI Wages (₹${edliWages.toLocaleString()}) exceeds EPF Wages (₹${epfWages.toLocaleString()}) - adjusted to EPF Wages.` });
        edliWages = epfWages;
        hasModification = true;
      }

      let ec = Math.min(epsWages, EPS_CEIL);
      if (epsWages > EPS_CEIL) remarks.push({ type: "warn", text: `<span class="font-semibold">${name}</span>: EPS Wages capped ₹${epsWages.toLocaleString()} → ₹${EPS_CEIL.toLocaleString()}.` });
      let epfC  = rnd(epfWages * 0.12);
      let epsC  = rnd(ec * 0.0833);
      let epfD  = epfC - epsC;
      if (empPFin > 0 && empPFin !== epfC) remarks.push({ type: "warn", text: `<span class="font-semibold">${name}</span>: EPF Contribution adjusted ₹${empPFin.toLocaleString()} → ₹${epfC.toLocaleString()}.` });
      let epfCF   = epfC + volPF;
      let adminC  = rnd(epfWages * 0.005);
      let edliC   = rnd(edliWages * 0.005);
      if (ncpDays === 0)  zeroNcp.push(name);
      if (refund === 0)   zeroRefund.push(name);
      if (epfCF === 0 && epsC === 0 && epfD === 0 && ncpDays === 0) {
        remarks.push({ type: "warn", text: `<span class="font-semibold">${name}</span>: All contributions zero - excluded.` });
        status = "EXCLUDED"; cntExcluded++;
      } else cntValid++;
      if (status === "VALID") ecrData.push({ uan, name, gross, epfWages, epsWages: ec, edliWages, epfCont: epfCF, epsCont: epsC, epfDiff: epfD, ncpDays, refund, adminCharge: adminC, edliCharge: edliC, hasModification });
    }
    obsData.push(...remarks.filter(r => r.type === "error" || r.type === "warn"));
  });

  if (zeroNcp.length > 0) {
    const l = zeroNcp.length === rows.length ? "All employees" : `${zeroNcp.length} employee(s)`;
    obsData.push({ type: "warn", text: `<strong>NCP/LOP Days is 0</strong> for ${l}. Confirm this is correct.` });
  }
  if (zeroRefund.length > 0) {
    const l = zeroRefund.length === rows.length ? "All employees" : `${zeroRefund.length} employee(s)`;
    obsData.push({ type: "warn", text: `<strong>Refund of Advances is 0</strong> for ${l}. Confirm this is correct.` });
  }

  return { ecrData, obsData, infoBanners, total: rows.length, cntValid, cntError, cntExcluded };
}

// ─── WORKBOOK BUILDERS ────────────────────────────────────────────────────────
function buildTemplateWorkbook() {
  const wb = XLSX.utils.book_new();
  const headers = [C.uan, C.name, C.gross, C.pfWages, C.penWages, C.edli, C.empPF, C.volPF, C.ncpDays, C.refund];
  const sample  = [
    ["100881966178", "JOHN DOE",    30000, 15000, 15000, 15000, 1800, 0, 0, 0],
    ["100881966179", "JANE SMITH",  25000, 15000, 15000, 15000, 1800, 0, 2, 0],
  ];
  const ws = XLSX.utils.aoa_to_sheet([headers, ...sample]);
  ws["!cols"] = [20, 38, 14, 12, 14, 12, 12, 12, 14, 20].map(w => ({ wch: w }));
  XLSX.utils.book_append_sheet(wb, ws, "PF Data");
  return wb;
}

function buildExcelOutput(ecrData, obsData, month, year) {
  const wb = XLSX.utils.book_new();

  // ── Identify duplicate UANs and names within ecrData ──
  const uanCount  = {}, nameCount = {};
  ecrData.forEach(r => {
    uanCount[r.uan]                    = (uanCount[r.uan]  || 0) + 1;
    nameCount[r.name.toUpperCase()]    = (nameCount[r.name.toUpperCase()] || 0) + 1;
  });
  const dupUANSet  = new Set(Object.keys(uanCount).filter(u => uanCount[u]  > 1));
  const dupNameSet = new Set(Object.keys(nameCount).filter(n => nameCount[n] > 1));

  // ── Build rows, tagging each with its dup type and modification flag ──
  const rows = ecrData.map(r => {
    const isDupUAN  = dupUANSet.has(r.uan);
    const isDupName = dupNameSet.has(r.name.toUpperCase());
    const hasModif  = r.hasModification || false;
    return {
      row: {
        "Universal Account Number": r.uan,
        "MEMBER NAME":              r.name.toUpperCase(),
        "GROSS WAGES":              r.gross,
        "EPF WAGES":                r.epfWages,
        "EPS WAGES":                r.epsWages,
        "EDLI WAGES":               r.edliWages,
        "EPF CONTRI REMITTED":      r.epfCont,
        "EPS CONTRI REMITTED":      r.epsCont,
        "EPF EPS DIFF REMITTED":    r.epfDiff,
        "NCP DAYS":                 r.ncpDays,
        "REFUND OF ADVANCES":       r.refund,
      },
      isDupUAN,
      isDupName,
      hasModif,
    };
  });

  const ws1 = XLSX.utils.json_to_sheet(rows.map(r => r.row));
  ws1["!cols"] = [24, 30, 14, 12, 12, 12, 20, 20, 22, 10, 20].map(w => ({ wch: w }));

  // ── Apply cell-level highlighting ──
  // Yellow (#FFF9C4) for duplicate UAN
  // Orange (#FFE0B2) for duplicate name
  // Red-orange (#FFCCBC) for both duplicates
  // Pink (#F8D7DA / #FFC0CB) for modifications
  const colCount = 11;
  rows.forEach((r, rowIdx) => {
    let fillColor = null;
    let isBold = false;

    if (r.hasModif) {
      fillColor = "FFC0CB"; // Pink for modifications
      isBold = true;
    } else if (r.isDupUAN && r.isDupName) {
      fillColor = "FFCCBC"; // Red-orange for both duplicates
      isBold = true;
    } else if (r.isDupUAN) {
      fillColor = "FFF9C4"; // Yellow for duplicate UAN only
    } else if (r.isDupName) {
      fillColor = "FFE0B2"; // Orange for duplicate name only
    }

    if (fillColor) {
      for (let col = 0; col < colCount; col++) {
        const cellAddr = XLSX.utils.encode_cell({ r: rowIdx + 1, c: col }); // +1 for header
        if (!ws1[cellAddr]) ws1[cellAddr] = { v: "", t: "s" };
        ws1[cellAddr].s = {
          fill: { patternType: "solid", fgColor: { rgb: fillColor } },
          font: { bold: isBold },
        };
      }
    }
  });

  // ── Style header row ──
  for (let col = 0; col < colCount; col++) {
    const cellAddr = XLSX.utils.encode_cell({ r: 0, c: col });
    if (!ws1[cellAddr]) continue;
    ws1[cellAddr].s = {
      fill: { patternType: "solid", fgColor: { rgb: "EDE9FE" } },
      font: { bold: true },
    };
  }

  XLSX.utils.book_append_sheet(wb, ws1, "ECR Data");

  // ── Legend sheet ──
  const legendData = [
    { "Highlight Color": "Yellow (#FFF9C4)",     Meaning: "Duplicate UAN - same UAN appears more than once" },
    { "Highlight Color": "Orange (#FFE0B2)",     Meaning: "Duplicate Name - same employee name appears more than once under different UANs" },
    { "Highlight Color": "Red-Orange (#FFCCBC)", Meaning: "Both duplicate UAN and duplicate Name" },
    { "Highlight Color": "Pink (#FFC0CB)",       Meaning: "Row has modifications - NCP days rounded, EPS/EDLI wages adjusted, etc." },
  ];
  const wsLegend = XLSX.utils.json_to_sheet(legendData);
  wsLegend["!cols"] = [{ wch: 26 }, { wch: 70 }];
  XLSX.utils.book_append_sheet(wb, wsLegend, "Legend");

  // ── Observations sheet ──
  if (obsData.length > 0) {
    const wsObs = XLSX.utils.json_to_sheet(
      obsData.map(o => ({ Type: { error: "ERROR", warn: "WARNING" }[o.type] || o.type.toUpperCase(), Remark: stripHtml(o.text) }))
    );
    wsObs["!cols"] = [{ wch: 10 }, { wch: 90 }];
    XLSX.utils.book_append_sheet(wb, wsObs, "Observations");
  }

  XLSX.writeFile(wb, `ECR_${month}_${year}.xlsx`);
}

function buildTxtOutput(ecrData, month, year) {
  const content = ecrData.map(r =>
    [r.uan, r.name.toUpperCase(), r.gross, r.epfWages, r.epsWages, r.edliWages, r.epfCont, r.epsCont, r.epfDiff, r.ncpDays, r.refund].join("#~#")
  ).join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([content], { type: "text/plain" }));
  a.download = `ECR_${month}_${year}.txt`;
  a.click();
}

function buildObsTxt(obsData, month, year) {
  const header = `PF ECR CREATOR - OBSERVATIONS\nWage Month: ${month} ${year}\nGenerated: ${new Date().toLocaleString("en-IN")}\n${"─".repeat(80)}\n`;
  const lines  = obsData.map((o, i) =>
    `${String(i + 1).padStart(4, "0")}  ${({ error: "[ERROR]  ", warn: "[WARNING]" }[o.type] || "[NOTE]   ")}  ${stripHtml(o.text)}`
  );
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([header + lines.join("\n")], { type: "text/plain" }));
  a.download = `ECR_Observations_${month}_${year}.txt`;
  a.click();
}

// ─── TOOLTIP ─────────────────────────────────────────────────────────────────
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
      {/* dot */}
      <circle cx="7.5" cy="4.8" r="0.85" fill="#A78BFA" />
      {/* stem */}
      <rect x="6.85" y="6.5" width="1.3" height="3.8" rx="0.65" fill="#A78BFA" />
    </svg>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function PfEcrCreator() {
  const [file,        setFileState]  = useState(null);
  const [dragOver,    setDragOver]   = useState(false);
  const [processing,  setProcessing] = useState(false);
  const [result,      setResult]     = useState(null);
  const [obsPage,     setObsPage]    = useState(1);
  const [obsVisible,  setObsVisible] = useState(false);
  const [month,       setMonth]      = useState("");
  const [year,        setYear]       = useState("");
  const fileInputRef                 = useRef(null);

  function validateFile(f) {
    if (!f) return false;
    const ext = f.name.split(".").pop().toLowerCase();
    return ext === "xlsx" || ext === "xls";
  }

  function handleFile(f) {
    if (!validateFile(f)) { alert("Only .xlsx or .xls files are accepted."); return; }
    setFileState(f);
    setResult(null);
    setObsPage(1);
    setObsVisible(false);
  }

  const onDragOver  = (e) => { e.preventDefault(); setDragOver(true); };
  const onDragLeave = () => setDragOver(false);
  const onDrop      = (e) => {
    e.preventDefault(); setDragOver(false);
    try { const f = e.dataTransfer?.files?.[0]; if (f) handleFile(f); } catch (_) {}
  };
  const onSelectFile = (e) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
    e.target.value = "";
  };

  async function handleProcess() {
    if (!file) return;
    setProcessing(true);
    try {
      const buffer = await file.arrayBuffer();
      const res    = processWorkbook(buffer);
      setResult(res);
      setObsPage(1);
    } catch (err) {
      alert("Error reading file: " + err.message);
    }
    setProcessing(false);
  }

  function handleDownloadTemplate(e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    setTimeout(() => {
      const wb = buildTemplateWorkbook();
      XLSX.writeFile(wb, "ECR_Template.xlsx");
    }, 0);
  }

  const hasResult  = !!result;
  const hasObs     = result?.obsData?.length > 0;
  const hasBanners = result?.infoBanners?.length > 0;
  const wageLabel  = month && year ? `${month} ${year}` : month || year || "Month Year";

  // Obs pagination
  const totalObsPages = hasObs ? Math.ceil(result.obsData.length / OBS_PER_PAGE) : 0;
  const obsSlice      = hasObs ? result.obsData.slice((obsPage - 1) * OBS_PER_PAGE, obsPage * OBS_PER_PAGE) : [];

  // Contribution sums
  const sum = (k) => result?.ecrData?.reduce((a, r) => a + r[k], 0) ?? 0;

  return (
    <>
      <Head>
        <title>PF ECR File Generator - PayrollTool</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content="Generate EPFO-compliant PF ECR files instantly. Bulk import, auto-validation, Excel & TXT export. Free, browser-based." />
        <meta name="robots" content="index, follow" />
      </Head>

      <div className="min-h-screen flex flex-col" style={{ fontFamily: "'DM Sans', sans-serif", background: "#EEEAF8" }}>
        <Header />

        {/* ── HERO ── */}
        <div className={`pt-6 pb-4 px-4 mx-auto w-full scroll-mt-24 transition-all duration-300 ${hasResult ? "max-w-4xl" : "max-w-lg"}`}>
          <div className="flex flex-col items-center text-center">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-gray-900 whitespace-nowrap">
              PF ECR <span className="text-violet-500">File Generator</span>
            </h1>
            <p className="mt-3 text-sm text-gray-500 max-w-sm mx-auto leading-relaxed">
              Upload your payroll sheet and instantly generate an EPFO-compliant ECR file - ready for portal upload.
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
                <Tooltip position="bottom" text="Download the official ECR template (.xlsx) - UAN, Employee Name, Gross Wages, PF Wages, Pension Wages, EDLI Wages, Employee PF, Voluntary PF, NCP Days, Refund.">
                  <InfoIcon />
                </Tooltip>
              </div>
            </div>
          </div>
        </div>

        {/* ── MAIN CONTENT ── */}
        <main className="flex-1 flex flex-col items-center justify-start px-4 pb-8">

          {/* ─── PRE-RESULT: single centred card (unchanged) ─── */}
          {!hasResult && (
            <div className="w-full max-w-lg bg-white rounded-3xl shadow-xl p-8 mt-2">

              {/* Wage Month & Year selects */}
              <div className="grid grid-cols-2 gap-3 mb-5">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Wage Month</label>
                  <select
                    value={month}
                    onChange={e => setMonth(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 bg-white focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition appearance-none"
                    style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%239CA3AF' d='M6 8L1 3h10z'/%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center" }}
                  >
                    <option value="">Select Month</option>
                    {MONTHS.map(m => <option key={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Calendar Year</label>
                  <select
                    value={year}
                    onChange={e => setYear(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 bg-white focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition appearance-none"
                    style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%239CA3AF' d='M6 8L1 3h10z'/%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center" }}
                  >
                    <option value="">Select Year</option>
                    {YEARS.map(y => <option key={y}>{y}</option>)}
                  </select>
                </div>
              </div>

              {/* Drop zone */}
              <div
                onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl flex flex-col items-center justify-center py-8 px-4 transition-colors cursor-pointer ${dragOver ? "border-violet-400 bg-violet-50" : "border-gray-200 bg-gray-50/50 hover:border-violet-300 hover:bg-violet-50/30"}`}
                style={{ userSelect: "none" }}
              >
                <div className="w-20 h-20 rounded-full bg-white shadow flex items-center justify-center mb-3 border border-gray-100">
                  <svg width="38" height="38" viewBox="0 0 38 38" fill="none">
                    <rect x="7" y="4" width="18" height="23" rx="2" stroke="#7C3AED" strokeWidth="1.6" fill="none"/>
                    <path d="M25 4v6h6" stroke="#7C3AED" strokeWidth="1.4" strokeLinejoin="round"/>
                    <path d="M13 27h12M13 22h8" stroke="#7C3AED" strokeWidth="1.3" strokeLinecap="round"/>
                    <circle cx="28" cy="28" r="7" fill="#7C3AED" fillOpacity="0.12" stroke="#7C3AED" strokeWidth="1.5"/>
                    <path d="M28 25v6M25 28h6" stroke="#7C3AED" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </div>
                {file ? (
                  <>
                    <p className="text-sm font-semibold text-violet-700">{file.name}</p>
                    <p className="text-xs text-gray-400 mt-1">{(file.size / 1024).toFixed(1)} KB · Ready to process</p>
                    <button onClick={(e) => { e.stopPropagation(); setFileState(null); setResult(null); }} className="mt-2 text-xs text-gray-400 hover:text-red-500 transition-colors underline">Remove</button>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-semibold text-violet-600">Drop file here</p>
                    <p className="text-xs text-gray-400 mt-1">Accepts .xlsx or .xls only</p>
                  </>
                )}
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px bg-gray-100" />
                <span className="text-xs text-gray-400 font-medium">or select from</span>
                <div className="flex-1 h-px bg-gray-100" />
              </div>

              <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={onSelectFile} />

              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-3.5 rounded-xl font-semibold text-sm text-white transition-all active:scale-95"
                style={{ background: "linear-gradient(135deg,#6D28D9 0%,#7C3AED 100%)" }}
              >
                <svg className="inline mr-2 -mt-0.5" width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M8 2v9M5 5l3-3 3 3" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M2 13h12" stroke="white" strokeWidth="1.6" strokeLinecap="round"/>
                </svg>
                Select ECR File
              </button>

              <p className="text-center text-xs text-gray-400 mt-3">
                Supports <span className="font-semibold text-gray-500">.XLSX</span> &amp; <span className="font-semibold text-gray-500">.XLS</span>
                <Tooltip text="Use the official ECR template. Columns: UAN, Employee Name, Gross Wages, PF Wages, Pension Wages, EDLI Wages, Employee PF, Voluntary PF, NCP Days, Refund of Advances.">
                  <InfoIcon />
                </Tooltip>
              </p>

              {/* Process button */}
              {file && (
                <button
                  onClick={handleProcess}
                  disabled={processing}
                  className="w-full mt-4 py-3 rounded-xl font-semibold text-sm text-white transition-all active:scale-95 disabled:opacity-60"
                  style={{ background: "linear-gradient(135deg,#059669 0%,#10B981 100%)" }}
                >
                  {processing ? "Processing…" : "⚡ Generate ECR Export"}
                </button>
              )}
            </div>
          )}

          {/* ─── POST-RESULT: two-column layout ─── */}
          {hasResult && (
            <div className="w-full max-w-4xl mt-2 flex flex-col gap-4">

              {/* Top row: stacks on mobile, side-by-side on md+ */}
              <div className="flex flex-col md:flex-row gap-4 items-start">

                {/* ── LEFT: input panel - full width on mobile, fixed 320px on desktop ── */}
                <div className="w-full md:w-80 md:flex-shrink-0 bg-white rounded-3xl shadow-xl p-6 md:p-6">

                  {/* Wage Month & Year selects */}
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Wage Month</label>
                      <select
                        value={month}
                        onChange={e => setMonth(e.target.value)}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 bg-white focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition appearance-none"
                        style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 12 12'%3E%3Cpath fill='%239CA3AF' d='M6 8L1 3h10z'/%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center" }}
                      >
                        <option value="">Month</option>
                        {MONTHS.map(m => <option key={m}>{m}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Year</label>
                      <select
                        value={year}
                        onChange={e => setYear(e.target.value)}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 bg-white focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition appearance-none"
                        style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 12 12'%3E%3Cpath fill='%239CA3AF' d='M6 8L1 3h10z'/%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center" }}
                      >
                        <option value="">Year</option>
                        {YEARS.map(y => <option key={y}>{y}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Drop zone - same size as pre-result */}
                  <div
                    onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl flex flex-col items-center justify-center py-8 px-4 transition-colors cursor-pointer ${dragOver ? "border-violet-400 bg-violet-50" : "border-gray-200 bg-gray-50/50 hover:border-violet-300 hover:bg-violet-50/30"}`}
                    style={{ userSelect: "none", minHeight: "180px" }}
                  >
                    <div className="w-20 h-20 rounded-full bg-white shadow flex items-center justify-center mb-3 border border-gray-100">
                      <svg width="38" height="38" viewBox="0 0 38 38" fill="none">
                        <rect x="7" y="4" width="18" height="23" rx="2" stroke="#7C3AED" strokeWidth="1.6" fill="none"/>
                        <path d="M25 4v6h6" stroke="#7C3AED" strokeWidth="1.4" strokeLinejoin="round"/>
                        <path d="M13 27h12M13 22h8" stroke="#7C3AED" strokeWidth="1.3" strokeLinecap="round"/>
                        <circle cx="28" cy="28" r="7" fill="#7C3AED" fillOpacity="0.12" stroke="#7C3AED" strokeWidth="1.5"/>
                        <path d="M28 25v6M25 28h6" stroke="#7C3AED" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                    </div>
                    {file ? (
                      <>
                        <p className="text-sm font-semibold text-violet-700 text-center break-all px-2">{file.name}</p>
                        <p className="text-xs text-gray-400 mt-1">{(file.size / 1024).toFixed(1)} KB · Ready</p>
                        <button onClick={(e) => { e.stopPropagation(); setFileState(null); setResult(null); }} className="mt-2 text-xs text-gray-400 hover:text-red-500 transition-colors underline">Remove</button>
                      </>
                    ) : (
                      <>
                        <p className="text-sm font-semibold text-violet-600">Drop file here</p>
                        <p className="text-xs text-gray-400 mt-1">Accepts .xlsx or .xls only</p>
                      </>
                    )}
                  </div>

                  {/* Divider */}
                  <div className="flex items-center gap-2 my-4">
                    <div className="flex-1 h-px bg-gray-100" />
                    <span className="text-xs text-gray-400 font-medium">or select from</span>
                    <div className="flex-1 h-px bg-gray-100" />
                  </div>

                  <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={onSelectFile} />

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-3.5 rounded-xl font-semibold text-sm text-white transition-all active:scale-95"
                    style={{ background: "linear-gradient(135deg,#6D28D9 0%,#7C3AED 100%)" }}
                  >
                    <svg className="inline mr-1.5 -mt-0.5" width="14" height="14" viewBox="0 0 16 16" fill="none">
                      <path d="M8 2v9M5 5l3-3 3 3" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M2 13h12" stroke="white" strokeWidth="1.6" strokeLinecap="round"/>
                    </svg>
                    Select ECR File
                  </button>

                  <p className="text-center text-xs text-gray-400 mt-2">
                    Supports <span className="font-semibold text-gray-500">.XLSX</span> &amp; <span className="font-semibold text-gray-500">.XLS</span>
                    <Tooltip text="Use the official ECR template. Columns: UAN, Employee Name, Gross Wages, PF Wages, Pension Wages, EDLI Wages, Employee PF, Voluntary PF, NCP Days, Refund of Advances.">
                      <InfoIcon />
                    </Tooltip>
                  </p>

                  {/* Re-generate button */}
                  {file && (
                    <button
                      onClick={handleProcess}
                      disabled={processing}
                      className="w-full mt-3 py-3 rounded-xl font-semibold text-sm text-white transition-all active:scale-95 disabled:opacity-60"
                      style={{ background: "linear-gradient(135deg,#059669 0%,#10B981 100%)" }}
                    >
                      {processing ? "Processing…" : "⚡ Re-generate ECR"}
                    </button>
                  )}
                </div>

                {/* ── RIGHT: results summary ── */}
                <div className="flex-1 min-w-0 flex flex-col gap-3">

                  {/* ECR Ready header */}
                  <div className="flex items-center gap-2">
                    <span className="text-green-500 text-lg">✓</span>
                    <span className="text-base font-bold text-gray-800">ECR Ready - {wageLabel}</span>
                  </div>

                  {/* Info banners */}
                  {hasBanners && (
                    <div className="flex flex-col gap-2">
                      {result.infoBanners.map((b, i) => (
                        <div key={i} className="rounded-xl bg-blue-50 border border-blue-200 p-3 flex items-start gap-2">
                          <span className="text-blue-500 text-sm flex-shrink-0">ℹ️</span>
                          <p className="text-xs text-blue-700" dangerouslySetInnerHTML={{ __html: b.text }} />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Stat grid - 2 cols on mobile, 4 on sm+ */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { label: "Imported",  value: result.total,       color: "text-gray-700",  bg: "bg-white border-gray-100",                                                             tip: "Total rows imported from the file." },
                      { label: "Valid",     value: result.cntValid,    color: "text-green-600", bg: "bg-white border-gray-100",                                                             tip: "Employees with valid data included in ECR." },
                      { label: "Errors",    value: result.cntError,    color: "text-red-600",   bg: result.cntError    > 0 ? "bg-red-50 border-red-200"    : "bg-white border-gray-100",   tip: "Rows with invalid UAN, duplicates, or wage issues." },
                      { label: "Excluded",  value: result.cntExcluded, color: "text-amber-600", bg: result.cntExcluded > 0 ? "bg-amber-50 border-amber-200" : "bg-white border-gray-100",  tip: "Rows excluded due to zero contributions." },
                    ].map(({ label, value, color, bg, tip }) => (
                      <div key={label} className={`rounded-xl p-3 text-center border ${bg}`}>
                        <p className={`text-xl font-bold ${color}`}>{value}</p>
                        <p className="text-xs text-gray-500">{label}<Tooltip text={tip}><InfoIcon /></Tooltip></p>
                      </div>
                    ))}
                  </div>

                  {/* Contribution summary */}
                  <div className="rounded-xl bg-white border border-gray-100 p-4">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Contribution Summary</p>
                    <table className="w-full text-xs">
                      <tbody>
                        {[
                          ["EPF Wages",          sum("epfWages")],
                          ["EPS Wages",          sum("epsWages")],
                          ["EDLI Wages",         sum("edliWages")],
                          ["EPF Contribution",   sum("epfCont")],
                          ["EPS Contribution",   sum("epsCont")],
                          ["EPF–EPS Difference", sum("epfDiff")],
                          ["Admin Charges",      sum("adminCharge")],
                          ["EDLI Contribution",  sum("edliCharge")],
                        ].map(([label, val]) => (
                          <tr key={label} className="border-b border-gray-50 last:border-0">
                            <td className="py-1.5 text-gray-500">{label}</td>
                            <td className="py-1.5 text-right font-medium text-gray-800 tabular-nums">{fmt(val)}</td>
                          </tr>
                        ))}
                        <tr className="border-t-2 border-gray-200">
                          <td className="pt-2.5 pb-1 font-bold text-gray-900">Total Payable by Company</td>
                          <td className="pt-2.5 pb-1 text-right font-extrabold text-violet-700 tabular-nums text-sm">{fmt(sum("epfCont") + sum("epsCont") + sum("epfDiff") + sum("adminCharge") + sum("edliCharge"))}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Observations */}
                  {hasObs && (
                    <div className="border border-amber-200 rounded-xl bg-amber-50/60 p-3">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold text-amber-700">
                          Observations ({result.obsData.length})
                          <Tooltip text="Flags rows with duplicate UAN/name, invalid UAN, wage mismatches, zero contributions, EPS cap adjustments, and NCP/Refund zeroes.">
                            <InfoIcon />
                          </Tooltip>
                        </p>
                        <div className="flex gap-2 items-center">
                          <button onClick={() => buildObsTxt(result.obsData, month || "Month", year || "Year")} className="text-xs text-amber-600 hover:underline">⬇ .txt</button>
                          <button onClick={() => setObsVisible(!obsVisible)} className="text-xs text-amber-600 hover:underline">
                            {obsVisible ? "Hide" : "Preview"}
                          </button>
                        </div>
                      </div>

                      {obsVisible && (
                        <>
                          <div className="flex flex-col gap-1.5 mb-2 max-h-48 overflow-y-auto">
                            {obsSlice.map((o, i) => (
                              <div
                                key={i}
                                className={`flex items-start gap-2 px-3 py-2 rounded-lg text-xs leading-relaxed ${o.type === "error" ? "bg-red-50 border border-red-100 text-red-800" : "bg-amber-50 border border-amber-100 text-amber-800"}`}
                              >
                                <span className="flex-shrink-0 mt-0.5">{o.type === "error" ? "❌" : "⚠️"}</span>
                                <span dangerouslySetInnerHTML={{ __html: o.text }} />
                              </div>
                            ))}
                          </div>

                          {totalObsPages > 1 && (
                            <div className="flex items-center justify-between mt-1">
                              <span className="text-xs text-gray-400">
                                {(obsPage - 1) * OBS_PER_PAGE + 1}–{Math.min(obsPage * OBS_PER_PAGE, result.obsData.length)} of {result.obsData.length}
                              </span>
                              <div className="flex gap-1">
                                <button onClick={() => setObsPage(p => Math.max(1, p - 1))} disabled={obsPage === 1} className="w-7 h-7 rounded-md border border-gray-200 text-xs text-gray-500 hover:bg-gray-50 disabled:opacity-40">‹</button>
                                {Array.from({ length: totalObsPages }, (_, i) => i + 1)
                                  .filter(p => p === 1 || p === totalObsPages || Math.abs(p - obsPage) <= 1)
                                  .reduce((acc, p, idx, arr) => { if (idx > 0 && p - arr[idx - 1] > 1) acc.push("…"); acc.push(p); return acc; }, [])
                                  .map((p, i) =>
                                    p === "…"
                                      ? <span key={`e${i}`} className="w-7 h-7 flex items-center justify-center text-xs text-gray-400">…</span>
                                      : <button key={p} onClick={() => setObsPage(p)} className={`w-7 h-7 rounded-md border text-xs transition-colors ${p === obsPage ? "bg-violet-600 border-violet-600 text-white" : "border-gray-200 text-gray-500 hover:bg-gray-50"}`}>{p}</button>
                                  )}
                                <button onClick={() => setObsPage(p => Math.min(totalObsPages, p + 1))} disabled={obsPage === totalObsPages} className="w-7 h-7 rounded-md border border-gray-200 text-xs text-gray-500 hover:bg-gray-50 disabled:opacity-40">›</button>
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
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={() => buildExcelOutput(result.ecrData, result.obsData, month || "Month", year || "Year")}
                    className="px-8 py-3 rounded-xl font-semibold text-sm text-white transition-all active:scale-95"
                    style={{ background: "linear-gradient(135deg,#059669 0%,#10B981 100%)" }}
                  >
                    ⬇ Download .xlsx
                  </button>
                  <button
                    onClick={() => buildTxtOutput(result.ecrData, month || "Month", year || "Year")}
                    className="px-8 py-3 rounded-xl font-semibold text-sm text-white transition-all active:scale-95"
                    style={{ background: "linear-gradient(135deg,#6D28D9 0%,#7C3AED 100%)" }}
                  >
                    ⬇ Download .txt
                  </button>
                </div>
                <button
                  onClick={() => { setFileState(null); setResult(null); setObsPage(1); setObsVisible(false); }}
                  className="text-xs text-gray-400 hover:text-violet-600 transition-colors"
                >
                  ↺ Process another file
                </button>
              </div>

            </div>
          )}

          {/* ── Feature pills ── */}
          <div className="flex flex-wrap justify-center gap-4 mt-6 text-xs text-gray-500">
            {[
              { label: "EPFO-compliant format",   tip: "Output matches the official ECR #~# delimited format accepted by the EPFO unified portal." },
              { label: "Duplicate UAN guard",      tip: "Detects and flags duplicate UANs, names, or UAN+Name combos before generating the ECR." },
              { label: "EPS wage auto-cap",        tip: "EPS wages are automatically capped at ₹15,000 as per EPFO rules." },
              { label: "100% browser processing",  tip: "All processing happens in your browser. No data sent to any server." },
            ].map(({ label, tip }) => (
              <span key={label} className="flex items-center gap-1">
                <span className="text-violet-500">●</span> {label}
                <Tooltip text={tip}><InfoIcon /></Tooltip>
              </span>
            ))}
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
}