#!/usr/bin/env bash
# Test CA filing reminder WhatsApp webhook on your n8n instance.
set -euo pipefail

WEBHOOK="${N8N_WHATSAPP_WEBHOOK:-https://aymaanshahzad23.app.n8n.cloud/webhook/ca-filing-reminder-whatsapp}"
MODE="${1:-test}"
PHONE="${2:-+919876543210}"

payload() {
  local extra="$1"
  cat <<EOF
{
  "source": "powerhouse-test-script",
  "triggeredAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "triggeredBy": "local-test@powerhouse",
  "channel": "whatsapp",
  $extra
  "clients": [
    {
      "name": "Test Client",
      "email": "test@example.com",
      "phone": "$PHONE",
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
EOF
}

case "$MODE" in
  test)
    BODY='{"test":true,"dryRun":true,"clients":[]}'
    ;;
  dry-run)
    BODY=$(payload '"dryRun":true,')
    ;;
  send)
    BODY=$(payload '"dryRun":false,')
    ;;
  *)
    echo "Usage: $0 [test|dry-run|send] [phone_e164]" >&2
    exit 1
    ;;
esac

echo "POST $WEBHOOK ($MODE)"
echo "$BODY" | jq . 2>/dev/null || echo "$BODY"
echo "---"
curl -sS -X POST "$WEBHOOK" \
  -H "Content-Type: application/json" \
  -d "$BODY" | jq . 2>/dev/null || curl -sS -X POST "$WEBHOOK" -H "Content-Type: application/json" -d "$BODY"
echo
