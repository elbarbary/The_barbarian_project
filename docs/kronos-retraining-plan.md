# Retraining Kronos-small on EGX candles — plan

Written 17 September 2026, for the owner's decision of the same day: plan a
retrained Kronos, tested on months it never saw, before it may join the lab.
Nothing here has been run beyond the measurements quoted, and nothing in the
lab changes until stage 3.

## Status

- **17 Sep 2026, approved by the owner:** the Mac GPU, the stage 1 stop rule
  and the stage 2 pass rule, and start the pilot.
- **Pilot data frozen before training.** 258 companies (896,608 candles
  fetched), cut into 500 clean segments. Windows: 686,106 train, 47,207
  validation, 80,229 test. The only cleaning drops were 4,443 candles traded
  after 13 companies were delisted. The manifest's SHA-256 begins `beaefae8`.
- **Preregistered, also before training:** 23 validation origins (every 10th
  session, 2 Jan to 2 Dec 2024), 120 of the 216 companies that cover the
  year, and 20,000 fixed validation windows. Both files are in
  `data-source/lab/retrain/pilot/`; the candles stay off this repository.
- **Pilot training started 12:47 UTC:** 3 epochs of 2,000 steps × 50 windows
  on the M4 GPU.
- **Original weights, measured on the preregistered set:** validation loss
  3.4601, and −16.21% on the steady rise.
- **Stage 1 passed on 18 Sep, all three checks (`data-source/lab/retrain/pilot/decision.json`):**

  | Check | Original | Pilot | Threshold |
  |---|---|---|---|
  | Pull at 20 sessions | 0.9742 | −0.2862 | ≤ 0.5 |
  | Steady rise at 20 sessions | −16.21% | +0.35% | > −5% |
  | Validation loss | 3.4601 | 2.8969 | below the original |

  The original pulled to the average on all 23 origins (0.954–0.989); the
  pilot on none of them (−0.487 to −0.073). Its middle 20-session forecast
  moved from −9.05% to −2.70% while the move back to the average was −6.04%,
  and its forecasts still tell companies apart (at the first origin, 10th
  percentile −9.5%, 90th +6.3%, 42 of 114 above zero, against 8 of 114 for
  the original). Scaling a training window with its own future was the cause.
- **Stage 2 runs on the owner's Pop!_OS box** (RTX 3060, CUDA), not the Mac:
  43 minutes an epoch there was 30 epochs of a working day. The box holds the
  same frozen candles; the original weights scored 3.46011 there against
  3.460098 on the Mac, so the two machines are the same experiment.
- **Full training, 18 Sep, 13:22–14:57 UTC.** 211 windows a second; ten epochs
  of 2,000 steps × 50 windows. Early stopping ended it at epoch 10 under the
  preregistered patience of 3. The kept checkpoint is **epoch 7**, validation
  loss **2.876661** against the original's **3.46011**. Epochs 5, 6 and 7 sit
  within 0.0005 of each other and 8–10 drift back up, so the run converged
  rather than being cut off. `data-source/lab/retrain/full/metrics.json`.
- **The stage 1 measures, re-read on the kept checkpoint** (same 23 origins,
  same 120 companies, `full/eval-kronos-egx.json`): pull at 20 sessions
  **−0.0689**, steady rise **+0.64%**. The original pulled above +0.95 at
  every one of the 23 origins; the retrained model is inside ±0.5 at all 23
  (−0.493 to +0.072). This is a like-for-like reading against the original and
  the pilot — but **it is not held out**: early stopping chose epoch 7 using a
  validation loss computed from 2024 windows, and these origins are 2024.
- **Stage 2 frozen 18 Sep, 15:20 UTC, before a single test origin was read**
  (`data-source/lab/retrain/test/test-preregistration.json`): 72 origins,
  every 5th session from 2 Jan 2025 to 29 Jun 2026; all 258 companies asked,
  225 scorable at the median origin; the checkpoint pinned by SHA-256
  (`9a3e0e24…0734cd`); the two Kronos variants and the lab's six baselines;
  and the pass rule copied from this plan. Rank IC, the summary and the paired
  comparison are imported from `scripts/lab/score.py` — the same code that
  marks every published night — and the baselines are `scripts/lab/forecast.py`
  unchanged, given the same 90 candles Kronos gets.
- **Stage 2 read once, 18 Sep, 16:56 UTC — the answer is STOP**
  (`data-source/lab/retrain/test/decision.json`). Three of the four conditions
  passed and one did not:

  | Check | kronos_original | kronos_egx | Rule | |
  |---|---|---|---|---|
  | Pull at 20 sessions | 0.9797 | **−0.1303** | ≤ 0.5 | PASS |
  | Rank IC at 5 | 0.02620 | **0.04144** | ≥ original | PASS |
  | Rank IC at 5 above zero | — | 0.04144 | > 0 | PASS |
  | Rank IC at 20 | 0.03717 | **0.03653** | ≥ original | **FAIL** |

  It is short at 20 sessions by **0.000636**. Paired on the same origins the
  difference is −0.00064 with a t of −0.04, ahead on 39 of 72 — a dead heat,
  and the rule breaks a tie against the challenger. It is not retuned. The
  rule was written down before these months were read precisely so that a gap
  this small could not be argued into a pass afterwards.

  What it did win: at one session +0.0883 against +0.0625, paired t 2.77, and
  it beats every lab baseline there (`reversal1`, the best of them, draws
  +0.0608). At five, +0.0414 against +0.0262. Its five best names returned
  +1.39% above the equal-weighted market at 20 sessions where the original's
  returned −0.50%.

  **Why the original scores as well as it does at 20 sessions is the pull.**
  On a mean-reverting window "how far is this above its own average" is a
  serviceable ranking, so the defect was buying most of that +0.0372. The
  retrained model gives the crutch up and lands in the same place. That is a
  real finding and it is still not a pass.

- **Stage 3 is not started.** Shipping `kronos_egx` as a lab model needs a
  reading that passes. The honest routes are: leave it unshipped; or run a
  SECOND reading on test months that did not exist when the checkpoint was
  frozen — August 2026 onward — and label it as a second reading. Narrowing
  the claim to 1 and 5 sessions after seeing the result would be choosing the
  horizons the model won on, which is the thing this stage exists to stop.

- **19 Sep 2026, the owner's decision: fix it and run it again, with
  `reversal90` added to the gate.** What follows was worked out on the 2024
  VALIDATION origins. No score from reading 1's months entered any of it.

  **The 20-session weakness is real, and larger than the test made it look.**

  | Mean rank IC, 23 validation origins | 1 | 5 | 20 |
  |---|---|---|---|
  | kronos_original | +0.0616 | +0.0306 | **+0.1047** |
  | kronos_egx | **+0.1267** | +0.0494 | +0.0541 |

  The dead heat on the test months was not a near miss. On validation the
  retrained model is half the original at 20 sessions. That makes it a thing
  that can be worked on honestly, because validation is where it shows.

  **What each model's 20-session ranking actually is.** Correlating each
  model's ordering against candidate explanations, on the same origins:
  `kronos_original` sits at **+0.97** with the distance below the 90-candle
  average and **−0.59** with 20-session trend. `kronos_egx` sits at **−0.13**
  and **+0.17**. The retraining did not merely remove the pull; it turned the
  sign over, and mild trend-following is a losing ordering on this exchange
  (`momentum20` and `momentum60` are negative at every horizon).

  **And then the finding that changed the gate.** If the original's 20-session
  score is really just "how far is this below its own 90-session average",
  that subtraction should score the same alone. It scores better:

  | Mean rank IC at 20 sessions | validation | reading 1's months |
  |---|---|---|
  | **reversal90** — one subtraction | **+0.1124** | **+0.0382** |
  | kronos_original | +0.1047 | +0.0372 |
  | kronos_egx | +0.0541 | +0.0365 |

  It beats both Kronos variants on both sets, and on reading 1's months it
  beats `kronos_egx` at five sessions too (+0.0431 against +0.0414). The
  retrained model's one clear win over everything, including `reversal1`, is
  at a single session: **+0.0883** against +0.0625 for the original, +0.0608
  for `reversal1` and +0.0436 for `reversal90`.

  So the gate reading 1 failed by 0.000636 was a contest between two
  approximations of a baseline that neither of them beats. Passing it would
  not have meant the model had earned its 20-session column.

  Two consequences, both shipped before reading 2 is written:

  1. **`reversal90` is now a lab baseline** (`scripts/lab/forecast.py`,
     `mean_reversion`). It is deliberately NOT `reversal(look=90)`: the
     reversal family is point to point, this is the distance below the
     window's mean, and on validation the two differ (+0.1124 on 19 of 23
     origins against +0.1031 on 16 of 23). Its live record starts the night it
     is added and the sealed nights before that are **not** backfilled, even
     though the arithmetic is deterministic — it was chosen for the lab after
     its backtest was read.
  2. **The gate is stricter.** `kronos_egx` must now also be no lower than
     `reversal90` at 5 and at 20 sessions (`notBelowAt` in the
     preregistration). This raises the bar the model already failed rather
     than lowering it, which is the only direction a rule may move after a
     failure. Reading 1's decision still reproduces byte-for-byte, because its
     preregistration has no `notBelowAt` in it.

- **Reading 2, not yet written.** Its window is the 34 origins from
  **30 June to 18 August 2026**, every session with a complete 20-session
  future inside the frozen snapshot, 234 names at the median origin. Reading 1
  ran to 29 June 2026 and did not touch them. The checkpoint will be chosen on
  the validation origins by rank IC, not by cross-entropy loss: epoch 7 was
  kept for having the lowest validation loss, and nothing ever checked that
  this agrees with what the gate measures. All ten saved epochs are being
  scored on validation first. The preregistration numbers the reading, so a
  second attempt cannot later be read as a first.

## Why

Kronos-small's forecasts are mostly a pull back to the average price of the
candles it is shown (`docs/ai-forecast-correctness.md`):

- Its 20-session forecasts correlated 0.94–0.97 with the move back to each
  company's 90-session average on every night from 13 to 16 September. They
  overshoot that move (slope about 1.2).
- On made-up prices, a steady rise from 100 to 130 draws a 16% fall.
- A longer history does not help on this market. With 500 candles, 77 real
  companies still tracked their average (0.75–0.85), and the middle forecast
  fell to −26%.

Changing the input cannot remove it, because it is in the weights. The likely
source is how Kronos's training samples were scaled. Every window is divided
by its own mean and standard deviation, and upstream's CSV fine-tuning script
still takes those over the whole window, future included
(`finetune_csv/finetune_base_model.py`, line 125 at 67b630e). A model trained
that way learns that the future balances the window around its average: a
rise must come back. Upstream's Qlib dataset was changed to use the past alone
("Fix data leakage in normalization window", PR #227), which is how forecasts
are scaled when the model is used. The pretraining code behind the released
weights is not public, so this cause is likely, not proven. Stage 1 exists to
test it before anything expensive is done.

## The idea

Fine-tune Kronos-small on EGX daily candles with each window scaled by its
90 past candles only, the same scaling used when forecasting. Nothing in the
training then rewards a return to the average. A trend that continued in
the data is shown continuing.

## Data

- **Source.** TradingView split-adjusted daily candles over the chart socket
  the lab already uses (`scripts/egx_history.mjs`, with a larger count in
  `create_series`). Measured 17 September: up to about 6,000 candles a
  company. COMI goes back to December 2001 (5,998). The median of 17 large
  names asked was 5,014; newer listings are shorter (EFIH 1,188, FWRY
  1,724). No zero-volume candles, and the 17 took 7.4 s.
- **Adjustment.** Splits only, not dividends: the same series the lab
  forecasts from.
- **Cleaning.** The lab's own rules, applied per company.
  - A series is cut at a gap of more than 45 days or a close-to-close step
    outside ×0.5–×2 (`run.unreadable`). Each clean segment is kept.
  - A delisted name's candles after its delisting date are dropped.
- **Survivorship.** Only listings with a symbol today can be fetched, so
  companies that failed are missing. Every model is tested on the same set,
  but the test's absolute returns will look better than the market really
  was.
- **Snapshot.** One fetch, frozen: SHA-256 per company and for the whole set,
  with counts and date ranges, written to a manifest. The candles are vendor
  data, so the snapshot stays out of this public repository; the manifest and
  its hashes go in.

## Splits, by time

Each window belongs to the split its forecast origin falls in. Its 20 target
sessions must end inside the same split, which leaves a 20-session gap
between splits.

| Split | Origins | Used for |
|---|---|---|
| Train | through 31 Dec 2023 | fitting |
| Validation | 1 Jan – 31 Dec 2024 | the stage 1 decision, early stopping, the few settings chosen |
| Test | 1 Jan 2025 – 31 Jul 2026 | one reading, after everything is frozen |

Test origins end on 31 July 2026, before the lab's first sealed night on
20 August 2026. After joining, the live record is the real test.

## Training recipe

- **Start from the pinned weights.** Kronos-small at `901c26c1` and
  Kronos-Tokenizer-base at `0e011738`, the revisions the lab runs. The
  tokenizer stays frozen, so forecasting uses the same tokens as today.
- **Windows.** 90 candles in and 20 out (111 with the teacher-forcing step),
  which is exactly how the lab forecasts.
- **Scaling.** The mean and standard deviation of the 90 input candles, used
  on all 111 and clipped at ±5. This is the one deliberate change from
  upstream's CSV script.
- **Timestamps.** The candles' real dates, so future steps follow the EGX
  week.
- **Loss and optimiser.** Upstream's next-token loss and its Qlib settings:
  AdamW at 4e-5, betas 0.9 and 0.95, weight decay 0.1, batch 50, 2,000
  iterations an epoch (100,000 windows drawn at random), best checkpoint by
  validation loss.
- **Speed, measured on this M4.** 0.79 s a training step for 32 windows of
  111 candles, about 40 windows a second, so one epoch takes about 41
  minutes.

## Stage 1 — pilot, with a stop rule (about 1 day)

1. Fetch and clean the data, and write the snapshot manifest.
2. Write the multi-company training dataset with past-only scaling. Its
   tests check that no future candle reaches the scale, and that windows
   never cross a split or a cut.
3. Fine-tune for 3 epochs on the Mac GPU, about 2 hours.
4. Measure the original and the pilot on validation origins: every 10th
   session of 2024, 120 companies, about 1 hour of forecasts on the Mac.

**Go on only if all three hold:**

- **The pull is gone.** The median, over origins, of the correlation between
  the 20-session forecast and the move back to the 90-session average is 0.5
  or less. Measure the original on the same origins for comparison; about 0.9
  is expected.
- **The made-up steady rise is no longer sent down.** A rise from 100 to 130
  gets a 20-session forecast above −5% (the original gives −16%).
- **Validation loss is below the original's**, with both scored under
  past-only scaling.

If any of these fails, stop and report: the pull is not coming from how
samples were scaled, and more training will not remove it.

## Stage 2 — full training and the one test (about 2 days)

1. Train with early stopping, up to 30 epochs: about 21 hours on the Mac, or
   2–4 hours on one cloud GPU.
2. **Freeze and write down before any test origin is read:** the checkpoint
   hash, the settings, and the pass rule below.
3. Forecast every 5th test session: about 80 origins × 240 companies with 90
   candles in. Each Kronos variant takes about 3 hours on the Mac; the
   baselines are instant. Run these models:
   - the original Kronos-small, exactly as the lab runs it (5 paths, T 1.0,
     top-p 0.9);
   - the retrained model with the same settings;
   - the lab's baselines: momentum 20 and 60, reversal 1 and 5, drift and
     flat.
4. Score each horizon (1, 5 and 20 sessions):
   - rank IC per origin (Spearman), averaged, with a t-statistic over
     non-overlapping origins;
   - the lab's own score: its top five minus the equal-weighted market;
   - the pull correlation above;
   - the median forecast beside the median realised move.

**Pass rule (fixed before the test is read):**

1. The pull at 20 sessions is 0.5 or less on the test origins.
2. Rank IC at 5 and at 20 sessions is not lower than the original's, and it
   is above zero at 5 sessions.

**One reading only.** A failed test is not retuned against the test months;
that is the backtest flattering itself, which the lab exists to prevent. A
second attempt would need test months that do not exist yet, and would be
labelled as one.

## Stage 3 — joining the lab (about 1 day, then its own record)

1. **Publish the weights** at a fixed revision with its SHA-256, the snapshot
   manifest, the code commit, the settings and the stage 1 and 2 results. The
   lab's rule is that a forecast must name the weights that made it. Kronos's
   code is MIT; check the model card's licence before publishing.
2. **Add a new model.** `kronos_egx` in `scripts/lab/neural.py` is the
   `kronos` adapter with the new weights: same 90 candles, 5 paths and seed
   rule. It starts in `TRIAL`, gets a dry run on the four-core runner to time
   it, then joins `all`. Kronos takes about 27 minutes on the runner for 260
   companies, so the nightly job would use about 65 of its 90 minutes. Raise
   the job's limit if the dry run says so.
3. **Put it on the site.** Add its label to `publish.LABELS` and `ORDER`, in
   English and Arabic. Its record starts the night it joins, and nothing is
   backfilled onto sealed nights. The pull note appears by itself if its
   numbers ever show the pull.
4. **The original stays.** `kronos` keeps running, pinned and unchanged.

## What it costs

- **Work:** about 4–6 days in all.
  - data and snapshot: 1 day;
  - dataset and training code with tests: 1 day;
  - evaluation harness: 1 day;
  - evaluation and write-up: 1 day;
  - lab integration and dry run: 1 day.
- **Compute:**
  - pilot: about 3 hours on the Mac;
  - full training: about 21 hours on the Mac, or 2–4 hours on one cloud GPU;
  - test forecasts: about 6 hours on the Mac.

## Risks

- **Fine-tuning may not erase the prior.** The pilot's stop rule catches
  that within a day.
- **Nominal EGX prices are dominated by the pound's devaluations** (2003,
  2016, 2022–2024). A model can learn "prices rise" instead of anything about
  companies. That is why the test scores cross-company rank IC and compares
  against drift.
- **Survivorship**, as above.
- **Vendor data.** The candles are TradingView's. The raw snapshot stays out
  of the public repository. Whether weights trained on it may be published is
  the owner's call.

## Decisions for the owner

1. **Compute:** the Mac GPU (free, about a day of machine time), or one cloud
   GPU on the project's Vertex credits (a few hours).
2. **Where the published weights live**, for the lab's which-weights rule.
3. **Approve the stage 1 stop rule and the stage 2 pass rule** before the
   pilot starts.
