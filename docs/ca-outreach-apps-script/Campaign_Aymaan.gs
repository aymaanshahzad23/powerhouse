const AYMAAN_SHEET = "Aymaan CA DB";
const AYMAAN_CALENDLY = "https://calendly.com/aymaan-shahzad-powerhousetech/30min";

function runCampaign_Aymaan() {
  runCampaignForSheet(AYMAAN_SHEET, getSubject1_Aymaan, getBody1_Aymaan, getBody2_Aymaan);
}

function getSubject1_Aymaan() {
  return "IIT Bombay team for your CA practice";
}

function getBody1_Aymaan(name, firm) {
  return `Hi ${firm},

How many hours is your team spending this year converting financial statements into the new NCE format, the ICAI Guidance Note formats for non-corporate entities? And how much of that would you happily never touch again?

We build automations for CA practices that take this off your plate. Statements and balance sheets convert from your own format into NCE format in minutes, no manual work involved. GST, ITR, and TDS reminders go out on their own, so you're not the one chasing clients for documents. Anything repetitive eating into your team's time, we automate it.

We're a team out of IIT Bombay. We build around how your practice actually works, not a one-size tool.

Worth a 15-minute call? Happy to work around your schedule.
${AYMAAN_CALENDLY}`;
}

function getBody2_Aymaan(name, firm) {
  return `Hi ${firm},

Just bumping this in case it got buried — happy to walk you through how we're helping CA practices automate NCE conversion, compliance reminders, and other repetitive work.

Worth a quick 15-minute call? You can pick a slot here:
${AYMAAN_CALENDLY}`;
}
