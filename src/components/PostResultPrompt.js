import { useCallback, useEffect, useRef, useState } from "react";
import { RESULT_EVENT, announceRated, inlineFeedbackVisible, wasRated } from "../lib/resultPrompt";

// One-tap "did this match?" card shown after a user downloads a result (audit section 8).
// Rules: only after a successful download (never on page load or after a rejected file),
// only when the inline "Was this helpful?" box is not already on screen,
// at most once per visit, and not again for 30 days after it is answered or closed.
// A corner card, not a modal: the result stays visible and the page never scroll-locks.

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
  const boxRef = useRef(null);
  const firstBtnRef = useRef(null);
  const returnFocusRef = useRef(null);
  const timerRef = useRef(null);

  const close = useCallback((reason) => {
    if (reason === "dismissed") ga("post_result_prompt_dismissed", { tool_name: tool });
    // Closed or skipped before answering: settle the inline question too, without a thank-you.
    if (reason === "dismissed" && tool) announceRated(tool, false);
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
      if (storageGet("sessionStorage", "ptool:prompt:shown") === "1") return;
      if (snoozed() || wasRated(name)) return;
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        // The inline "Was this helpful?" box is already in view: one question is enough.
        if (inlineFeedbackVisible() || wasRated(name)) return;
        storageSet("sessionStorage", "ptool:prompt:shown", "1");
        returnFocusRef.current = document.activeElement;
        setStep("ask"); setAnswer(null); setComment("");
        setTool(name);
        ga("post_result_prompt_shown", { tool_name: name });
      }, SHOW_DELAY_MS);
    }
    window.addEventListener(RESULT_EVENT, onResult);
    return () => { window.removeEventListener(RESULT_EVENT, onResult); clearTimeout(timerRef.current); };
  }, []);

  // Focus into the card when it opens; Esc and an outside tap close it.
  useEffect(() => {
    if (!tool) return undefined;
    if (firstBtnRef.current) firstBtnRef.current.focus();
    function onKey(e) { if (e.key === "Escape") close("dismissed"); }
    function onDown(e) { if (boxRef.current && !boxRef.current.contains(e.target)) close("dismissed"); }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown, { passive: true });
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
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
    <div ref={boxRef} className="prp" role="dialog" aria-modal="false" aria-labelledby="prp-title">
      <button type="button" className="prp-close" aria-label="Close" onClick={() => close("dismissed")}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>

      {step === "ask" && (
        <>
          <p id="prp-title" className="prp-title">Did this file match your payroll system?</p>
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

      <style jsx>{`
        .prp {
          position: fixed; left: 24px; bottom: 24px; z-index: 70; width: 340px; max-width: calc(100vw - 24px);
          background: var(--card); color: var(--ink); border: 1px solid var(--line); border-radius: 16px;
          box-shadow: 0 12px 32px rgba(20, 10, 40, 0.18); padding: 18px 52px 16px 18px;
        }
        .prp-close {
          position: absolute; top: 4px; right: 4px; width: 44px; height: 44px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center; color: var(--ink-soft); background: transparent;
        }
        .prp-close:hover, .prp-close:focus-visible { color: var(--ink); background: var(--brand-50); }
        .prp-title { font-size: 15px; font-weight: 600; line-height: 1.4; margin: 0 0 12px; color: var(--ink); }
        .prp-label { display: block; font-size: 13px; color: var(--ink-soft); margin-bottom: 6px; }
        .prp-input {
          width: 100%; border: 1px solid var(--line); border-radius: 10px; padding: 9px 11px; font-size: 14px;
          background: var(--paper); color: var(--ink); margin-bottom: 10px;
        }
        .prp-input:focus { outline: none; border-color: var(--brand-600); box-shadow: 0 0 0 3px var(--brand-50); }
        .prp-row { display: flex; gap: 8px; }
        .prp-btn {
          min-height: 44px; padding: 0 18px; border-radius: 10px; border: 1px solid var(--line);
          font-size: 14px; font-weight: 600; color: var(--ink); background: transparent;
        }
        .prp-btn:hover, .prp-btn:focus-visible { border-color: var(--brand-600); color: var(--brand-600); }
        .prp-primary { background: var(--brand-600); border-color: var(--brand-600); color: #fff; }
        .prp-primary:hover, .prp-primary:focus-visible { background: var(--brand-700); color: #fff; }
        @media (max-width: 560px) {
          .prp { left: 12px; right: 12px; bottom: 12px; width: auto; max-width: none; }
        }
      `}</style>
    </div>
  );
}
