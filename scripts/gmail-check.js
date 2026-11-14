// Read-only: checks that GMAIL_USER and GMAIL_APP_PASSWORD in .env.local can log in to Gmail.
// Sends no email and prints no password.
//   node --env-file=.env.local scripts/gmail-check.js
const nodemailer = require("nodemailer");

const user = process.env.GMAIL_USER || "";
const pass = process.env.GMAIL_APP_PASSWORD || "";
const masked = user.replace(/^(.).*(@.*)$/, "$1***$2");
console.log(`GMAIL_USER: ${masked || "(missing)"}`);
console.log(`GMAIL_APP_PASSWORD: ${pass ? pass.length + " characters" : "(missing)"}${/\s|"|'/.test(pass) ? " - contains a space or quote, remove it" : ""}`);
if (!/@gmail\.com$/i.test(user)) console.log("Note: GMAIL_USER should be the @gmail.com account you sign in with, not support@payrolltool.in.");
if (!user || !pass) process.exit(1);

nodemailer
  .createTransport({ service: "gmail", auth: { user, pass } })
  .verify()
  .then(() => { console.log("RESULT: login OK - the contact form and popup emails will send from this laptop."); process.exit(0); })
  .catch((e) => {
    console.log("RESULT: login refused - " + (e.response || e.message).split("\n")[0]);
    console.log("This password does not belong to " + masked + ". Create a new app password while signed in as that exact account.");
    process.exit(1);
  });
