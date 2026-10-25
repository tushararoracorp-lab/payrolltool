// Small helpers shared by the tool pages, the feedback widget and the post-result prompt.
// All browser-storage access is wrapped in try/catch: storage can be blocked (private mode,
// strict settings), and the tools must keep working when it is.

export const RESULT_EVENT = 'ptool:result';
export const RATED_EVENT = 'ptool:rated';

// Call right after a result is delivered. The prompt decides whether to show.
//   kind 'file' (default): after a download - asks "Did this file match your payroll system?"
//   kind 'calc': after a calculation - asks about the result, and waits longer (10 s by default)
//   so the user can read it first. A new signal (e.g. a recalculation) restarts the wait.
export function signalResult(tool, kind = 'file', delayMs) {
  if (typeof window === 'undefined') return;
  const delay = typeof delayMs === 'number' ? delayMs : (kind === 'calc' ? 10000 : 1500);
  try {
    window.dispatchEvent(new CustomEvent(RESULT_EVENT, { detail: { tool, kind, delay } }));
  } catch (e) { /* very old browsers: no prompt, nothing else affected */ }
}

// Remember that this tool was already rated on this visit (by the inline widget or the prompt).
export function markRated(tool) {
  try { sessionStorage.setItem(`ptool:rated:${tool}`, '1'); } catch (e) { /* ignore */ }
}

export function wasRated(tool) {
  try { return sessionStorage.getItem(`ptool:rated:${tool}`) === '1'; } catch (e) { return false; }
}

// Tell the inline feedback widget that the post-result prompt has been dealt with, so the same
// question is not asked twice on one visit. answered: true -> the widget says thanks;
// answered: false (skipped or closed) -> the widget hides quietly.
export function announceRated(tool, answered = true) {
  markRated(tool);
  try { window.dispatchEvent(new CustomEvent(RATED_EVENT, { detail: { tool, answered } })); } catch (e) { /* ignore */ }
}
