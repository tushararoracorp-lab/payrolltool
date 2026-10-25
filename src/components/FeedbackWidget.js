import { useState } from "react";
import { markRated } from "../lib/resultPrompt";

// Tap-only reasons shown after "No", so nobody has to type to tell us what went wrong.
const NO_REASONS = [
  { id: "numbers_mismatch", label: "Numbers don't match" },
  { id: "confusing", label: "Confusing to use" },
  { id: "case_missing", label: "My state or case is missing" },
  { id: "file_rejected", label: "File got rejected" },
];

export default function FeedbackWidget({ toolName }) {
  const [rated, setRated] = useState(null);
  const [showText, setShowText] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reason, setReason] = useState(null);

  const sendGA4Event = (eventName, params) => {
    if (typeof window !== "undefined" && window.gtag) {
      window.gtag("event", eventName, params);
    }
  };

  const handleRating = (value) => {
    setRated(value);
    if (value !== "not_helpful") setReason(null);
    sendGA4Event("tool_feedback_rating", {
      tool_name: toolName,
      rating: value,
    });
    markRated(toolName); // the post-result prompt will not ask again for this tool
    setShowText(true);
  };

  const handleReason = (id) => {
    setReason(id);
    sendGA4Event("tool_feedback_reason", { tool_name: toolName, reason: id });
  };

  const handleTextSubmit = async () => {
    if (isSubmitting) return; // guard against double-clicks
    setIsSubmitting(true);
    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tool: toolName,
          rating: rated,
          feedback: [reason ? `Reason: ${NO_REASONS.find((r) => r.id === reason)?.label}.` : "", feedbackText.trim()]
            .filter(Boolean)
            .join(" "),
        }),
      });
    } catch (err) {
      console.error("Feedback submission failed:", err);
    }
    setIsSubmitting(false);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div
        className="mt-8 p-4 rounded-xl text-center text-sm"
        style={{ background: "var(--brand-50)", color: "var(--brand-700)" }}
      >
        Thanks for the feedback 🙏
      </div>
    );
  }

  return (
    <>
      <div
        className="feedback-widget mt-8 p-5 rounded-xl"
        style={{ border: "1px solid var(--line)", background: "var(--card)" }}
      >
        <p className="text-sm font-medium mb-3" style={{ color: "var(--ink)" }}>
          Was this helpful?
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => handleRating("helpful")}
            className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
              rated === "helpful" ? "" : "fw-btn-unselected"
            }`}
            style={
              rated === "helpful"
                ? { background: "var(--brand-600)", color: "#fff", borderColor: "var(--brand-600)" }
                : { borderColor: "var(--line)", color: "var(--ink-soft)" }
            }
          >
            👍 Yes
          </button>
          <button
            onClick={() => handleRating("not_helpful")}
            className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
              rated === "not_helpful" ? "" : "fw-btn-unselected"
            }`}
            style={
              rated === "not_helpful"
                ? { background: "var(--brand-600)", color: "#fff", borderColor: "var(--brand-600)" }
                : { borderColor: "var(--line)", color: "var(--ink-soft)" }
            }
          >
            👎 No
          </button>
        </div>

        {rated === "not_helpful" && (
          <div className="mt-4" role="group" aria-label="What went wrong?">
            <p className="text-sm mb-2" style={{ color: "var(--ink-soft)" }}>What went wrong? Tap one.</p>
            <div className="flex flex-wrap gap-2">
              {NO_REASONS.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => handleReason(r.id)}
                  aria-pressed={reason === r.id}
                  className={`px-3 py-2 rounded-full text-sm border transition-colors ${reason === r.id ? "" : "fw-btn-unselected"}`}
                  style={
                    reason === r.id
                      ? { background: "var(--brand-600)", color: "#fff", borderColor: "var(--brand-600)" }
                      : { borderColor: "var(--line)", color: "var(--ink-soft)" }
                  }
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {showText && (
          <div className="mt-4">
            <label className="text-sm mb-2 block" style={{ color: "var(--ink-soft)" }}>
              What would make this even better for you?{" "}
              <span style={{ color: "var(--ink-soft)", opacity: 0.7 }}>(optional)</span>
            </label>
            <textarea
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              rows={3}
              className="fw-textarea w-full rounded-lg p-3 text-sm"
              style={{ border: "1px solid var(--line)", background: "var(--paper)", color: "var(--ink)" }}
              placeholder="Type your thoughts..."
            />
            <button
              onClick={handleTextSubmit}
              className="mt-2 px-4 py-2 rounded-lg text-sm font-medium fw-submit"
              style={{ background: "var(--brand-600)", color: "#fff" }}
            >
              Submit
            </button>
          </div>
        )}
      </div>

      <style jsx>{`
        .fw-btn-unselected:hover {
          border-color: var(--brand-600) !important;
          color: var(--brand-600) !important;
        }
        .fw-textarea:focus {
          outline: none;
          box-shadow: 0 0 0 3px var(--brand-50);
          border-color: var(--brand-600) !important;
        }
        .fw-submit:hover {
          background: var(--brand-700) !important;
        }
      `}</style>
    </>
  );
}
