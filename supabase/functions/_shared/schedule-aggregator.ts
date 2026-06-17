import type { BalanceSheetHints } from './balance-sheet.ts';
import type { TradingAccountHints } from './trading-account.ts';
import { aggregateSourceLedgers, parseSourceLedgers } from './source-ledger.ts';
import { sumPlExpenses } from './reconcile-mapping.ts';

type Period = { current: number; previous: number };

function period(current = 0, previous = 0): Period {
  return { current, previous };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function setPl(out: Record<string, Period>, key: string, current: number) {
  if (current > 0) out[key] = period(round2(current), 0);
}

function setBs(
  side: Record<string, Period>,
  key: string,
  current: number,
) {
  if (current > 0) side[key] = period(round2(current), 0);
}

export type DeterministicMapping = {
  entity_name?: string;
  balance_sheet: {
    equity_and_liabilities: Record<string, Period>;
    assets: Record<string, Period>;
  };
  profit_and_loss: Record<string, Period>;
  notes: Record<string, unknown>;
  unmapped_ledgers: { ledger_name: string; amount: number; reason: string }[];
  mapping_confidence: 'high' | 'medium' | 'low';
  deterministic_coverage_pct: number;
  net_profit_source?: number;
};

export function buildDeterministicMapping(
  sourceText: string,
  tradingHints: TradingAccountHints | null,
  balanceHints: BalanceSheetHints | null,
): DeterministicMapping {
  const lines = parseSourceLedgers(sourceText);
  const agg = aggregateSourceLedgers(lines);

  const pl: Record<string, Period> = {};
  const eq: Record<string, Period> = {};
  const assets: Record<string, Period> = {};
  const notes: Record<string, unknown> = {};

  // COGS from trading account parser (authoritative when confident)
  if (tradingHints && tradingHints.confidence !== 'low' && tradingHints.confidence !== 'none') {
    const c = tradingHints.current;
    if (c.cogs > 0) setPl(pl, 'cost_of_goods_sold', c.cogs);
    const inv: Record<string, Period> = {};
    if (c.openingStock > 0) inv.stock_in_trade_opening = period(c.openingStock, 0);
    if (c.closingStock > 0) inv.stock_in_trade_closing = period(c.closingStock, 0);
    if (Object.keys(inv).length) notes.inventories_breakup = inv;
    if (tradingHints.netProfitCurrent != null) {
      agg.netProfitSource = tradingHints.netProfitCurrent;
    }
  }

  // P&L from parsed expense/income lines
  for (const [key, val] of Object.entries(agg.pl)) {
    if (key === 'cost_of_goods_sold' && pl.cost_of_goods_sold?.current) continue;
    setPl(pl, key, val);
  }

  // BS from balance sheet hints (override aggregates when high confidence)
  if (balanceHints && balanceHints.confidence !== 'low' && balanceHints.confidence !== 'none') {
    const c = balanceHints.current;
    setBs(eq, 'owners_capital', c.owners_capital);
    setBs(eq, 'long_term_borrowings', c.long_term_borrowings);
    setBs(eq, 'short_term_borrowings', c.short_term_borrowings);
    setBs(eq, 'trade_payables', c.trade_payables);
    setBs(eq, 'other_current_liabilities', c.other_current_liabilities);
    setBs(assets, 'property_plant_equipment', c.property_plant_equipment);
    setBs(assets, 'long_term_loans_advances', c.long_term_loans_advances);
    setBs(assets, 'inventories', c.inventories);
    setBs(assets, 'trade_receivables', c.trade_receivables);
    setBs(assets, 'cash_and_bank', c.cash_and_bank);
    setBs(assets, 'short_term_loans_advances', c.short_term_loans_advances);
    if (c.other_current_assets > 0) setBs(assets, 'other_current_assets', c.other_current_assets);
    if (balanceHints.booksImbalance !== 0) {
      const suspense = round2(Math.abs(balanceHints.booksImbalance));
      if (suspense > 0) setBs(eq, 'other_long_term_liabilities', suspense);
    }
  }

  // BS from parsed lines (fill gaps; prefer larger figure when hint under-reported)
  for (const [key, val] of Object.entries(agg.bsEq)) {
    if (!eq[key]?.current) setBs(eq, key, val);
  }
  for (const [key, val] of Object.entries(agg.bsAssets)) {
    const existing = assets[key]?.current || 0;
    if (!existing || (val > existing && key !== 'other_current_assets')) {
      setBs(assets, key, val);
    }
  }

  // Merge cash in hand + bank into single line if both parsed
  const cash = agg.bsAssets.cash_and_bank || 0;
  if (cash > 0) setBs(assets, 'cash_and_bank', cash);

  if (agg.otherExpenseBreakup.length) {
    notes.other_expenses_breakup = agg.otherExpenseBreakup.map((r) => ({
      head: r.head,
      current: r.current,
      previous: 0,
    }));
    const breakupSum = round2(agg.otherExpenseBreakup.reduce((s, r) => s + r.current, 0));
    if (breakupSum > 0 && (!pl.other_expenses?.current || pl.other_expenses.current < breakupSum * 0.9)) {
      setPl(pl, 'other_expenses', breakupSum);
    }
  }

  const revenueKeys = Object.keys(agg.revenueBreakup);
  if (revenueKeys.length) {
    const revBreakup: Record<string, Period> = {};
    for (const [head, amt] of Object.entries(agg.revenueBreakup)) {
      if (/service/i.test(head)) revBreakup.sale_of_services = period(amt, 0);
      else if (/interest|incentive|dividend/i.test(head)) {
        /* handled in other_income */
      } else revBreakup.sale_of_products = period(
        round2((revBreakup.sale_of_products?.current || 0) + amt),
        0,
      );
    }
    notes.revenue_breakup = revBreakup;
    const revTotal = round2(Object.values(agg.revenueBreakup).reduce((s, v) => s + v, 0));
    const opRev = pl.revenue_from_operations?.current || 0;
    if (revTotal > opRev) setPl(pl, 'revenue_from_operations', revTotal);
  }

  const mappedValue = round2(
    Object.values(pl).reduce((s, p) => s + p.current, 0)
    + Object.values(eq).reduce((s, p) => s + p.current, 0)
    + Object.values(assets).reduce((s, p) => s + p.current, 0),
  );
  const sourceValue = round2(lines.reduce((s, l) => s + l.amount, 0));
  const coverage = sourceValue > 0 ? round2((mappedValue / sourceValue) * 100) : 0;

  let confidence: DeterministicMapping['mapping_confidence'] = 'low';
  if (coverage >= 70 && (tradingHints?.confidence === 'high' || balanceHints?.confidence === 'high')) {
    confidence = 'high';
  } else if (coverage >= 45) confidence = 'medium';

  return {
    balance_sheet: { equity_and_liabilities: eq, assets },
    profit_and_loss: pl,
    notes,
    unmapped_ledgers: agg.unmapped.map((u) => ({
      ledger_name: u.label,
      amount: u.amount,
      reason: u.reason,
    })),
    mapping_confidence: confidence,
    deterministic_coverage_pct: coverage,
    net_profit_source: agg.netProfitSource,
  };
}

export function formatDeterministicBlock(det: DeterministicMapping): string {
  const pl = det.profit_and_loss;
  const eq = det.balance_sheet.equity_and_liabilities;
  const assets = det.balance_sheet.assets;
  const lines = [
    'PARSED_SCHEDULE_TOTALS (deterministic from source — treat as authoritative for these heads; do not change unless clearly wrong):',
    ...Object.entries(pl).map(([k, v]) => `pl.${k}: ${v.current}`),
    ...Object.entries(eq).map(([k, v]) => `bs.liabilities.${k}: ${v.current}`),
    ...Object.entries(assets).map(([k, v]) => `bs.assets.${k}: ${v.current}`),
    `deterministic_coverage_pct: ${det.deterministic_coverage_pct}`,
    det.net_profit_source != null ? `source_net_profit: ${det.net_profit_source}` : null,
  ].filter(Boolean);
  return lines.join('\n');
}

export function mergeDeterministicOverLlm(
  llm: Record<string, unknown>,
  det: DeterministicMapping,
): Record<string, unknown> {
  const out = structuredClone(llm) as Record<string, unknown>;

  const pl = (out.profit_and_loss ?? {}) as Record<string, Period>;
  out.profit_and_loss = pl;
  for (const [key, val] of Object.entries(det.profit_and_loss)) {
    if (val.current > 0) pl[key] = { current: val.current, previous: val.previous ?? 0 };
  }

  const bs = (out.balance_sheet ?? {}) as {
    equity_and_liabilities?: Record<string, Period>;
    assets?: Record<string, Period>;
  };
  out.balance_sheet = bs;
  bs.equity_and_liabilities = bs.equity_and_liabilities ?? {};
  bs.assets = bs.assets ?? {};
  for (const [key, val] of Object.entries(det.balance_sheet.equity_and_liabilities)) {
    if (val.current > 0) bs.equity_and_liabilities![key] = { current: val.current, previous: 0 };
  }
  for (const [key, val] of Object.entries(det.balance_sheet.assets)) {
    if (val.current > 0) bs.assets![key] = { current: val.current, previous: 0 };
  }

  const notes = { ...((out.notes ?? {}) as Record<string, unknown>), ...det.notes };
  out.notes = notes;

  if (det.unmapped_ledgers.length) {
    const existing = (out.unmapped_ledgers ?? []) as typeof det.unmapped_ledgers;
    const names = new Set(existing.map((e) => e.ledger_name.toLowerCase()));
    for (const u of det.unmapped_ledgers) {
      if (!names.has(u.ledger_name.toLowerCase())) existing.push(u);
    }
    out.unmapped_ledgers = existing;
  }

  out.deterministic_coverage_pct = det.deterministic_coverage_pct;
  if (det.mapping_confidence === 'high') {
    out.mapping_confidence = 'high';
  }

  return out;
}

export function computeProfitFromPl(pl: Record<string, Period>): number {
  const revenue = (pl.revenue_from_operations?.current || 0) + (pl.other_income?.current || 0);
  const expenses = sumPlExpenses(pl, 'current');
  return round2(revenue - expenses);
}
