/**
 * LOP Splitter – Main App Component
 * File: src/App.jsx
 */

import { useState, useRef } from "react";
import { parseFile, buildWorkbook, downloadWorkbook } from "./utils/excelHandler";
import { processAll } from "./utils/lopLogic";
import "./styles/app.css";

const STEPS = {
  IDLE: "idle",
  PARSING: "parsing",
  READY: "ready",
  ERROR: "error",
};

export default function App() {
  const [step, setStep] = useState(STEPS.IDLE);
  const [fileName, setFileName] = useState("");
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef();

  // ── File handling ────────────────────────────────────────────────────────────
  async function handleFile(file) {
    if (!file) return;
    const ext = file.name.split(".").pop().toLowerCase();
    if (ext !== "xlsx") {
      setErrorMsg("Only .xlsx files are supported.");
      setStep(STEPS.ERROR);
      return;
    }
    setFileName(file.name);
    setStep(STEPS.PARSING);
    setErrorMsg("");
    setResult(null);

    try {
      const { rows } = await parseFile(file);
      const processed = processAll(rows);
      setResult(processed);
      setStep(STEPS.READY);
      const workbook = buildWorkbook(processed.exportRows, processed.observations, false);
      downloadWorkbook(workbook, "LOP_Split_Export.xlsx");
    } catch (err) {
      setErrorMsg(err.message || "Failed to process file.");
      setStep(STEPS.ERROR);
    }
  }

  function onInputChange(e) {
    handleFile(e.target.files[0]);
  }

  function onDrop(e) {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  }

  // ── Downloads ────────────────────────────────────────────────────────────────
  function downloadExport() {
    if (!result) return;
    const wb = buildWorkbook(result.exportRows, result.observations, false);
    downloadWorkbook(wb, "LOP_Split_Export.xlsx");
  }

  function downloadObservations() {
    if (!result) return;
    const wb = buildWorkbook(result.exportRows, result.observations, true);
    // Write only Observations sheet
    const obsWb = { SheetNames: [], Sheets: {} };
    obsWb.SheetNames.push("Observations");
    obsWb.Sheets["Observations"] = wb.Sheets["Observations"];
    downloadWorkbook(obsWb, "LOP_Observations.xlsx");
  }

  function reset() {
    setStep(STEPS.IDLE);
    setFileName("");
    setResult(null);
    setErrorMsg("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="app">
      {/* NAVBAR */}
      <nav className="navbar">
        <div className="nav-logo">
          <span className="logo-icon">♥</span>
          <span className="logo-text">LOP<span className="logo-accent">tools</span></span>
        </div>
        <ul className="nav-links">
          <li><a href="#">Merge</a></li>
          <li><a href="#" className="active">Split LOP Dates</a></li>
          <li><a href="#">Convert</a></li>
          <li><a href="#">All Tools</a></li>
        </ul>
        <div className="nav-actions">
          <button className="btn-secondary">Login</button>
          <button className="btn-primary">Sign up</button>
        </div>
      </nav>

      {/* HERO */}
      <section className="hero">
        <div className="badge">⚙ Payroll Tool</div>
        <h1>Split <span>LOP Dates</span></h1>
        <p className="subtitle">
          Upload your payroll file to split Loss of Pay entries into individual daily rows,
          capped to month boundaries and date of leaving.
        </p>
      </section>

      {/* UPLOAD CARD */}
      <div className="upload-wrapper">
        <div className="upload-card">

          {/* Drop Zone */}
          {step === STEPS.IDLE && (
            <>
              <div
                className={`drop-circle ${dragOver ? "drag-over" : ""}`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <svg className="drop-icon" viewBox="0 0 80 80" fill="none">
                  <rect x="8" y="14" width="38" height="44" rx="6" fill="#EDE9FE" stroke="#A78BFA" strokeWidth="2.5" strokeDasharray="5 3"/>
                  <g transform="translate(28,30)">
                    <rect x="4" y="12" width="24" height="18" rx="5" fill="white" stroke="#3B82F6" strokeWidth="2.2"/>
                    <rect x="4" y="4" width="5" height="14" rx="2.5" fill="white" stroke="#3B82F6" strokeWidth="2"/>
                    <rect x="11" y="1" width="5" height="17" rx="2.5" fill="white" stroke="#3B82F6" strokeWidth="2"/>
                    <rect x="18" y="3" width="5" height="15" rx="2.5" fill="white" stroke="#3B82F6" strokeWidth="2"/>
                    <rect x="25" y="7" width="5" height="11" rx="2.5" fill="white" stroke="#3B82F6" strokeWidth="2"/>
                  </g>
                  <circle cx="60" cy="22" r="9" fill="#EDE9FE" stroke="#3B82F6" strokeWidth="2"/>
                  <line x1="60" y1="17" x2="60" y2="27" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round"/>
                  <line x1="55" y1="22" x2="65" y2="22" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                <span className="drop-label">Drop file here</span>
                <span className="drop-hint">.xlsx / .xls only</span>
              </div>

              <div className="or-divider">or select from</div>

              <div className="upload-buttons">
                <button className="btn-upload-primary" onClick={() => fileInputRef.current?.click()}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="20" height="20">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="17 8 12 3 7 8"/>
                    <line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                  Select LOP File
                </button>

                <div className="source-row">
                  <button className="btn-source" onClick={() => fileInputRef.current?.click()}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22">
                      <rect x="5" y="2" width="14" height="20" rx="2"/>
                      <line x1="12" y1="18" x2="12.01" y2="18"/>
                    </svg>
                    Mobile
                  </button>
                  <button className="btn-source" onClick={() => fileInputRef.current?.click()}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22">
                      <rect x="2" y="3" width="20" height="14" rx="2"/>
                      <line x1="8" y1="21" x2="16" y2="21"/>
                      <line x1="12" y1="17" x2="12" y2="21"/>
                    </svg>
                    Laptop / PC
                  </button>
                  <button className="btn-source" onClick={() => fileInputRef.current?.click()}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22">
                      <polyline points="16 16 12 12 8 16"/>
                      <line x1="12" y1="12" x2="12" y2="21"/>
                      <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
                    </svg>
                    Cloud
                  </button>
                </div>
              </div>

              <p className="formats">Accepts <span>.xlsx</span> files only</p>
            </>
          )}

          {/* Processing */}
          {step === STEPS.PARSING && (
            <div className="status-box">
              <div className="spinner" />
              <p>Processing <strong>{fileName}</strong>…</p>
            </div>
          )}

          {/* Error */}
          {step === STEPS.ERROR && (
            <div className="status-box error">
              <span className="status-icon">✕</span>
              <p>{errorMsg}</p>
              <button className="btn-upload-primary" onClick={reset}>Try Again</button>
            </div>
          )}

          {/* Results */}
          {step === STEPS.READY && result && (
            <div className="results">
              <div className="result-header">
                <span className="result-icon">✓</span>
                <div>
                  <p className="result-title">Processing Complete</p>
                  <p className="result-file">{fileName}</p>
                </div>
              </div>

              <div className="summary-grid">
                <div className="summary-tile">
                  <span className="tile-num">{result.summary.totalInput}</span>
                  <span className="tile-label">Input Rows</span>
                </div>
                <div className="summary-tile">
                  <span className="tile-num">{result.summary.totalOutputRows}</span>
                  <span className="tile-label">Export Rows</span>
                </div>
                <div className="summary-tile warn">
                  <span className="tile-num">{result.summary.totalObservations}</span>
                  <span className="tile-label">Observations</span>
                </div>
              </div>

              <div className="download-section">
                <button className="btn-upload-primary full" onClick={downloadExport}>
                  ↓  Download Export (.xlsx)
                </button>

                {result.observations.length > 0 && (
                  <button className="btn-obs" onClick={downloadObservations}>
                    ↓  Download Observations (optional)
                  </button>
                )}
              </div>

              {/* Preview Table */}
              {result.exportRows.length > 0 && (
                <div className="preview-wrap">
                  <p className="preview-label">Preview (first 10 rows)</p>
                  <table className="preview-table">
                    <thead>
                      <tr>
                        <th>Employee ID</th>
                        <th>Start Date</th>
                        <th>End Date</th>
                        <th>Days</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.exportRows.slice(0, 10).map((r, i) => (
                        <tr key={i}>
                          <td>{r.employeeId}</td>
                          <td>{r.startDate}</td>
                          <td>{r.endDate}</td>
                          <td>{r.days}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {result.exportRows.length > 10 && (
                    <p className="preview-more">…and {result.exportRows.length - 10} more rows in the downloaded file</p>
                  )}
                </div>
              )}

              <button className="btn-reset" onClick={reset}>Process Another File</button>
            </div>
          )}

          <input
            type="file"
            ref={fileInputRef}
            accept=".xlsx,.xls"
            style={{ display: "none" }}
            onChange={onInputChange}
          />
        </div>
      </div>

      {/* FEATURES */}
      <div className="features">
        {["Month-boundary capped", "DOJ & DOL aware", "Decimal day support", "Observations report", "No weekends skipped", "100% browser-side"].map((f) => (
          <div key={f} className="feature-pill">
            <div className="feature-dot" />
            {f}
          </div>
        ))}
      </div>

      <footer>© LOPtools 2026 — Your Payroll Date Splitter</footer>
    </div>
  );
}
