/**
 * Excel Parsing & Export Utility
 * Uses SheetJS (xlsx) for reading input and writing output
 * File: src/utils/excelHandler.js
 */

import * as XLSX from "xlsx";

/**
 * Expected column headers in the input file (case-insensitive match)
 */
const HEADER_MAP = {
  "employee id": "employeeId",
  "doj (date of joining)": "doj",
  "dol (date of leaving)": "dol",
  "start date": "startDate",
  "days": "days",
};

/**
 * Parse an uploaded .xlsx / .xls file
 * Returns the rows from the first sheet named "Uploader" (or first sheet)
 */
export async function parseFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array", cellDates: true });

        // Prefer "Uploader" sheet
        const sheetName =
          workbook.SheetNames.find(
            (n) => n.toLowerCase() === "uploader"
          ) || workbook.SheetNames[0];

        const sheet = workbook.Sheets[sheetName];
        const rawRows = XLSX.utils.sheet_to_json(sheet, {
          header: 1,
          raw: false,
          dateNF: "DD/MM/YYYY",
        });

        if (rawRows.length < 2) {
          return reject(new Error("File has no data rows."));
        }

        // Map headers
        const headers = rawRows[0].map((h) =>
          (h ?? "").toString().trim()
        );
        while (headers.length > 0 && headers[headers.length - 1] === "") {
          headers.pop();
        }

        if (headers.length !== Object.keys(HEADER_MAP).length) {
          return reject(
            new Error(
              `Input file must contain exactly 5 header columns: Employee ID, DOJ (Date of Joining), DOL (Date of Leaving), Start Date, Days.`
            )
          );
        }

        const normalizedHeaders = headers.map((h) => h.toLowerCase());
        const mappedHeaders = normalizedHeaders.map((h) => HEADER_MAP[h] || null);

        if (mappedHeaders.includes(null)) {
          const bad = headers.filter((h, idx) => !mappedHeaders[idx]);
          return reject(
            new Error(
              `Unexpected header name(s): ${bad.join(", ")}. Use exact headers from the template.`
            )
          );
        }

        // Build row objects from the first 5 columns only
        const rows = rawRows.slice(1).map((row) => {
          const obj = {};
          mappedHeaders.forEach((key, i) => {
            obj[key] = row[i] ?? null;
          });
          return obj;
        });

        // Filter out completely empty rows
        const filtered = rows.filter((r) =>
          Object.values(r).some((v) => v !== null && v !== "")
        );

        resolve({ rows: filtered, sheetName });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file."));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Build and download the output .xlsx workbook
 * Sheet 1: Export (always included)
 * Sheet 2: Observations (included only if user requests it)
 */
export function buildWorkbook(exportRows, observations, includeObs = false) {
  const wb = XLSX.utils.book_new();

  // ── Export Sheet ─────────────────────────────────────────────────────────────
  const exportData = [
    ["Employee ID", "Start Date", "End Date", "Days"],
    ...exportRows.map((r) => [
      // Preserve leading zeros by prepending apostrophe trick via cell type
      r.employeeId,
      r.startDate,
      r.endDate,
      r.days,
    ]),
  ];

  const exportSheet = XLSX.utils.aoa_to_sheet(exportData);

  // Force Employee ID column (A) as text to preserve leading zeros
  const range = XLSX.utils.decode_range(exportSheet["!ref"]);
  for (let row = 1; row <= range.e.r; row++) {
    const cell = exportSheet[XLSX.utils.encode_cell({ r: row, c: 0 })];
    if (cell) {
      cell.t = "s"; // string type
      cell.v = String(cell.v);
    }
  }

  // Set date format for Start Date (B) and End Date (C) columns
  for (let row = 1; row <= range.e.r; row++) {
    // Start Date column (B)
    const startCell = exportSheet[XLSX.utils.encode_cell({ r: row, c: 1 })];
    if (startCell && startCell.v instanceof Date) {
      startCell.t = "n"; // number type for dates
      startCell.v = (startCell.v - new Date(Date.UTC(1899, 11, 30))) / 86400000; // Excel serial
      startCell.z = "dd/mm/yyyy"; // date format
    }
    // End Date column (C)
    const endCell = exportSheet[XLSX.utils.encode_cell({ r: row, c: 2 })];
    if (endCell && endCell.v instanceof Date) {
      endCell.t = "n"; // number type for dates
      endCell.v = (endCell.v - new Date(Date.UTC(1899, 11, 30))) / 86400000; // Excel serial
      endCell.z = "dd/mm/yyyy"; // date format
    }
  }

  // Style header row
  exportSheet["!cols"] = [
    { wch: 18 }, // Employee ID
    { wch: 14 }, // Start Date
    { wch: 14 }, // End Date
    { wch: 8 },  // Days
  ];

  XLSX.utils.book_append_sheet(wb, exportSheet, "Export");

  // ── Observations Sheet ────────────────────────────────────────────────────────
  if (includeObs && observations.length > 0) {
    const obsData = [
      [
        "Row #",
        "Employee ID",
        "Input Start Date",
        "Adjusted Start Date",
        "Input Days",
        "Allowed Days",
        "Excess Days",
        "Remark",
      ],
      ...observations.map((o) => [
        o.rowIndex,
        o.employeeId,
        o.inputStartDate || "",
        o.adjustedStartDate || "",
        o.inputDays ?? "",
        o.allowedDays ?? "",
        o.excessDays ?? "",
        o.remark,
      ]),
    ];
    const obsSheet = XLSX.utils.aoa_to_sheet(obsData);
    
    // Set date format for Input Start Date (C) and Adjusted Start Date (D) columns
    const obsRange = XLSX.utils.decode_range(obsSheet["!ref"]);
    for (let row = 1; row <= obsRange.e.r; row++) {
      // Input Start Date column (C)
      const inputStartCell = obsSheet[XLSX.utils.encode_cell({ r: row, c: 2 })];
      if (inputStartCell && inputStartCell.v instanceof Date) {
        inputStartCell.t = "n"; // number type for dates
        inputStartCell.v = (inputStartCell.v - new Date(Date.UTC(1899, 11, 30))) / 86400000; // Excel serial
        inputStartCell.z = "dd/mm/yyyy"; // date format
      }
      // Adjusted Start Date column (D)
      const adjustedStartCell = obsSheet[XLSX.utils.encode_cell({ r: row, c: 3 })];
      if (adjustedStartCell && adjustedStartCell.v instanceof Date) {
        adjustedStartCell.t = "n"; // number type for dates
        adjustedStartCell.v = (adjustedStartCell.v - new Date(Date.UTC(1899, 11, 30))) / 86400000; // Excel serial
        adjustedStartCell.z = "dd/mm/yyyy"; // date format
      }
    }
    
    obsSheet["!cols"] = [
      { wch: 7 },
      { wch: 18 },
      { wch: 18 },
      { wch: 20 },
      { wch: 12 },
      { wch: 14 },
      { wch: 13 },
      { wch: 60 },
    ];
    XLSX.utils.book_append_sheet(wb, obsSheet, "Observations");
  }

  return wb;
}

/**
 * Trigger browser download of a workbook
 */
export function downloadWorkbook(wb, filename = "LOP_Split_Output.xlsx") {
  XLSX.writeFile(wb, filename);
}
