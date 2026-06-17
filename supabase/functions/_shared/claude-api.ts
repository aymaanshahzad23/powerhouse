import { tallyNotesPrompt } from './tally-notes-prompt.ts';
import { parseJsonFromLlmText } from './parse-llm-json.ts';
import { getAnthropicModel } from './anthropic-model.ts';
import { reconcileMappingResult } from './reconcile-mapping.ts';
import { extractTradingAccount, formatTradingAccountBlock } from './trading-account.ts';
import { extractBalanceSheetHints, formatBalanceSheetBlock } from './balance-sheet.ts';
import {
  applyNotesSupplement,
  buildDeterministicMapping,
  deterministicToMappingResult,
  formatDeterministicBlock,
} from './schedule-aggregator.ts';
import { validateMappingResult } from './validate-mapping.ts';

export const MAX_TALLY_CHARS = 80000;

async function fetchNotesSupplement(
  userMessage: string,
  apiKey: string,
): Promise<Record<string, unknown> | null> {
  const anthropicResp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: getAnthropicModel(),
      max_tokens: 4096,
      system: tallyNotesPrompt,
      messages: [{ role: 'user', content: userMessage }],
    }),
  });

  const anthropicBody = await anthropicResp.json().catch(() => ({}));
  if (!anthropicResp.ok) {
    return null;
  }

  const rawText = (anthropicBody as { content?: { type: string; text?: string }[] })
    .content?.find((b) => b.type === 'text')?.text || '';

  try {
    return parseJsonFromLlmText(rawText);
  } catch {
    return null;
  }
}

export async function mapTallyWithClaude({
  entityName,
  fyEnd,
  prevFyEnd,
  tallyData,
  apiKey,
}: {
  entityName: string;
  fyEnd: string;
  prevFyEnd: string;
  tallyData: string;
  apiKey: string;
}): Promise<Record<string, unknown>> {
  const trimmed = String(tallyData || '').slice(0, MAX_TALLY_CHARS);
  if (!trimmed.trim()) {
    throw new Error('tallyData is required');
  }

  const tradingHints = extractTradingAccount(trimmed);
  const balanceHints = extractBalanceSheetHints(trimmed);
  const deterministic = buildDeterministicMapping(trimmed, tradingHints, balanceHints);

  const base = deterministicToMappingResult(deterministic, entityName, fyEnd, prevFyEnd);
  if (deterministic.net_profit_source != null) {
    base.net_profit_source = deterministic.net_profit_source;
  }

  const tradingBlock = tradingHints ? `\n\n${formatTradingAccountBlock(tradingHints)}\n` : '';
  const balanceBlock = balanceHints ? `\n\n${formatBalanceSheetBlock(balanceHints)}\n` : '';
  const detBlock = `\n\n${formatDeterministicBlock(deterministic)}\n`;

  const userMessage =
    `Entity: ${entityName}\nFinancial year end: ${fyEnd}\nPrevious year end: ${prevFyEnd}\n\n`
    + `TALLY EXPORT DATA:\n${trimmed}${tradingBlock}${balanceBlock}${detBlock}\n`
    + `Return notes and previous_year JSON only. Current-year totals are final.`;

  const supplement = await fetchNotesSupplement(userMessage, apiKey);
  let notesFromLlm = false;
  if (supplement) {
    applyNotesSupplement(base, supplement);
    notesFromLlm = true;
  }

  const { result } = reconcileMappingResult(base, tradingHints, balanceHints);
  const validation = validateMappingResult(result, tradingHints);
  if (!notesFromLlm) {
    validation.warnings.push(
      'Previous-year columns and extended notes could not be filled by the mapping service; current-year figures are from parsed source.',
    );
  }
  result.mapping_validation = validation;
  return result;
}
