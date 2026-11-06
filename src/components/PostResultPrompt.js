import { useCallback, useEffect, useRef, useState } from "react";
import { RESULT_EVENT, announceRated, wasRated } from "../lib/resultPrompt";

// One-tap "did this match?" card shown after a tool delivers a result (audit section 8): a download
// for file tools, or a completed calculation for calculators.
// Rules: only after a result (never on page load or after a rejected file), not if the inline
// "Was this helpful?" box was already answered on this visit, and at most once per tool per day:
// each screen can ask once a day, independently of the other tools.
// A small centred card over a light backdrop. It only ever appears after a download, never on
// arrival, and the page never scroll-locks. Only the cross (or Esc) closes it: a stray tap on the
// backdrop does nothing, so feedback is not lost by accident. Closing counts as skipped.

const SHOW_DELAY_MS = 1500; // let the browser's download bar appear first
const MAX_NO = 1000; // message length after "No" (the feedback sheet keeps up to this much)
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function storageGet(store, key) {
  try { return window[store].getItem(key); } catch (e) { return null; }
}
function storageSet(store, key, value) {
  try { window[store].setItem(key, value); } catch (e) { /* storage blocked: ignore */ }
}
// Local calendar date, e.g. "2026-10-25": the prompt for a tool resets at local midnight.
function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
const dayKey = (tool) => `ptool:prompt:day:${tool}`;
function askedToday(tool) {
  return storageGet("localStorage", dayKey(tool)) === today();
}
function ga(name, params) {
  try { if (window.gtag) window.gtag("event", name, params); } catch (e) { /* ignore */ }
}

export default function PostResultPrompt() {
  const [tool, setTool] = useState(null);
  const [step, setStep] = useState("ask"); // ask -> comment -> thanks
  const [answer, setAnswer] = useState(null);
  const [comment, setComment] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [updates, setUpdates] = useState(false); // unticked by default: only a clear "yes" counts
  const [emailError, setEmailError] = useState("");
  const [replyTo, setReplyTo] = useState("");
  const sendingRef = useRef(false); // stops a second send while the first is still saving (Enter + click)
  const [sending, setSending] = useState(false);
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
      if (askedToday(name) || wasRated(name)) return;
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        // Answered inline in the meantime: one question is enough.
        if (askedToday(name) || wasRated(name)) return;
        storageSet("localStorage", dayKey(name), today());
        returnFocusRef.current = document.activeElement;
        setStep("ask"); setAnswer(null); setComment(""); setEmail(""); setName(""); setUpdates(false); setEmailError(""); setReplyTo(""); setKind(nextKind);
        sendingRef.current = false; setSending(false);
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
      const f = boxRef.current.querySelectorAll("button, input, textarea");
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [tool, close]);

  // Close a few seconds after the thank-you (a little longer when it mentions a reply).
  useEffect(() => {
    if (step !== "thanks") return undefined;
    const t = setTimeout(() => close("answered"), replyTo ? 4500 : 2500);
    return () => clearTimeout(t);
  }, [step, close, replyTo]);

  if (!tool) return null;

  function choose(value) {
    setAnswer(value);
    announceRated(tool);
    ga("post_result_prompt_answered", { tool_name: tool, answer: value });
    setStep("comment");
  }

  async function send() {
    if (sendingRef.current) return;                 // already sending: ignore the second Enter or click
    const text = comment.trim();
    const mail = email.trim();
    const who = name.trim().slice(0, 80);
    if (mail && !EMAIL_PATTERN.test(mail)) { setEmailError("That doesn't look like a valid email. Check it, or leave it empty."); return; }
    if (mail && !text) { setEmailError("Add a line about what was different, so we know what to reply about."); return; }
    setEmailError("");
    sendingRef.current = true; setSending(true);
    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tool,
          rating: answer === "yes" ? "match_yes" : "match_no",
          feedback: ["Post-result prompt.", text].filter(Boolean).join(" "),
          name: mail ? who : "",
          email: mail,
          updates: Boolean(mail && updates),
        }),
      });
    } catch (e) { /* network error: the GA answer is already counted */ }
    // Email given (only offered after "No"): same flow as the homepage form - support gets the message
    // with reply-to set to the person, and the person gets the "Got your message" email.
    let replied = false;
    if (mail) {
      try {
        const res = await fetch("/api/contact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: mail,
            name: who,
            subject: `Feedback on ${tool}`,
            message: `Tool: ${tool}\nAnswer: the ${kind === "calc" ? "result" : "file"} did not match\n\n${text}`,
          }),
        });
        replied = res.ok;
      } catch (e) { /* falls back to the message below */ }
    }
    setReplyTo(mail ? (replied ? mail : "failed") : "");
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
          {answer === "no" ? (
            <>
              <label className="prp-label" htmlFor="prp-input">What was different? (optional)</label>
              {/* Longer box after "No": people often explain an error or ask for help. Enter adds a new line. */}
              <textarea
                id="prp-input"
                className="prp-input prp-area"
                value={comment}
                rows={3}
                maxLength={MAX_NO}
                onChange={(e) => setComment(e.target.value)}
                autoFocus
              />
              {comment.length >= MAX_NO * 0.8 && <p className="prp-count">{comment.length}/{MAX_NO}</p>}
            </>
          ) : (
            <>
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
            </>
          )}
          {answer === "no" && (
            <>
              <label className="prp-label" htmlFor="prp-name">Your name (optional)</label>
              <input
                id="prp-name"
                className="prp-input"
                value={name}
                maxLength={80}
                autoComplete="name"
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") send(); }}
              />
              <label className="prp-label" htmlFor="prp-email">Want a reply? Add your email (optional)</label>
              <input
                id="prp-email"
                className="prp-input"
                type="email"
                value={email}
                maxLength={120}
                autoComplete="email"
                placeholder="you@company.com"
                onChange={(e) => { setEmail(e.target.value); setEmailError(""); }}
                onKeyDown={(e) => { if (e.key === "Enter") send(); }}
              />
              <label className={`prp-check${email.trim() ? "" : " prp-check-off"}`}>
                <input
                  type="checkbox"
                  checked={updates}
                  disabled={!email.trim()}
                  onChange={(e) => setUpdates(e.target.checked)}
                />
                <span>Send me occasional PayrollTool.in updates. You can stop them any time.</span>
              </label>
              <p className="prp-hint">
                Your name and email are kept with your feedback to reply to you, and for updates only if you tick the box.{" "}
                <a href="/privacy-policy" target="_blank" rel="noopener noreferrer">Privacy Policy</a>
              </p>
              {emailError && <p className="prp-error">{emailError}</p>}
              <p className="prp-hint prp-mail">
                Prefer email?{" "}
                <a
                  href={`mailto:support@payrolltool.in?subject=${encodeURIComponent(`Help with ${tool}`)}&body=${encodeURIComponent(comment.trim() ? `${comment.trim()}\n\n` : "Tell us what was different:\n\n")}`}
                >
                  support@payrolltool.in
                </a>
              </p>
            </>
          )}
          <div className="prp-row">
            <button type="button" className="prp-btn prp-primary" onClick={send} disabled={sending}>{sending ? "Sending…" : "Send"}</button>
            <button type="button" className="prp-btn" onClick={() => close("answered")}>Skip</button>
          </div>
        </>
      )}

      {step === "thanks" && (
        <p id="prp-title" className="prp-title">
          {replyTo === "failed"
            ? <>Thank you. We could not send your message for a reply - please email <a href="mailto:support@payrolltool.in">support@payrolltool.in</a>.</>
            : replyTo
              ? <>Thank you. We will reply to <b>{replyTo}</b>, and a confirmation is on its way to your inbox.</>
              : "Thank you, that helps."}
        </p>
      )}
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
          max-height: calc(100vh - 32px); overflow-y: auto;
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
        .prp-area { resize: vertical; min-height: 72px; font-family: inherit; line-height: 1.45; display: block; }
        .prp-count { font-size: 12px; color: var(--ink-soft, #5b5370); text-align: right; margin: -6px 0 8px; }
        .prp-hint { font-size: 12px; color: var(--ink-soft, #5b5370); margin: -6px 0 10px; }
        .prp-error { font-size: 13px; color: #dc2626; margin: -4px 0 10px; }
        .prp-title a, .prp-mail a { color: var(--brand-600, #7c3aed); font-weight: 600; }
        .prp-mail { margin: 0 0 12px; }
        .prp-hint a { color: var(--brand-600, #7c3aed); font-weight: 600; }
        .prp-check { display: flex; gap: 8px; align-items: flex-start; font-size: 13px; color: var(--ink, #1b1526); margin: 0 0 10px; cursor: pointer; line-height: 1.4; }
        .prp-check input { margin-top: 2px; width: 16px; height: 16px; accent-color: var(--brand-600, #7c3aed); flex-shrink: 0; }
        .prp-check-off { opacity: 0.5; cursor: default; }
        .prp-btn:disabled { opacity: 0.6; cursor: default; }
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
