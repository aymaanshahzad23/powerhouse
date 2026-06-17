#!/usr/bin/env -S deno run --allow-read --allow-run

import { extractTradingAccount } from '../supabase/functions/_shared/trading-account.ts';
import { extractBalanceSheetHints } from '../supabase/functions/_shared/balance-sheet.ts';
import {
  buildDeterministicMapping,
  computeProfitFromPl,
  deterministicToMappingResult,
} from '../supabase/functions/_shared/schedule-aggregator.ts';
import { reconcileMappingResult } from '../supabase/functions/_shared/reconcile-mapping.ts';

const path = '/Users/aymaanshahzad23/Downloads/Trial_Balance_ZENITH_FLAT_FY2024.xlsx';
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
const pack = new TextDecoder().decode(stdout);

const trading = extractTradingAccount(pack);
const balance = extractBalanceSheetHints(pack);
const det = buildDeterministicMapping(pack, trading, balance);
const base = deterministicToMappingResult(det, 'NOVA CHEMICAL TRADERS', '2024-03-31', '2023-03-31');
const { result } = reconcileMappingResult(base, trading, balance);
const pl = result.profit_and_loss as Record<string, { current: number }>;
const bs = result.balance_sheet as {
  equity_and_liabilities: Record<string, { current: number }>;
  assets: Record<string, { current: number }>;
};

const rev = pl.revenue_from_operations?.current ?? 0;
const cogs = pl.cost_of_goods_sold?.current ?? 0;
const profit = computeProfitFromPl(pl);
const capital = bs.equity_and_liabilities.owners_capital?.current ?? 0;
const ocl = bs.equity_and_liabilities.other_current_liabilities?.current ?? 0;

console.log('coverage:', det.deterministic_coverage_pct, 'confidence:', det.mapping_confidence);
console.log('revenue:', rev, '(expected ~25954489)');
console.log('cogs:', cogs, '(expected ~18708135.7)');
console.log('profit:', profit, '(expected ~-1813353.1)');
console.log('owners_capital:', capital, '(expected ~10660537.35)');
console.log('ocl:', ocl, '(expected ~2214485.55 incl. suspense)');
console.log('unmapped:', det.unmapped_ledgers.length);

const checks = [
  Math.abs(rev - 25_954_489) < 100,
  Math.abs(cogs - 18_708_135.7) < 100,
  Math.abs(profit - (-1_813_353.1)) < 5000,
  Math.abs(capital - 10_660_537.35) < 100,
  Math.abs(ocl - 2_214_485.55) < 500,
  rev > 0 && cogs > 0,
];
if (checks.every(Boolean)) {
  console.log('\n✓ NOVA flat TB checks passed');
} else {
  console.log('\n✗ NOVA flat TB checks failed');
  Deno.exit(1);
}
