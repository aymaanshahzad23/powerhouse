#!/usr/bin/env python3
"""Generate MERIDIAN POLYMER WORKS — complex flat TB fixture + golden expected JSON."""

import json
import math
from pathlib import Path

try:
    import openpyxl
    from openpyxl import Workbook
except ImportError:
    import subprocess
    subprocess.check_call(["pip3", "install", "openpyxl", "-q"])
    import openpyxl
    from openpyxl import Workbook

ROOT = Path(__file__).resolve().parent.parent
OUT_XLSX = ROOT / "fixtures/nce/MERIDIAN_flat_tb.xlsx"
OUT_JSON = ROOT / "fixtures/nce/meridian-expected.json"

ENTITY = "MERIDIAN POLYMER WORKS"
FY_END = "2024-03-31"
SUSPENSE = 127_843.65  # deliberate Dr − Cr gap

# (label, group, debit, credit)
ROWS = [
    # Revenue
    ("Domestic Sales – Products", "Sales Accounts", None, 18_456_782.40),
    ("Export Sales", "Sales Accounts", None, 2_341_567.85),
    ("Service Income", "Direct Incomes", None, 567_890.25),
    ("Sales Returns", "Sales Accounts", 234_567.90, None),
    ("Interest on FD", "Indirect Incomes", None, 45_678.30),
    ("Discount Received", "Indirect Incomes", None, 12_345.60),
    # COGS building blocks
    ("Opening Stock – Finished Goods", "Stock-in-Hand", 2_456_789.15, None),
    ("Purchases – Raw Materials", "Purchase Accounts", 14_567_890.45, None),
    ("Purchases – Packing Materials", "Purchase Accounts", 1_234_567.80, None),
    ("Frieght Inward", "Direct Expenses", 456_789.12, None),
    ("Purchase Rate Difference", "Direct Expenses", 123_456.78, None),
    ("Closing Stock – Finished Goods", "Trading Account", None, 2_789_012.34),
    # Indirect expenses
    ("Salaries & Wages", "Indirect Expenses", 2_567_890.45, None),
    ("Employer PF Contribution", "Indirect Expenses", 234_567.80, None),
    ("Bank Interest on Term Loan", "Indirect Expenses", 345_678.90, None),
    ("Bank Interest on CC", "Indirect Expenses", 123_456.78, None),
    ("Depreciation", "Indirect Expenses", 567_890.12, None),
    ("Bank Charges", "Indirect Expenses", 34_567.89, None),
    ("Audit Fees", "Indirect Expenses", 89_450.00, None),
    ("Rent", "Indirect Expenses", 456_789.00, None),
    ("Electricity", "Indirect Expenses", 234_567.45, None),
    ("Insurance", "Indirect Expenses", 78_901.23, None),
    ("Legal & Professional", "Indirect Expenses", 45_678.90, None),
    ("Printing & Stationery", "Indirect Expenses", 23_456.78, None),
    ("Telephone", "Indirect Expenses", 18_901.45, None),
    ("Advertisement", "Indirect Expenses", 156_789.30, None),
    ("Shop Expenses", "Indirect Expenses", 89_012.67, None),
    ("Repairs & Maintenance", "Indirect Expenses", 134_567.89, None),
    # Equity & liabilities
    ("Partners' Capital", "Capital Account", None, 8_456_789.00),
    ("Term Loan – HDFC", "Loans (Liability)", None, 3_456_789.45),
    ("Cash Credit – SBI", "Bank OD A/c", None, 1_234_567.80),
    ("Sundry Creditors – Trade", "Sundry Creditors", None, 2_345_678.90),
    ("Sundry Creditors – Expenses", "Sundry Creditors", None, 567_890.12),
    ("Audit Fees Payable", "Provisions", None, 89_450.00),
    ("GST Payable", "Duties & Taxes", None, 234_567.89),
    ("TDS Payable", "Duties & Taxes", None, 45_678.90),
    # Fixed assets
    ("Land & Building", "Fixed Assets", 5_678_901.23, None),
    ("Plant & Machinery", "Fixed Assets", 3_456_789.12, None),
    ("Accumulated Depreciation", "Fixed Assets", None, 1_234_567.89),
    # Other assets
    ("Security Deposit – Premises", "Deposits (Asset)", 250_000.00, None),
    ("Closing Stock – Finished Goods", "Stock-in-Hand", 2_789_012.34, None),
    ("Sundry Debtors ", "Sundry Debtors", 1_876_543.21, None),  # trailing space trap
    ("Cash in Hand", "Cash-in-Hand", 123_456.78, None),
    ("HDFC Current A/c", "Bank Accounts", 987_654.32, None),
    ("GST Input Credit", "Loans & Advances (Asset)", 345_678.90, None),
    ("TDS Receivable", "Loans & Advances (Asset)", 67_890.12, None),
    ("Advance to Suppliers", "Loans & Advances (Asset)", 234_567.89, None),
    ("Misc. Deposit (old)", "Deposits (Asset)", 0.00, None),
]


def r2(n: float) -> float:
    return round(n * 100) / 100


def compute_expected(receivables: float, suspense: float) -> dict:
    rev_gross = r2(18_456_782.40 + 2_341_567.85 + 567_890.25)
    sales_returns = 234_567.90
    revenue = r2(rev_gross - sales_returns)
    other_income = r2(45_678.30 + 12_345.60)

    cogs = r2(
        2_456_789.15
        + 14_567_890.45
        + 1_234_567.80
        + 456_789.12
        + 123_456.78
        - 2_789_012.34
    )
    employee = r2(2_567_890.45 + 234_567.80)
    finance = r2(345_678.90 + 123_456.78)
    depreciation = 567_890.12
    other_exp = r2(
        34_567.89
        + 89_450.00
        + 456_789.00
        + 234_567.45
        + 78_901.23
        + 45_678.90
        + 23_456.78
        + 18_901.45
        + 156_789.30
        + 89_012.67
        + 134_567.89
    )
    total_exp = r2(cogs + employee + finance + depreciation + other_exp)
    net_profit = r2(revenue + other_income - total_exp)

    pre_loss_capital = 8_456_789.00
    owners_capital = r2(pre_loss_capital + net_profit)

    lt_borrow = 3_456_789.45
    st_borrow = 1_234_567.80
    trade_pay = 2_345_678.90
    ocl_base = r2(567_890.12 + 89_450.00 + 234_567.89 + 45_678.90)
    ocl_total = r2(ocl_base + suspense)

    ppe_net = r2(5_678_901.23 + 3_456_789.12 - 1_234_567.89)
    lt_adv = 250_000.00
    inventories = 2_789_012.34
    cash_bank = r2(123_456.78 + 987_654.32)
    st_adv = r2(345_678.90 + 67_890.12 + 234_567.89)

    total_assets = r2(ppe_net + lt_adv + inventories + receivables + cash_bank + st_adv)
    total_liab = r2(owners_capital + lt_borrow + st_borrow + trade_pay + ocl_total)

    return {
        "entity_name": ENTITY,
        "fy_end": FY_END,
        "profit_and_loss": {
            "revenue_from_operations": {"current": revenue},
            "other_income": {"current": other_income},
            "cost_of_goods_sold": {"current": cogs},
            "employee_benefits_expense": {"current": employee},
            "finance_costs": {"current": finance},
            "depreciation_amortization": {"current": depreciation},
            "other_expenses": {"current": other_exp},
        },
        "balance_sheet": {
            "equity_and_liabilities": {
                "owners_capital": {"current": owners_capital},
                "long_term_borrowings": {"current": lt_borrow},
                "short_term_borrowings": {"current": st_borrow},
                "trade_payables": {"current": trade_pay},
                "other_current_liabilities": {"current": ocl_total},
            },
            "assets": {
                "property_plant_equipment": {"current": ppe_net},
                "long_term_loans_advances": {"current": lt_adv},
                "inventories": {"current": inventories},
                "trade_receivables": {"current": receivables},
                "cash_and_bank": {"current": cash_bank},
                "short_term_loans_advances": {"current": st_adv},
            },
        },
        "net_profit": net_profit,
        "tb_suspense": suspense,
        "ocl_excl_suspense": ocl_base,
        "total_liabilities": total_liab,
        "total_assets": total_assets,
        "pre_loss_capital": pre_loss_capital,
        "trade_receivables": receivables,
    }


def write_xlsx(total_debit: float, total_credit: float, suspense: float, exp: dict) -> None:
    wb = Workbook()
    ws = wb.active
    ws.title = "Trial Balance"

    ws.append([ENTITY])
    ws.append([f"Trial Balance for the year ended 31 March 2024  (Amounts in INR)"])
    ws.append(["Partnership firm  |  Complex flat TB — regression fixture"])
    ws.append([])
    ws.append(["Ledger Name", "Group", "Debit", "Credit"])

    for label, group, dr, cr in ROWS:
        ws.append([label, group, dr if dr else None, cr if cr else None])

    ws.append([])
    ws.append([None, "GRAND TOTAL", r2(total_debit), r2(total_credit)])
    ws.append([None, "DIFFERENCE (Dr − Cr)", r2(suspense), None])
    ws.append([
        "Note: Trial balance is intentionally UNBALANCED. See meridian-expected.json.",
        None,
        None,
        None,
    ])

    readme = wb.create_sheet("README")
    readme.append([f"{ENTITY} — FIXTURE README"])
    readme.append(["Revenue from operations", exp["profit_and_loss"]["revenue_from_operations"]["current"]])
    readme.append(["Net profit / (loss)", exp["net_profit"]])
    readme.append(["Owners capital (post-loss)", exp["balance_sheet"]["equity_and_liabilities"]["owners_capital"]["current"]])
    readme.append(["TB suspense (Dr − Cr)", suspense])
    readme.append(["TOTAL assets = liabilities", exp["total_assets"]])

    OUT_XLSX.parent.mkdir(parents=True, exist_ok=True)
    wb.save(OUT_XLSX)


def main() -> None:
    global ROWS

    def sum_tb(rows) -> tuple[float, float]:
        dr = cr = 0.0
        for _, _, d, c in rows:
            if d:
                dr += d
            if c:
                cr += c
        return r2(dr), r2(cr)

    total_dr, total_cr = sum_tb(ROWS)
    debtor = 1_876_543.21
    target_suspense = SUSPENSE

    if total_dr - total_cr < target_suspense:
        bump = r2(total_cr + target_suspense - total_dr)
        debtor = r2(debtor + bump)
        patched = []
        for label, group, dr_val, cr_val in ROWS:
            if label == "Sundry Debtors ":
                patched.append((label, group, debtor, cr_val))
            else:
                patched.append((label, group, dr_val, cr_val))
        ROWS = patched
        total_dr, total_cr = sum_tb(ROWS)

    actual_suspense = r2(total_dr - total_cr)
    exp = compute_expected(debtor, actual_suspense)
    write_xlsx(total_dr, total_cr, actual_suspense, exp)

    OUT_JSON.write_text(json.dumps(exp, indent=2) + "\n")
    print(f"Wrote {OUT_XLSX}")
    print(f"Wrote {OUT_JSON}")
    print(f"Revenue: {exp['profit_and_loss']['revenue_from_operations']['current']}")
    print(f"COGS: {exp['profit_and_loss']['cost_of_goods_sold']['current']}")
    print(f"Net profit: {exp['net_profit']}")
    print(f"Debtors: {debtor}")
    print(f"TB Dr: {total_dr}  Cr: {total_cr}  Suspense: {actual_suspense}")
    print(f"BS assets: {exp['total_assets']}  liab: {exp['total_liabilities']}")
    diff = abs(exp['total_assets'] - exp['total_liabilities'])
    if diff > 0.02:
        raise SystemExit(f"Answer key does not foot (off by {diff:.2f})")


if __name__ == "__main__":
    main()
