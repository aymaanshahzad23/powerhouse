#!/usr/bin/env -S deno run --allow-read

import { extractTradingAccount } from '../supabase/functions/_shared/trading-account.ts';
import { extractBalanceSheetHints } from '../supabase/functions/_shared/balance-sheet.ts';
import { buildDeterministicMapping, computeProfitFromPl } from '../supabase/functions/_shared/schedule-aggregator.ts';
import { reconcileMappingResult } from '../supabase/functions/_shared/reconcile-mapping.ts';
import { validateMappingResult } from '../supabase/functions/_shared/validate-mapping.ts';

const root = new URL('..', import.meta.url).pathname;
const xlsPath = `${root}/fixtures/nce/ABC_2019-20_source.xls`;
const expectedPath = `${root}/fixtures/nce/abc-expected.json`;

async function xlsToPackText(path: string): Promise<string> {
  const cmd = new Deno.Command('python3', {
    args: ['-c', `
import pandas as pd, sys
path = sys.argv[1]
xl = pd.ExcelFile(path)
parts = []
for name in xl.sheet_names:
    df = pd.read_excel(path, sheet_name=name, header=None)
    df = df.map(lambda x: str(x).replace('\\n', ' ').strip() if isinstance(x, str) else x)
    parts.append('--- Sheet: ' + name + ' ---\\n' + df.to_csv(index=False, header=False, sep='\\t'))
print(''.join(parts))
`, path],
    stdout: 'piped',
  });
  const { code, stdout, stderr } = await cmd.output();
  if (code !== 0) {
    throw new Error(new TextDecoder().decode(stderr));
  }
  return new TextDecoder().decode(stdout);
}

function compareSection(
  label: string,
  actual: Record<string, { current?: number }>,
  expected: Record<string, { current?: number }>,
  tolerance = 500,
) {
  let ok = 0;
  let fail = 0;
  for (const [key, exp] of Object.entries(expected)) {
    const a = actual[key]?.current ?? 0;
    const e = exp.current ?? 0;
    const diff = Math.abs(a - e);
    if (diff <= tolerance || (e > 0 && diff / e < 0.02)) {
      ok++;
      console.log(`  ✓ ${key}: ${a} (expected ${e})`);
    } else {
      fail++;
      console.log(`  ✗ ${key}: ${a} (expected ${e}, diff ${(a - e).toFixed(2)})`);
    }
  }
  console.log(`${label}: ${ok} ok, ${fail} failed\n`);
  return fail;
}

const packText = await xlsToPackText(xlsPath);
const trading = extractTradingAccount(packText);
const balance = extractBalanceSheetHints(packText);
const det = buildDeterministicMapping(packText, trading, balance);

console.log('Trading hints:', trading?.current);
console.log('Deterministic coverage:', det.deterministic_coverage_pct + '%');
console.log('COGS (det):', det.profit_and_loss.cost_of_goods_sold?.current);
console.log('Revenue (det):', det.profit_and_loss.revenue_from_operations?.current);

const { result } = reconcileMappingResult(
  {
    entity_name: 'ABC AUTOMOBILE SERVICE CENTER',
    fy_end: '2020-03-31',
    balance_sheet: det.balance_sheet,
    profit_and_loss: det.profit_and_loss,
    notes: det.notes,
    unmapped_ledgers: det.unmapped_ledgers,
  },
  trading,
  balance,
);

const validation = validateMappingResult(result, trading);
console.log('Computed profit:', validation.computed_net_profit);
console.log('Source net profit:', validation.source_net_profit);
console.log('Profit OK:', validation.profit_ok);
if (validation.warnings.length) console.log('Warnings:', validation.warnings);

const expected = JSON.parse(await Deno.readTextFile(expectedPath));
let failures = 0;
failures += compareSection('P&L', result.profit_and_loss as Record<string, { current: number }>, expected.profit_and_loss);
failures += compareSection(
  'BS Liabilities',
  (result.balance_sheet as { equity_and_liabilities: Record<string, { current: number }> }).equity_and_liabilities,
  expected.balance_sheet.equity_and_liabilities,
);
failures += compareSection(
  'BS Assets',
  (result.balance_sheet as { assets: Record<string, { current: number }> }).assets,
  expected.balance_sheet.assets,
);

const computed = computeProfitFromPl(result.profit_and_loss as Record<string, { current: number }>);
const npDiff = Math.abs(computed - expected.net_profit_current);
if (npDiff > 5000) {
  console.log(`✗ Net profit: ${computed} vs expected ${expected.net_profit_current}`);
  failures++;
} else {
  console.log(`✓ Net profit within tolerance: ${computed}`);
}

Deno.exit(failures > 0 ? 1 : 0);
