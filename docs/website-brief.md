# ESTHMR on the web — build brief

A web front end that reads the **same static JSON** the Flutter app reads. No server,
no database, no second pipeline. Everything here is a contract that already exists and
is already live.

---

## 1. The job

ESTHMR is a **publisher**, not a broker or an adviser. It takes what companies file with
the EGX, checks it, and explains it. The app never tells anybody what to do with a share,
and the website must not either — that constraint shapes more of this brief than any
visual decision, so read §2 before designing a screen.

The whole product is static JSON over HTTPS. A daily build pushes files to
`public/data/v1/`, Cloudflare serves them, and every client reads the same bytes.

**One rule above the others:** every figure on screen must be traceable to something a
company filed. Never compute a number the data does not contain, never fill a gap with an
estimate. Where a value is missing, say it is missing rather than showing a zero.

---

## 2. Legal limits — non-negotiable

The publisher holds **no licence from Egypt's Financial Regulatory Authority**. Under
Capital Market Law 95/1992 securities advisory is licensed, and a public graded opinion on
a named issuer is the exposure. These are not tone preferences.

**Never publish, about a named company:**

- Instructions to trade — buy, sell, hold, avoid, accumulate, exit, or any Arabic equivalent
- Grades on the security — strong, weak, good, bad, undervalued, overvalued, cheap,
  expensive, safe, risky, healthy, unsustainable, comfortable
- Predictions — where a price is going, what a company will report, what happens next
- Trade levels — a price target, an entry, a stop, a model position size
- Accuracy claims — a hit rate, a track record, "we called it", "we passed on it"
- The word **"verdict"** for anything the site outputs

What the site says instead: what was filed, what the arithmetic comes to, which way it
moved. *"Borrowings are higher than at 31 December"* is a fact. *"Borrowings are
dangerously high"* is an unlicensed credit opinion. That line is the entire product.

**Must include:**

- The non-licence line on every scored screen, in the reader's language (ships as
  `legalNotLicensed`): *"ESTHMR is a publisher and is not licensed by the Financial
  Regulatory Authority. We do not buy, we do not sell, and we do not advise. Nothing here
  is a recommendation to trade any security."*
- Attribution and a link back on every news headline. Outlet's own headline and picture,
  link to their article, **never** the body text.
- A date on every figure. Filings lag, macro lags, prices are delayed.

**Borrow the guard, don't re-derive it.** Prose in the data has already passed an advice
detector, a figure-quoting check and a verdict-word filter in both languages. Render those
strings as-is and you inherit the protection. Write your own copy only for navigation,
headings and help text — never new sentences about a named company.

---

## 3. Fetching and caching

```
https://thebarbarianproject.com/data/v1/<path>
```

Same origin as the site, plain JSON, no auth, no rate limit.

**Fetch `manifest.json` first, always:**

```json
{
  "schema_version": 1,
  "data_version": "771314503edcd981",
  "generated_at": "2026-08-27T11:48:47+00:00",
  "market_date": "2026-08-26",
  "versions": { "market": 44883356, "companies": 28407954, "news": 64645472,
                "disclosures": 89454315, "calendar": 58781588, "signals": 83066781,
                "review": 11269032, "sectors": 98096326, "macro": 3617583,
                "rates": 84397460, "connections": 32690950,
                "market_history": 33815261, "cash_or_trash": 42225606 }
}
```

- Each `versions` entry is a **content fingerprint**. Unchanged → cache is still correct →
  do not refetch.
- `data_version` changes when anything changes. A `schema_version` change means stop and
  update the client.
- `market_date` is the session the figures describe. **Show it** — it is not always today.
- Poll the manifest on load and on tab refocus; fetch everything else only when its
  fingerprint moved.

**Live prices are a separate feed:** `https://quotes.thebarbarianproject.com/quotes.json`
— a Cloudflare Worker snapshot **delayed ~15 minutes**. Refresh at most every 5 minutes.
**Label the delay wherever a live price appears.** `market.json` is an official close and
is not live.

---

## 4. Every resource

| Path | Holds | Size | Load |
|---|---|---|---|
| `manifest.json` | Versions, session date | 4 KB | Always first |
| `market.json` | Every ticker's close, change, volume | 28 KB | Eager |
| `companies.json` | Directory of 282: names en/ar, sector, cap, EPS, P/E, net income | 104 KB | Eager |
| `companies/{TICKER}.json` | Full company document (§5) | ~25 KB | Per company |
| `prices/{TICKER}.json` | Up to 1,500 sessions of `{date, close}` | ~50 KB | On chart zoom |
| `news/latest.json` | 400 headlines, source, image, tickers, why it matters | 416 KB | Lazy |
| `sectors.json`, `sectors/{slug}.json` | 15 sector reads | 132 KB | Lazy |
| `signals.json`, `signals/{TICKER}.json` | Streak breaks, silences, results due | 1.1 MB | Per company |
| `review.json`, `review/{TICKER}.json` | Metrics + direction + peer comparison | 1.9 MB | Per company |
| `briefs/{TICKER}.json` | Who the company is | 1.1 MB | Per company |
| `calendar.json`, `calendar/filed/{YYYY-MM}.json` | Filed and expected | 7.1 MB | Per month |
| `disclosures/archive/{YYYY-MM}.json`, `disclosures/documents/{TICKER}.json` | The filing archive | 89 MB | **Never bundle** |
| `macro.json` | Suez, GDP, inflation, FDI, remittances | 40 KB | Lazy |
| `rates/latest.json` | EGX 30/70/100, gold, silver, Brent, WTI, EGP crosses | 16 KB | Eager |
| `market-history.json` | 260 sessions of index/metals | 44 KB | On chart |
| `connections.json` | Companies that moved together + the filing behind it | 20 KB | Lazy |
| `cash-or-trash/index.json` | Scored research studies | 24 KB | Lazy |

`market.json` keys stocks by ticker, not as an array:

```json
{"date":"2026-08-26","captured_at":"…","is_close":true,
 "stocks":{"COMI":{"close":88.4,"previous_close":87.1,
                   "change":1.3,"change_percent":1.49,"volume":4213880}}}
```

**Every human-readable string is paired.** Wherever there is `label`, `title`, `read`,
`meaning`, `because`, `why`, there is a matching `*_ar`. Fall back to English when the
Arabic is absent — never render an empty string.

---

## 5. The company page

```
GET /data/v1/companies/KORA.json

{ "ticker":"KORA", "name":{"en":"KORRA","ar":"كورّة"}, "sector":"Utilities",
  "market":{ "last_close":…, "date":…, "open":…, "high":…, "low":…, "volume":… },
  "price_history":[ {"date":"2026-08-26","close":12.4,"volume":118422}, … ],
  "profile":{ "market_cap":…, "shares_outstanding":…, "perf_1w":…, "perf_1m":…, … },
  "financials":{ "annual":[…], "quarterly":[…] },
  "debt":{ … see §6 … } }
```

Each `financials` entry is one filed period:

| Field | Meaning |
|---|---|
| `period` | The label as filed — `H1 2026`, `Q1 2026`, `FY 2025`, `9M 2026 (to 31 Mar)` |
| `period_start` / `period_end` | The actual window. **Sort by these, never the label** — a string sort puts "H1 2026" under "Q4 2024" |
| `revenue`, `gross_profit`, `operating_income`, `net_income` | Income statement, EGP millions |
| `assets`, `liabilities`, `equity` | Balance sheet |
| `debt`, `short_term_debt`, `long_term_debt`, `cash`, `finance_cost` | Borrowings by maturity, cash, cost of carrying |
| `operating_cash_flow`, `investing_cash_flow`, `financing_cash_flow`, `net_change_in_cash`, `dividends_paid` | Cash-flow statement |
| `filing_id`, `source`, `filed_on` | Which filing every figure came from |

**Two traps:**

1. **Periods are cumulative, not discrete.** The exchange files `H1` and `9M` (year-to-date)
   alongside `Q1`. Never subtract to synthesise a quarter; never chart them as one
   comparable series. Label each exactly as filed.
2. **Any field may be null, and null is not zero.** Many periods carry only `net_income`.
   Render what exists, omit the rest.

---

## 6. The debt block

Present when the last filed statement states borrowings; **absent when it states none —
that absence is an answer, not a gap.**

```json
"debt": {
  "period":"H1 2026", "as_of":"2026-06-30",
  "filing_id":"egx-293566", "source":"https://www.egx.com.eg",
  "frame":"operating",              // or "finance"
  "borrowings":1869.119,            // EGP millions
  "short_term":1795.468,            // due inside a year
  "long_term":73.652,
  "cash":375.378,
  "net_debt":1493.741,              // borrowings − cash
  "finance_cost":206.506,           // cost for THIS period
  "due_within_year":0.961,          // share, 0–1
  "cover":1.923,                    // operating profit ÷ finance cost
  "gearing":1.219,                  // borrowings ÷ equity
  "pattern":"raised_and_invested",
  "movement":{ "operating_cash_flow":88.149, "investing_cash_flow":-55.781,
               "financing_cash_flow":13.268 },
  "change":{ "since":"2025-12-31", "basis":"balance_sheet",
             "borrowings":1617.011, "delta":252.108, "direction":"up" },
  "read":{ "read":"During the period, …", "read_ar":"خلال هذه الفترة، …" }
}
```

`pattern` is a **closed set** — render the matching sentence, never your own reading:

| Value | Say |
|---|---|
| `raised_and_invested` | It raised money and spent on assets over the same period. |
| `raised_while_operations_consumed_cash` | It raised money while its operations were using cash rather than producing it. |
| `raised_and_held` | It raised money without spending it on assets. |
| `repaid_from_operating_cash` | It repaid or returned money, and its operations produced cash over the same period. |
| `repaid_without_operating_cash` | It repaid or returned money while its operations were not producing cash. |
| `little_movement` | Its borrowings barely moved. |
| `funding_raised` *(finance)* | It took in more funding than it repaid. |
| `funding_repaid` *(finance)* | It repaid more funding than it took in. |

**Three things the design must respect:**

- **`frame: "finance"` means a bank or lender.** Borrowing is the raw material of the
  business, not a load on it, and the operating-cash test is meaningless because its
  lending runs through that line. Use funding language; note that customer deposits are
  not counted as borrowings.
- **`change.since` is a date, usually the last year-end — not twelve months back.** Print
  *"Higher than at 31 December 2025"*. Never render it as "versus a year ago". `basis` is
  `balance_sheet` (the statement's own prior column) or `year_earlier`.
- **This is not a credit rating.** No traffic lights, no A–F grade, no red panel meaning
  "bad". `cover` below 1 is a fact to state plainly, not a warning to dramatise.

**Worked example — KORA H1 2026:** borrowings EGP 1,869.1m, of which 1,795.5m (96%) falls
due within a year; cash 375.4m; cost 206.5m for the half; against 1,617.0m at 31 December,
so up 252.1m. Every figure read from the borrowing lines of the company's own filed
balance sheet — loans, bank facilities and lease liabilities summed by maturity — never
from total liabilities, which also carry payables, provisions and customer advances that
nobody lent the company.

---

## 7. Screens

Build the first four; the rest are the second pass.

| Screen | Route | Content |
|---|---|---|
| Home | `/` | Index levels, movers, watchlist, what to read now. Show `market_date`. |
| Today | `/today` | News + filings, newest first, attributed and linked out. |
| Market | `/market` | All 282, sortable/filterable by sector, movement, volume, cap, P/E. Bilingual search. |
| Company | `/company/{TICKER}` | The main event — see below. |
| Sectors | `/sectors/{slug}` | 15 sectors: movement counts, medians, standouts, read. |
| Calendar | `/calendar` | Filed and expected by month. Mark estimates as estimates. |
| Exchange | `/exchange` | Indices, gold, oil, EGP crosses, macro with plain-language meanings. |
| Research | `/research` | Scored studies. Bands describe the scorecard, never the security. |

**Company page, in order:** header (names both languages, ticker, sector, last close +
change + its date) → price chart → who they are (`briefs/`) → financials as filed (newest
first by `period_end`, nulls omitted) → **what it does with its borrowings** (the debt
block, below the statement because it is a reading of those figures) → what is unusual
(`signals/`) → its filings (`disclosures/documents/`, linking to the signed document).

---

## 8. Arabic and RTL

Arabic is not a bolt-on. The audience is Egyptian and most source material is Arabic.

- **Mirror the whole layout** with `dir="rtl"` — nav, tables, charts, icon direction. Use
  CSS logical properties so one stylesheet serves both.
- **Numbers stay legible** — Western digits with `font-variant-numeric: tabular-nums`, as
  the app does, so columns align either way.
- **Search must fold Arabic orthography.** Readers do not type hamza or ta marbuta
  consistently and the two upstream sources disagree. Fold أ إ آ ٱ → ا, ة → ه, ى/ئ → ي,
  ؤ → و, strip harakat and tatweel, on both sides of the comparison. Without it
  "الاسكندرية" silently misses three listed companies.
- **Never machine-translate the data.** Every string that needs Arabic has it; fall back
  to English if absent.

---

## 9. Design system

Reuse the app's, so the two products read as one.

| Token | Light | Dark | Use |
|---|---|---|---|
| background | `#EDE8E2` | `#141311` | The ground — warm paper, not white |
| surface | `#F7F4F0` | `#1D1B19` | Cards |
| ink | `#1B1917` | `#F0EBE5` | Primary text |
| textSecondary | `#5C554F` | `#B8B0A8` | Supporting copy |
| textFaint | `#6E6761` | `#9C938B` | Captions, data-age lines |
| accent | `#E8621C` | `#FF8340` | The one orange, used sparingly |
| iris | `#5F4B6E` | `#A99BB8` | Unresolved states |
| up | `#3F6B52` | `#6EA487` | Rises |
| down | `#A3402F` | `#D97D64` | Falls |

Contrast was measured, not guessed — several were darkened to clear 4.5:1 on both card and
ground. **Ink on the accent, never white** (white on `#E8621C` is 3.39:1 and fails).

**Type:** Bricolage Grotesque (display), IBM Plex Sans + IBM Plex Sans Arabic (body),
IBM Plex Mono (tickers, figures in columns). All on Google Fonts.

The up/down pair is a **semantic** signal, separate from the accent. Do not let green or
red creep into decoration — on this product, colour that reads as judgement is a legal
problem, not a taste one.

---

## 10. Hosting

- **Same origin.** Deploy under `thebarbarianproject.com` so data is a relative fetch and
  CORS never arises. The site already runs on a Cloudflare Worker with auto-deploy on push.
- **Static output.** No server, no database, no build-time data fetch.
- **Cache hard, revalidate on the manifest.**
- **Do not bundle the data into the build** — 89 MB of disclosures alone. Fetch per
  company, per month, on demand.
- **Pre-render if the framework allows.** 282 company pages of filed financial data in
  Arabic and English, updated daily, that nothing else in the market publishes.

---

## 11. What not to build

- **No portfolio tracker, position sizing or P&L** — tracking holdings and reporting on
  them moves the product toward advice.
- **No alerts that read as calls to act.** A notification may state a fact; it may not urge
  a trade.
- **No screener that ranks "best" companies.** Filtering and sorting on filed figures is
  fine; a leaderboard of good ones is a graded opinion.
- **No AI chat over the data.** Free-form generation about named securities is what every
  guard in the pipeline exists to prevent.
- **No second data pipeline.** If the site needs a figure the JSON lacks, fix it upstream
  in the build, not in the browser.
- **No republishing article bodies.** Headline, picture, link back — the bargain with every
  outlet in the feed.
