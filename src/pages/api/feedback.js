import { google } from "googleapis";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { tool, rating, feedback } = req.body;

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
    range: "Sheet1!A:D",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[istTimestamp, tool || "", rating || "", feedback || ""]],
    },
  });

  res.status(200).json({ success: true });
  } catch (error) {
    console.error("Sheet write failed:", error);
    res.status(500).json({ error: "Failed to save feedback" });
  }
}