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
| 1 | Translation needs a home in this file | done — issue 1 above |
| 2 | **Time is crucial**: how old each headline and filing is must be obvious | open |
| 3 | EGX 30 / 70 / 100 historic levels — find a source, fetch, and chart them | open |
| 4 | Rose/fell needs its red / green / grey lines, and pressing it should show past sessions | open |
| 5 | "All filings" / "All news" should scroll to the section rather than navigate away; the news list feels too short to be worth scrolling | open |
| 6 | Show the article's own picture on a news card where one exists | open |

Item 2 is not a new requirement — §49 already says *every screen shows its data
age; stale is labelled, never disguised*. It is a compliance gap, not a feature
request.
