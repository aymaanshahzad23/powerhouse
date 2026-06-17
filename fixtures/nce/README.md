# NCE mapping fixtures

Local QA for TB → NCE conversion. **Not used in production** — compare deterministic mapping against the corrected Schedule III workbook.

## Files

| File | Purpose |
|------|---------|
| `ABC_2019-20_source.xls` | Source pl / bs / Dep workbook (client-style input) |
| `abc-expected.json` | Key Schedule III line items from the corrected NCE output |

## Run deterministic test (no API)

```bash
npm run test:nce
```

Requires [Deno](https://deno.land/). Tests parsers + schedule aggregator only — no Claude call.

## Full pipeline (local edge)

```bash
export ANTHROPIC_API_KEY=...
npx supabase functions serve --env-file .env
# Upload ABC_2019-20_source.xls via localhost:8742 workspace
```
