# The Barbarian app — delivery plan

Companion to [`app-spec.md`](app-spec.md) (the contract) and `design/The Barbarian.dc.html` (the look).
This file records **how** we build it and **every place the spec and the design disagree**, with the
resolution. Update it when a decision changes.

Status: **Phase 1 complete** — 2026-08-11. Builds and runs on iOS simulator,
`flutter analyze` clean, 62 tests passing. Architecture notes in
[`architecture.md`](architecture.md).

---

## 0. Verified environment

| | |
|---|---|
| Flutter | 3.41.6 stable · Dart 3.11.4 · DevTools 2.54.2 (`~/flutter`) |
| iOS | Xcode 26.6 (17F113), iPhone 17 / 17 Pro Max simulators available |
| Android | SDK present at `~/Library/Android/sdk` |
| Repo | `~/Documents/Codex/2026-07-13/fin/thebarbarianproject` → `elbarbary/The_barbarian_project` |
| Deploy | Cloudflare static assets. `public/wrangler.jsonc` has `assets.directory = "."` and **no `main`** — pure static, no Worker yet. |
| Serving check | `public/.assetsignore` excludes only `.wrangler`, `wrangler.jsonc`, `.DS_Store`, `.git`, `node_modules`. **`public/data/v1/` will serve at `https://thebarbarianproject.com/data/v1/`.** |

A duplicate clone at `~/The_barbarian_project` was deleted 2026-08-11. This is the only clone.

## 1. Repo layout

Everything new is additive. `public/*.html`, `public/style.css`, `public/script.js`, `public/evidence/`
and every existing URL stay exactly as they are (spec §58).

```text
thebarbarianproject/
├── public/                 # EXISTING website = Cloudflare asset root. Untouched.
│   └── data/v1/            # NEW  static app API (§16). Generated, committed.
├── app/                    # NEW  Flutter application (§37)
├── data-source/            # NEW  human-readable raw data, committed (§15, §22 needs it to persist)
├── scripts/                # NEW  python ingestion + build pipeline (§20)
├── design/                 # NEW  imported Claude Design canvas, reference only, not deployed
├── docs/                   # NEW  app-spec.md, app-plan.md, + §60 docs
└── .github/workflows/      # NEW  scheduled market-data update (§23)
```

**The Flutter app lives in this repo under `app/`.** Spec §3 says reuse the existing repository, and
Cloudflare only ever publishes `public/`, so a Flutter project at the root cannot affect the website.
One repo also means one GitHub Action can rebuild data and the app reads it from the same commit.

## 2. Design ↔ spec reconciliation

The design canvas was made for this app and is newer than the spec's design notes, so **the design wins
on look**; the **spec wins on features, naming and regulatory posture**. Every conflict and its ruling:

| # | Design canvas | Spec | Ruling |
|---|---|---|---|
| 1 | Warm bone `#F5F1EC`, ink cards, orange `#E8621C` | §39 "dark/deep purple surfaces", "lime accent" | **Design palette.** Build tokens once, ship **light (default) + dark** themes. Decided by user 2026-08-11. |
| 2 | Outfit + IBM Plex Sans Arabic | §40 Bricolage Grotesque / Instrument Serif / Space Grotesk | **Design fonts.** Both are SIL OFL, so §40's licensing caveat is satisfied, and IBM Plex Sans Arabic is a real Arabic face — §41 needs that. |
| 3 | `PRO` badge on Home and You | §61 no paid subscription system in V1 | **Omit.** `enablePaidTiers = false` alongside the §46 flags. Decided by user 2026-08-11. |
| 4 | Home hero reads `DAILY INSIGHT · 11 AUG` | §4 "Do NOT rename it Daily Insights" — it is the **Opportunity Scanner** | **Keep the design's editorial hero card, relabel it `OPPORTUNITY SCANNER · 11 AUG`** and put the §6 counts (`1 Qualified · 4 Watching`) in it. Satisfies both. |
| 5 | Company tabs: Overview · Financials · Research · Filings · Discussion | §13: Overview · Financials · **Price** · Research · **Pit** | **Overview · Financials · Price · Research · Discussion.** Design's 52-week gauge stays in the header; `Price` gets the §13 `1M/3M/1Y/5Y/MAX` chart. "Discussion" over "Pit" inside a company page reads better and §13's intent is met. `Filings` folds into Research until there is a filings feed. |
| 6 | Verdict gauge `72` on a Trash→Cash 0–100 scale | §9 verdicts `cash/loose_change/recyclable/trash/toxic`; published scores are **signed** (KWIN −50, GBCO −6, CIRA −1, MCQE +20) over 6 pillars | **Keep the gauge, rescale it to the real signed range** with 0 at centre, Trash left / Cash right. Showing a 0–100 number the research never produced would misstate published work. |
| 7 | `Prices delayed 15 minutes` | §49 never pretend stale data is live; pipeline is **end-of-day only** | **`Last close · <date>`.** We will not have a 15-minute feed, so the design's own alternate label ("end-of-day EGX data") is the honest one. |
| 8 | Market header count `243` | §7 coverage `thndr 224 / egx 293` | Count comes from `companies.json` at build time. No hard-coded totals anywhere. |
| 9 | Home shows EGX30 level 31,842.60 + volume | not in spec | Keep **only if** a licensed/available index series exists (Yahoo `^CASE30` to be verified in Phase 2). If not available, the card degrades to the Opportunity Scanner hero alone rather than showing a fabricated number. |

The design is clean on §8: no BUY/SELL/TARGET/STOP/EXPECTED-RETURN anywhere. Nothing to strip.

## 3. Design tokens (extracted from the canvas)

```text
ink          #1B1917   dark card surface, primary text on light
ink-raised   #242120   elevated dark surface
paper        #F7F4F0   card surface on light
bg           #F5F1EC   app background (canvas gradient #EDE8E2 → #E3DCD4)
hairline     #E8E2DB / #D9D2CA
text-2       #5C554F   secondary
text-3       #7A736D   muted (most-used muted tone)
text-4       #8E8781 / #9A938C
accent       #E8621C   orange — on light
accent-lift  #FF8340   orange — on dark surfaces
up           #3F6B52   positive
down         #A3402F   negative

dark theme:  bg #14120F · card #1B1917 · raised #242120 · text #F7F4F0 · accent #FF8340
```

Type: **Outfit** 200/300/400/500 (display + UI), **IBM Plex Sans Arabic** 300/400/500 (Arabic, labels,
numerals). Display sizes run very light — the canvas uses weight 200 at 56px for "The Barbarian" and
weight 200–300 for large figures. Never bold a number.

Both families are SIL Open Font License 1.1 → bundled in `app/assets/fonts/` (§40 satisfied).

Verdict colours must never be the only signal (§42): every verdict shows emoji + word + score.

## 4. Screens in the canvas

Eight, all with full copy in the design source: **Home · Market · Company (SWDY) · The Pit ·
Post detail · Research reader · You · States**. The States frame is a gift — it specifies empty
watchlist, empty feed, no search result, loading ("static dimmed placeholders at 40% — no shimmer")
and reported-post copy, which covers most of §49.

Phase 1 ships Home, Market, Company, Cash or Trash, Opportunity Scanner, You, and the States
behaviours. The Pit renders its §56 placeholder.

## 5. Content pipeline reality check

- `public/cash-or-trash.html` currently holds **7 score-cards** (KWIN, AMES, CIRA, DGTZ, NCCW, GBCO and
  an uncommitted MCQE) and **no `data-*` attributes** — it is not machine-readable today.
- `public/egx-insights.html` has **no automation marker comments**, so §24's "don't break existing
  markers" has nothing to protect; the page is regenerated wholesale.

So §25's "single source, no duplicated manual editing" is reached in two steps, not one:

1. **Now** — a deterministic extractor parses the existing HTML score-cards into
   `public/data/v1/cash-or-trash/index.json`. One direction, existing page untouched, zero risk.
2. **Later** — invert it: a structured source generates both the HTML and the JSON.

Same shape for the scanner (§24 explicitly permits the temporary build step).

## 6. Milestones and commits

Ordered so the §55 flow — open → scanner → cash or trash → search SWDY → price → financials →
research — works end to end before any community code exists.

### Phase 1 — static app foundation (§54, §56)

All twelve landed. Two extras were pulled forward from phase 3 because they let
the app run on real research rather than invented data:
`scripts/build_cash_or_trash_api.py` (the §25 extractor) and
`scripts/build_fixtures.py`.

| # | Commit | Contents |
|---|---|---|
| 1 | `feat: initialize barbarian flutter app` | `app/` scaffold, Flutter 3.41.6, analysis options, iOS/Android bundle ids |
| 2 | `feat: add barbarian design system` | tokens, light+dark `ThemeExtension`, Outfit + IBM Plex Sans Arabic, core widgets (card, pill, segmented row, verdict badge, stat tile), RTL-safe from the start |
| 3 | `feat: add app shell and routing` | 4-tab glass bottom nav (Home/Market/The Pit/You), declarative router, Pit placeholder |
| 4 | `feat: add static market data contract` | immutable models + JSON codecs for manifest, market snapshot, company, opportunities, cash-or-trash; unit tests (§52) |
| 5 | `feat: add local cache and manifest refresh` | storage abstraction, cache-first render → manifest → version diff → quiet refresh (§17, §36) |
| 6 | `feat: add development fixtures` | 6–8 companies (§57) using the real researched names so screens show true data |
| 7 | `feat: add market screen and company search` | search over cached directory, no per-keystroke network (§35) |
| 8 | `feat: add company detail page` | overview, price chart with 1M/3M/1Y/5Y/MAX, financials, research links |
| 9 | `feat: add opportunity scanner client` | qualified / watching / **rejected** sections — rejected never hidden (§7) |
| 10 | `feat: add cash or trash client` | list, verdict filter, sort, WebView into the existing investigation pages |
| 11 | `feat: add local watchlist and bookmarks` | on-device only, no account (§30, §33) |
| 12 | `feat: add empty, loading and error states` | the States frame, verbatim copy (§49) |

### Phase 2 — data pipeline (§20–23)

`scripts/` with a `MarketDataProvider` interface and a `YahooFinanceProvider` behind it (§14),
incremental fetch (§22), validation that refuses to overwrite the last good dataset (§21),
`build_all.py`, then the scheduled GitHub Action with `workflow_dispatch` (§23).

### Phase 3 — research integration (§24, §25)

Scanner and Cash or Trash extractors, research cards on company pages.

### Phase 4 — The Pit (§28–31, §53)

Worker + D1, auth, posts/comments/likes/reports. Requires adding `"main"` to `wrangler.jsonc`.
App must stay fully usable when the Worker is down.

### Phase 5 — polish (§54)

Arabic localisation + RTL pass, notifications architecture, accessibility review, release builds.

## 6a. Findings from the design extraction (2026-08-11)

Eight agents read the canvas screen by screen and a ninth consolidated them into
31 shared widgets, 63 tokens and 15 risks. Full output in `docs/design-specs/`
(`_design-system.json` plus one file per screen). What changed as a result:

| Finding | Status |
|---|---|
| **Tabular figures are not guaranteed.** Measured from the bundled binaries: Outfit *has* `tnum` but its default digits are **proportional** (`1`=321, `0`=659 at 1000 upem); IBM Plex Sans Arabic **lacks** `tnum` but its digits are **already monospaced** (all 600). | Verified safe, for opposite reasons. Recorded in `BarbarianType` so nobody removes the Plex call or swaps a family. |
| **No ink ripple exists anywhere in the design** — every surface scales 2–6% and springs back. | Fixed: theme sets `NoSplash` and transparent splash/highlight/hover; `BPressable` is the house feedback. `InkWell` is banned. |
| **CSS inset shadows cost zero layout; a Flutter `Border` does not.** Eleven inset rules across the design would each shift a row by 1px and compound down a list. | Fixed: `BHairline` returns decorations for **`foregroundDecoration`**, which paints over the child without consuming layout. |
| **Direction ≠ desirability.** The canvas paints "Net debt 12.9bn ▲ 8.8%" in the up colour, while its own financials table shows net debt *falling*. | `BChangeDelta` takes `isPositiveGood`; the glyph always reports true direction, the colour reports whether it is welcome. |
| **Three colour-only states** (Reader save toggle, You notification toggle) violate §42. | Widgets that invert require a label or icon change too. Flagged for the screen work. |
| **`fl_chart` cannot build the canvas's visuals** — a 56-blade staggered arc gauge, a non-uniform-scaled area chart, unlabelled bar charts. | Those three become `CustomPainter`. `fl_chart` is kept only for the §13 Price tab chart, which the canvas does not specify. |
| **The arc gauge is west-anchored** (`ratio = (value−min)/(max−min)`), so a signed score would fill from the left edge rather than from centre. | The verdict gauge needs an explicit centre-anchored mode with a static zero marker. Scheduled with the gauge. |
| **Dark mode is entirely unverified** — the canvas has *zero* dark tokens despite its "dark-first" label. | The dark ramp here is derived, not transcribed. Needs a contrast pass before release. |
| **Per-screen block gaps are not tokens** (22/24/20/20/18/20/22/22 across the eight screens). | `BScreenScaffold` takes `blockGap` per screen rather than pretending there is one value. |

## 7. Standing rules for this build

- Never break an existing website URL or page (§58).
- Static by default; D1 only for user-generated content (§27, §48).
- No AI, no broker, no algorithms, no portfolios, no price targets (§43–45, §61).
- Feature flags in §46 exist and stay `false`, with no hidden UI.
- Every screen shows its data age; stale is labelled, never disguised (§49).
- yfinance stays behind the provider interface — the app never learns its name (§14).
- $0/month while inside free tiers (§47).
