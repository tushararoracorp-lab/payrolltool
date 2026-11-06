import { google } from "googleapis";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { tool, rating, feedback, name, email, updates } = req.body || {};

  // Cells starting with = + - @ would run as a spreadsheet formula, so user text is stored as plain text.
  const cell = (v, max) => {
    const t = String(v == null ? "" : v).replace(/[\r\n]+/g, " ").trim().slice(0, max);
    return /^[=+\-@]/.test(t) ? "'" + t : t;
  };
  const mail = cell(email, 120);
  const validMail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail) ? mail : "";
  // "Yes" only when the person ticked the box and gave a valid email; otherwise blank.
  const wantsUpdates = updates === true && validMail ? "Yes" : validMail ? "No" : "";

  try {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
        private_key: Buffer.from(process.env.GOOGLE_SHEETS_PRIVATE_KEY_BASE64, "base64").toString("utf-8"),
      },
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

  const sheets = google.sheets({ version: "v4", auth });

  const istTimestamp = new Date().toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "numeric", minute: "2-digit", second: "2-digit",
    hour12: true,
  });

  await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: "Sheet1!A:G",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      // Timestamp | Tool | Sender Name | Email address | Rating | Feedback | Wants updates
      values: [[istTimestamp, cell(tool, 60), cell(name, 80), validMail, cell(rating, 30), cell(feedback, 1100), wantsUpdates]],
    },
  });

  res.status(200).json({ success: true });
  } catch (error) {
    console.error("Sheet write failed:", error);
    res.status(500).json({ error: "Failed to save feedback" });
  }
}