# The Barbarian — Mobile App Product & Engineering Specification

> Source: user-provided spec, captured verbatim 2026-08-11.
> This file is the contract. When implementation and this document disagree, this document wins
> unless the user says otherwise. Reference sections by number (e.g. "spec §17 manifest").
>
> Companion design source: `design/The Barbarian.dc.html` (Claude Design project
> `a8df885b-140e-4a7a-8e79-da46260885ad`), rendered with `design/support.js`.

---

You are building a production-quality Flutter mobile application called **The Barbarian** for the Egyptian Exchange (EGX).

The existing public project and website already exist here:

- GitHub repository: https://github.com/elbarbary/The_barbarian_project
- Existing website: https://thebarbarianproject.com

Do NOT redesign or replace the existing website. The mobile application should build on the existing project and use the existing GitHub repository as the initial public-data/content source.

## 1. PRODUCT VISION

The Barbarian should become an EGX research, market-data, and community application.

The product should help people:

- discover what is happening in the Egyptian market;
- read The Barbarian's research;
- inspect individual EGX companies;
- study historical financial and price data;
- follow companies;
- discuss companies with other users.

The application must NOT initially provide personalized financial advice.

The core idea is: **The Barbarian helps users understand the EGX. It does not decide what they should buy.**

## 2. CORE PRODUCTS

The application has four major areas:

1. Opportunity Scanner
2. Cash or Trash
3. Market / Company Research
4. The Pit community

There is NO AI assistant in V1.
There are NO public user-created trading algorithms in V1.
There is NO broker integration in V1.
There is NO portfolio recommendation engine in V1.

## 3. EXISTING CONTENT THAT MUST BE REUSED

The current repository already contains the website implementation. Important existing files include:

```text
public/
├── index.html
├── egx-insights.html
├── egx-monitor.html
├── egx-early-opportunity-monitor.txt
├── cash-or-trash.html
├── kwin-investigation.html
├── ames-investigation.html
├── cira-investigation.html
├── evidence/
├── style.css
└── ...
```

Do not break the existing website.

The app should consume structured JSON generated alongside these existing pages.

- The app must NOT scrape HTML at runtime.
- The app must NOT make direct runtime requests to raw.githubusercontent.com.
- GitHub is the source of truth.
- Cloudflare is the public delivery/CDN layer.

## 4. PRODUCT NAMING

Use the following names consistently:

- **The Barbarian** — main application/product.
- **Opportunity Scanner** — corresponds to the existing Daily EGX Insights / early opportunity monitoring system. Do NOT rename it "Daily Insights."
- **Cash or Trash** — keep the existing branding.
- **The Pit** — community/discussion area.
- **Market** — company database, financial data, historical prices, sectors, disclosures, etc.

## 5. MAIN MOBILE NAVIGATION

Use a four-item bottom navigation bar:

```text
Home       Market       The Pit       You
```

Do not add more primary tabs.

## 6. HOME SCREEN

The Home screen should feel editorial and useful immediately.

Suggested layout:

```text
THE BARBARIAN

Opportunity Scanner
Updated Today
1 Qualified
4 Watching
[Open Scanner]

Cash or Trash
6 / 224 companies studied
[Explore]

Your Watchlist
SWDY
COMI
ORAS

Latest Research
...

From The Pit
...
```

The screen should combine:

- latest Opportunity Scanner status;
- latest Cash or Trash research;
- watchlist updates;
- latest Barbarian research;
- latest community discussions.

If the user has not created a watchlist yet, show: `Follow companies to build your watchlist.`

## 7. OPPORTUNITY SCANNER

The existing `egx-insights.html` is currently the public representation of the scanner. The app needs a structured version.

Create:

```text
public/data/v1/opportunities/latest.json
public/data/v1/opportunities/history/
```

with files such as `2026-08-11.json`, `2026-08-10.json`, ...

A scanner result should contain fields such as:

```json
{
  "date": "2026-08-11",
  "updated_at": "2026-08-11T12:56:00+03:00",

  "coverage": {
    "thndr": 224,
    "egx": 293,
    "adjusted_histories": 221
  },

  "summary": {
    "qualified": 1,
    "watching": 4,
    "rejected": 12
  },

  "qualified": [],
  "watching": [],
  "rejected": []
}
```

Each company should support fields such as:

```json
{
  "ticker": "MCQE",
  "score": 9,
  "max_score": 13,

  "status": "qualified",

  "headline": "H1 profit acceleration with abnormal volume",

  "catalyst": "H1 consolidated results",

  "published_at": "2026-08-06T09:24:00+03:00",

  "scores": {
    "fresh_disclosure": 4,
    "economic_importance": 3,
    "volume_confirmation": 2,
    "ownership_cluster": 0,
    "dated_catalyst": 0,
    "anti_chasing": 0,
    "limit_up_penalty": 0,
    "issuer_denial": 0,
    "risk_penalty": 0
  },

  "research_summary": "...",

  "sources": [
    { "name": "H1 consolidated filing", "url": "..." }
  ]
}
```

The app should present three separate sections: **Qualified Research**, **Watching**, **Rejected / Failed Test**.

Do not hide rejected stocks. The entire Barbarian identity depends on preserving the failed cases.

## 8. OPPORTUNITY SCANNER REGULATORY UX

The underlying existing scanner methodology currently contains concepts such as entries, targets, holding periods and model positions.

Do NOT make those concepts prominent product primitives in the new app until regulatory status is clarified.

The V1 app should emphasize: catalyst; evidence; materiality; volume; ownership; filings; financial trends; score; why it qualified; why it did not qualify; source links.

Avoid creating UI elements such as:

```text
BUY
SELL
BUY NOW
TARGET PRICE
STOP LOSS
EXPECTED RETURN
BEST STOCK TODAY
```

Do not create brokerage-style CTA buttons.

Where the existing website contains stronger investment language, the app may link to the original research page but should not introduce additional recommendation semantics.

## 9. CASH OR TRASH

Cash or Trash already exists on the website. It studies EGX companies one by one using six pillars:

1. Valuation
2. Earnings Quality
3. Growth
4. Balance Sheet
5. Tradability
6. Governance

Create `public/data/v1/cash-or-trash/index.json`:

```json
{
  "updated_at": "2026-08-11",

  "studied": 6,
  "total": 224,

  "companies": [
    {
      "ticker": "KWIN",
      "name": "Cairo National for Investment & Securities",
      "score": -50,
      "verdict": "toxic",
      "summary": "7.7× look-through NAV; 82% of profit was one property sale",
      "article_url": "/kwin-investigation.html"
    }
  ]
}
```

Allow the following verdict identifiers:

```text
cash
loose_change
recyclable
trash
toxic
```

Individual structured files may later live under `public/data/v1/cash-or-trash/KWIN.json`, `AMES.json`, ... but they are not required for the first milestone.

## 10. CASH OR TRASH MOBILE SCREEN

Screen header:

```text
Cash or Trash

6 / 224 investigated
```

Features: search by ticker; search by company name; sort by score; filter by verdict; display score; display verdict; short summary; open full investigation.

Example card:

```text
CIRA

♻️ RECYCLABLE
-1 / 60

Strong operating business.
Valuation remains the main problem.

[Read Investigation]
```

For V1, tapping Read Investigation can open the existing website investigation inside an in-app browser/WebView.

Do NOT rebuild every 30,000-word research page in Flutter immediately.

## 11. MARKET

The Market tab should eventually become the best simple EGX company browser.

Initial sections:

```text
Market

Search...

Companies
Sectors
Latest
Watchlist
```

Do not include:

```text
Best Stocks
Top Buys
AI Picks
Most Recommended
```

## 12. COMPANY DIRECTORY

Create `public/data/v1/companies.json`:

```json
{
  "updated_at": "2026-08-11T15:30:00+03:00",

  "companies": [
    {
      "ticker": "SWDY",
      "name_en": "Elsewedy Electric",
      "name_ar": "السويدي إليكتريك",
      "sector": "Industrial Goods",
      "exchange": "EGX",
      "has_cash_or_trash": false,
      "has_research": true
    }
  ]
}
```

Every company needs a stable canonical ticker. Future data providers must map into this internal ticker system. The application must NOT use the market-data vendor's ticker naming as its canonical identifier.

## 13. COMPANY SCREEN

The company page should become one of the most important screens in the entire product.

Layout:

```text
SWDY
Elsewedy Electric

Overview
Financials
Price
Research
Pit
```

**Overview** — company name; ticker; sector; latest available price; latest available session date; basic company information; key financial metrics.

**Financials** — eventually show: revenue; gross profit; operating income; net income; assets; liabilities; equity; cash; debt; operating cash flow; capex; free cash flow; margins. Support annual periods and quarterly periods. Use simple native charts.

**Price** — historical end-of-day price chart. Initial periods: `1M 3M 1Y 5Y MAX`. No real-time WebSocket price feed. V1 is research-oriented, not a day-trading terminal.

**Research** — Cash or Trash; Opportunity Scanner history; Other Barbarian research.

**Pit** — discussions associated with this ticker.

## 14. MARKET DATA SOURCE

Create a market-data provider abstraction. The application and JSON schema must never depend directly on yfinance.

Conceptually:

```python
class MarketDataProvider:
    def get_daily_prices(...)
    def get_company_metadata(...)
```

Initial implementation: `YahooFinanceProvider` using `yfinance`. This is ONLY the development / early prototype provider. Make replacing it later easy.

Potential future implementation: `EgxLicensedProvider` or another legally licensed EGX provider.

The app must not need changes when the provider changes. Only the ingestion layer changes.

## 15. RAW PRICE STORAGE

Store development-source data outside `public`.

```text
data-source/
├── prices/
│   ├── SWDY.csv
│   ├── COMI.csv
│   ├── ORAS.csv
│   └── ...
│
├── companies/
│   └── companies.json
│
└── financials/
    ├── SWDY.json
    └── ...
```

Example raw CSV:

```csv
date,open,high,low,close,volume
2026-08-09,63.2,64.1,62.8,63.9,1729382
2026-08-10,64.0,65.2,63.7,64.8,1234567
2026-08-11,64.8,65.8,64.5,65.42,1438221
```

Source files should be human-readable.

## 16. PUBLIC APP DATA

Build scripts convert source data into optimized app-facing JSON.

```text
public/data/v1/
│
├── manifest.json
├── market.json
├── companies.json
│
├── companies/
│   ├── SWDY.json
│   ├── COMI.json
│   └── ...
│
├── opportunities/
│   ├── latest.json
│   └── history/
│
├── cash-or-trash/
│   └── index.json
│
└── research/
```

## 17. MANIFEST

The first network request made by the app should be `/data/v1/manifest.json`:

```json
{
  "schema_version": 1,
  "data_version": "2026-08-11.1",
  "generated_at": "2026-08-11T15:30:00+03:00",
  "market_date": "2026-08-11",

  "versions": {
    "market": 382,
    "companies": 14,
    "opportunities": 219,
    "cash_or_trash": 8
  }
}
```

The app should cache this locally. On the next launch:

1. display cached content immediately;
2. fetch the manifest;
3. compare versions;
4. refresh only changed resources.

Do NOT block app startup waiting for every API response.

## 18. MARKET SNAPSHOT

Create `public/data/v1/market.json` containing the latest available market snapshot:

```json
{
  "date": "2026-08-11",

  "stocks": {
    "SWDY": {
      "close": 65.42,
      "previous_close": 64.8,
      "change": 0.62,
      "change_percent": 0.9568,
      "volume": 1438221
    },

    "COMI": {
      "close": 82.10,
      "previous_close": 81.65,
      "change": 0.45,
      "change_percent": 0.5511,
      "volume": 3912450
    }
  }
}
```

One Home/Market request should retrieve the latest snapshot for all companies. Do NOT make one network request per ticker on the Market screen.

## 19. COMPANY JSON

Each company should eventually have `public/data/v1/companies/SWDY.json`:

```json
{
  "ticker": "SWDY",

  "name": {
    "en": "Elsewedy Electric",
    "ar": "السويدي إليكتريك"
  },

  "sector": "Industrial Goods",

  "market": {
    "last_close": 65.42,
    "date": "2026-08-11"
  },

  "price_history": [],

  "financials": {
    "annual": [],
    "quarterly": []
  },

  "research": []
}
```

Do not make these files unnecessarily huge. If price history becomes large, split it: `prices/SWDY.json`.

## 20. DATA UPDATE PIPELINE

Create scripts such as:

```text
scripts/
├── fetch_market_data.py
├── validate_market_data.py
├── build_market_api.py
├── build_opportunity_api.py
├── build_cash_or_trash_api.py
└── build_all.py
```

Pipeline:

```text
Market source
    ↓
fetch_market_data.py
    ↓
data-source/
    ↓
validate_market_data.py
    ↓
build_all.py
    ↓
public/data/v1/
    ↓
Git commit/deploy
    ↓
Cloudflare
    ↓
Flutter
```

## 21. DATA VALIDATION

Do not blindly publish market data. Validation should detect:

- duplicate dates;
- missing close;
- negative price;
- negative volume;
- malformed ticker;
- date regression;
- historical rows unexpectedly disappearing;
- impossible or suspicious price changes;
- empty provider response;
- corrupted JSON.

When validation fails: do NOT overwrite the last valid public dataset. The application should continue serving the previous valid version. Log the failure clearly.

## 22. INCREMENTAL PRICE UPDATES

Do not download ten years of history every day.

- First run: download historical data.
- Subsequent runs: read latest local date; fetch missing sessions only; append; validate; rebuild.

## 23. GITHUB ACTION

Create a GitHub Action for market data updates. It should:

1. install Python;
2. install required dependencies;
3. run market-data update;
4. validate;
5. rebuild app JSON;
6. commit changes only if valid data changed.

Schedule it once after an EGX trading session in Africa/Cairo time. Keep the schedule configurable. Also allow `workflow_dispatch` so it can be run manually.

Do NOT build an always-running server.

## 24. OPPORTUNITY SCANNER OUTPUT PIPELINE

The Opportunity Scanner currently updates the website. Extend the workflow so the same research result can produce `egx-insights.html` AND `data/v1/opportunities/latest.json` AND `data/v1/opportunities/history/YYYY-MM-DD.json`.

Do not make Flutter parse HTML.

If the current scanner automation cannot directly emit JSON yet, implement a temporary deterministic build step that converts the structured scanner content into JSON. Do not break existing automation markers in `egx-insights.html`.

## 25. CASH OR TRASH OUTPUT PIPELINE

Do not manually maintain two separate leaderboards.

Create a single structured source or deterministic extraction/build mechanism that can produce `cash-or-trash.html` and `data/v1/cash-or-trash/index.json` without duplicated manual editing.

Do this incrementally and without breaking the existing page.

## 26. CLOUDFLARE

Use Cloudflare as the delivery layer. Public/read-only data should be static wherever possible.

```text
GitHub
   ↓
Cloudflare static assets/CDN
   ↓
Flutter
```

Preferred public data endpoint: `https://thebarbarianproject.com/data/v1/` or, if configured later, `https://data.thebarbarian.trade/data/v1/`.

The base data URL must be configurable in Flutter. Never hardcode infrastructure assumptions throughout the application. Use one configuration object.

## 27. DYNAMIC BACKEND

Static information does NOT belong in D1 initially. Do not put these into D1:

```text
historical prices
Cash or Trash articles
Opportunity Scanner history
company financial statements
public company metadata
```

Those are read-heavy/public data and belong in static assets. D1 is reserved for interactive user-generated data.

## 28. THE PIT

The Pit is the community. Initial post types:

```text
Discussion
Question
Research Note
Source / Disclosure
```

Do not create a structured `BUY / SELL CALL`, price target, confidence, holding period, or portfolio recommendation feature in V1.

A normal user may discuss their own market opinion in free text subject to moderation, but Barbarian should not structurally convert every discussion into a trading recommendation.

## 29. PIT DATA MODEL

Use Cloudflare Worker + D1. Suggested tables:

```sql
users
posts
comments
post_likes
comment_likes
bookmarks
watchlists
reports
```

Possible schema:

```sql
users
-----
id
username
display_name
avatar_url
created_at
updated_at
```

```sql
posts
-----
id
user_id
ticker
type
title
body
created_at
updated_at
deleted_at
```

```sql
comments
--------
id
post_id
user_id
parent_comment_id
body
created_at
updated_at
deleted_at
```

```sql
post_likes
----------
user_id
post_id
created_at
```

```sql
bookmarks
---------
user_id
content_type
content_id
created_at
```

```sql
watchlists
----------
user_id
ticker
created_at
```

```sql
reports
-------
id
reporter_user_id
content_type
content_id
reason
status
created_at
```

Add appropriate indexes. Use pagination. Never query an unlimited number of posts/comments.

## 30. ACCOUNT STRATEGY

The read-only parts of Barbarian must work WITHOUT creating an account. Users should be able to: browse Market; read Opportunity Scanner; read Cash or Trash; read research; view The Pit.

An account is required only for: posting; commenting; liking; syncing bookmarks; syncing watchlists.

During the earliest development milestone, watchlists and bookmarks may be stored locally on device. The authentication layer should be abstracted so a provider can be added cleanly later. Do not block the entire application on authentication implementation.

## 31. THE PIT SCREEN

Main tabs/filters:

```text
Latest
Popular
Following
```

Post card:

```text
@username
SWDY · Research Note
2h

Why I think margins changed...

12 comments    24 useful
```

Tapping ticker opens the company page. Tapping post opens thread. Allow reporting abusive/misleading content.

## 32. REPUTATION

Do NOT implement market-performance reputation in V1. Do not reward users because a stock subsequently rose.

If reputation is implemented, it should initially be based on research/community quality. Possible signals: useful votes; source citations; accepted corrections; moderator validation; quality contributions.

Do not create `Best Investor`, `Top Trader`, `Highest Return`, `Most Profitable Calls` in V1.

## 33. WATCHLIST

The Watchlist means **companies the user wants to follow**. It does NOT mean portfolio holdings.

Do not ask:

```text
How many shares do you own?
What price did you buy?
How much money do you have?
What is your risk tolerance?
```

V1 watchlist fields only require `ticker`. Optionally `notification preferences`.

## 34. NOTIFICATIONS

Do not build complicated notifications in the first milestone. Design the system to eventually notify users about: new Opportunity Scanner appearance; new company disclosure; new Cash or Trash research; reply to a user's Pit post/comment.

Do NOT create `BUY NOW`, `SELL NOW`, `PRICE TARGET HIT` notifications.

## 35. SEARCH

Provide unified search for: ticker; company name; sector; Cash or Trash research. Community search can come later.

Search should work quickly using the locally cached company directory. Do not make a network request for every typed letter.

## 36. LOCAL CACHE

The app should feel fast even on slow mobile connections. Use local persistence.

On startup:

1. Load cached app data.
2. Render immediately.
3. Fetch manifest.
4. Compare versions.
5. Refresh changed resources.
6. Update UI quietly.

Cache: company directory; market snapshot; Opportunity Scanner; Cash or Trash index; opened company pages; watchlist; bookmarks.

Use an appropriate Flutter local database/cache library. Keep the repository layer abstracted from the storage implementation.

## 37. FLUTTER ARCHITECTURE

Use Flutter with clean separation between `presentation`, `domain`, `data`. Do not overengineer with dozens of unnecessary layers.

Suggested structure:

```text
lib/
├── app/
├── core/
│   ├── config/
│   ├── networking/
│   ├── storage/
│   ├── theme/
│   └── widgets/
│
├── features/
│   ├── home/
│   ├── market/
│   ├── company/
│   ├── opportunities/
│   ├── cash_or_trash/
│   ├── pit/
│   ├── watchlist/
│   └── profile/
│
└── main.dart
```

Use: a modern declarative routing package; a modern state-management approach; immutable typed models; JSON serialization; an HTTP client with sensible timeouts; local persistence.

Use latest stable mutually compatible package versions. Do not pin arbitrary outdated versions.

## 38. REPOSITORIES IN FLUTTER

Create separate repositories: `MarketRepository`, `ResearchRepository`, `CommunityRepository`, `UserRepository`.

**MarketRepository** reads static JSON:

```dart
getManifest()
getMarketSnapshot()
getCompanies()
getCompany(ticker)
getPriceHistory(ticker)
```

**ResearchRepository** reads static JSON:

```dart
getOpportunityScanner()
getOpportunityHistory()
getCashOrTrashIndex()
```

**CommunityRepository** calls the Worker API:

```dart
getPosts()
getCompanyPosts(ticker)
createPost()
getComments(postId)
createComment()
likePost()
reportPost()
```

## 39. DESIGN LANGUAGE

The mobile application should visually feel like the existing Barbarian website. Do NOT copy the website layout literally. Translate its personality into native mobile UI.

Use: dark/deep purple surfaces; high-contrast typography; selective lime accent; subtle violet/rose/cyan accents; premium editorial cards; generous spacing; strong typography hierarchy; minimal financial-dashboard clutter.

Avoid generic crypto/trading-app aesthetics. Avoid: neon green everywhere; candlestick overload; fake terminal aesthetics; dozens of tiny numbers; overly dense Bloomberg imitation.

The product should feel like: **editorial research publication + modern financial product + intelligent community.**

## 40. TYPOGRAPHY

The website uses typography including Bricolage Grotesque, Instrument Serif, Space Grotesk. Use equivalent fonts in Flutter if legally and technically appropriate.

Suggested hierarchy:

```text
Bricolage Grotesque → UI headings
Instrument Serif    → editorial/research moments
Space Grotesk       → numbers, labels and data
```

Do not ship arbitrary font files if they are not appropriately licensed.

## 41. BILINGUAL READINESS

The app should be architected for English and Arabic even if the first content release is predominantly English.

Do not hardcode English-only layout assumptions. Support RTL.

Company metadata should support `"name_en": "..."`, `"name_ar": "..."`.

All UI strings should live in localization resources.

## 42. ACCESSIBILITY

Implement: semantic labels; sufficient contrast; scalable typography; touch targets; screen-reader-friendly controls; no information conveyed exclusively by color.

For example, do not indicate Cash/Trash verdict exclusively through red/green. Always include text/icon labels.

## 43. NO AI IN V1

Do NOT add: Gemini; OpenAI; Workers AI; Vectorize; embeddings; AI chat; AI recommendations; document RAG.

We are intentionally removing AI to keep cost low; complexity low; regulatory ambiguity lower.

Structure the code so AI could theoretically be added later, but do not implement it.

## 44. NO ALGORITHM MARKETPLACE IN V1

Do not implement: user Python execution; containers; Sandbox; public backtests; algorithm rankings; public live algorithm signals.

These may return in a future regulated version.

## 45. NO BROKER INTEGRATION

Do not integrate: Thndr account; EFG Hermes; Mubasher Trade; brokerage APIs; trading execution; copy trading; order routing.

Future architecture may support it, but V1 does not.

## 46. FEATURE FLAGS

Create centralized feature flags for potentially sensitive future functionality:

```text
enablePublicCalls = false
enablePublicAlgorithms = false
enableAiRecommendations = false
enablePortfolios = false
enableBrokerConnections = false
enablePerformanceLeaderboards = false
```

They should remain false. Do not expose hidden UI for them.

## 47. COST REQUIREMENT

The initial application should be designed to run for approximately $0/month in infrastructure while usage stays inside free-tier limits.

Prefer: GitHub; Cloudflare static assets; Cloudflare Worker free tier; Cloudflare D1 free tier; local caching.

Avoid: always-running servers; paid AI APIs; real-time price APIs; expensive databases; large compute jobs; WebSockets; containers.

## 48. STATIC-FIRST PRINCIPLE

Every time you need data, ask: does this need to be dynamic? If no, put it in static JSON.

- Static: company information; historical prices; scanner reports; Cash or Trash; financial statements.
- Dynamic (D1): posts; comments; likes; reports; synced watchlists.

This principle is important for both cost and performance.

## 49. ERROR HANDLING

The application must gracefully handle: network unavailable; outdated cached data; malformed server response; ticker missing; scanner not updated today; no market data; empty Cash or Trash list; Worker unavailable.

Never display a blank screen.

For market data, always show `Last updated:` or `Last available session:`. Do not pretend stale data is live.

## 50. SOURCE TRANSPARENCY

Research content should expose original sources whenever available. A research card/detail screen should support a `Sources` section with external links.

Visually distinguish `Fact`, `Calculation`, `Interpretation` when the underlying data supports this distinction.

Transparency is a core Barbarian product value.

## 51. ANALYTICS

Do not add expensive analytics infrastructure. Create a thin analytics interface `trackEvent(...)` but allow it to be a no-op initially.

Possible future events: `company_opened`, `opportunity_opened`, `cash_or_trash_opened`, `research_read`, `watchlist_added`, `pit_post_opened`.

Do not couple business logic to analytics.

## 52. TESTING

Add automated tests for important behavior. At minimum:

**Data pipeline tests** — valid CSV becomes valid JSON; duplicate prices rejected; malformed data rejected; invalid scanner JSON rejected; last good dataset preserved after failure.

**Flutter tests** — manifest parsing; company parsing; Opportunity Scanner parsing; Cash or Trash parsing; cache/version behavior; search; empty states.

**Backend tests** — create/read post; pagination; comments; duplicate likes prevented; deleted content handled; input validation.

## 53. SECURITY

For the Worker/D1 community backend: validate all user input; parameterize SQL; implement rate limiting; set maximum post/comment lengths; sanitize/render user-generated text safely; do not allow arbitrary HTML; prevent users from forging another user's ID; verify authentication server-side once auth is enabled; implement reporting and moderation paths.

Never put private secrets inside Flutter.

## 54. APP RELEASE PHASES

**Phase 1 — Static app foundation.** Flutter project; theme; navigation; local cache; manifest; company directory; Market; company page; Opportunity Scanner; Cash or Trash; existing-article WebView; local watchlist; local bookmarks. This phase should require no user account. It should already be a useful product.

**Phase 2 — Data pipeline.** `data-source/`; yfinance development adapter; historical data downloader; incremental updater; validation; `build_all.py`; market JSON output; GitHub Action. Connect Flutter to real static Cloudflare-hosted JSON.

**Phase 3 — Research integration.** Opportunity Scanner JSON output; historical scanner results; Cash or Trash structured index; research linking; research cards inside company pages.

**Phase 4 — The Pit.** Worker API; D1; authentication; posts; comments; likes; reports; company discussion tabs. The app must remain usable when the community backend is unavailable.

**Phase 5 — polish.** Bilingual localization; RTL; notifications architecture; better charts; performance optimization; accessibility review; error monitoring; release build configuration.

## 55. DEVELOPMENT PRIORITY

Do NOT begin by implementing The Pit. First prove that this works:

```text
Open Barbarian
    ↓
Opportunity Scanner
    ↓
Cash or Trash
    ↓
Search SWDY
    ↓
Open SWDY
    ↓
See market history
    ↓
See financials
    ↓
See Barbarian research
```

Once that flow feels excellent, add the community.

## 56. FIRST IMPLEMENTATION MILESTONE

The first working milestone should contain exactly:

**Home** — Opportunity Scanner preview; Cash or Trash preview.
**Market** — company search; company list.
**Company** — overview; historical price chart; research links.
**Opportunity Scanner** — latest report; qualified/watching/rejected sections.
**Cash or Trash** — leaderboard/list; verdict filters; existing article links.
**You** — local watchlist; local bookmarks; settings.

The Pit may initially show: `The Pit / Coming in the next development phase.`

Do not let community backend work delay the first functioning app.

## 57. SAMPLE DEVELOPMENT DATA

Before integrating the entire EGX, create development fixtures for approximately 5–10 companies. Include representative companies such as `SWDY`, `COMI`, `ORAS`, `CIRA`, `KWIN`, `AMES`.

Use this fixture dataset to complete the UI first. Do not download/process the entire exchange before the application architecture works.

## 58. PRESERVE THE WEBSITE

This is critical. Do not: rewrite existing HTML pages; remove existing website functionality; delete research files; change existing URLs; change existing automation markers; restructure existing content without necessity.

New mobile-data infrastructure should be additive. Preferred additions:

```text
data-source/
scripts/
public/data/v1/
.github/workflows/
```

Existing website behavior must remain intact.

## 59. GIT WORKFLOW

Do not make one giant change. Use logical commits. Example:

```text
feat: initialize barbarian flutter app
feat: add static market data contract
feat: add company directory and search
feat: add company detail page
feat: add opportunity scanner client
feat: add cash or trash client
feat: add local cache and manifest refresh
feat: add development market ingestion
feat: add market data validation
ci: add daily market data workflow
```

Keep changes reviewable.

## 60. DOCUMENTATION

Add clear documentation explaining:

- **App architecture** — how Flutter communicates with static assets and dynamic APIs.
- **Data pipeline** — `provider → data-source → validation → build → public/data/v1 → Cloudflare → app`.
- **Updating companies** — how to add a new ticker.
- **Changing market-data provider** — how to replace yfinance without changing the app.
- **Opportunity Scanner** — how structured JSON is generated.
- **Cash or Trash** — how index JSON is generated.
- **Cloudflare** — how static and dynamic infrastructure is separated.

## 61. IMPORTANT NON-GOALS

Do NOT implement any of the following unless explicitly requested later:

- AI assistant
- personalized investing advice
- AI stock recommendations
- stock prediction model
- public Buy/Sell calls
- target-price system
- algorithm marketplace
- portfolio tracker
- portfolio recommendations
- copy trading
- broker connectivity
- automatic trading
- real-time prices
- order books
- intraday tick database
- paid subscription system
- complex reputation algorithm

## 62. SUCCESS CRITERIA

The first Barbarian app is successful if a user can:

1. open it instantly;
2. see today's Opportunity Scanner;
3. browse Cash or Trash;
4. search any supported EGX company;
5. inspect historical price data;
6. inspect basic financial information;
7. see Barbarian research related to that company;
8. follow/bookmark companies locally;
9. use the app without creating an account;
10. continue using cached data with poor connectivity.

And the infrastructure should:

1. cost effectively $0 during early development/beta;
2. reuse the existing GitHub repository;
3. serve public content through Cloudflare;
4. avoid runtime GitHub API requests from Flutter;
5. avoid an always-running server;
6. keep yfinance isolated behind a replaceable provider;
7. preserve all existing website URLs/content;
8. allow The Pit to be added later without rewriting the app.

## 63. PRODUCT PHILOSOPHY

When making implementation decisions, optimize in this order:

1. Trust
2. Research quality
3. Speed
4. Simplicity
5. Low operating cost
6. Community
7. Future extensibility

Do not optimize for maximum feature count. The app should feel focused. The user should understand the core value within seconds:

- Opportunity Scanner tells me what deserves investigation now.
- Cash or Trash tells me what The Barbarian discovered after studying a company deeply.
- Market gives me the raw information to research it myself.
- The Pit lets investors discuss the evidence together.

## 64. FINAL INSTRUCTION

Start by inspecting the existing repository carefully. Do not guess how the current website works.

Identify: current Cloudflare deployment structure; existing website public directory; Opportunity Scanner update markers; Cash or Trash structure; existing styling conventions; current GitHub Actions/workflows if any.

Then implement Phase 1 first. Do not jump ahead to AI, algorithms, brokerage, or complex backend infrastructure.

Before each major implementation decision, prefer the option that: preserves existing website functionality; uses static files when possible; reduces monthly cost; keeps the mobile app independent of the market-data vendor; avoids creating financial recommendation mechanics; can scale gradually.

The goal is not to build a Bloomberg terminal on day one. The goal is to build **the best simple place to research and understand the Egyptian stock market**, using the Barbarian research products that already exist.
