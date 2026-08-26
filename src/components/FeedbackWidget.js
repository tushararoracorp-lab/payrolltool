import { useState } from "react";

export default function FeedbackWidget({ toolName }) {
  const [rated, setRated] = useState(null);
  const [showText, setShowText] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const sendGA4Event = (eventName, params) => {
    if (typeof window !== "undefined" && window.gtag) {
      window.gtag("event", eventName, params);
    }
  };

  const handleRating = (value) => {
    setRated(value);
    sendGA4Event("tool_feedback_rating", {
      tool_name: toolName,
      rating: value,
    });
    setShowText(true);
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
          feedback: feedbackText.trim(),
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
