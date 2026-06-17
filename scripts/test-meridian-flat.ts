#!/usr/bin/env -S deno run --allow-read --allow-run

import { extractTradingAccount } from '../supabase/functions/_shared/trading-account.ts';
import { extractBalanceSheetHints } from '../supabase/functions/_shared/balance-sheet.ts';
import {
  buildDeterministicMapping,
  computeProfitFromPl,
  deterministicToMappingResult,
} from '../supabase/functions/_shared/schedule-aggregator.ts';
import { reconcileMappingResult } from '../supabase/functions/_shared/reconcile-mapping.ts';

const root = new URL('..', import.meta.url).pathname;
const xlsxPath = `${root}/fixtures/nce/MERIDIAN_flat_tb.xlsx`;
const expectedPath = `${root}/fixtures/nce/meridian-expected.json`;

type Period = { current?: number };
type Expected = {
  entity_name: string;
  fy_end: string;
  profit_and_loss: Record<string, Period>;
  balance_sheet: {
    equity_and_liabilities: Record<string, Period>;
    assets: Record<string, Period>;
  };
  net_profit: number;
  tb_suspense: number;
};

async function xlsxToPack(path: string): Promise<string> {
  const cmd = new Deno.Command('python3', {
    args: ['-c', `
import pandas as pd, sys
path = sys.argv[1]
xl = pd.ExcelFile(path)
parts = []
for name in xl.sheet_names:
    if name.lower() == 'readme':
        continue
    df = pd.read_excel(path, sheet_name=name, header=None)
    df = df.map(lambda x: str(x).replace('\\n', ' ').strip() if isinstance(x, str) else x)
    parts.append('--- Sheet: ' + name + ' ---\\n' + df.to_csv(index=False, header=False))
print(''.join(parts))
`, path],
    stdout: 'piped',
  });
  const { code, stdout, stderr } = await cmd.output();
  if (code !== 0) throw new Error(new TextDecoder().decode(stderr));
  return new TextDecoder().decode(stdout);
}

function compareSection(
  label: string,
  actual: Record<string, { current?: number }>,
  expected: Record<string, Period>,
  tolerance = 100,
): number {
  let fail = 0;
  for (const [key, exp] of Object.entries(expected)) {
    const a = actual[key]?.current ?? 0;
    const e = exp.current ?? 0;
    const diff = Math.abs(a - e);
    if (diff <= tolerance) {
      console.log(`  ✓ ${key}: ${a}`);
    } else {
      fail++;
      console.log(`  ✗ ${key}: ${a} (expected ${e}, diff ${(a - e).toFixed(2)})`);
    }
  }
  console.log(`${label}: ${Object.keys(expected).length - fail}/${Object.keys(expected).length} ok\n`);
  return fail;
}

const expected: Expected = JSON.parse(await Deno.readTextFile(expectedPath));
const pack = await xlsxToPack(xlsxPath);
const trading = extractTradingAccount(pack);
const balance = extractBalanceSheetHints(pack);
const det = buildDeterministicMapping(pack, trading, balance);
const base = deterministicToMappingResult(det, expected.entity_name, expected.fy_end, '2023-03-31');
const { result } = reconcileMappingResult(base, trading, balance);

const pl = result.profit_and_loss as Record<string, { current: number }>;
const bs = result.balance_sheet as {
  equity_and_liabilities: Record<string, { current: number }>;
  assets: Record<string, { current: number }>;
};

console.log(`\n--- ${expected.entity_name} (complex flat TB) ---`);
console.log(`Coverage: ${det.deterministic_coverage_pct}%  Confidence: ${det.mapping_confidence}`);
console.log(`Unmapped: ${det.unmapped_ledgers.length}`);
if (det.unmapped_ledgers.length) {
  det.unmapped_ledgers.forEach((u) => console.log(`  - ${u.ledger_name}: ${u.amount}`));
}

let fails = 0;
fails += compareSection('P&L', pl, expected.profit_and_loss);
fails += compareSection('BS Liabilities', bs.equity_and_liabilities, expected.balance_sheet.equity_and_liabilities);
fails += compareSection('BS Assets', bs.assets, expected.balance_sheet.assets);

const profit = computeProfitFromPl(pl);
const profitDiff = Math.abs(profit - expected.net_profit);
if (profitDiff <= 5000) {
  console.log(`✓ Net profit: ${profit} (expected ${expected.net_profit})`);
} else {
  console.log(`✗ Net profit: ${profit} (expected ${expected.net_profit})`);
  fails++;
}

const ocl = bs.equity_and_liabilities.other_current_liabilities?.current ?? 0;
const oclExp = expected.balance_sheet.equity_and_liabilities.other_current_liabilities?.current ?? 0;
if (Math.abs(ocl - oclExp) <= 200) {
  console.log(`✓ OCL incl. suspense: ${ocl}`);
} else {
  console.log(`✗ OCL: ${ocl} (expected ${oclExp})`);
  fails++;
}

if (fails > 0) {
  console.log(`\n${fails} check(s) failed`);
  Deno.exit(1);
}
console.log('\n✓ MERIDIAN complex flat TB — all checks passed');
