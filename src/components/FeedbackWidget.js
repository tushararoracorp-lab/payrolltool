import { useState } from "react";

export default function FeedbackWidget({ toolName }) {
  const [rated, setRated] = useState(null);
  const [showText, setShowText] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [submitted, setSubmitted] = useState(false);

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

  const [isSubmitting, setIsSubmitting] = useState(false);

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
      <div className="mt-8 p-4 rounded-xl bg-violet-50 text-center text-sm text-violet-700">
        Thanks for the feedback 🙏
      </div>
    );
  }

  return (
    <div className="mt-8 p-5 rounded-xl border border-gray-100 bg-white">
      <p className="text-sm font-medium text-gray-700 mb-3">Was this helpful?</p>
      <div className="flex gap-3">
        <button
          onClick={() => handleRating("helpful")}
          className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
            rated === "helpful"
              ? "bg-violet-600 text-white border-violet-600"
              : "border-gray-200 text-gray-600 hover:border-violet-300 hover:text-violet-700"
          }`}
        >
          👍 Yes
        </button>
        <button
          onClick={() => handleRating("not_helpful")}
          className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
            rated === "not_helpful"
              ? "bg-violet-600 text-white border-violet-600"
              : "border-gray-200 text-gray-600 hover:border-violet-300 hover:text-violet-700"
          }`}
        >
          👎 No
        </button>
      </div>

      {showText && (
        <div className="mt-4">
          <label className="text-sm text-gray-600 mb-2 block">
            What would make this even better for you? <span className="text-gray-400">(optional)</span>
          </label>
          <textarea
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            rows={3}
            className="w-full border border-gray-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
            placeholder="Type your thoughts..."
          />
          <button
            onClick={handleTextSubmit}
            className="mt-2 px-4 py-2 rounded-lg text-sm font-medium bg-violet-600 text-white hover:bg-violet-700"
          >
            Submit
          </button>
        </div>
      )}
    </div>
  );
}