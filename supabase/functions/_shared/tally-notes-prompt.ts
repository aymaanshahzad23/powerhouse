/** Small LLM pass: notes + previous-year columns only (current-year totals come from parsers). */

export const tallyNotesPrompt = `You are a Chartered Accountant assistant for Indian Schedule III (non-corporate) financials.

Return ONLY valid JSON — no markdown, no backticks, no explanation.

Current-year Schedule III line totals are ALREADY computed in the input (PARSED_SCHEDULE_TOTALS). Do NOT return current-year P&L or balance sheet totals.

Return this JSON shape only:
{
  "notes": {
    "owners_capital_details": [
      { "name": "string", "share_pct": 0, "opening": 0, "capital_introduced": 0,
        "remuneration": 0, "interest": 0, "withdrawals": 0, "closing": 0 }
    ],
    "revenue_breakup": {
      "sale_of_products": { "previous": 0 },
      "sale_of_services": { "previous": 0 },
      "other_operating_revenue": { "previous": 0 }
    },
    "other_income_breakup": {
      "interest_income": { "previous": 0 },
      "dividend_income": { "previous": 0 },
      "other_non_operating": { "previous": 0 }
    },
    "employee_expense_breakup": {
      "salaries_wages_bonus": { "previous": 0 },
      "pf_and_other_funds": { "previous": 0 },
      "gratuity": { "previous": 0 },
      "staff_welfare": { "previous": 0 }
    },
    "other_expenses_breakup": [
      { "head": "string", "previous": 0 }
    ],
    "trade_payables_msme": { "previous": 0 },
    "trade_payables_others": { "previous": 0 },
    "cash_in_hand": { "previous": 0 },
    "bank_balances": { "previous": 0 },
    "inventories_breakup": {
      "stock_in_trade_opening": { "previous": 0 },
      "stock_in_trade_closing": { "previous": 0 },
      "wip_opening": { "previous": 0 },
      "wip_closing": { "previous": 0 }
    }
  },
  "previous_year": {
    "profit_and_loss": {
      "revenue_from_operations": 0,
      "other_income": 0,
      "cost_of_goods_sold": 0,
      "employee_benefits_expense": 0,
      "finance_costs": 0,
      "depreciation_amortization": 0,
      "other_expenses": 0
    },
    "balance_sheet": {
      "equity_and_liabilities": {
        "owners_capital": 0,
        "long_term_borrowings": 0,
        "other_long_term_liabilities": 0,
        "long_term_provisions": 0,
        "short_term_borrowings": 0,
        "trade_payables": 0,
        "other_current_liabilities": 0,
        "short_term_provisions": 0
      },
      "assets": {
        "property_plant_equipment": 0,
        "intangible_assets": 0,
        "capital_wip": 0,
        "non_current_investments": 0,
        "long_term_loans_advances": 0,
        "other_non_current_assets": 0,
        "current_investments": 0,
        "inventories": 0,
        "trade_receivables": 0,
        "cash_and_bank": 0,
        "short_term_loans_advances": 0,
        "other_current_assets": 0
      }
    }
  }
}

Rules:
- Use 0 for any figure not present in the source.
- Ignore README / answer-key sheets.
- Merge other_expenses_breakup previous values with heads already listed in the input when possible.
- notes_to_preparer is not needed in your response.`;
