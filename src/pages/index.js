import { useState, useRef, useCallback } from "react";
import ReactDOM from "react-dom";
import * as XLSX from "xlsx";
import Head from "next/head";

// ─── DATE UTILITIES ───────────────────────────────────────────────────────────

function parseExcelDate(value) {
  if (!value && value !== 0) return null;
  if (value instanceof Date)
    return new Date(Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()));
  if (typeof value === "number") {
    const base = new Date(Date.UTC(1899, 11, 30));
    base.setUTCDate(base.getUTCDate() + value);
    return base;
  }
  const d = new Date(value);
  if (isNaN(d)) return null;
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

function monthEnd(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0));
}

function addDays(date, n) {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + n);
  return d;
}

function excelSerial(date) {
  return Math.round((date - new Date(Date.UTC(1899, 11, 30))) / 86400000);
}

/** Format a Date as "DD-MM-YYYY" string — used as dictionary keys (mirrors VBA dateKey) */
function dateKey(empID, date) {
  const dd = String(date.getUTCDate()).padStart(2, "0");
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const yyyy = date.getUTCFullYear();
  return `${empID}|${dd}-${mm}-${yyyy}`;
}

// ─── CORE PROCESSING (Full VBA port — Module4) ───────────────────────────────
/**
 * Two-pass processing matching the VBA macro exactly:
 *
 * Pass 1 — Collect all explicit Start Dates across all rows (priorityDates).
 * Pass 2 — For each row, iterate day-by-day:
 *   • Skip days beyond monthEnd
 *   • Skip days beyond DOL
 *   • Stop early if the current date matches another row's explicit Start Date
 *     (priority start date check — carries remaining days to excess)
 *   • Skip duplicate dates via usedDates dictionary
 *   • Apply same logic to the decimal day
 */
function processLOP(rows) {
  const exportRows = [];
  const obsRows    = [];
  const errors     = [];
  const inputFlags = {};

  // ── PASS 1: collect all explicit start dates ────────────────────────────────
  const priorityDates = new Set(); // Set<"empID|DD-MM-YYYY">

  for (let idx = 0; idx < rows.length; idx++) {
    const raw = rows[idx];
    const empID = raw["Employee ID"] !== undefined && raw["Employee ID"] !== ""
      ? String(raw["Employee ID"]).trim()
      : "";
    const startDate = parseExcelDate(raw["Start Date"]);
    if (empID && startDate) {
      priorityDates.add(dateKey(empID, startDate));
    }
  }

  // ── PASS 2: main processing ─────────────────────────────────────────────────
  const usedDates = new Map(); // Map<"empID|DD-MM-YYYY", number> — stores days already written

  for (let idx = 0; idx < rows.length; idx++) {
    const raw    = rows[idx];
    const rowNum = idx + 2;

    // ── blank row check ──────────────────────────────────────────────────────
    const hasAllowedData =
      (raw["Employee ID"] !== "" && raw["Employee ID"] !== undefined && raw["Employee ID"] !== null) ||
      (raw["DOJ"]         !== "" && raw["DOJ"]         !== undefined && raw["DOJ"]         !== null) ||
      (raw["Start Date"]  !== "" && raw["Start Date"]  !== undefined && raw["Start Date"]  !== null);

    const hasExtra = Array.isArray(raw.__extra) &&
      raw.__extra.some(v => v !== "" && v !== null && v !== undefined);

    if (!hasAllowedData && !hasExtra) continue;

    if (hasExtra) {
      errors.push(
        `Row ${rowNum}: Data found outside allowed columns (A–E). Please use only the official template.`
      );
      continue;
    }

    // ── field extraction ─────────────────────────────────────────────────────
    const empID = raw["Employee ID"] !== undefined && raw["Employee ID"] !== ""
      ? String(raw["Employee ID"]).trim()
      : "";

    if (!empID) {
      errors.push(`Row ${rowNum}: Employee ID is missing.`);
      continue;
    }

    const doj       = parseExcelDate(raw["DOJ"]) || null;
    const dol       = parseExcelDate(raw["DOL"]) || null;
    const startDate = parseExcelDate(raw["Start Date"]);
    const totalDays = raw["Days"] !== undefined && raw["Days"] !== ""
      ? Number(raw["Days"])
      : null;

    // ── validation ───────────────────────────────────────────────────────────
    if (!startDate) {
      errors.push(`Row ${rowNum}: Start Date is missing or invalid.`);
      obsRows.push({
        "Employee ID": empID, "DOJ": "", "DOL": "", "Start Date": "",
        "Total Days": "", "Allowed Days": "", "Excess Days": "",
        "Remarks": "Invalid Start Date.",
      });
      continue;
    }

    if (totalDays === null || isNaN(totalDays) || totalDays <= 0) {
      errors.push(`Row ${rowNum}: Days must be a number greater than 0.`);
      continue;
    }

    const decimal = totalDays - Math.floor(totalDays);
    if (decimal !== 0 && Math.abs(decimal - 0.5) > 0.001) {
      errors.push(`Row ${rowNum}: Only 0.5 decimal increments are allowed in Days.`);
      continue;
    }

    // ── DOJ adjustment (mirrors VBA Step 1) ─────────────────────────────────
    let remarks     = "";
    let flagColor   = null;
    let actualStart = startDate;

    if (doj && startDate < doj) {
      actualStart = doj;
      remarks    += "Start adjusted to DOJ. ";
      flagColor   = "yellow";
    }

    const mEnd      = monthEnd(actualStart);
    const fullDays  = Math.floor(totalDays);
    const remaining = Math.round((totalDays - fullDays) * 100) / 100;

    let allowedDays = 0;
    let excessDays  = 0;
    let earlyExit   = false; // set when a priority date terminates full-day loop early

    // ── FULL DAY LOOP (mirrors VBA For j = 0 To fullDays-1) ─────────────────
    for (let j = 0; j < fullDays; j++) {
      const currentDate = addDays(actualStart, j);

      // Month-end restriction
      if (currentDate > mEnd) {
        excessDays += 1;
        if (!remarks.includes("Restricted to month end"))
          remarks += "Restricted to month end. ";
        continue; // skip this day (mirrors VBA GoTo SkipFullDay)
      }

      // DOL restriction
      if (dol && currentDate > dol) {
        excessDays += 1;
        if (!remarks.includes("Restricted due to DOL"))
          remarks += "Restricted due to DOL. ";
        continue;
      }

      // Priority start date check — only for dates AFTER the actualStart
      // (mirrors VBA: If currentDate <> actualStart Then)
      if (currentDate.getTime() !== actualStart.getTime()) {
        const dk = dateKey(empID, currentDate);
        if (priorityDates.has(dk)) {
          // Carry all remaining days (current + future full + decimal) to excess
          const remainingFullDays = fullDays - j;
          excessDays += remainingFullDays + remaining;
          excessDays  = Math.round(excessDays * 100) / 100;
          remarks    += "Restricted due to another transaction start date. ";
          earlyExit   = true;
          break; // mirrors VBA: Exit For
        }
      }

      // Duplicate date prevention
      const dk = dateKey(empID, currentDate);
      if (usedDates.has(dk)) {
        excessDays += 1;
        if (!remarks.includes("Duplicate overlap"))
          remarks += "Duplicate overlap restricted. ";
      } else {
        usedDates.set(dk, 1);
        exportRows.push({
          "Employee ID": empID,
          "Start Date":  excelSerial(currentDate),
          "End Date":    excelSerial(currentDate),
          "Days": 1,
        });
        allowedDays += 1;
      }
    } // end full day loop

    // ── DECIMAL DAY (mirrors VBA decimal section) ────────────────────────────
    if (remaining > 0 && !earlyExit) {
      const decDate = addDays(actualStart, fullDays);

      if (decDate > mEnd) {
        excessDays += remaining;
        if (!remarks.includes("Restricted to month end"))
          remarks += "Restricted to month end. ";
      } else if (dol && decDate > dol) {
        excessDays += remaining;
        if (!remarks.includes("Restricted due to DOL"))
          remarks += "Restricted due to DOL. ";
      } else {
        // Priority start date check for decimal day
        if (decDate.getTime() !== actualStart.getTime()) {
          const dk = dateKey(empID, decDate);
          if (priorityDates.has(dk)) {
            excessDays += remaining;
            remarks    += "Restricted due to another transaction start date. ";
          } else {
            // Duplicate prevention for decimal day
            const ddk = dateKey(empID, decDate);
            if (usedDates.has(ddk)) {
              excessDays += remaining;
              if (!remarks.includes("Decimal overlap"))
                remarks += "Decimal overlap restricted. ";
            } else {
              usedDates.set(ddk, remaining);
              exportRows.push({
                "Employee ID": empID,
                "Start Date":  excelSerial(decDate),
                "End Date":    excelSerial(decDate),
                "Days": remaining,
              });
              allowedDays += remaining;
            }
          }
        } else {
          // decDate === actualStart (single-day entry with decimal only)
          const ddk = dateKey(empID, decDate);
          if (usedDates.has(ddk)) {
            excessDays += remaining;
            remarks    += "Decimal overlap restricted. ";
          } else {
            usedDates.set(ddk, remaining);
            exportRows.push({
              "Employee ID": empID,
              "Start Date":  excelSerial(decDate),
              "End Date":    excelSerial(decDate),
              "Days": remaining,
            });
            allowedDays += remaining;
          }
        }
      }
    }

    // ── Final excess recalculation (mirrors VBA: excessDays = Round(totalDays - allowedDays, 2)) ─
    allowedDays = Math.round(allowedDays * 100) / 100;
    excessDays  = Math.round((totalDays - allowedDays) * 100) / 100;

    // ── Input flag colour (mirrors VBA RGB colouring) ────────────────────────
    if (excessDays > 0) flagColor = "red";
    if (flagColor) inputFlags[idx] = { color: flagColor };

    // ── Observations (mirrors VBA: If excessDays > 0 Or remarks <> "") ──────
    if (excessDays > 0 || remarks !== "") {
      obsRows.push({
        "Employee ID": empID,
        "DOJ":         doj ? excelSerial(doj) : "",
        "DOL":         dol ? excelSerial(dol) : "",
        "Start Date":  excelSerial(startDate),
        "Total Days":  totalDays,
        "Allowed Days": allowedDays,
        "Excess Days": excessDays,
        "Remarks":     remarks.trim(),
      });
    }
  } // end row loop

  return { exportRows, obsRows, inputFlags, errors };
}

// ─── WORKBOOK BUILDER ─────────────────────────────────────────────────────────
function buildWorkbook(exportRows, obsRows) {
  const wb         = XLSX.utils.book_new();
  const dateFormat = "DD-MM-YYYY";

  // Export sheet
  const exportHeader = [["Employee ID", "Start Date", "End Date", "Days"]];
  const exportData   = exportRows.map(r => [r["Employee ID"], r["Start Date"], r["End Date"], r["Days"]]);
  const wsExport     = XLSX.utils.aoa_to_sheet([...exportHeader, ...exportData]);

  const range = XLSX.utils.decode_range(wsExport["!ref"]);
  for (let R = 1; R <= range.e.r; R++) {
    ["B", "C"].forEach(col => {
      const cell = wsExport[`${col}${R + 1}`];
      if (cell) cell.z = dateFormat;
    });
    const cellA = wsExport[`A${R + 1}`];
    if (cellA) { cellA.t = "s"; cellA.v = String(cellA.v); }
  }
  wsExport["!cols"] = [{ wch: 15 }, { wch: 14 }, { wch: 14 }, { wch: 8 }];
  XLSX.utils.book_append_sheet(wb, wsExport, "Export");

  // Observations sheet
  const obsHeader = [["Employee ID", "DOJ", "DOL", "Start Date", "Total Days", "Allowed Days", "Excess Days", "Remarks"]];
  const obsData   = obsRows.map(r => [
    r["Employee ID"], r["DOJ"], r["DOL"], r["Start Date"],
    r["Total Days"], r["Allowed Days"], r["Excess Days"], r["Remarks"],
  ]);
  const wsObs = XLSX.utils.aoa_to_sheet([...obsHeader, ...obsData]);
  wsObs["!cols"] = [
    { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
    { wch: 11 }, { wch: 13 }, { wch: 11 }, { wch: 50 },
  ];
  const obsRange = XLSX.utils.decode_range(wsObs["!ref"] || "A1");
  for (let R = 1; R <= obsRange.e.r; R++) {
    ["B", "C", "D"].forEach(col => {
      const cell = wsObs[`${col}${R + 1}`];
      if (cell && typeof cell.v === "number") cell.z = dateFormat;
    });
  }
  XLSX.utils.book_append_sheet(wb, wsObs, "Observations");
  return wb;
}

// ─── TEMPLATE BUILDER ────────────────────────────────────────────────────────
function buildTemplateWorkbook() {
  const wb = XLSX.utils.book_new();

  const header = [["Employee ID", "DOJ", "DOL", "Start Date", "Days"]];
  const ws     = XLSX.utils.aoa_to_sheet(header);
  ws["!cols"]  = [{ wch: 18 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 8 }];
  XLSX.utils.book_append_sheet(wb, ws, "Uploader");

  // Hidden validation token — treated as a trade secret
  const tokenSheet = XLSX.utils.aoa_to_sheet([["PAYROLLTOOLS_V1_SECURE"]]);
  XLSX.utils.book_append_sheet(wb, tokenSheet, "__lop_token__");

  wb.Workbook = {
    Sheets: [
      { name: "Uploader",      Hidden: 0 },
      { name: "__lop_token__", Hidden: 1 },
    ],
  };
  return wb;
}

// ─── TOOLTIP ─────────────────────────────────────────────────────────────────
function Tooltip({ text, children, position = "top" }) {
  const [show, setShow]           = useState(false);
  const [tooltipPos, setTooltipPos] = useState({ left: 0, top: 0 });
  const wrapperRef                = useRef(null);
  const tooltipWidth              = 220;

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
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" className="inline ml-1 text-violet-400 cursor-help">
      <circle cx="7.5" cy="7.5" r="6.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M7.5 6.5v4M7.5 5v-.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

// ─── ABOUT MODAL ─────────────────────────────────────────────────────────────
function AboutModal({ onClose }) {
  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center p-4"
      style={{ background: "rgba(30,27,75,0.55)", backdropFilter: "blur(2px)", animation: "fadeIn 0.25s ease" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <style>{`
        @keyframes fadeIn  { from { opacity:0 } to { opacity:1 } }
        @keyframes slideUp { from { transform:translateY(40px);opacity:0 } to { transform:translateY(0);opacity:1 } }
        .about-modal::-webkit-scrollbar       { width: 6px; }
        .about-modal::-webkit-scrollbar-track { background: transparent; }
        .about-modal::-webkit-scrollbar-thumb { background: #A78BFA; border-radius: 999px; }
        .about-modal::-webkit-scrollbar-thumb:hover { background: #8B5CF6; }
      `}</style>

      <div
        className="about-modal bg-white rounded-[32px] w-full max-w-3xl max-h-[92vh] overflow-y-auto shadow-2xl border border-purple-100 relative"
        style={{ animation: "slideUp 0.3s ease" }}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-purple-100 text-purple-600 hover:bg-purple-600 hover:text-white transition-all flex items-center justify-center text-sm font-bold"
        >
          ×
        </button>

        {/* Header */}
        <div
          className="rounded-t-[32px] px-10 py-9 relative overflow-hidden"
          style={{ background: "linear-gradient(135deg, #5B21B6 0%, #7C3AED 60%, #8B5CF6 100%)" }}
        >
          <div className="absolute top-[-60px] right-[-60px] w-48 h-48 rounded-full" style={{ background: "rgba(255,255,255,0.07)" }} />
          <div className="absolute bottom-[-40px] left-[-40px] w-36 h-36 rounded-full" style={{ background: "rgba(255,255,255,0.05)" }} />
          <div className="flex items-center gap-3 mb-4 relative z-10">
            <div className="w-12 h-12 rounded-full flex items-center justify-center border-2 border-white/40" style={{ background: "rgba(255,255,255,0.2)" }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
                <path d="M12 21.593c-5.63-5.539-11-10.297-11-14.402 0-3.791 3.068-5.191 5.281-5.191 1.312 0 4.151.501 5.719 4.457 1.59-3.968 4.464-4.447 5.726-4.447 2.54 0 5.274 1.621 5.274 5.181 0 4.069-5.136 8.625-11 14.402z" />
              </svg>
            </div>
            <span className="text-white font-extrabold text-2xl tracking-tight">PayrollTool</span>
          </div>
          <p className="text-white/85 text-base leading-relaxed relative z-10 max-w-md">
            Built for the people who make payroll happen.
          </p>
        </div>

        {/* Body */}
        <div className="px-10 py-8 flex flex-col gap-8">
          {[
            {
              icon: "💡", title: "Why We're Here",
              content: [
                "Every month, payroll and HR professionals spend hours doing repetitive, error-prone calculations in Excel — splitting LOP dates, computing proration, calculating notice recoveries and final settlements. These aren't complex problems. They just need the right tool.",
                "PayrollTool was built to solve exactly that — turning what used to be a 30-minute spreadsheet exercise into a 30-second task.",
              ],
            },
            {
              icon: "🎯", title: "Our Purpose",
              content: ["We are here to help payroll and HR teams skip the manual hurdles and be more effective and efficient in their day-to-day work. No macros. No complex formulas. No errors. Just upload, process, and download."],
            },
          ].map(({ icon, title, content }) => (
            <div key={title} className="flex gap-4 items-start">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0 border border-purple-100" style={{ background: "#F5F3FF" }}>{icon}</div>
              <div>
                <h3 className="font-bold text-gray-900 mb-2">{title}</h3>
                {content.map((p, i) => <p key={i} className="text-sm text-gray-500 leading-relaxed mt-1">{p}</p>)}
              </div>
            </div>
          ))}

          {/* Who It's For */}
          <div className="flex gap-4 items-start">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0 border border-purple-100" style={{ background: "#F5F3FF" }}>👥</div>
            <div>
              <h3 className="font-bold text-gray-900 mb-3">Who It&apos;s For</h3>
              <div className="flex flex-wrap gap-2">
                {["Payroll Executives", "HR Operations", "People Managers", "Finance Teams", "HR Shared Services", "Payroll Consultants"].map(tag => (
                  <span key={tag} className="text-xs font-semibold px-3 py-1.5 rounded-full border border-purple-200 text-purple-700" style={{ background: "#EDE9FE" }}>{tag}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Roadmap */}
          <div className="flex gap-4 items-start">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0 border border-purple-100" style={{ background: "#F5F3FF" }}>🚀</div>
            <div className="flex-1">
              <h3 className="font-bold text-gray-900 mb-1">What&apos;s Coming Next</h3>
              <p className="text-sm text-gray-400 mb-3">PayrollTool is growing. Here&apos;s what we&apos;re building for you:</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { name: "LOP Splitter",                  desc: "Split Loss of Pay dates into daily rows",   live: true  },
                  { name: "Salary Proration Calculator",   desc: "Calculate pay for partial months",          live: false },
                  { name: "Final Settlement Calculator",   desc: "Full and final settlement computation",     live: false },
                  { name: "Notice Period Recovery",        desc: "Short notice recovery calculations",        live: false },
                  { name: "Leave Encashment Calculator",   desc: "Encash earned/PL leaves accurately",        live: false },
                  { name: "More Payroll Tools",            desc: "Arrears, reimbursements & more",            live: false },
                ].map(tool => (
                  <div key={tool.name} className={`rounded-xl p-3 border ${tool.live ? "border-purple-200 bg-purple-50" : "border-gray-100 bg-gray-50/80"}`}>
                    <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${tool.live ? "text-green-600" : "text-gray-400"}`}>
                      {tool.live ? "● LIVE" : "○ Coming Soon"}
                    </p>
                    <p className="text-xs font-bold text-gray-800 leading-snug">{tool.name}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5 leading-snug">{tool.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Promise */}
          <div className="flex gap-4 items-start rounded-2xl p-4 border border-purple-100" style={{ background: "linear-gradient(135deg, #F5F3FF 0%, #F0ECFF 100%)" }}>
            <span className="text-2xl flex-shrink-0 mt-0.5">🔒</span>
            <div>
              <p className="text-sm font-bold text-purple-800 mb-1">Our Promise</p>
              <p className="text-sm text-gray-500 leading-relaxed">All processing happens in your browser. No data is sent to any server. Your payroll data stays private, always.</p>
            </div>
          </div>
        </div>

        <div className="px-10 py-5 border-t border-gray-100 flex items-center justify-center rounded-b-[32px] bg-white">
          <span className="text-xs text-gray-400">© PayrollTool 2026 — Your Payroll Helper</span>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function Home() {
  const [file,       setFile]       = useState(null);
  const [dragOver,   setDragOver]   = useState(false);
  const [processing, setProcessing] = useState(false);
  const [result,     setResult]     = useState(null);
  const [obsVisible, setObsVisible] = useState(false);
  const [aboutOpen,  setAboutOpen]  = useState(false);
  const fileInputRef                = useRef(null);

  function validateFile(f) {
    if (!f) return false;
    const ext = f.name.split(".").pop().toLowerCase();
    return ext === "xlsx" || ext === "xls";
  }

  function handleFile(f) {
    if (!validateFile(f)) { alert("Only .xlsx or .xls files are accepted."); return; }
    setFile(f);
    setResult(null);
  }

  const onDragOver  = (e) => { e.preventDefault(); setDragOver(true); };
  const onDragLeave = ()  => setDragOver(false);
  const onDrop      = (e) => {
    e.preventDefault();
    setDragOver(false);
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
      const wb_in  = XLSX.read(buffer, { type: "array", cellDates: false });

      // Token validation
      const tokenSheet = wb_in.Sheets?.["__lop_token__"];
      const tokenCell  = tokenSheet?.["A1"];
      if (!tokenSheet || !tokenCell || tokenCell.v !== "PAYROLLTOOLS_V1_SECURE") {
        alert("This file was not generated from PayrollTools. Please download the official template from the portal.");
        setProcessing(false);
        return;
      }

      const ws      = wb_in.Sheets[wb_in.SheetNames[0]];
      const aoa     = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "", blankrows: true });
      const dataRows = aoa.slice(1);
      const rows    = dataRows.map(rowArr => ({
        "Employee ID": rowArr[0] ?? "",
        "DOJ":         rowArr[1] ?? "",
        "DOL":         rowArr[2] ?? "",
        "Start Date":  rowArr[3] ?? "",
        "Days":        rowArr[4] ?? "",
        __extra:       rowArr.slice(5) || [],
      }));

      const { exportRows, obsRows, errors } = processLOP(rows);
      const wb_out = buildWorkbook(exportRows, obsRows);
      setResult({ exportRows, obsRows, errors, wb: wb_out });
    } catch (err) {
      alert("Error reading file: " + err.message);
    }
    setProcessing(false);
  }

  function downloadExport() {
    if (!result?.wb) return;
    const wb2 = XLSX.utils.book_new();
    const ws  = result.wb.Sheets["Export"];
    if (!ws) return;
    XLSX.utils.book_append_sheet(wb2, ws, "Export");
    XLSX.writeFile(wb2, "LOP_Export.xlsx");
  }

  function downloadObs() {
    if (!result?.wb) return;
    const wb2 = XLSX.utils.book_new();
    const ws  = result.wb.Sheets["Observations"];
    XLSX.utils.book_append_sheet(wb2, ws, "Observations");
    XLSX.writeFile(wb2, "LOP_Observations.xlsx");
  }

  const handleDownloadTemplate = (e) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    setTimeout(() => {
      const wb = buildTemplateWorkbook();
      XLSX.writeFile(wb, "LOP_Uploader_Template.xlsx");
    }, 0);
  };

  const hasResult = !!result;
  const hasErrors = result?.errors?.length > 0;
  const hasObs    = result?.obsRows?.length > 0;

  return (
    <>
      <Head>
        <title>LOP Splitter for Payroll &amp; HRMS Uploads | PayrollTool</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content="Free LOP Splitter tool for payroll and HR teams. Upload Excel sheets and instantly generate HRMS-ready LOP rows securely in your browser." />
        <meta name="keywords" content="LOP splitter, payroll tool, HRMS upload, salary proration, payroll automation, payroll excel utility, loss of pay calculator" />
        <meta name="robots" content="index, follow" />
        <meta property="og:title" content="PayrollTool – LOP Splitter" />
        <meta property="og:description" content="Upload payroll sheets and generate HRMS-ready LOP rows instantly." />
        <meta property="og:url" content="https://www.payrolltool.in/" />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="PayrollTool" />
        <meta property="og:image" content="https://www.payrolltool.in/preview.png" />
        <meta name="author" content="PayrollTool" />
        <link rel="canonical" href="https://www.payrolltool.in/" />
      </Head>

      <div className="min-h-screen flex flex-col" style={{ fontFamily: "'DM Sans', sans-serif", background: "#EEEAF8" }}>

        {aboutOpen && <AboutModal onClose={() => setAboutOpen(false)} />}

        {/* ── NAVBAR ── */}
        <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-violet-600 text-white shadow">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                  <path d="M12 21.593c-5.63-5.539-11-10.297-11-14.402 0-3.791 3.068-5.191 5.281-5.191 1.312 0 4.151.501 5.719 4.457 1.59-3.968 4.464-4.447 5.726-4.447 2.54 0 5.274 1.621 5.274 5.181 0 4.069-5.136 8.625-11 14.402z" />
                </svg>
              </div>
              <span className="text-lg font-extrabold text-violet-700 tracking-tight">PayrollTool</span>
            </div>

            <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
              <a href="#lop-top" className="px-4 py-2 rounded-lg text-violet-700 font-bold bg-violet-50">LOP Splitter</a>
              <span className="px-4 py-2 rounded-lg text-gray-300 cursor-not-allowed select-none" title="Coming Soon">Salary Proration</span>
              <span className="px-4 py-2 rounded-lg text-gray-300 cursor-not-allowed select-none" title="Coming Soon">Final Settlement</span>
              <span className="px-4 py-2 rounded-lg text-gray-300 cursor-not-allowed select-none" title="Coming Soon">More Tools ▾</span>
              <button onClick={() => setAboutOpen(true)} className="px-4 py-2 rounded-lg text-gray-600 hover:text-violet-700 hover:bg-violet-50 transition-colors">About</button>
            </nav>

            <div className="w-44" />
          </div>
        </header>

        {/* ── HERO ── */}
        <div id="lop-top" className="pt-6 pb-4 px-4 max-w-5xl mx-auto w-full scroll-mt-24">
          <div className="relative flex items-start justify-center">
            <div className="absolute right-0 top-0 flex items-center gap-2">
              <button type="button" onClick={handleDownloadTemplate}
                className="rounded-full border border-violet-200 bg-white px-4 py-2 text-xs font-semibold text-violet-700 hover:bg-violet-50 transition shadow-sm">
                ⬇ Generate Template
              </button>
              <Tooltip position="top" text="Download the official LOP Uploader template (.xlsx) — Employee ID, DOJ, DOL, Start Date, Days.">
                <InfoIcon />
              </Tooltip>
            </div>
            <div className="text-center">
              <h1 className="text-5xl font-bold tracking-tight text-gray-900">
                Split <span className="text-violet-500">LOP Dates</span>
              </h1>
              <p className="mt-3 text-sm text-gray-500 max-w-xs mx-auto leading-relaxed">
                Upload your payroll sheet and get individual LOP date rows — ready for HRMS import.
              </p>
            </div>
          </div>
        </div>

        {/* ── MAIN CARD ── */}
        <main className="flex-1 flex flex-col items-center justify-start px-4 pb-8">
          <div id="tools" className="w-full max-w-lg bg-white rounded-3xl shadow-xl p-8 mt-2">

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
                  <button onClick={() => { setFile(null); setResult(null); }} className="mt-2 text-xs text-gray-400 hover:text-red-500 transition-colors underline">Remove</button>
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
              Select LOP File
            </button>


            <p className="text-center text-xs text-gray-400 mt-3">
              Supports <span className="font-semibold text-gray-500">.XLSX</span> &amp; <span className="font-semibold text-gray-500">.XLS</span>
              <Tooltip text="Use the official LOP Uploader template. Columns: Employee ID, DOJ, DOL (optional), Start Date, Days.">
                <InfoIcon />
              </Tooltip>
            </p>

            {/* Process button */}
            {file && !hasResult && (
              <button
                onClick={handleProcess}
                disabled={processing}
                className="w-full mt-4 py-3 rounded-xl font-semibold text-sm text-white transition-all active:scale-95 disabled:opacity-60"
                style={{ background: "linear-gradient(135deg,#059669 0%,#10B981 100%)" }}
              >
                {processing ? "Processing…" : "⚡ Generate LOP Export"}
              </button>
            )}

            {/* Validation errors */}
            {hasErrors && (
              <div className="mt-4 rounded-xl bg-red-50 border border-red-200 p-4">
                <p className="text-xs font-bold text-red-600 mb-2">⚠ Validation Errors</p>
                {result.errors.map((e, i) => (
                  <p key={i} className="text-xs text-red-500">{e}</p>
                ))}
              </div>
            )}

            {/* Results */}
            {hasResult && !hasErrors && (
              <div className="mt-5 rounded-2xl border border-violet-100 bg-violet-50/50 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-green-500 text-lg">✓</span>
                  <span className="text-sm font-bold text-gray-800">Export Ready</span>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-4">
                  {[
                    { label: "Export Rows", value: result.exportRows.length, tip: "Total individual LOP day rows generated." },
                    { label: "Employees",   value: [...new Set(result.exportRows.map(r => r["Employee ID"]))].length, tip: "Unique Employee IDs processed." },
                    { label: "Obs Flags",   value: result.obsRows.length, tip: "Rows with DOJ adjustment, month cap, DOL cap, priority clash, or duplicate overlap.", warn: result.obsRows.length > 0 },
                  ].map(({ label, value, tip, warn }) => (
                    <div key={label} className={`rounded-xl p-3 text-center border ${warn && value > 0 ? "bg-amber-50 border-amber-200" : "bg-white border-gray-100"}`}>
                      <p className={`text-xl font-bold ${warn && value > 0 ? "text-amber-600" : "text-violet-700"}`}>{value}</p>
                      <p className="text-xs text-gray-500">{label}<Tooltip text={tip}><InfoIcon /></Tooltip></p>
                    </div>
                  ))}
                </div>

                <button
                  onClick={downloadExport}
                  className="w-full py-3 rounded-xl font-semibold text-sm text-white mb-2 transition-all active:scale-95"
                  style={{ background: "linear-gradient(135deg,#6D28D9 0%,#7C3AED 100%)" }}
                >
                  ⬇ Download Export (.xlsx)
                </button>

                {hasObs && (
                  <div className="border border-amber-200 rounded-xl bg-amber-50/60 p-3">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-semibold text-amber-700">
                        Observation Report
                        <Tooltip text="Flags rows with DOJ adjustment, month-end cap, DOL restriction, priority date clash, duplicate overlap, or excess days.">
                          <InfoIcon />
                        </Tooltip>
                      </p>
                      <button onClick={() => setObsVisible(!obsVisible)} className="text-xs text-amber-600 hover:underline">
                        {obsVisible ? "Hide preview" : "Preview"}
                      </button>
                    </div>
                    {obsVisible && (
                      <div className="overflow-x-auto text-xs mb-2 max-h-40 overflow-y-auto">
                        <table className="min-w-full border-collapse">
                          <thead>
                            <tr className="bg-amber-100">
                              {["Emp ID", "Total", "Allowed", "Excess", "Remarks"].map(h => (
                                <th key={h} className="px-2 py-1 text-left text-amber-800 font-semibold border-b border-amber-200">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {result.obsRows.map((r, i) => (
                              <tr key={i} className="border-b border-amber-100">
                                <td className="px-2 py-1 text-gray-700">{r["Employee ID"]}</td>
                                <td className="px-2 py-1 text-gray-700">{r["Total Days"]}</td>
                                <td className="px-2 py-1 text-gray-700">{r["Allowed Days"]}</td>
                                <td className="px-2 py-1 text-red-600 font-medium">{r["Excess Days"]}</td>
                                <td className="px-2 py-1 text-gray-600 max-w-xs truncate">{r["Remarks"]}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    <button
                      onClick={downloadObs}
                      className="w-full py-2.5 rounded-lg text-xs font-semibold text-amber-800 bg-amber-100 hover:bg-amber-200 transition-colors border border-amber-200"
                    >
                      ⬇ Download Observation Report (.xlsx)
                    </button>
                  </div>
                )}

                <button
                  onClick={() => { setFile(null); setResult(null); setObsVisible(false); }}
                  className="w-full mt-2 py-2 rounded-xl text-xs text-gray-400 hover:text-violet-600 transition-colors"
                >
                  ↺ Process another file
                </button>
              </div>
            )}
          </div>

          {/* Coming Soon */}
          <section id="coming-soon" className="w-full max-w-lg mt-6 rounded-3xl border border-dashed border-violet-200 bg-white/90 p-6">
            <h2 className="text-base font-bold text-violet-700 mb-1">More Tools Coming Soon</h2>
            <p className="text-xs text-gray-400 mb-4">PayrollTool is growing. Here&apos;s what&apos;s next for HR and payroll teams.</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { name: "Salary Proration Calculator", desc: "Calculate pay for partial months" },
                { name: "Final Settlement Calculator", desc: "Full and final settlement computation" },
                { name: "Notice Period Recovery",      desc: "Short notice recovery calculations" },
                { name: "Leave Encashment Calculator", desc: "Encash earned/PL leaves accurately" },
              ].map(tool => (
                <div key={tool.name} className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                  <p className="text-[10px] font-bold text-amber-500 uppercase tracking-wider mb-1">Coming Soon</p>
                  <p className="text-xs font-bold text-gray-700 leading-snug">{tool.name}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">{tool.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Feature pills */}
          <div className="flex flex-wrap justify-center gap-4 mt-6 text-xs text-gray-500">
            {[
              { label: "Split by date range",      tip: "Each LOP day becomes its own row with Start Date = End Date." },
              { label: "Priority date protection", tip: "If another row's start date falls mid-range, that row takes priority and excess is logged." },
              { label: "Duplicate overlap guard",  tip: "Same date cannot be written twice for the same employee across all rows." },
              { label: "100% secure processing",   tip: "All processing happens in your browser. No data sent to any server." },
            ].map(({ label, tip }) => (
              <span key={label} className="flex items-center gap-1">
                <span className="text-violet-500">●</span> {label}
                <Tooltip text={tip}><InfoIcon /></Tooltip>
              </span>
            ))}
          </div>
        </main>

        <footer className="text-center text-xs text-gray-400 py-4 border-t border-white/40">
          © PayrollTool 2026 — Your Payroll Helper
        </footer>
      </div>
    </>
  );
}
