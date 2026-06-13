const systemPrompt = require('./lib/tally-system-prompt');

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const MAX_TALLY_CHARS = 80000;

function json(statusCode, body) {
  return {
    statusCode,
    headers: JSON_HEADERS,
    body: JSON.stringify(body),
  };
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: JSON_HEADERS, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return json(500, { error: 'ANTHROPIC_API_KEY is not configured on the server.' });
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch {
    return json(400, { error: 'Invalid JSON body' });
  }

  const entityName = String(payload.entityName || 'Entity Name').slice(0, 500);
  const fyEnd = String(payload.fyEnd || '2026-03-31').slice(0, 32);
  const prevFyEnd = String(payload.prevFyEnd || '2025-03-31').slice(0, 32);
  const tallyData = String(payload.tallyData || '').slice(0, MAX_TALLY_CHARS);

  if (!tallyData.trim()) {
    return json(400, { error: 'tallyData is required' });
  }

  const userMessage = `Entity: ${entityName}\nFinancial year end: ${fyEnd}\nPrevious year end: ${prevFyEnd}\n\nTALLY EXPORT DATA:\n${tallyData}`;

  let anthropicResp;
  try {
    anthropicResp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      }),
    });
  } catch (err) {
    return json(502, { error: 'Could not reach Anthropic API: ' + err.message });
  }

  const anthropicBody = await anthropicResp.json().catch(() => ({}));

  if (!anthropicResp.ok) {
    return json(anthropicResp.status, {
      error: anthropicBody.error?.message || `Anthropic API HTTP ${anthropicResp.status}`,
    });
  }

  const rawText = anthropicBody.content?.find((b) => b.type === 'text')?.text || '';
  const clean = rawText.replace(/^```json\s*/i, '').replace(/\s*```$/, '').trim();

  try {
    return json(200, JSON.parse(clean));
  } catch {
    return json(502, {
      error: 'Claude returned invalid JSON',
      preview: rawText.slice(0, 300),
    });
  }
};
