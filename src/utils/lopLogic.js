/**
 * LOP Splitter – Core Processing Logic
 * Ported from Excel Macro Module4 (VBA → JavaScript)
 * File: src/utils/lopLogic.js
 */

/**
 * Parse a date from various formats (Excel serial, JS Date, string)
 */
export function parseDate(value) {
  if (!value && value !== 0) return null;
  if (value instanceof Date) return new Date(value);
  // Excel serial number
  if (typeof value === "number") {
    const utc = new Date(Date.UTC(1899, 11, 30) + value * 86400000);
    return utc;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    const dmY = /^([0-3]?\d)\/([0-1]?\d)\/([0-9]{4})$/;
    const match = trimmed.match(dmY);
    if (match) {
      const day = Number(match[1]);
      const month = Number(match[2]) - 1;
      const year = Number(match[3]);
      const date = new Date(year, month, day);
      if (
        date.getFullYear() === year &&
        date.getMonth() === month &&
        date.getDate() === day
      ) {
        return date;
      }
    }
    const d = new Date(trimmed);
    return isNaN(d) ? null : d;
  }
  return null;
}

/**
 * Return the last day of the month for a given date
 */
export function monthEnd(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

/**
 * Format a Date as DD/MM/YYYY string
 */
export function formatDate(date) {
  if (!date) return "";
  const d = String(date.getDate()).padStart(2, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

/**
 * Compare two dates by value only (ignores time)
 */
export function minDate(...dates) {
  const valid = dates.filter(Boolean);
  return valid.reduce((a, b) => (a <= b ? a : b));
}

export function maxDate(...dates) {
  const valid = dates.filter(Boolean);
  return valid.reduce((a, b) => (a >= b ? a : b));
}

/**
 * Add days to a date
 */
export function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

/**
 * Process a single input row — returns export rows + observation entry
 * @param {Object} row - { employeeId, doj, dol, startDate, days }
 * @param {number} rowIndex - 1-based row index for observations
 * @returns {{ exportRows: Array, observation: Object|null }}
 */
export function processRow(row, rowIndex) {
  const exportRows = [];
  let observation = null;

  const empId = String(row.employeeId ?? "").trim();
  const totalDays = parseFloat(row.days);
  const inputStart = parseDate(row.startDate);
  const doj = parseDate(row.doj);
  const dol = parseDate(row.dol) || null;

  // ── Validation ──────────────────────────────────────────────────────────────
  const errors = [];
  if (!empId) errors.push("Employee ID is missing");
  if (!inputStart || isNaN(inputStart)) errors.push("Start Date is invalid");
  if (!doj || isNaN(doj)) errors.push("DOJ is invalid");
  if (isNaN(totalDays) || totalDays <= 0) errors.push("Days must be a positive number");
  if (dol && dol < doj) errors.push("DOL is before DOJ");

  if (errors.length) {
    return {
      exportRows: [],
      observation: {
        rowIndex,
        employeeId: empId || "(blank)",
        remark: "VALIDATION ERROR: " + errors.join("; "),
        flagColor: "red",
      },
    };
  }

  // ── Step 1: Adjust start date if before DOJ ──────────────────────────────────
  let remarks = [];
  let flagColor = null;

  let allowedStart = inputStart;
  if (inputStart < doj) {
    allowedStart = doj;
    remarks.push(`Start date adjusted from ${formatDate(inputStart)} to DOJ ${formatDate(doj)}`);
    flagColor = "yellow";
  }

  // ── Step 2: Cap at month-end of allowedStart ──────────────────────────────────
  const mEnd = monthEnd(allowedStart);

  // ── Step 3: Cap at DOL if present ────────────────────────────────────────────
  const caps = [mEnd];
  if (dol) caps.push(dol);
  const finalEnd = minDate(...caps);

  // ── Step 4: Calculate allowed days (inclusive) ────────────────────────────────
  const diffMs = finalEnd - allowedStart;
  const diffDays = Math.round(diffMs / 86400000) + 1; // inclusive
  let allowedDays = Math.max(0, Math.min(totalDays, diffDays));
  allowedDays = Math.round(allowedDays * 100) / 100;

  const excessDays = Math.round((totalDays - allowedDays) * 100) / 100;

  if (excessDays > 0) {
    remarks.push(`Excess days: ${excessDays} (input ${totalDays}, allowed ${allowedDays})`);
    flagColor = flagColor || "red";
  }

  if (dol && finalEnd.getTime() === dol.getTime()) {
    remarks.push(`End date capped at DOL ${formatDate(dol)}`);
  }

  // ── Step 5: Generate one export row per day ────────────────────────────────────
  let remaining = allowedDays;
  let cursor = new Date(allowedStart);

  while (remaining > 0) {
    const dayValue = remaining >= 1 ? 1 : Math.round(remaining * 100) / 100;
    exportRows.push({
      employeeId: empId,
      startDate: new Date(cursor),
      endDate: new Date(cursor),
      days: dayValue,
    });
    cursor = addDays(cursor, 1);
    remaining = Math.round((remaining - dayValue) * 100) / 100;
  }

  // ── Step 6: Build observation if needed ───────────────────────────────────────
  if (remarks.length > 0) {
    observation = {
      rowIndex,
      employeeId: empId,
      inputStartDate: new Date(inputStart),
      adjustedStartDate: new Date(allowedStart),
      inputDays: totalDays,
      allowedDays,
      excessDays,
      remark: remarks.join(" | "),
      flagColor,
    };
  }

  return { exportRows, observation };
}

/**
 * Process all rows from the uploaded sheet
 * @param {Array} rows - array of raw row objects
 * @returns {{ exportRows, observations, summary }}
 */
export function processAll(rows) {
  const allExport = [];
  const allObs = [];
  let skipped = 0;

  rows.forEach((row, i) => {
    const { exportRows, observation } = processRow(row, i + 2); // row 1 is header
    allExport.push(...exportRows);
    if (observation) allObs.push(observation);
    if (exportRows.length === 0) skipped++;
  });

  return {
    exportRows: allExport,
    observations: allObs,
    summary: {
      totalInput: rows.length,
      skipped,
      totalOutputRows: allExport.length,
      totalObservations: allObs.length,
    },
  };
}
