import { tallySystemPrompt } from './tally-system-prompt.ts';
import { reconcileMappingResult } from './reconcile-mapping.ts';
import { extractTradingAccount, formatTradingAccountBlock } from './trading-account.ts';
import { extractBalanceSheetHints, formatBalanceSheetBlock } from './balance-sheet.ts';
import {
  buildDeterministicMapping,
  formatDeterministicBlock,
  mergeDeterministicOverLlm,
} from './schedule-aggregator.ts';
import { validateMappingResult } from './validate-mapping.ts';

export const MAX_TALLY_CHARS = 80000;

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

  const tradingBlock = tradingHints ? `\n\n${formatTradingAccountBlock(tradingHints)}\n` : '';
  const balanceBlock = balanceHints ? `\n\n${formatBalanceSheetBlock(balanceHints)}\n` : '';
  const detBlock = `\n\n${formatDeterministicBlock(deterministic)}\n`;

  const userMessage =
    `Entity: ${entityName}\nFinancial year end: ${fyEnd}\nPrevious year end: ${prevFyEnd}\n\n`
    + `TALLY EXPORT DATA:\n${trimmed}${tradingBlock}${balanceBlock}${detBlock}\n`
    + `Fill notes, previous-year columns, and owners_capital_details. Do NOT change PARSED_SCHEDULE_TOTALS figures.`;

  const anthropicResp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: tallySystemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    }),
  });

  const anthropicBody = await anthropicResp.json().catch(() => ({}));

  if (!anthropicResp.ok) {
    throw new Error(`Mapping service error (HTTP ${anthropicResp.status})`);
  }

  const rawText = (anthropicBody as { content?: { type: string; text?: string }[] })
    .content?.find((b) => b.type === 'text')?.text || '';
  const clean = rawText.replace(/^```json\s*/i, '').replace(/\s*```$/, '').trim();

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(clean);
  } catch {
    throw new Error('Invalid mapping response from service');
  }

  parsed.entity_name = parsed.entity_name || entityName;
  parsed.fy_end = parsed.fy_end || fyEnd;
  parsed.prev_fy_end = parsed.prev_fy_end || prevFyEnd;

  const merged = mergeDeterministicOverLlm(parsed, deterministic);
  if (deterministic.net_profit_source != null) {
    merged.net_profit_source = deterministic.net_profit_source;
  }

  const { result } = reconcileMappingResult(merged, tradingHints, balanceHints);
  result.mapping_validation = validateMappingResult(result, tradingHints);
  return result;
}
