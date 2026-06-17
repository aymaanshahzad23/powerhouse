/** Extract and parse JSON from an LLM text response. */

export function parseJsonFromLlmText(rawText: string): Record<string, unknown> {
  let clean = String(rawText || '').trim();
  clean = clean.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

  const firstBrace = clean.indexOf('{');
  const lastBrace = clean.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    clean = clean.slice(firstBrace, lastBrace + 1);
  }

  return JSON.parse(clean) as Record<string, unknown>;
}
