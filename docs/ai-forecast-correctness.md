# Workbench correctness review — 17 September 2026

## Confirmed defects

- `returnsView` always passed 1/5/20 to the market-outlook chart. Selecting a
  shorter window changed the ranking/histogram but not that chart. The plotted
  future now ends at the selected horizon. This is a cross-company median,
  **not an EGX index forecast**. Bands describe cross-company dispersion.
- Nine names in the 16 September scenarios were already marked delisted/OTC
  in the directory: APPC, EITP, GTHE, IRAX, NBKE, NCGC, PACH, TORA, WATP.
  Listing status now gates new inference, Gemini input and current publication;
  the browser also excludes them when it encounters an older saved bundle.
  Historical evaluation and immutable runs are deliberately unchanged.
- Kronos future timestamps used pandas' Monday–Friday business calendar.
  New runs use Sunday–Thursday. Future exchange holidays are **not yet supplied
  by an authoritative calendar**; the adapter records this limitation.
- The pinned upstream Kronos code averages sampled paths (`np.mean(axis=1)`),
  while the adapter called this a median. The description is corrected; the
  averaging algorithm has not been replaced. Weight/tokenizer revisions are now
  explicitly passed to the loader, with evaluation mode enabled.
- A company's last bar could precede the common basis. Models now abstain
  rather than forecast an older closing price under the newer date.

Upstream implementation:
https://github.com/shiyu-coder/Kronos/blob/67b630e67f6a18c9e9be918d9b4337c960db1e9a/model/kronos.py

## Kronos-small's 20-session forecasts are mostly a return to the average

The company-outlook chart draws the saved numbers correctly (16 September:
−0.19%, −1.77% and −10.51% for 1, 5 and 20 sessions). The problem is in the
numbers. Kronos-small's 20-session forecasts correlate 0.94–0.97, on every
night from 13 to 16 September, with the move that would take each company
back to its average close over the 90 candles it reads. They also overshoot
that move (slope about 1.2). After the rally 77% of companies closed above
that average, so Kronos's middle forecast was −10.5% to −13.3%. The other
models sat between −1.0% and −4.4%, and their correlations were 0.16–0.67.

Rerun locally with the pinned weights and code:

- A 60-candle window moves the median forecast from −13.5% (at 90) to −4.0%.
  Each window's forecasts track that window's own average.
- A steady rise from 100 to 130 draws −16% over 20 sessions, and a steady fall
  draws +21%.
- On random walks the correlation is 0.98 at 90 candles, 0.86 at 250 and 0.13
  at 500. Only a long context removes it. At 500 candles each company costs
  6.2 times as long, about 2.6 h on the four-core runner for the market.

A plausible cause, not confirmed for the released weights: the upstream
finetuning code normalised each sample over past and future together until
PR #227.

The sealed record is unchanged. `publish.pull` publishes each night's
correlation for every model and horizon, and the workbench says so where it
reaches 0.8. The owner's decision (17 September) is to add a second Kronos
given a long history, judged only on nights after it starts, rather than to
change the pinned one.

## Prices shown

The current quote is timestamped separately from the frozen forecast basis.
For each price-producing model, retain the central daily closing-price path
before sealing it. Low/high/average are the minimum, maximum and arithmetic
mean **along that path within the chosen window**, not sample quantiles,
probability bounds or intraday high/low. The endpoint remains separately shown.
The price target never gets recalculated using today's quote.

Old runs only saved three endpoint returns. They cannot supply a daily path
or its statistics. Show dashes, not invented ranges. Do not re-run an old
session with a corrected adapter and present it as its original forecast.
Momentum/reversal ranking rules do not produce price targets at all.

## Why Gemini missed risks

The original context used at most 14 days of filing headlines and 48 hours of
news. Measures were optional, and their financial period was not explicit.
A time-series model reads prices/candles, not company news or listing status.

Every future Gemini reading now includes mandatory, dated risk facts:

- Missing/unverified financial period, or period ending more than 270 days ago
  (an explicit research flag, not a statutory filing deadline).
- Large absolute 20-session moves and declining reported net income.
- Explicit company statements in the archived official release body denying
  material information explaining the move, within a 90-day trail.

The trail includes BIOC's 20 July 2026 release, EGX NewsID 291659:
https://www.egx.com.eg/en/NewsDetails.aspx?NewsID=291659

This is **not evidence proving manipulation**. The source and date remain
visible; later material filings must be reconciled. Matching currently covers
explicit English release-body wording, not every possible adverse event or
the content of every attachment. The site must not claim exhaustive screening.

Risk warnings supplied to Gemini are not a deterministic guarantee it will
rank a company low. Listing/OTC exclusions are deterministic. Existing Gemini
scores are not silently edited: older readings are labelled as predating the
mandatory risk check. Current risk notes are not attributed retrospectively
to Gemini. New protocol results should be assessed prospectively.

## CI and integrity

The existing nightly job executes the changed adapters, publisher and all
`scripts/lab/test_*.py` tests; the offline workflow runs frontend regressions.
The model cache key includes the pinned tokenizer revision. Publication
validation now checks saved paths for positive finite values and agreement
with every frozen endpoint return. Authentication and its gate are unchanged.

No stored forecasts, outcomes or Gemini scores were rewritten during this
review. Full price-path fields appear only after the next newly sealed run.

## Verification

- Full site suite on the refreshed branch: 840 tests passed;
  focused checks after the final warning/price-card polish: 92 passed.
- Python suite: all 293 passed using the isolated inference dependencies
  (the optional tensor test also ran). Compilation, whitespace checks, existing
  publication validation and workflow YAML parsing passed.
- Real CPU inference smoke test using pinned upstream Kronos/tokenizer on
  saved COMI, BTFH and BIOC candles through 15 September: all produced finite,
  positive 20-session paths and distinct horizon forecasts. Two calls per
  company produced identical returns. No output was saved as a forecast.
  First call included downloading the pinned weights; later two-call checks
  took about 1.2 seconds per company. This tests execution/reproducibility,
  **not predictive accuracy**. No Gemini API call was made.
