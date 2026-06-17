#!/usr/bin/env -S deno run --allow-read --allow-run --allow-env --allow-net

import { extractTradingAccount } from '../supabase/functions/_shared/trading-account.ts';
import { extractBalanceSheetHints } from '../supabase/functions/_shared/balance-sheet.ts';
import {
  applyNotesSupplement,
  buildDeterministicMapping,
  computeProfitFromPl,
  deterministicToMappingResult,
} from '../supabase/functions/_shared/schedule-aggregator.ts';
import { reconcileMappingResult } from '../supabase/functions/_shared/reconcile-mapping.ts';
import { validateMappingResult } from '../supabase/functions/_shared/validate-mapping.ts';
import { parseJsonFromLlmText } from '../supabase/functions/_shared/parse-llm-json.ts';
import { mapTallyWithClaude } from '../supabase/functions/_shared/claude-api.ts';

const root = new URL('..', import.meta.url).pathname;

type Check = { name: string; ok: boolean; detail?: string };

const checks: Check[] = [];

function pass(name: string, detail = '') {
  checks.push({ name, ok: true, detail });
  console.log(`  ✓ ${name}${detail ? ` — ${detail}` : ''}`);
}

function fail(name: string, detail: string) {
  checks.push({ name, ok: false, detail });
  console.log(`  ✗ ${name} — ${detail}`);
}

async function xlsxToBrowserCsvPack(path: string, skipReadme = true): Promise<string> {
  const cmd = new Deno.Command('python3', {
    args: ['-c', `
import pandas as pd, sys
path = sys.argv[1]
skip = sys.argv[2] == '1'
xl = pd.ExcelFile(path)
parts = []
for name in xl.sheet_names:
    if skip and name.lower() == 'readme':
        continue
    df = pd.read_excel(path, sheet_name=name, header=None)
    df = df.map(lambda x: str(x).replace('\\n', ' ').strip() if isinstance(x, str) else x)
    parts.append('--- Sheet: ' + name + ' ---\\n' + df.to_csv(index=False, header=False))
print(''.join(parts))
`, path, skipReadme ? '1' : '0'],
    stdout: 'piped',
  });
  const { code, stdout, stderr } = await cmd.output();
  if (code !== 0) throw new Error(new TextDecoder().decode(stderr));
  return new TextDecoder().decode(stdout);
}

function getByPath(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce((acc: unknown, key) => {
    if (acc && typeof acc === 'object') return (acc as Record<string, unknown>)[key];
    return undefined;
  }, obj);
}

async function loadTemplatePaths(): Promise<string[]> {
  const map = JSON.parse(await Deno.readTextFile(`${root}/template_map.json`));
  const paths: string[] = [];
  for (const key of Object.keys(map.balance_sheet ?? {})) {
    paths.push(`balance_sheet.${key}`);
  }
  for (const key of Object.keys(map.profit_and_loss ?? {})) {
    if (['total_income', 'total_expenses', 'profit_before_exceptional', 'profit_before_extraordinary', 'profit_before_remuneration'].includes(key)) continue;
    paths.push(`profit_and_loss.${key}`);
  }
  return paths;
}

function runPipeline(packText: string, entity: string, fyEnd: string, prevFyEnd: string) {
  const trading = extractTradingAccount(packText);
  const balance = extractBalanceSheetHints(packText);
  const det = buildDeterministicMapping(packText, trading, balance);
  const base = deterministicToMappingResult(det, entity, fyEnd, prevFyEnd);
  const { result } = reconcileMappingResult(base, trading, balance);
  result.mapping_validation = validateMappingResult(result, trading);
  return { result, trading, balance, det };
}

function assertSchema(result: Record<string, unknown>, label: string) {
  const required = [
    'entity_name', 'fy_end', 'balance_sheet', 'profit_and_loss', 'notes', 'unmapped_ledgers',
  ];
  for (const key of required) {
    if (!(key in result)) {
      fail(`${label}: schema`, `missing top-level ${key}`);
      return;
    }
  }
  pass(`${label}: schema`, 'top-level keys present');
}

function assertTemplateNode(node: unknown, path: string): boolean {
  if (!node || typeof node !== 'object') return false;
  const p = node as { current?: unknown; previous?: unknown };
  return typeof p.current === 'number' && typeof p.previous === 'number';
}

async function assertTemplatePaths(result: Record<string, unknown>, label: string) {
  const paths = await loadTemplatePaths();
  let missing = 0;
  for (const path of paths) {
    const node = getByPath(result, path);
    if (!assertTemplateNode(node, path)) missing++;
  }
  if (missing > 0) fail(`${label}: template paths`, `${missing}/${paths.length} paths missing or invalid`);
  else pass(`${label}: template paths`, `${paths.length} resolvable`);
}

// --- unit checks ---
try {
  parseJsonFromLlmText('```json\n{"notes":{},"previous_year":{}}\n```');
  pass('parseJsonFromLlmText', 'markdown fence');
} catch (e) {
  fail('parseJsonFromLlmText', String(e));
}

const base = deterministicToMappingResult(
  buildDeterministicMapping('', null, null),
  'Test', '2024-03-31', '2023-03-31',
);
applyNotesSupplement(base, {
  notes: { cash_in_hand: { previous: 100 } },
  previous_year: { profit_and_loss: { revenue_from_operations: 999 } },
});
const pl = base.profit_and_loss as Record<string, { previous: number }>;
if (pl.revenue_from_operations?.previous === 999) pass('applyNotesSupplement', 'previous year merged');
else fail('applyNotesSupplement', `expected 999 got ${pl.revenue_from_operations?.previous}`);

console.log('\n--- ABC (golden) ---');
const abcPath = `${root}/fixtures/nce/ABC_2019-20_source.xls`;
const abcPack = await xlsxToBrowserCsvPack(abcPath, false);
const abc = runPipeline(abcPack, 'ABC AUTOMOBILE SERVICE CENTER', '2020-03-31', '2019-03-31');
assertSchema(abc.result as Record<string, unknown>, 'ABC');
await assertTemplatePaths(abc.result as Record<string, unknown>, 'ABC');
const abcPl = (abc.result as { profit_and_loss: Record<string, { current: number }> }).profit_and_loss;
const abcProfit = computeProfitFromPl(abcPl);
if (Math.abs(abcProfit - (-1120765.85)) < 5000) pass('ABC: net profit', String(abcProfit));
else fail('ABC: net profit', `${abcProfit} vs -1120765.85`);
if ((abcPl.revenue_from_operations?.current ?? 0) > 14_000_000) pass('ABC: revenue', String(abcPl.revenue_from_operations?.current));
else fail('ABC: revenue', String(abcPl.revenue_from_operations?.current));

console.log('\n--- ZENITH (browser CSV) ---');
const zenithCandidates = [
  `${root}/../Downloads/ZENITH_QA_test.xlsx`,
  '/Users/aymaanshahzad23/Downloads/ZENITH_QA_test.xlsx',
];
let zenithPack = '';
for (const candidate of zenithCandidates) {
  try {
    zenithPack = await xlsxToBrowserCsvPack(candidate, true);
    break;
  } catch { /* try next */ }
}
if (!zenithPack) fail('ZENITH: file', 'ZENITH_QA_test.xlsx not found');
if (!zenithPack) {
  // skip zenith block
} else {
const zenith = runPipeline(
  zenithPack,
  'ZENITH PRECISION TOOLS & FABRICATORS',
  '2024-03-31',
  '2023-03-31',
);
assertSchema(zenith.result as Record<string, unknown>, 'ZENITH');
await assertTemplatePaths(zenith.result as Record<string, unknown>, 'ZENITH');
const zPl = (zenith.result as { profit_and_loss: Record<string, { current: number }> }).profit_and_loss;
const zRev = zPl.revenue_from_operations?.current ?? 0;
const zCogs = zPl.cost_of_goods_sold?.current ?? 0;
if (Math.abs(zRev - 5_517_500.95) < 1) pass('ZENITH: revenue', String(zRev));
else fail('ZENITH: revenue', `${zRev} vs 5517500.95`);
if (Math.abs(zCogs - 4_198_923.1) < 1) pass('ZENITH: COGS', String(zCogs));
else fail('ZENITH: COGS', `${zCogs} vs 4198923.1`);
if (zRev > 0 && zCogs > 0) pass('ZENITH: pipeline', 'no throw, figures populated');
else fail('ZENITH: pipeline', 'empty P&L');
}

console.log('\n--- NOVA flat TB ---');
const novaCandidates = [
  `${root}/../Downloads/Trial_Balance_ZENITH_FLAT_FY2024.xlsx`,
  '/Users/aymaanshahzad23/Downloads/Trial_Balance_ZENITH_FLAT_FY2024.xlsx',
];
let novaPack = '';
for (const candidate of novaCandidates) {
  try {
    novaPack = await xlsxToBrowserCsvPack(candidate, true);
    break;
  } catch { /* try next */ }
}
if (!novaPack) fail('NOVA flat: file', 'Trial_Balance_ZENITH_FLAT_FY2024.xlsx not found');
if (novaPack) {
  const nova = runPipeline(novaPack, 'NOVA CHEMICAL TRADERS', '2024-03-31', '2023-03-31');
  assertSchema(nova.result as Record<string, unknown>, 'NOVA flat');
  const nPl = (nova.result as { profit_and_loss: Record<string, { current: number }> }).profit_and_loss;
  const nBs = (nova.result as { balance_sheet: { equity_and_liabilities: Record<string, { current: number }> } }).balance_sheet;
  const nRev = nPl.revenue_from_operations?.current ?? 0;
  const nCogs = nPl.cost_of_goods_sold?.current ?? 0;
  const nProfit = computeProfitFromPl(nPl);
  const nCap = nBs.equity_and_liabilities.owners_capital?.current ?? 0;
  if (Math.abs(nRev - 25_954_489) < 100) pass('NOVA flat: revenue', String(nRev));
  else fail('NOVA flat: revenue', `${nRev} vs 25954489`);
  if (Math.abs(nCogs - 18_708_135.7) < 100) pass('NOVA flat: COGS', String(nCogs));
  else fail('NOVA flat: COGS', `${nCogs} vs 18708135.7`);
  if (Math.abs(nProfit - (-1_813_353.1)) < 5000) pass('NOVA flat: net loss', String(nProfit));
  else fail('NOVA flat: net loss', `${nProfit} vs -1813353.1`);
  if (Math.abs(nCap - 10_660_537.35) < 100) pass('NOVA flat: owners capital', String(nCap));
  else fail('NOVA flat: owners capital', `${nCap} vs 10660537.35`);
}

console.log('\n--- Live API (optional) ---');
const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
if (!apiKey) {
  console.log('  ⊘ skipped — ANTHROPIC_API_KEY not set');
} else if (!zenithPack) {
  console.log('  ⊘ skipped — ZENITH file not available');
} else {
  try {
    const live = await mapTallyWithClaude({
      entityName: 'ZENITH PRECISION TOOLS & FABRICATORS',
      fyEnd: '2024-03-31',
      prevFyEnd: '2023-03-31',
      tallyData: zenithPack.slice(0, 50000),
      apiKey,
    });
    if (live.profit_and_loss && live.mapping_validation) {
      pass('live mapTallyWithClaude', 'returns result without throw');
    } else {
      fail('live mapTallyWithClaude', 'missing profit_and_loss or mapping_validation');
    }
  } catch (e) {
    fail('live mapTallyWithClaude', e instanceof Error ? e.message : String(e));
  }
}

const failed = checks.filter((c) => !c.ok);
console.log(`\n${checks.length - failed.length}/${checks.length} checks passed`);
if (failed.length) {
  console.log('\nFailed:');
  failed.forEach((c) => console.log(`  - ${c.name}: ${c.detail}`));
  Deno.exit(1);
}
