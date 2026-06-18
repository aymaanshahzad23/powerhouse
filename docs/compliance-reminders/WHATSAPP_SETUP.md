# Compliance reminders — WhatsApp (n8n)

Mirrors the existing **email** workflow (`ca-filing-reminder`) with a parallel webhook for WhatsApp.

## 1. Workflow (already live)

**Active workflow:** [CA Filing Reminder — WhatsApp (Powerhouse)](https://aymaanshahzad23.app.n8n.cloud/workflow/JxeQdD9B0e7zkEEd) (`JxeQdD9B0e7zkEEd`)

Production webhook URL:

```
https://aymaanshahzad23.app.n8n.cloud/webhook/ca-filing-reminder-whatsapp
```

Source in repo: `workflows/n8n/ca-filing-reminder-whatsapp.sdk.js` (canonical; JSON import file is older).

**Send node:** `Send WhatsApp (Twilio)` is **disabled** until you add Twilio credentials (see §2). Parse + build + dry-run work without it.

Self-hosted: `https://<your-host>/webhook/ca-filing-reminder-whatsapp`

## 2. Twilio WhatsApp (recommended for testing)

1. [Twilio Console](https://console.twilio.com) → **Messaging → Try WhatsApp** → activate Sandbox.
2. Note **Sandbox number** (e.g. `+14155238886`) and join from your phone (`join <code>`).
3. In n8n → **Credentials → Twilio** → name it **Twilio WhatsApp** (Account SID + Auth Token).
4. Open workflow → **Send WhatsApp (Twilio)** → select that credential → **enable** the node → **Publish** again.
5. Optional env var on n8n host: `TWILIO_WHATSAPP_FROM=whatsapp:+14155238886`

Delete the duplicate inactive import (`eeyZAoCWwjorfNBo`) from your n8n workflow list if it still appears.

Sandbox limits: recipients must join the sandbox; business-initiated messages outside the 24h window need templates.

## 3. Test from terminal

```bash
# Connection test
./scripts/test-reminder-whatsapp.sh test

# Dry run (builds message, does not send)
./scripts/test-reminder-whatsapp.sh dry-run

# Live send (requires Twilio + sandbox join)
./scripts/test-reminder-whatsapp.sh send +919876543210
```

Override webhook:

```bash
N8N_WHATSAPP_WEBHOOK=https://your-n8n.example.com/webhook/ca-filing-reminder-whatsapp ./scripts/test-reminder-whatsapp.sh test
```

## 4. Dashboard

Compliance Reminders tab → **Delivery channel** → Email / WhatsApp / Both.

- Client template includes **Phone (WhatsApp)** column (E.164 or 10-digit Indian mobile).
- WhatsApp uses `N8N_WHATSAPP_WEBHOOK_URL` in `index.html` (same host as email by default).

## Payload shape

Same as email, plus `channel` and per-client `phone`:

```json
{
  "source": "powerhouse-dashboard",
  "triggeredAt": "2026-06-12T12:00:00.000Z",
  "triggeredBy": "ca@firm.in",
  "channel": "whatsapp",
  "dryRun": false,
  "clients": [
    {
      "name": "Acme Traders",
      "email": "client@example.com",
      "phone": "+919876543210",
      "reminders": [
        {
          "type": "gst",
          "label": "GST filing",
          "filingDueDate": "2026-07-20",
          "documentsDueBy": "2026-07-10"
        }
      ]
    }
  ]
}
```

## Alternative: Meta WhatsApp Cloud API

Replace **Send WhatsApp (Twilio)** with n8n’s **WhatsApp Business Cloud** node if you use Meta directly. Keep **Parse** and **Build Reminder WhatsApp** nodes unchanged; only swap the send node and credentials.
