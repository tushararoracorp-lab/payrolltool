import { useCallback, useEffect, useRef, useState } from "react";
import { RESULT_EVENT, announceRated, wasRated } from "../lib/resultPrompt";

// One-tap "did this match?" card shown after a tool delivers a result (audit section 8): a download
// for file tools, or a completed calculation for calculators.
// Rules: only after a successful download (never on page load or after a rejected file),
// not if the inline "Was this helpful?" box was already answered on this visit,
// at most once per visit, and not again for 30 days after it is answered or closed.
// A small centred card over a light backdrop. It only ever appears after a download, never on
// arrival, and the page never scroll-locks. Only the cross (or Esc) closes it: a stray tap on the
// backdrop does nothing, so feedback is not lost by accident. Closing counts as skipped.

const SNOOZE_DAYS = 30;
const SHOW_DELAY_MS = 1500; // let the browser's download bar appear first

function storageGet(store, key) {
  try { return window[store].getItem(key); } catch (e) { return null; }
}
function storageSet(store, key, value) {
  try { window[store].setItem(key, value); } catch (e) { /* storage blocked: ignore */ }
}
function snoozed() {
  const t = Number(storageGet("localStorage", "ptool:prompt:snoozedAt") || 0);
  return t && Date.now() - t < SNOOZE_DAYS * 24 * 60 * 60 * 1000;
}
function ga(name, params) {
  try { if (window.gtag) window.gtag("event", name, params); } catch (e) { /* ignore */ }
}

export default function PostResultPrompt() {
  const [tool, setTool] = useState(null);
  const [step, setStep] = useState("ask"); // ask -> comment -> thanks
  const [answer, setAnswer] = useState(null);
  const [comment, setComment] = useState("");
  const [kind, setKind] = useState("file");
  const boxRef = useRef(null);
  const firstBtnRef = useRef(null);
  const returnFocusRef = useRef(null);
  const timerRef = useRef(null);

  const close = useCallback((reason) => {
    // Closed with the cross (or Esc) before answering: recorded as skipped. The inline question
    // is settled too, without a thank-you.
    if (reason === "skipped") ga("post_result_prompt_skipped", { tool_name: tool });
    if (reason === "skipped" && tool) announceRated(tool, false);
    storageSet("localStorage", "ptool:prompt:snoozedAt", String(Date.now()));
    setTool(null);
    const el = returnFocusRef.current;
    if (el && typeof el.focus === "function") { try { el.focus(); } catch (e) { /* ignore */ } }
  }, [tool]);

  // Listen for results signalled by the tool pages.
  useEffect(() => {
    function onResult(e) {
      const name = e && e.detail && e.detail.tool;
      if (!name) return;
      const nextKind = e.detail.kind === "calc" ? "calc" : "file";
      const delay = typeof e.detail.delay === "number" ? e.detail.delay : SHOW_DELAY_MS;
      if (storageGet("sessionStorage", "ptool:prompt:shown") === "1") return;
      if (snoozed() || wasRated(name)) return;
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        // Answered inline in the meantime: one question is enough.
        if (wasRated(name)) return;
        storageSet("sessionStorage", "ptool:prompt:shown", "1");
        returnFocusRef.current = document.activeElement;
        setStep("ask"); setAnswer(null); setComment(""); setKind(nextKind);
        setTool(name);
        ga("post_result_prompt_shown", { tool_name: name });
      }, delay);
    }
    window.addEventListener(RESULT_EVENT, onResult);
    return () => { window.removeEventListener(RESULT_EVENT, onResult); clearTimeout(timerRef.current); };
  }, []);

  // Focus into the card when it opens; Esc and an outside tap close it.
  useEffect(() => {
    if (!tool) return undefined;
    if (firstBtnRef.current) firstBtnRef.current.focus();
    function onKey(e) {
      if (e.key === "Escape") { close("skipped"); return; }
      if (e.key !== "Tab" || !boxRef.current) return;
      // Keep keyboard focus inside the card while it is open.
      const f = boxRef.current.querySelectorAll("button, input");
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [tool, close]);

  // Close a few seconds after the thank-you.
  useEffect(() => {
    if (step !== "thanks") return undefined;
    const t = setTimeout(() => close("answered"), 2500);
    return () => clearTimeout(t);
  }, [step, close]);

  if (!tool) return null;

  function choose(value) {
    setAnswer(value);
    announceRated(tool);
    ga("post_result_prompt_answered", { tool_name: tool, answer: value });
    setStep("comment");
  }

  async function send() {
    const text = comment.trim();
    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tool,
          rating: answer === "yes" ? "match_yes" : "match_no",
          feedback: ["Post-result prompt.", text].filter(Boolean).join(" "),
        }),
      });
    } catch (e) { /* network error: the GA answer is already counted */ }
    setStep("thanks");
  }

  return (
    <div className="prp-backdrop">
    <div ref={boxRef} className="prp" role="dialog" aria-modal="true" aria-labelledby="prp-title">
      <button type="button" className="prp-close" aria-label="Close" onClick={() => close("skipped")}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>

      {step === "ask" && (
        <>
          <p id="prp-title" className="prp-title">
            {kind === "calc" ? "Did this result match your payroll calculation?" : "Did this file match your payroll system?"}
          </p>
          <div className="prp-row">
            <button ref={firstBtnRef} type="button" className="prp-btn" onClick={() => choose("yes")}>Yes</button>
            <button type="button" className="prp-btn" onClick={() => choose("no")}>No</button>
          </div>
        </>
      )}

      {step === "comment" && (
        <>
          <p id="prp-title" className="prp-title">
            {answer === "yes" ? "Thanks. Anything we could do better?" : "Sorry about that. What was different?"}
          </p>
          <label className="prp-label" htmlFor="prp-input">One line is enough (optional)</label>
          <input
            id="prp-input"
            className="prp-input"
            value={comment}
            maxLength={300}
            onChange={(e) => setComment(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") send(); }}
            autoFocus
          />
          <div className="prp-row">
            <button type="button" className="prp-btn prp-primary" onClick={send}>Send</button>
            <button type="button" className="prp-btn" onClick={() => close("answered")}>Skip</button>
          </div>
        </>
      )}

      {step === "thanks" && <p id="prp-title" className="prp-title">Thank you, that helps.</p>}
    </div>

      <style jsx>{`
        .prp-backdrop {
          position: fixed; inset: 0; z-index: 70; display: flex; align-items: center; justify-content: center;
          padding: 16px; background: rgba(15, 10, 30, 0.28); animation: prp-fade 0.15s ease-out;
        }
        @keyframes prp-fade { from { opacity: 0; } to { opacity: 1; } }
        .prp {
          position: relative; box-sizing: border-box; width: 380px; max-width: 100%;
          background: var(--card, #ffffff); color: var(--ink, #1b1526); border: 1px solid var(--line, #e6e1f0); border-radius: 16px;
          box-shadow: 0 12px 32px rgba(20, 10, 40, 0.18); padding: 18px 52px 16px 18px;
        }
        .prp-close {
          position: absolute; top: 4px; right: 4px; width: 44px; height: 44px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center; color: var(--ink-soft, #5b5370); background: transparent;
        }
        .prp-close:hover, .prp-close:focus-visible { color: var(--ink, #1b1526); background: var(--brand-50, #f3eefe); }
        .prp-title { font-size: 15px; font-weight: 600; line-height: 1.4; margin: 0 0 12px; color: var(--ink, #1b1526); }
        .prp-label { display: block; font-size: 13px; color: var(--ink-soft, #5b5370); margin-bottom: 6px; }
        .prp-input {
          width: 100%; border: 1px solid var(--line, #e6e1f0); border-radius: 10px; padding: 9px 11px; font-size: 14px;
          background: var(--paper, #ffffff); color: var(--ink, #1b1526); margin-bottom: 10px;
        }
        .prp-input:focus { outline: none; border-color: var(--brand-600, #7c3aed); box-shadow: 0 0 0 3px var(--brand-50, #f3eefe); }
        .prp-row { display: flex; gap: 8px; }
        .prp-btn {
          min-height: 44px; padding: 0 18px; border-radius: 10px; border: 1px solid var(--line, #e6e1f0);
          font-size: 14px; font-weight: 600; color: var(--ink, #1b1526); background: transparent;
        }
        .prp-btn:hover, .prp-btn:focus-visible { border-color: var(--brand-600, #7c3aed); color: var(--brand-600, #7c3aed); }
        .prp-primary { background: var(--brand-600, #7c3aed); border-color: var(--brand-600, #7c3aed); color: #fff; }
        .prp-primary:hover, .prp-primary:focus-visible { background: var(--brand-700, #6d28d9); color: #fff; }
        @media (prefers-reduced-motion: reduce) { .prp-backdrop { animation: none; } }
      `}</style>
    </div>
  );
}
