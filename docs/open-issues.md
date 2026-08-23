# Open issues

Things known to be unfinished or unresolved. An issue leaves this file when it
is fixed or when someone decides it does not need fixing — not when it stops
being mentioned.

Last reviewed: 21 August 2026.

---

## 1. New Arabic arrives every day and nothing translates it

**Status:** blocked on a payment decision, degrading gracefully meanwhile.

The whole backlog — 130 headlines and filing titles — was translated by hand on
21 Aug and lives in `scripts/translations_en.json`, a committed, reviewable
file. News and filings are at 100% English coverage today, and recent builds
make zero translation calls.

The delta is the open part. Each session brings new Arabic headlines, and there
is no automatic translator behind them right now:

* **Gemini** is gated behind bought prepay credits. This was chased to the end
  — a new Google account, a new project, the API freshly enabled and a new
  restricted key all return the same `prepayment credits are depleted`, and
  seven models including the cheapest lite ones refuse identically. A cheaper
  model lowers the bill once credits exist; it buys no access.
  Fix: buy credits at <https://ai.studio/projects> for the project the key is
  on (`project-8bba98ed-6d90-45af-ab8`).
* **Cloud Translation** is already wired in ahead of Gemini and would cost
  nothing at this volume — 500,000 characters a month free against a worst case
  of ~245,000 — but it needs billing enabled on the project.
* **An offline model was tried and rejected.** Argos Translate dropped
  "Walmart" and "QNB" out of their own headlines, turned "highest level in 3
  years" into "three years ago", and rendered "investor reluctance" as "investor
  consoles". A translation that silently changes facts is worse than keeping the
  Arabic.

Until one of those is paid for, untranslated strings keep their Arabic, which is
honest rather than broken. Hand-filling the cache also remains valid: the store
is a plain reviewed file and nothing marks entries by origin.

---

## 2. The Arabic non-licence wording has no legal sign-off

**Status:** needs an Egyptian lawyer.

The Arabic disclaimer is a careful translation of the English, which is not the
same thing as being correct under Egyptian law. Nobody qualified has read it.

---

## 3. §8.0 — may an unregistered publisher publish scored analysis at all?

**Status:** unresolved, and upstream of several other decisions.

The app publishes a score out of 13 against a rubric for named issuers. §8
governs *how* that is worded, and the wording is now careful — no entries, no
stops, no targets, no personalisation, and as of 21 Aug no verdict vocabulary
either. It does not answer whether the scored analysis may be published in the
first place by someone holding no FRA licence.

Everything downstream of this — the scanner's existence, the Six Pillars
verdicts, the rubric itself — depends on the answer.

---

## 4. Founder's UI list, 21 August 2026

Raised together; tracked here until each is done.

| # | Item | State |
|---|---|---|
| 1 | Translation needs a home in this file | **done** — issue 1 above |
| 2 | **Time is crucial**: how old each headline and filing is must be obvious | **done** |
| 3 | EGX 30 / 70 / 100 historic levels — find a source, fetch, and chart them | **done** — 260 sessions |
| 4 | Rose/fell needs its red / green / grey lines, and pressing it should show past sessions | **blocked — needs a decision, see below** |
| 5 | "All filings" / "All news" should scroll to the section; the news list feels too short | **done** |
| 6 | Show the article's own picture on a news card where one exists | **done** — 68 of 120 |

Item 2 was not a new requirement — §49 already says *every screen shows its data
age; stale is labelled, never disguised*. It was a compliance gap. Filings
showed no date at all, and Home's hero asserted "Filed today" over a feed that
was a day old.

### 4 is blocked on a decision, not on work

The breadth chart draws a dot instead of three lines because the store holds
**one** session of breadth. Index levels were backfilled a year deep; breadth
cannot be, and the reason is a genuine conflict rather than a missing source:

* **Today's count** comes from the market snapshot. It reads every listed
  share's published change, so it counts **282** shares and a change of exactly
  zero is a real "did not move" — 48 of them on 20 Aug.
* **A historical count** can only come from the stored per-company closes. Those
  cover 259 companies, and coverage per date is thinner still because many
  shares' stored history ends earlier — a derived 19 Aug counts **209**, with
  only 4 unchanged.

Different populations and different definitions of "unchanged". Charting one
against the other reproduces exactly the bug that was already fixed once, when
Today and Home showed 107 up against 57 for the same session; `home_screen_test`
now has a guard named *§49 one breadth count, from one source*.

Three ways out, none of which should be picked without the founder:

1. **Let it accumulate.** A row a day, and the chart fills in over a fortnight.
   Costs nothing, honest, slow.
2. **Derive the whole series, including today, from stored closes.** One method
   everywhere and the guard holds. Costs the headline count its 282-share
   denominator and a day of freshness.
3. **Fetch real historical closes for every listed share** and rebuild breadth
   properly. Correct, and by far the most work and the most scraping.

---

## 5. Review against the spec, 21 August 2026

Asked whether the app actually does what it is meant to. Read §1–§56 against
what is built. Two things that *look* like holes are not, and two real ones.

### Not holes — the spec defers them on purpose

* **The Pit is a placeholder** (104 lines against 1,000–1,700 for real
  features), and a quarter of the navigation says "coming soon". §55 opens with
  *"Do NOT begin by implementing The Pit"* and names the flow that must feel
  excellent first. §30 adds that the read-only product must work with no
  account at all. So this is sequencing, not neglect.
* **Notifications do not exist.** §34: *"Do not build complicated notifications
  in the first milestone."*

### Real: quarterly financials exist for 1 company in 282

§13 requires the Financials tab to *"support annual periods and quarterly
periods"*. Annual covers 228 of 282 (81%). Quarterly covers **one**. So half of
what §13 asks for is a tab that cannot be drawn, and "study historical
financial data" (§1) is served at yearly resolution only — on an exchange where
the interesting filings are half-year results.

Mubasher carries interim statements and `mubasher_statements.py` already parses
that shape; this is a collection job, not a research one.

### Real: the price series is a few months deep, not five years

§13 asks for `1M 3M 1Y 5Y MAX`. What is held:

| sessions stored | companies |
|---|---|
| none | 23 |
| under 50 | 3 |
| 50–99 | 240 |
| 200+ | 16 |

So 1Y is fillable for 16 companies and 5Y for none. The window selector no
longer offers what it cannot fill, which stops the screen overstating itself —
but that is honesty about a gap, not the gap closed. The company page is
supposed to be *"one of the most important screens in the entire product"* and
its Price tab is a few months deep for almost everything.

Investing.com served a verified year of index closes and very likely serves
per-share history too, but it began rate-limiting during this work. Needs a
paced, resumable job — the same discipline the EGX fetcher uses.

### Coverage that is fine

Profile and market snapshot 282/282. Search, watchlist, bookmarks all work.
Cash or Trash is 8 studies, which is by design — they are deep investigations,
not a per-company field.

---

## 6. Progress on the review, 21 August 2026

### Closed

**Price history.** 810,044 sessions collected from Mubasher across 210
companies and merged. 1Y was fillable for sixteen listings and is now fillable
for **208**. The window selector already refuses to offer what it cannot fill,
so the two changes meet in the middle.

The verification tolerance was wrong on the first pass and is worth recording:
at a tenth of a percent it rejected 121 companies sitting at 81-89% agreement,
because two honest feeds of the same closes round differently — Al Arafa's
1 June is 7.32 on ours and 7.35 on theirs. At one percent those pass and the
real failures still do not, at 12% to 60%.

**Localisation.** Forty-six user-facing strings were written into widgets and
never reached an Arabic reader — Today's section headings, the You screen, the
empty states, and the whole nine-line scanner rubric. All are in the ARB now,
in both languages, and a test walks `lib/` and fails on any new one. That guard
matters: `'OPPORTUNITY SCANNER'` survived a product rename earlier the same day
purely because a hardcoded string is invisible to the ARB and to a reviewer
grepping for the old name.

That guard was then found to be seeing about half of what it claimed. It
matched literals passed straight into `Text(` or a `label:`-shaped parameter,
so a string returned from a model getter, sitting in a `(String, String)`
record, or behind a ternary was invisible to it — which is how the most-rendered
sentence in the product, the price-age line, stayed hardcoded English through
several passes that each reported the file clean. It now walks the whole first
argument of a copy-carrying widget with a balanced-paren scan, reads `value:`,
`text:`, `sentence:` and the explainer fields, catches one-word row labels, and
scans `=>` arms under `core/models` for sentences a widget cannot know were
never translated. Under the wider guard the baseline went to 46 and is now
empty, screen-reader labels included.

**Explainer prose is in both languages.** Roughly two dozen sentences lived in
`core/models/explainer.dart` — the bodies as well as the titles — and were
deliberately left whole in English, because an Arabic heading over an English
paragraph reads worse than either. They are the app's teaching surface: every
number that opens a sheet opens one of these. All five builders now take the
reader's language, the file is no longer exempt from the localisation guard,
and a test renders every sentence each one can produce in Arabic and fails on
a Latin letter.

**The scanner's own vocabulary is in Arabic.** `ScanStatus.label` was three
English literals on a model, so "Watching · of 13" sat under a score. The
report's finer wording — "Persistent watch", "Tape propagation alert" — comes
out of an English field note, so the builder publishes an Arabic sibling from
a table of the phrases the note has actually used, clause by clause, and a
phrase nobody has written an Arabic for stays in English rather than being
guessed at.

**The sector a company is filed under is in Arabic.** Twenty English category
codes from the scan were printed raw on the directory's chips and twice on
every company page. A test over the published directory fails when a new one
arrives.

### Still open

**5Y and MAX have no data behind them.** The published company file is capped
at a year, because 282 companies of twenty years is fourteen megabytes of JSON
in the app binary. §19 already anticipates this: *"If price history becomes
large, split it: `prices/SWDY.json`."* The full series is staged in
`data-source/prices`; building that document and wiring a repository, provider
and manifest entry for it is the remaining work.

**72 companies still have shallow or no price history.** 27 have no Mubasher
page, 40 failed identity verification against closes we already held, and 5 had
too little overlap to confirm. None were taken on faith. A second source would
be needed for these rather than a looser check.

**The full legal statement is English-only**, deliberately: it is a constant so
counsel edits one place and a test can assert on it. The Arabic version is
issue 2 above and is blocked on the same sign-off.

---

---

## 7. What World Monitor teaches us, 21 August 2026

<https://github.com/koala73/worldmonitor> — a global intelligence dashboard with
finance and commodity variants. Studied, not copied: it is **AGPL v3**, so its
code cannot enter a closed App Store product without taking the whole product
with it. What is worth having is its **source catalogue** and a couple of its
habits.

### Sources tested against Egypt, today

| Source | Verified | What it gives ESTHMR |
|---|---|---|
| **IMF PortWatch** (ArcGIS feature service) | **yes** — daily Suez transits to 16 Aug, no key | The single most Egypt-specific macro series there is |
| **World Bank Open Data** | **yes** — Egypt GDP growth 4.39%, CPI 14.07%, FDI $15.5bn (2025), no key | The long-run backdrop, annual |
| GDELT | **yes, on retry** — see the verdict below | Suez and macro context, not a general feed |
| U.S. EIA | not tested | Crude inventories and fuel prices |
| FRED | not tested (needs a free key) | US rates, which drive emerging-market flows |

**Suez is the find.** PortWatch publishes a daily count of vessels through the
canal, split by container, tanker, dry bulk, general cargo and roro, plus cargo
capacity — 41 vessels on 16 August against 57 on the 11th. Canal dues are among
Egypt's largest foreign-currency earners, and the 2024 Red Sea diversion took a
visible bite out of them. That chain — *transits fall → dollar earnings fall →
pressure on the pound → import costs rise → margins compress* — is the clearest
"why this matters to somebody holding EGX shares" story available anywhere, and
every link in it is a published number rather than an opinion.

### Habits worth stealing

* **A published source catalogue with licence posture per provider.** They list
  every upstream with its provider, feed tier, licence and collection method.
  ESTHMR marks provenance per figure (§50) but has no such page. It should:
  the same discipline, one level up.
* **Freshness tracked per source group**, which is §49 by another name and
  confirms the instinct.
* **A Gulf panel** — Tadawul, DFM, ADX, Qatar, alongside Brent and WTI. Gulf
  money is a real participant in the EGX and we publish none of it.

### And one habit to avoid

Their finance radar carries a **"composite BUY/CASH verdict"**. That is exactly
what §8 forbids us, and it is worth writing down that the most attractive-looking
feature in a comparable product is the one we must not copy. Publishing the
inputs is the product; publishing the conclusion is advice.

### What this would look like here

A `macro_types.py` beside `filing_types.py` — a hand-written, reviewed glossary
in English and Arabic mapping each macro event to the mechanism it sets off,
never a model's sentence. Detection and numbers from the free sources above; the
explanation written once, by a person, exactly as the filing glossary is. That
keeps §43 (no AI), §50 (provenance) and §8 (mechanism, not advice) intact.

Start with Suez, because it is daily, free, verifiable, and nobody else puts it
in front of an Egyptian retail investor.

