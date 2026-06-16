function runCampaignForSheet(sheetName, getSubject, getBody, getFollowUpBody) {
  const CONFIG = SHARED_CONFIG;

  if (MailApp.getRemainingDailyQuota() < CONFIG.MIN_GMAIL_QUOTA) {
    Logger.log("Low Gmail quota. Skipping.");
    return;
  }

  const sheet = getSheetByName(sheetName);
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return;

  const col = mapHeaders(data[0]);
  validateHeaders(col);
  flagBouncedRows(sheet, data, col);

  const now = new Date();
  let sentCount = 0;

  for (let i = 1; i < data.length && sentCount < CONFIG.BATCH_SIZE; i++) {
    const record = readRow(data[i], col);

    if (!record.email || !isValidEmail(record.email)) continue;
    if (TERMINAL_STATUSES.includes(record.status)) continue;

    // Partial failure: first mail sent but status never updated — don't resend
    if (record.threadId && (!record.status || record.status === "Pending")) continue;

    try {
      let sent = false;

      if (!record.status || record.status === "Pending") {
        sent = sendFirstEmail(sheet, i, col, record, now, getSubject, getBody);
      } else if (record.status === "Sent" && record.firstSentAt && getFollowUpBody) {
        sent = sendFollowUp(sheet, i, col, record, now, getFollowUpBody);
      }

      if (sent) {
        sentCount++;
        randomDelay(CONFIG);
      }
    } catch (e) {
      updateCell(sheet, i, col, "Remarks", e.message);
      updateCell(sheet, i, col, "Last Attempt", now);
      Logger.log(`Error processing ${record.email}: ${e.message}`);
    }
  }

  Logger.log(`${sheetName}: sent ${sentCount}`);
}

function sendFirstEmail(sheet, rowIndex, col, record, now, getSubject, getBody) {
  const subject = getSubject();
  sendOutreachEmail(record.email, subject, getBody(record.name, record.firm));

  updateCell(sheet, rowIndex, col, "Status", "Sent");
  updateCell(sheet, rowIndex, col, "First Sent At", now);
  updateCell(sheet, rowIndex, col, "Last Attempt", now);
  updateCell(sheet, rowIndex, col, "Remarks", "First email sent");

  const threadId = captureThreadId(sheet, rowIndex, col, record.email, subject);
  if (!threadId) {
    updateCell(sheet, rowIndex, col, "Remarks", "First email sent (Thread ID pending — will retry next run)");
  }

  return true;
}

function sendFollowUp(sheet, rowIndex, col, record, now, getFollowUpBody) {
  const hoursPassed = (now - new Date(record.firstSentAt)) / (1000 * 60 * 60);
  if (hoursPassed < SHARED_CONFIG.FOLLOWUP_AFTER_HOURS) return false;

  if (!record.threadId) {
    const sentThreads = GmailApp.search(`in:sent to:${record.email}`);
    if (sentThreads.length > 0) {
      const latest = sentThreads.sort((a, b) => b.getLastMessageDate() - a.getLastMessageDate())[0];
      updateCell(sheet, rowIndex, col, "Thread ID", latest.getId());
      record.threadId = latest.getId();
    }
  }

  if (!record.threadId) {
    updateCell(sheet, rowIndex, col, "Status", "Failed");
    updateCell(sheet, rowIndex, col, "Remarks", "Missing Thread ID, cannot send follow-up");
    updateCell(sheet, rowIndex, col, "Last Attempt", now);
    return false;
  }

  const thread = GmailApp.getThreadById(record.threadId);
  if (!thread) {
    updateCell(sheet, rowIndex, col, "Status", "Failed");
    updateCell(sheet, rowIndex, col, "Remarks", "Thread not found");
    updateCell(sheet, rowIndex, col, "Last Attempt", now);
    return false;
  }

  const messages = thread.getMessages();
  if (!messages.length) {
    updateCell(sheet, rowIndex, col, "Status", "Failed");
    updateCell(sheet, rowIndex, col, "Remarks", "Thread has no messages");
    updateCell(sheet, rowIndex, col, "Last Attempt", now);
    return false;
  }

  const anchor = messages[messages.length - 1];
  const messageId = anchor.getHeader("Message-ID");
  if (!messageId) {
    updateCell(sheet, rowIndex, col, "Status", "Failed");
    updateCell(sheet, rowIndex, col, "Remarks", "Missing Message-ID on original email");
    updateCell(sheet, rowIndex, col, "Last Attempt", now);
    return false;
  }

  const originalSubject = anchor.getSubject();
  const replySubject = /^Re:\s*/i.test(originalSubject)
    ? originalSubject
    : "Re: " + originalSubject;

  const plainBody = getFollowUpBody(record.name, record.firm);

  sendThreadedReply({
    to: record.email,
    from: Session.getActiveUser().getEmail(),
    subject: replySubject,
    plainBody: buildFollowUpPlain(plainBody, anchor),
    htmlBody: buildFollowUpHtml(plainBody, anchor),
    threadId: record.threadId,
    inReplyTo: messageId,
    references: messageId
  });

  updateCell(sheet, rowIndex, col, "Status", "Completed");
  updateCell(sheet, rowIndex, col, "Followup Sent At", now);
  updateCell(sheet, rowIndex, col, "Last Attempt", now);
  updateCell(sheet, rowIndex, col, "Remarks", "Follow-up sent in thread");

  return true;
}
