// Small helpers shared by the tool pages, the feedback widget and the post-result prompt.
// All browser-storage access is wrapped in try/catch: storage can be blocked (private mode,
// strict settings), and the tools must keep working when it is.

export const RESULT_EVENT = 'ptool:result';

// Call right after a successful download or copy. The prompt decides whether to show.
export function signalResult(tool) {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(new CustomEvent(RESULT_EVENT, { detail: { tool } }));
  } catch (e) { /* very old browsers: no prompt, nothing else affected */ }
}

// Remember that this tool was already rated on this visit (by the inline widget or the prompt).
export function markRated(tool) {
  try { sessionStorage.setItem(`ptool:rated:${tool}`, '1'); } catch (e) { /* ignore */ }
}

export function wasRated(tool) {
  try { return sessionStorage.getItem(`ptool:rated:${tool}`) === '1'; } catch (e) { return false; }
}
