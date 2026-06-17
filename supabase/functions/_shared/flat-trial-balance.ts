/** Flat trial balance: Ledger Name | Group | Debit | Credit */

import type { ScheduleTarget } from './ledger-rules.ts';
import { matchLedgerRule, PL_CREDIT_RULES, PL_DEBIT_RULES, BS_RULES } from './ledger-rules.ts';

export type FlatTbRow = {
  label: string;
  group: string;
  debit: number;
  credit: number;
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function isFlatTrialBalanceHeader(cells: string[]): boolean {
  const joined = cells.join(' ').toLowerCase();
  return /\bledger\s+name\b/i.test(joined) && /\bdebit\b/i.test(joined) && /\bcredit\b/i.test(joined);
}

export function isFlatTrialBalanceSheet(sheetName: string): boolean {
  return /\btrial\s+balance\b/i.test(sheetName);
}

export function parseFlatTbCells(cells: string[]): FlatTbRow | null {
  const label = (cells[0] || '').trim();
  if (!label || /^(ledger\s+name|grand\s+total|difference|note:)/i.test(label)) return null;

  const group = (cells[1] || '').trim();
  let debit = 0;
  let credit = 0;

  if (cells.length >= 4) {
    debit = Number(String(cells[2] ?? '').replace(/,/g, '')) || 0;
    credit = Number(String(cells[3] ?? '').replace(/,/g, '')) || 0;
  } else if (cells.length === 3) {
    debit = Number(String(cells[1] ?? '').replace(/,/g, '')) || 0;
    credit = Number(String(cells[2] ?? '').replace(/,/g, '')) || 0;
  }

  if (Math.abs(debit) < 0.001 && Math.abs(credit) < 0.001) return null;
  return { label, group, debit: round2(Math.abs(debit)), credit: round2(Math.abs(credit)) };
}

export function matchFlatTbTarget(label: string, group: string, side: 'debit' | 'credit'): ScheduleTarget | null {
  const l = label.toLowerCase();
  const g = group.toLowerCase();

  if (/\bsales?\s+returns?\b/i.test(l) && side === 'debit') {
    return { statement: 'pl', key: '_revenue_returns' };
  }
  if (side === 'credit') {
    if (/\bsales?\s+accounts?\b/i.test(g) || /\bdirect\s+incomes?\b/i.test(g)) {
      return { statement: 'pl', key: 'revenue_from_operations', noteHead: /service/i.test(l) ? 'Sale of services' : 'Sale of products' };
    }
    if (/\bindirect\s+incomes?\b/i.test(g) || /\binterest\s+on\s+fd\b/i.test(l) || /\bdiscount\s+received\b/i.test(l)) {
      return { statement: 'pl', key: 'other_income', noteHead: /interest/i.test(l) ? 'Interest income' : 'Other non-operating' };
    }
    if (/\bcapital\s+account\b/i.test(g) || /\bpartners?'\s+capital\b/i.test(l)) {
      return { statement: 'bs', side: 'equity_and_liabilities', key: 'owners_capital' };
    }
    if (/\bloans?\s*\(liability\)\b/i.test(g) || /\bterm\s+loan\b/i.test(l)) {
      return { statement: 'bs', side: 'equity_and_liabilities', key: 'long_term_borrowings' };
    }
    if (/\bbank\s+od\b/i.test(g) || /\bcash\s+credit\b/i.test(l)) {
      return { statement: 'bs', side: 'equity_and_liabilities', key: 'short_term_borrowings' };
    }
    if (/\bsundry\s+creditors?\b/i.test(g)) {
      if (/expenses?/i.test(l)) {
        return { statement: 'bs', side: 'equity_and_liabilities', key: 'other_current_liabilities' };
      }
      return { statement: 'bs', side: 'equity_and_liabilities', key: 'trade_payables' };
    }
    if (/\bprovisions?\b/i.test(g) || /\bduties\s*&\s*taxes\b/i.test(g)) {
      return { statement: 'bs', side: 'equity_and_liabilities', key: 'other_current_liabilities' };
    }
    if (/\baccumulated\s+depreciation\b/i.test(l)) {
      return { statement: 'bs', side: 'assets', key: '_ppe_accumulated_depreciation' };
    }
    if (/\btrading\s+account\b/i.test(g) && /\bclosing\s+stock\b/i.test(l)) {
      return { statement: 'pl', key: '_cogs_closing' };
    }
  }

  if (side === 'debit') {
    if (/\bstock[\s-]*in[\s-]*hand\b/i.test(g) && /\bopening\b/i.test(l)) {
      return { statement: 'pl', key: '_cogs_opening' };
    }
    if (/\bstock[\s-]*in[\s-]*hand\b/i.test(g) && /\bclosing\b/i.test(l)) {
      return { statement: 'bs', side: 'assets', key: 'inventories' };
    }
    if (/\bpurchase\s+accounts?\b/i.test(g) || /\bpurchas/i.test(l)) {
      return { statement: 'pl', key: '_cogs_purchases' };
    }
    if (/\brate\s+diff/i.test(l)) {
      return { statement: 'pl', key: '_cogs_rate_diff' };
    }
    if (/\bfreight|frieght|carriage\s+inward\b/i.test(l)) {
      return { statement: 'pl', key: '_cogs_freight' };
    }
    if (/\bdirect\s+expenses?\b/i.test(g) && /\brate\s+diff/i.test(l)) {
      return { statement: 'pl', key: '_cogs_rate_diff' };
    }
    if (/\bdirect\s+expenses?\b/i.test(g) && /\bfreight|frieght/i.test(l)) {
      return { statement: 'pl', key: '_cogs_freight' };
    }
    if (/\bindirect\s+expenses?\b/i.test(g)) {
      const rules = PL_DEBIT_RULES;
      const rule = matchLedgerRule(label, rules);
      if (rule) return rule.target;
    }
    if (/\bfixed\s+assets?\b/i.test(g) && !/\baccumulated\b/i.test(l)) {
      return { statement: 'bs', side: 'assets', key: '_ppe_gross' };
    }
    if (/\bdeposits?\s*\(asset\)\b/i.test(g)) {
      if (/security|long[\s-]*term/i.test(l)) {
        return { statement: 'bs', side: 'assets', key: 'long_term_loans_advances' };
      }
      return { statement: 'bs', side: 'assets', key: 'short_term_loans_advances' };
    }
    if (/\bsundry\s+debtors?\b/i.test(g)) {
      return { statement: 'bs', side: 'assets', key: 'trade_receivables' };
    }
    if (/\bcash[\s-]*in[\s-]*hand\b/i.test(g)) {
      return { statement: 'bs', side: 'assets', key: 'cash_and_bank' };
    }
    if (/\bbank\s+accounts?\b/i.test(g)) {
      return { statement: 'bs', side: 'assets', key: 'cash_and_bank' };
    }
    if (/\bloans?\s*&\s*advances?\s*\(asset\)\b/i.test(g)) {
      return { statement: 'bs', side: 'assets', key: 'short_term_loans_advances' };
    }
  }

  const rules = side === 'debit' ? [...PL_DEBIT_RULES, ...BS_RULES] : [...PL_CREDIT_RULES, ...BS_RULES];
  const rule = matchLedgerRule(label, rules);
  return rule?.target ?? null;
}

export function parseFlatTrialBalanceRows(body: string, sheetName: string): {
  label: string;
  group: string;
  amount: number;
  side: 'debit' | 'credit';
  sheet: string;
}[] {
  const out: ReturnType<typeof parseFlatTrialBalanceRows> = [];
  let inFlat = isFlatTrialBalanceSheet(sheetName);

  for (const line of body.split(/\r?\n/)) {
    const lineContent = line.replace(/\r/g, '');
    if (!lineContent.trim()) continue;
    const cells = lineContent.includes('\t')
      ? lineContent.split('\t').map((c) => c.trim())
      : lineContent.split(',').map((c) => c.trim().replace(/^"|"$/g, ''));

    if (!inFlat && isFlatTrialBalanceHeader(cells)) {
      inFlat = true;
      continue;
    }
    if (!inFlat) continue;

    const row = parseFlatTbCells(cells);
    if (!row) continue;

    if (row.debit > 0) {
      out.push({ label: row.label, group: row.group, amount: row.debit, side: 'debit', sheet: sheetName });
    }
    if (row.credit > 0) {
      out.push({ label: row.label, group: row.group, amount: row.credit, side: 'credit', sheet: sheetName });
    }
  }
  return out;
}

export function parseFlatTbFooterTotals(body: string): { totalDebit: number; totalCredit: number } | null {
  let totalDebit = 0;
  let totalCredit = 0;
  let found = false;
  for (const line of body.split(/\r?\n/)) {
    const cells = line.includes('\t')
      ? line.split('\t').map((c) => c.trim())
      : line.split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
    const joined = cells.join(' ').toLowerCase();
    if (/\bgrand\s+total\b/i.test(joined)) {
      const nums = cells
        .map((c) => Number(String(c).replace(/,/g, '')))
        .filter((n) => Number.isFinite(n) && Math.abs(n) > 0.001);
      if (nums.length >= 2) {
        totalDebit = nums[nums.length - 2];
        totalCredit = nums[nums.length - 1];
        found = true;
      }
    }
    if (/\bdifference\s*\(\s*dr\s*[-−]\s*cr\s*\)/i.test(joined)) {
      const nums = cells
        .map((c) => Number(String(c).replace(/,/g, '')))
        .filter((n) => Number.isFinite(n) && Math.abs(n) > 0.001);
      if (nums.length) {
        const diff = nums[nums.length - 1];
        if (totalDebit > 0 && totalCredit > 0) {
          return { totalDebit, totalCredit };
        }
        if (diff > 0) {
          return { totalDebit: round2(totalCredit + diff), totalCredit: round2(totalCredit) };
        }
      }
    }
  }
  if (found && totalDebit > 0 && totalCredit > 0) {
    return { totalDebit: round2(totalDebit), totalCredit: round2(totalCredit) };
  }
  return null;
}
