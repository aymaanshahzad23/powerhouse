/** Rule-based ledger label → Schedule III mapping for Indian CA exports. */

export type ScheduleTarget =
  | { statement: 'pl'; key: string; noteHead?: string }
  | { statement: 'bs'; side: 'equity_and_liabilities' | 'assets'; key: string };

export type LedgerRule = {
  pattern: RegExp;
  target: ScheduleTarget;
  /** If true, amount is taken as absolute value on the expense/asset side. */
  abs?: boolean;
};

export const PL_DEBIT_RULES: LedgerRule[] = [
  { pattern: /\b(opening\s*stock|op\.?\s*stock)\b/i, target: { statement: 'pl', key: '_cogs_opening' } },
  { pattern: /\bpurchases?\b/i, target: { statement: 'pl', key: '_cogs_purchases' } },
  { pattern: /\brate\s*diff/i, target: { statement: 'pl', key: '_cogs_rate_diff' } },
  { pattern: /\b(closing\s*stock|cl\.?\s*stock)\b/i, target: { statement: 'pl', key: '_cogs_closing' } },
  { pattern: /\b(salar|wages|staff\s+salary|payroll)\b/i, target: { statement: 'pl', key: 'employee_benefits_expense', noteHead: 'Salaries & wages' } },
  { pattern: /\b(bank\s*interest|interest\s+on\s+(loan|cc|od))\b/i, target: { statement: 'pl', key: 'finance_costs', noteHead: 'Bank interest' } },
  { pattern: /\bdepreciation\b/i, target: { statement: 'pl', key: 'depreciation_amortization' } },
  { pattern: /\b(audit\s+fee)\b/i, target: { statement: 'pl', key: 'other_expenses', noteHead: 'Audit fee' } },
  { pattern: /\brent\b/i, target: { statement: 'pl', key: 'other_expenses', noteHead: 'Rent' } },
  { pattern: /\bbank\s*charg/i, target: { statement: 'pl', key: 'other_expenses', noteHead: 'Bank charges' } },
  { pattern: /\belectric/i, target: { statement: 'pl', key: 'other_expenses', noteHead: 'Electricity' } },
  { pattern: /\bshop\s*exp/i, target: { statement: 'pl', key: 'other_expenses', noteHead: 'Shop expenses' } },
  { pattern: /\btelephone\b/i, target: { statement: 'pl', key: 'other_expenses', noteHead: 'Telephone' } },
  { pattern: /\brepair/i, target: { statement: 'pl', key: 'other_expenses', noteHead: 'Repairs' } },
  { pattern: /\bprint/i, target: { statement: 'pl', key: 'other_expenses', noteHead: 'Printing & stationery' } },
  { pattern: /\bpromotion/i, target: { statement: 'pl', key: 'other_expenses', noteHead: 'Sales promotion' } },
  { pattern: /\bfees?\s+paid\b/i, target: { statement: 'pl', key: 'other_expenses', noteHead: 'Fees' } },
  { pattern: /\b(factory\s*power|power\s*&\s*fuel)\b/i, target: { statement: 'pl', key: 'other_expenses', noteHead: 'Factory power & fuel' } },
  { pattern: /\b(freight\s+inward|carriage\s+inward)\b/i, target: { statement: 'pl', key: 'other_expenses', noteHead: 'Freight inward' } },
  { pattern: /\bgst\s+(paid|expense)\b/i, target: { statement: 'pl', key: 'other_expenses', noteHead: 'GST expense' } },
  { pattern: /\b(late\s+fees?|gst\s+late)\b/i, target: { statement: 'pl', key: 'other_expenses', noteHead: 'Late fees' } },
];

export const PL_CREDIT_RULES: LedgerRule[] = [
  { pattern: /\b(by\s+sale|sale\s+of\s+goods|sales?\s+account)\b/i, target: { statement: 'pl', key: 'revenue_from_operations', noteHead: 'Sale of products' } },
  { pattern: /\bservice\s+charg/i, target: { statement: 'pl', key: 'revenue_from_operations', noteHead: 'Sale of services' } },
  { pattern: /\b(incentive|discount)/i, target: { statement: 'pl', key: 'other_income', noteHead: 'Other non-operating' } },
  { pattern: /\b(intt?\s+on\s+deposits?|interest\s+on\s+deposits?)/i, target: { statement: 'pl', key: 'other_income', noteHead: 'Interest income' } },
  { pattern: /\binterest\s+(income|received|cr)\b/i, target: { statement: 'pl', key: 'other_income', noteHead: 'Interest income' } },
  { pattern: /\bdividend\b/i, target: { statement: 'pl', key: 'other_income', noteHead: 'Dividend income' } },
];

export const BS_RULES: LedgerRule[] = [
  { pattern: /\b(capital\s+account|capital\s+a\/?c|owners?'?\s+capital|proprietor)\b/i, target: { statement: 'bs', side: 'equity_and_liabilities', key: 'owners_capital' } },
  { pattern: /\b(term\s+loan|unsecured\s+loan|vehicle\s+loan)\b/i, target: { statement: 'bs', side: 'equity_and_liabilities', key: 'long_term_borrowings' } },
  { pattern: /\b(cc\s+limit|cash\s+credit|c\/?c\s+a\/?c|overdraft|secured\s+loan)\b/i, target: { statement: 'bs', side: 'equity_and_liabilities', key: 'short_term_borrowings' } },
  { pattern: /\b(sundry\s+creditor|sundry\s+cr|trade\s+payable|goods\s+creditor)\b/i, target: { statement: 'bs', side: 'equity_and_liabilities', key: 'trade_payables' } },
  { pattern: /\baudit\s+fees?\s+payable\b/i, target: { statement: 'bs', side: 'equity_and_liabilities', key: 'other_current_liabilities' } },
  { pattern: /\b(gst\s+payable|tds\s+payable|salary\s+payable)\b/i, target: { statement: 'bs', side: 'equity_and_liabilities', key: 'other_current_liabilities' } },
  { pattern: /\b(difference\s+in\s+books|unadjusted)\b/i, target: { statement: 'bs', side: 'equity_and_liabilities', key: 'other_long_term_liabilities' } },
  { pattern: /\b(fixed\s+asset|property.*equipment|schedule\s*[\"']?a|net\s+block)/i, target: { statement: 'bs', side: 'assets', key: 'property_plant_equipment' } },
  { pattern: /\bsecurity\s+deposit/i, target: { statement: 'bs', side: 'assets', key: 'long_term_loans_advances' } },
  { pattern: /\b(closing\s+stock|stock\s+in\s+trade)\b/i, target: { statement: 'bs', side: 'assets', key: 'inventories' } },
  { pattern: /\b(sundry\s+debtor|trade\s+receivable|debtors?)\b/i, target: { statement: 'bs', side: 'assets', key: 'trade_receivables' } },
  { pattern: /\b(cash\s+in\s+hand|bank\s+balances?)\b/i, target: { statement: 'bs', side: 'assets', key: 'cash_and_bank' } },
  { pattern: /\b(gst\s+input|gst\s+receivable|\bgst\b)/i, target: { statement: 'bs', side: 'assets', key: 'short_term_loans_advances' } },
  { pattern: /\btds\s+(deducted|receivable)/i, target: { statement: 'bs', side: 'assets', key: 'short_term_loans_advances' } },
];

export function matchLedgerRule(label: string, rules: LedgerRule[]): LedgerRule | null {
  const text = String(label || '').trim();
  if (!text) return null;
  for (const rule of rules) {
    if (rule.pattern.test(text)) return rule;
  }
  return null;
}
