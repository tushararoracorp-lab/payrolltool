import { useState } from "react";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Shared component used on both the homepage and About page. Deliberately
// minimal - just email and message, name optional, no phone number - since
// this is market research (what are people's pain points / what tool do
// they wish existed), not lead-gen. Fewer required fields means more people
// actually submit something.
export default function RequestForm({ heading, subtext }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("idle"); // idle | submitting | sent | error
  const [emailError, setEmailError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    const trimmedEmail = email.trim();

    if (!EMAIL_PATTERN.test(trimmedEmail)) {
      setEmailError("That doesn't look like a valid email — double-check it before sending.");
      return;
    }
    setEmailError("");

    if (!trimmedEmail || !message.trim()) return;
    setStatus("submitting");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: trimmedEmail, message: message.trim() }),
      });
      if (!res.ok) throw new Error("Request failed");
      setStatus("sent");
    } catch (err) {
      console.error("Contact form submission failed:", err);
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <div className="request-form-card request-form-sent">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--brand-600)" strokeWidth="2">
          <path d="M20 6L9 17l-5-5" />
        </svg>
        <p>Got it - thanks for sharing. I read every message myself.</p>
      </div>
    );
  }

  return (
    <div className="request-form-card">
      <h3>{heading}</h3>
      <p className="request-form-subtext">{subtext}</p>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Your name (optional)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          type="email"
          placeholder="Your email*"
          required
          value={email}
          onChange={(e) => { setEmail(e.target.value); setEmailError(""); }}
        />
        {emailError && <p className="request-form-error request-form-email-error">{emailError}</p>}
        <textarea
          rows={3}
          placeholder="Tell me what's missing, or what worked well…*"
          required
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <button type="submit" disabled={status === "submitting"}>
          {status === "submitting" ? "Sending…" : "Send"}
        </button>
        {status === "error" && (
          <p className="request-form-error">
            Something went wrong — email{" "}
            <a href="mailto:support@payrolltool.in">support@payrolltool.in</a> directly instead.
          </p>
        )}
      </form>

      <style jsx>{`
        .request-form-card {
          background: var(--brand-50);
          border-radius: var(--radius-lg);
          padding: 32px;
          max-width: 480px;
        }
        .request-form-card h3 {
          font-size: 20px;
          margin-bottom: 6px;
        }
        .request-form-subtext {
          color: var(--ink-soft);
          font-size: 14px;
          margin-bottom: 20px;
        }
        .request-form-card form {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .request-form-card input,
        .request-form-card textarea {
          border: 1px solid var(--line);
          border-radius: 10px;
          padding: 10px 14px;
          font-size: 14px;
          font-family: inherit;
          color: var(--ink);
          background: var(--card);
          resize: none;
        }
        .request-form-card input:focus,
        .request-form-card textarea:focus {
          outline: none;
          border-color: var(--brand-600);
        }
        .request-form-card button {
          margin-top: 4px;
          background: var(--brand-600);
          color: white;
          border: none;
          border-radius: 100px;
          padding: 11px 24px;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          transition: background 0.2s ease;
        }
        .request-form-card button:hover:not(:disabled) {
          background: var(--brand-700);
        }
        .request-form-card button:disabled {
          opacity: 0.6;
          cursor: default;
        }
        .request-form-error {
          font-size: 13px;
          color: var(--ink-soft);
          margin-top: 4px;
        }
        .request-form-email-error {
          color: #dc2626;
          margin-top: -4px;
        }
        .request-form-error a {
          color: var(--brand-600);
          font-weight: 600;
        }
        .request-form-sent {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 12px;
          padding: 40px 32px;
        }
        .request-form-sent p {
          color: var(--ink);
          font-size: 15px;
        }
      `}</style>
    </div>
  );
}
