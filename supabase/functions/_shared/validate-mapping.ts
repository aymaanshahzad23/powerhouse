import { computeProfitFromPl } from './schedule-aggregator.ts';
import type { TradingAccountHints } from './trading-account.ts';

type Period = { current: number; previous: number };

export type MappingValidation = {
  computed_net_profit: number;
  source_net_profit: number | null;
  profit_variance: number | null;
  profit_ok: boolean;
  warnings: string[];
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function validateMappingResult(
  result: Record<string, unknown>,
  tradingHints?: TradingAccountHints | null,
): MappingValidation {
  const pl = (result.profit_and_loss ?? {}) as Record<string, Period>;
  const computed = computeProfitFromPl(pl);

  let source: number | null = null;
  if (tradingHints?.netProfitCurrent != null) {
    source = tradingHints.netProfitCurrent;
  } else if (typeof result.net_profit_source === 'number') {
    source = result.net_profit_source as number;
  }

  const warnings: string[] = [];
  let profitVariance: number | null = null;
  let profitOk = true;

  if (source != null) {
    profitVariance = round2(computed - source);
    const tolerance = Math.max(5000, Math.abs(source) * 0.02);
    profitOk = Math.abs(profitVariance) <= tolerance;
    if (!profitOk) {
      warnings.push(
        `Computed P&L net ${computed} differs from source net profit ${source} by ${profitVariance}. Review COGS and expense classification.`,
      );
    }
  }

  const cogs = pl.cost_of_goods_sold?.current || 0;
  const revenue = (pl.revenue_from_operations?.current || 0) + (pl.other_income?.current || 0);
  if (cogs > revenue && revenue > 0) {
    warnings.push('Cost of goods sold exceeds total income — check opening/closing stock and purchase mapping.');
  }

  const coverage = Number(result.deterministic_coverage_pct ?? 0);
  if (coverage > 0 && coverage < 50) {
    warnings.push(`Only ${coverage}% of source amounts were mapped deterministically; review unmapped ledgers.`);
  }

  const unmapped = (result.unmapped_ledgers ?? []) as { ledger_name: string; amount: number }[];
  const materialUnmapped = unmapped.filter((u) => Math.abs(u.amount) > 50000);
  if (materialUnmapped.length) {
    warnings.push(`${materialUnmapped.length} material ledger(s) still unmapped.`);
  }

  return {
    computed_net_profit: computed,
    source_net_profit: source,
    profit_variance: profitVariance,
    profit_ok: profitOk,
    warnings,
  };
}
