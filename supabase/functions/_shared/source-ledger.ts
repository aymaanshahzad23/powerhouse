import {
  matchLedgerRule,
  PL_CREDIT_RULES,
  PL_DEBIT_RULES,
  BS_RULES,
  type ScheduleTarget,
} from './ledger-rules.ts';

export type SourceLedgerLine = {
  label: string;
  amount: number;
  side: 'debit' | 'credit';
  sheet: string;
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function parseNum(raw: unknown): number | null {
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  const s = String(raw ?? '').replace(/,/g, '').trim();
  if (!s || s === '-') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function splitLine(line: string): string[] {
  if (line.includes('\t')) return line.split('\t').map((c) => c.trim());
  return line.split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
}

function rowLabel(cells: string[]): string {
  return cells.filter(Boolean).join(' ').trim();
}

function pickAmount(cells: string[], preferLast = false): number {
  const nums = cells.map(parseNum).filter((n): n is number => n != null && Math.abs(n) > 0.001);
  if (!nums.length) return 0;
  const val = preferLast ? nums[nums.length - 1] : nums[0];
  return round2(Math.abs(val));
}

function firstAmountInRange(cells: string[], from = 0, to = cells.length): number {
  for (let i = from; i < to; i++) {
    const n = parseNum(cells[i]);
    if (n != null && Math.abs(n) > 0.001) return round2(Math.abs(n));
  }
  return 0;
}

function isTradingMeta(label: string): boolean {
  return /\b(gross\s+profit|net\s+profit|total|particular|amount|trading|profit\s*&\s*loss)\b/i.test(label);
}

function isPlCreditLabel(label: string): boolean {
  return /\b(sale|service\s+charg|incentive|discount|intt|interest|dividend)\b/i.test(label);
}

function isPlDebitLabel(label: string): boolean {
  return /^to\s+/i.test(label) && !/\b(by\s+sale|gross\s+profit)\b/i.test(label);
}

function pushPlLine(
  out: SourceLedgerLine[],
  label: string,
  amount: number,
  side: 'debit' | 'credit',
  sheet: string,
): void {
  if (amount <= 0 || isTradingMeta(label) || /\bgross\s+profit\b/i.test(label)) return;
  out.push({ label: label.trim(), amount, side, sheet });
}

function parsePlRow(cells: string[], sheet: string, out: SourceLedgerLine[]): void {
  const joined = rowLabel(cells);
  const hasToBy = cells.some((c) => /^(to|by)\s+/i.test(String(c || '').trim()));
  if (!joined || (!hasToBy && isTradingMeta(joined))) return;

  // Scan every cell for To / By prefixes (split-row Indian layouts).
  for (let i = 0; i < cells.length; i++) {
    const cell = String(cells[i] || '').trim();
    if (!cell) continue;

    if (/^to\s+/i.test(cell)) {
      const amt = firstAmountInRange(cells, i + 1);
      pushPlLine(out, cell, amt, 'debit', sheet);
    }

    if (/^by\s+/i.test(cell)) {
      const preferLast = /\bclosing\s+stock\b/i.test(cell);
      const amt = preferLast ? pickAmount(cells.slice(i), true) : firstAmountInRange(cells, i + 1);
      pushPlLine(out, cell, amt, 'credit', sheet);
    }
  }

  // Sub-lines without To/By prefix (e.g. "Sale of Goods" beside "To Purchase").
  const SALE_SUB = /\b(sale\s+of\s+goods|service\s+charg)/i;
  for (let i = 0; i < cells.length; i++) {
    const sub = String(cells[i] || '').trim();
    if (!sub || /^to\s+|^by\s+/i.test(sub)) continue;
    if (!SALE_SUB.test(sub)) continue;
    const amt = firstAmountInRange(cells, i + 1);
    if (amt > 0) pushPlLine(out, sub, amt, 'credit', sheet);
  }

  // Flat TB row: label + debit/credit columns
  if (!hasToBy) {
    const label = cells[0] || '';
    const debit = parseNum(cells[1]);
    const credit = parseNum(cells[2]);
    if (debit && Math.abs(debit) > 0.001) {
      pushPlLine(out, label, round2(Math.abs(debit)), 'debit', sheet);
    }
    if (credit && Math.abs(credit) > 0.001) {
      pushPlLine(out, label, round2(Math.abs(credit)), 'credit', sheet);
    }
  }
}

function findBsSplitIndex(cells: string[]): number {
  const assetHdr = cells.findIndex((c, i) => i >= 2 && /^assets$/i.test(String(c || '').trim()));
  if (assetHdr >= 0) return assetHdr;
  const fixed = cells.findIndex((c, i) => i >= 2 && /\bfixed\s+assets\b/i.test(String(c || '').trim()));
  if (fixed >= 0) return fixed;
  const current = cells.findIndex((c, i) => i >= 2 && /\bcurrent\s+assets\b/i.test(String(c || '').trim()));
  if (current >= 0) return current;
  return 3;
}

function pushBsLine(
  out: SourceLedgerLine[],
  label: string,
  amount: number,
  sheet: string,
  section: 'liability' | 'asset',
): void {
  const ll = label.toLowerCase();
  if (!label || amount <= 0) return;
  if (/\b(op\.?\s*bal|add:|less:|drawing|gift|net\s+profit|as\s+per\s+schedule|total)\b/i.test(ll)) return;
  if (/^assets$/i.test(label.trim())) return;

  out.push({ label: label.trim(), amount, side: 'debit', sheet: `${sheet}/${section}` });

  if (section === 'liability' && amount > 50000 && !BS_RULES.some((r) => r.pattern.test(label))) {
    const name = label.trim();
    if (name.length > 2 && !/^(current|liabilit|secured|unsecured|capital|fixed|loan|sundry\s+creditor)/i.test(name)) {
      out.push({ label: name, amount, side: 'debit', sheet: `${sheet}/creditor` });
    }
  }
}

function parseBsRow(cells: string[], sheet: string, out: SourceLedgerLine[]): void {
  if (!cells.some(Boolean)) return;

  const split = findBsSplitIndex(cells);
  const left = cells.slice(0, split);
  const right = cells.slice(split);

  const liabLabel = (left[0] || '').trim();
  const liabAmt = firstAmountInRange(left, 1, left.length);
  if (liabLabel && liabAmt > 0) {
    pushBsLine(out, liabLabel, liabAmt, sheet, 'liability');
  }

  const assetLabel = (right[0] || right.find((c) => c && !/^amount$/i.test(c)) || '').trim();
  const assetStart = right.findIndex((c) => c === assetLabel);
  const assetAmt = firstAmountInRange(right, assetStart >= 0 ? assetStart + 1 : 1);
  if (assetLabel && assetAmt > 0 && !/^amount$/i.test(assetLabel)) {
    pushBsLine(out, assetLabel, assetAmt, sheet, 'asset');
  }
}

export function parseSourceLedgers(sourceText: string): SourceLedgerLine[] {
  const sections = String(sourceText || '').split(/---\s*(?:Sheet|File):\s*([^\n-]+)\s*---/i);
  const out: SourceLedgerLine[] = [];

  function parseBody(body: string, sheetName: string) {
    const lower = sheetName.toLowerCase();
    if (/\breadme\b/i.test(lower)) return;
    const isDep = /\bdep\b|depreciation|schedule\s*[\"']?a/i.test(lower);
    const isPl = /\bpl\b|profit|trading/i.test(lower);
    const isBs = /\bbs\b|balance\s+sheet/i.test(lower);

    for (const line of body.split(/\r?\n/)) {
      const lineContent = line.replace(/\r/g, '');
      if (!lineContent.trim()) continue;
      const cells = splitLine(lineContent);
      if (isPl) parsePlRow(cells, sheetName, out);
      else if (isBs) parseBsRow(cells, sheetName, out);
      else if (!isDep) parsePlRow(cells, sheetName, out);
    }
  }

  if (sections.length === 1) {
    parseBody(sections[0], 'upload');
  } else {
    for (let i = 1; i < sections.length; i += 2) {
      parseBody(sections[i + 1] || '', (sections[i] || 'upload').trim());
    }
  }

  return out;
}

export type AggregatedSchedule = {
  pl: Record<string, number>;
  bsEq: Record<string, number>;
  bsAssets: Record<string, number>;
  otherExpenseBreakup: { head: string; current: number }[];
  revenueBreakup: Record<string, number>;
  netProfitSource?: number;
  matched: { label: string; target: string; amount: number }[];
  unmapped: { label: string; amount: number; reason: string }[];
};

function addTo(map: Record<string, number>, key: string, amount: number) {
  map[key] = round2((map[key] || 0) + amount);
}

function targetKey(t: ScheduleTarget): string {
  if (t.statement === 'pl') return `pl.${t.key}`;
  return `bs.${t.side}.${t.key}`;
}

export function aggregateSourceLedgers(lines: SourceLedgerLine[]): AggregatedSchedule {
  const pl: Record<string, number> = {};
  const bsEq: Record<string, number> = {};
  const bsAssets: Record<string, number> = {};
  const otherExpenseBreakup: { head: string; current: number }[] = [];
  const revenueBreakup: Record<string, number> = {};
  const matched: AggregatedSchedule['matched'] = [];
  const unmapped: AggregatedSchedule['unmapped'] = [];
  let netProfitSource: number | undefined;

  // Prefer total "By Sale" over sub-line breakup when both present.
  const saleTotal = lines.find((l) => /\bby\s+sale\b/i.test(l.label) && l.side === 'credit');
  const saleSubLines = lines.filter(
    (l) => l.side === 'credit'
      && /\b(sale\s+of\s+goods|service\s+charg)/i.test(l.label)
      && !/^by\s+/i.test(String(l.label || '').trim()),
  );

  for (const line of lines) {
    const ll = line.label.toLowerCase();
    if (/\bnet\s+(profit|loss)\b/i.test(ll)) {
      netProfitSource = line.side === 'debit' ? -line.amount : line.amount;
      continue;
    }

    if (saleTotal && saleSubLines.some((s) => s.label === line.label)) {
      continue;
    }

    const rules = line.side === 'debit'
      ? [...PL_DEBIT_RULES, ...BS_RULES]
      : [...PL_CREDIT_RULES, ...BS_RULES];
    const rule = matchLedgerRule(line.label, rules);
    if (!rule) {
      if (line.amount > 1000) {
        unmapped.push({ label: line.label, amount: line.amount, reason: 'No rule matched' });
      }
      continue;
    }

    const t = rule.target;
    matched.push({ label: line.label, target: targetKey(t), amount: line.amount });

    if (t.statement === 'pl') {
      if (t.key.startsWith('_cogs_')) continue;
      addTo(pl, t.key, line.amount);
      if (t.key === 'other_expenses' && t.noteHead) {
        otherExpenseBreakup.push({ head: t.noteHead, current: line.amount });
      }
      if (t.key === 'revenue_from_operations' && t.noteHead) {
        addTo(revenueBreakup, t.noteHead, line.amount);
      }
    } else if (t.side === 'equity_and_liabilities') {
      addTo(bsEq, t.key, line.amount);
    } else {
      addTo(bsAssets, t.key, line.amount);
    }
  }

  return {
    pl,
    bsEq,
    bsAssets,
    otherExpenseBreakup,
    revenueBreakup,
    netProfitSource,
    matched,
    unmapped,
  };
}
