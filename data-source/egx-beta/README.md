# What the exchange's own API gave us

Raw payloads from `beta.egx.com.eg`, written by `scripts/harvest_egx_beta.py`
and read by nothing. **Nothing under `public/` depends on this directory.**

It is here so the decision to migrate onto that API can be made against real
data rather than against a sample, and so the archive survives if the beta
service moves. `docs/open-issues.md` §1b is the write-up.

## `indices/`

One file per index: every daily open, high, low and close the exchange will
serve, oldest first.

| File | Sessions | From |
| --- | --- | --- |
| `CASE30.json` | 3,961 | 2010-03-21 |
| `EGX70_EWI.json` | 3,961 | 2010-03-21 |
| `EGX100_EWI.json` | 3,961 | 2010-03-21 |
| `EGX30_CAP.json` | 3,961 | 2010-03-21 |
| `EGX30_TR.json` | 3,961 | 2010-03-21 |
| `TAMAYUZ.json` | 1,853 | 2018-12-31 |
| `EGX_SHARIAH.json` | 1,123 | 2022-01-01 |
| `EGX35LV.json` | 1,103 | 2022-01-31 |

The three the app publishes were checked against it: 609 of our own published
closes, none differing by more than half a point.

## `filings/`

One gzipped file per month, every disclosure the exchange published that month,
both languages, full bodies. 27,750 filings across 2025 and 2026 — the app's
own permanent archive holds 125.

Gzipped because the bodies are the bulk of it and they compress eight to one;
`gzip.decompress(path.read_bytes())` gets you the JSON. Each file carries the
`totalCount` the service reported, so a short month is visible rather than
silent.

The service will answer for any window back to 2005 — 191,484 filings in all.
Only these two years are held; `harvest_egx_beta.py --from 2024-01 --to 2024-12`
takes the next one, and skips anything already complete.
