# NCE golden fixtures

| File | Entity | Format | Purpose |
|------|--------|--------|---------|
| `ABC_2019-20_source.xls` | ABC Automobile | pl + bs sheets | Classic Tally export |
| `MERIDIAN_flat_tb.xlsx` | Meridian Polymer Works | Flat TB (Ledger \| Group \| Dr \| Cr) | Complex traps regression |

Regenerate Meridian:

```bash
python3 scripts/generate-meridian-fixture.py
npm run test:meridian
```

**MERIDIAN traps:** export + domestic sales, sales returns, Frieght typo, COGS components, Cash Credit (Bank OD), split sundry creditors, audit fee vs payable, advance to suppliers, unbalanced TB suspense, trailing-space debtor name, zero-balance ledger.
