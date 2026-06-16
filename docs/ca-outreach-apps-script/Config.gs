const SPREADSHEET_ID = "1bZSPsrZVykUOY23UBnY6rUD1sW1UlwRNwB0Lc8udX2A";

// Set to false before going live
const IS_TEST_MODE = false;

const SHARED_CONFIG = IS_TEST_MODE
  ? {
      BATCH_SIZE: 2,
      FOLLOWUP_AFTER_HOURS: 0.01,
      MIN_DELAY_MS: 5000,
      MAX_DELAY_MS: 10000,
      MIN_GMAIL_QUOTA: 20
    }
  : {
      // ~15–17 sends per run (at 1–2.5 min delays, fits Workspace 30 min limit)
      // At 6 runs/day → ~100 emails/day per account, ~300 across 3 accounts
      BATCH_SIZE: 25,
      FOLLOWUP_AFTER_HOURS: 48,
      MIN_DELAY_MS: 60000,    // 1 min
      MAX_DELAY_MS: 150000,   // 2.5 min
      MIN_GMAIL_QUOTA: 30
    };

const TERMINAL_STATUSES = ["Completed", "Bounced", "Failed"];

const REQUIRED_HEADERS = [
  "Name", "Email", "Firm", "Status", "First Sent At",
  "Followup Sent At", "Bounce Status", "Remarks",
  "Last Attempt", "Thread ID"
];

function getSheetByName(sheetName) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    throw new Error(`Sheet '${sheetName}' not found. Available: ${ss.getSheets().map(s => s.getName()).join(", ")}`);
  }
  return sheet;
}

function mapHeaders(headerRow) {
  const col = {};
  headerRow.forEach((h, i) => { col[String(h).trim()] = i; });
  return col;
}

function validateHeaders(col) {
  const missing = REQUIRED_HEADERS.filter(h => !(h in col));
  if (missing.length) throw new Error("Missing headers: " + missing.join(", "));
}

function readRow(row, col) {
  return {
    name: safe(row[col["Name"]]),
    email: safe(row[col["Email"]]),
    firm: safe(row[col["Firm"]]),
    status: safe(row[col["Status"]]),
    firstSentAt: row[col["First Sent At"]],
    threadId: safe(row[col["Thread ID"]])
  };
}

function safe(value) { return String(value || "").trim(); }

function updateCell(sheet, rowIndex, col, header, value) {
  sheet.getRange(rowIndex + 1, col[header] + 1).setValue(value);
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function randomDelay(config) {
  const delay = config.MIN_DELAY_MS + Math.random() * (config.MAX_DELAY_MS - config.MIN_DELAY_MS);
  Logger.log(`Sleeping for ${Math.round(delay / 1000)} sec`);
  Utilities.sleep(delay);
}

function getBouncedEmails() {
  const bounced = new Set();
  try {
    GmailApp.search("from:mailer-daemon newer_than:30d").forEach(thread => {
      thread.getMessages().forEach(msg => {
        const matches = msg.getPlainBody().match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/ig);
        if (matches) matches.forEach(e => bounced.add(e.toLowerCase()));
      });
    });
  } catch (e) {
    Logger.log("Bounce detection failed: " + e);
  }
  return bounced;
}

function flagBouncedRows(sheet, data, col) {
  const bounced = getBouncedEmails();
  for (let i = 1; i < data.length; i++) {
    const email = safe(data[i][col["Email"]]).toLowerCase();
    if (bounced.has(email)) {
      updateCell(sheet, i, col, "Bounce Status", "YES");
      updateCell(sheet, i, col, "Status", "Bounced");
      updateCell(sheet, i, col, "Remarks", "Mail bounced");
      data[i][col["Status"]] = "Bounced";
    }
  }
}

// --- Email helpers ---

function sendOutreachEmail(to, subject, plainBody) {
  const signature = getGmailSignature();
  const closing =
    '<p style="margin:16px 0 8px 0;line-height:1.6;font-family:Arial,sans-serif;font-size:14px;color:#222;">Best regards,</p>';

  const htmlBody = plainBodyToHtml(plainBody) + closing +
    (signature ? signature : "");

  GmailApp.sendEmail(to, subject, plainBody + "\n\nBest regards,", { htmlBody: htmlBody });
}

function getGmailSignature() {
  try {
    const email = Session.getActiveUser().getEmail();
    const sendAs = Gmail.Users.Settings.SendAs.get("me", email);
    return sendAs.signature || "";
  } catch (e) {
    Logger.log("Could not fetch Gmail signature: " + e.message);
    return "";
  }
}

function plainBodyToHtml(text) {
  return text
    .split(/\n\n+/)
    .map(para => {
      const escaped = escapeHtml(para.trim()).replace(/\n/g, "<br>");
      const linked = escaped.replace(
        /(https?:\/\/[^\s<]+)/g,
        '<a href="$1" style="color:#1a73e8;">$1</a>'
      );
      return `<p style="margin:0 0 16px 0;line-height:1.6;font-family:Arial,sans-serif;font-size:14px;color:#222;">${linked}</p>`;
    })
    .join("");
}

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function wrapSignature(signature) {
  if (!signature) return "";
  return '<div dir="ltr" class="gmail_signature" data-smartmail="gmail_signature">' +
    signature + "</div>";
}

function buildFollowUpHtml(plainBody, anchorMessage) {
  const closing =
    '<p style="margin:16px 0 8px 0;line-height:1.6;font-family:Arial,sans-serif;font-size:14px;color:#222;">Best regards,</p>';

  return '<div dir="ltr">' +
    plainBodyToHtml(plainBody) +
    closing +
    wrapSignature(getGmailSignature()) +
    "</div>" +
    buildQuotedHtml(anchorMessage);
}

function buildFollowUpPlain(plainBody, anchorMessage) {
  const date = Utilities.formatDate(
    anchorMessage.getDate(),
    Session.getScriptTimeZone(),
    "EEE, MMM d, yyyy 'at' h:mm a"
  );
  const quoted = anchorMessage.getPlainBody()
    .split("\n")
    .map(line => "> " + line)
    .join("\n");

  return plainBody +
    "\n\nBest regards,\n\n" +
    "On " + date + " " + anchorMessage.getFrom() + " wrote:\n" +
    quoted;
}

function buildQuotedHtml(msg) {
  const date = Utilities.formatDate(
    msg.getDate(),
    Session.getScriptTimeZone(),
    "EEE, MMM d, yyyy 'at' h:mm a"
  );
  const from = escapeHtml(msg.getFrom());
  const plainQuote = escapeHtml(msg.getPlainBody()).replace(/\n/g, "<br>");

  return '<div class="gmail_quote gmail_quote_container">' +
    '<div dir="ltr" class="gmail_attr">On ' + date + " " + from + " wrote:</div>" +
    '<blockquote class="gmail_quote" style="margin:0 0 0 .8ex;border-left:1px #ccc solid;padding-left:1ex">' +
    plainQuote +
    "</blockquote></div>";
}

function sendThreadedReply(params) {
  const boundary = "ph_" + Utilities.getUuid().replace(/-/g, "");

  const rawMessage = [
    "From: " + params.from,
    "To: " + params.to,
    "Subject: " + params.subject,
    "In-Reply-To: " + params.inReplyTo,
    "References: " + params.references,
    "MIME-Version: 1.0",
    "Content-Type: multipart/alternative; boundary=\"" + boundary + "\"",
    "",
    "--" + boundary,
    "Content-Type: text/plain; charset=UTF-8",
    "",
    params.plainBody,
    "",
    "--" + boundary,
    "Content-Type: text/html; charset=UTF-8",
    "",
    params.htmlBody,
    "",
    "--" + boundary + "--"
  ].join("\r\n");

  const encoded = Utilities.base64EncodeWebSafe(
    Utilities.newBlob(rawMessage).getBytes()
  ).replace(/=+$/, "");

  Gmail.Users.Messages.send({
    raw: encoded,
    threadId: params.threadId
  }, "me");
}

function captureThreadId(sheet, rowIndex, col, email, subject) {
  try {
    Utilities.sleep(3000);
    const threads = GmailApp.search(`in:sent to:${email} subject:"${subject}"`);
    if (threads.length > 0) {
      const latest = threads.sort((a, b) => b.getLastMessageDate() - a.getLastMessageDate())[0];
      updateCell(sheet, rowIndex, col, "Thread ID", latest.getId());
      return latest.getId();
    }
  } catch (e) {
    Logger.log(`Thread lookup failed for ${email}: ${e.message}`);
  }
  return "";
}
