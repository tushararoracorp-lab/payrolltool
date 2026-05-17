/**
 * lopProcessor.js
 * Core LOP splitting logic — ported from VBA Module4.
 * No weekend / holiday exclusion. All calendar days count.
 */

/**
 * Parse an Excel serial date number or a date string into a JS Date (UTC midnight).
 */
export function parseExcelDate(value) {
  if (!value && value !== 0) return null;
  // Already a JS Date
  if (value instanceof Date) return new Date(Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()));
  // Numeric serial (Excel date)
  if (typeof value === "number") {
    // Excel epoch: 1900-01-01 = serial 1 (with the 1900 leap-year bug)
    const utc = new Date(Date.UTC(1899, 11, 30));
    utc.setUTCDate(utc.getUTCDate() + value);
    return utc;
  }
  // String date
  const d = new Date(value);
  if (isNaN(d)) return null;
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

/** Last calendar day of the month that contains `date` */
function monthEnd(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0));
}

/** Add `n` calendar days to `date` */
function addDays(date, n) {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + n);
  return d;
}

/** Format a JS Date as DD-MM-YYYY string */
export function formatDate(date) {
  if (!date) return "";
  const d = String(date.getUTCDate()).padStart(2, "0");
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const y = date.getUTCFullYear();
  return `${d}-${m}-${y}`;
}

/**
 * Validate a single input row.
 * Returns an array of error strings (empty = valid).
 */
export function validateRow(row, rowNum) {
  const errors = [];

  if (!row.employeeId || String(row.employeeId).trim() === "") {
    errors.push(`Row ${rowNum}: Employee ID is missing.`);
  }
  if (!row.doj) errors.push(`Row ${rowNum}: DOJ is missing or invalid.`);
  if (!row.startDate) errors.push(`Row ${rowNum}: Start Date is missing or invalid.`);
  if (row.days === null || row.days === undefined || isNaN(row.days)) {
    errors.push(`Row ${rowNum}: Days is missing or not a number.`);
  } else {
    if (row.days <= 0) errors.push(`Row ${rowNum}: Days must be greater than 0.`);
  }
  return errors;
}

/**
 * Process all input rows.
 *
 * @param {Array} rows  — array of raw objects from SheetJS
 * @returns {{ exportRows, obsRows, inputFlags, errors }}
 *
 * inputFlags: Map of rowIndex → { color: 'yellow'|'red' }
 * exportRows: [{ employeeId, startDate, endDate, days }]
 * obsRows:    [{ employeeId, doj, dol, startDate, totalDays, allowedDays, excessDays, remarks }]
 * errors:     [string]  — validation errors collected across all rows
 */
export function processLOP(rows) {
  const exportRows = [];
  const obsRows = [];
  const inputFlags = {};
  const errors = [];

  rows.forEach((raw, idx) => {
    const rowNum = idx + 2; // 1-indexed header + 1

    // Skip truly empty rows
    if (!raw.employeeId && !raw.doj && !raw.startDate) return;

    const row = {
      employeeId: String(raw.employeeId ?? "").trim(),
      doj:        parseExcelDate(raw.doj),
      dol:        parseExcelDate(raw.dol) || null,
      startDate:  parseExcelDate(raw.startDate),
      days:       raw.days !== undefined && raw.days !== "" ? Number(raw.days) : null,
    };

    const rowErrors = validateRow(row, rowNum);
    if (rowErrors.length) {
      errors.push(...rowErrors);
      return; // skip processing this row
    }

    let remarks = "";
    let flagColor = null;

    // ── Step 2: DOJ Adjustment ──────────────────────────────────────────
    let actualStart = row.startDate;
    if (row.startDate < row.doj) {
      actualStart = row.doj;
      remarks += "Start adjusted to DOJ. ";
      flagColor = "yellow";
    }

    // ── Step 3 & 4: Month boundary & calculated end ─────────────────────
    const mEnd = monthEnd(actualStart);
    const calculatedEnd = addDays(actualStart, row.days - 1);

    // ── Step 5: Month cap ───────────────────────────────────────────────
    let finalEnd = calculatedEnd;
    if (calculatedEnd > mEnd) {
      finalEnd = mEnd;
      remarks += "Restricted to month end. ";
    }

    // ── Step 6: DOL cap ─────────────────────────────────────────────────
    if (row.dol && finalEnd > row.dol) {
      finalEnd = row.dol;
      remarks += "Restricted due to DOL. ";
    }

    // ── Step 7 & 8: Allowed / excess days ───────────────────────────────
    const diffMs      = finalEnd - actualStart;
    const diffDays    = diffMs / (1000 * 60 * 60 * 24);
    const allowedDays = Math.round((diffDays + 1) * 100) / 100;
    const excessDays  = Math.round((row.days - allowedDays) * 100) / 100;

    if (excessDays > 0) flagColor = "red";
    if (flagColor) inputFlags[idx] = { color: flagColor };

    // ── Step 9: Split to rows ────────────────────────────────────────────
    const fullDays      = Math.floor(allowedDays);
    const remainingDay  = Math.round((allowedDays - fullDays) * 100) / 100;

    for (let j = 0; j < fullDays; j++) {
      const d = addDays(actualStart, j);
      exportRows.push({ employeeId: row.employeeId, startDate: d, endDate: d, days: 1 });
    }
    if (remainingDay > 0) {
      const d = addDays(actualStart, fullDays);
      exportRows.push({ employeeId: row.employeeId, startDate: d, endDate: d, days: remainingDay });
    }

    // ── Step 10: Observation row ─────────────────────────────────────────
    if (excessDays > 0 || remarks !== "") {
      obsRows.push({
        employeeId:  row.employeeId,
        doj:         row.doj,
        dol:         row.dol,
        startDate:   row.startDate,
        totalDays:   row.days,
        allowedDays,
        excessDays,
        remarks:     remarks.trim(),
      });
    }
  });

  return { exportRows, obsRows, inputFlags, errors };
}
