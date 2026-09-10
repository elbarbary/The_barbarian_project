# Sector pulse and ownership lens

New ESTHMR routes: `?view=liquidity` and `?view=ownership`. Both have Home
entry cards after the existing EGX index graphs and entries under Explore.
Arabic/English and light/dark use the existing site's state and tokens.

## Data contract and refresh

`scripts/build_flow_trackers.py` reads only the latest published company
directory, company histories, market snapshot and insider dataset. It makes
no network or AI calls. The daily build and live-data build regenerate the
read model before the manifest. Published files and bundled copies match.

- `flow-preview.json`: small Home payload, latest sector observations and count.
- `flow-trackers.json`: histories, reference profiles and source-linked events;
  fetched only when a reader opens a tracker. It uses the existing authenticated
  data route. Failed loads expose Retry; late responses cannot cross sign-out.

## Sector interpretation

- Size is the sum of available published market capitalizations; coverage is
  shown. Non-EGP listings are excluded from sector EGP totals.
- Traded value uses actual reported turnover when available for the same
  session, otherwise **close × volume**, explicitly labelled an estimate.
- Total purchases and total sales are equal sides of this traded value. They
  are **not** buyer-/seller-initiated flow, order-book imbalance, or net inflow.
- Price movement is a weighted average of reported daily price changes using
  fixed, latest published capitalization weights on covered names. It is not a
  reconstructed historical sector index, historical market cap, total return,
  or a portfolio backtest. Coverage can vary by day.
- Moves over 30% are withheld for corporate-action review, not silently used
  as price gains. Smaller corporate-action discontinuities may remain in the
  source; this guard is not a full corporate-action adjustment service.
- History controls select 1/5/20/60/120 available observations. The exact dates
  and daily chart scales are displayed; missing values are never zero-filled.

## Ownership interpretation

- An unnamed insider/related-party category is **not a unique person**. We do
  not add its transactions up into a fabricated individual's holdings.
- Trade size / latest reference outstanding shares is a scale comparison,
  **not** the actual change in ownership. The denominator's snapshot date is
  displayed. Capital changes and splits can change that denominator.
- Shares × latest published price is a **current marked-value comparison**,
  not a verified execution amount or historical portfolio value. Its currency
  and price date are stated. Cross-company EGP totals exclude other currencies.
- Before/after stakes and named-investor histories are shown only when the
  source event carries those fields. The current feed does not yet supply
  verified named holdings; zero counts describe coverage, not zero ownership.
- A named-investor filter and stake-history chart activate when verified
  `investorName`, `ownershipBeforePercent`, `ownershipAfterPercent` fields arrive.
  Multi-company ownership percentages are never summed.
- Date/company/party filters drive the event cards and event charts together.
  Price history is a separately dated published-price series. The 7/30/90/365
  day disclosure windows end at the latest available disclosure, not the clock.
- Existing insider table, map and sector-flow screens remain unchanged.

## Validation

Run `python3 -m unittest discover -s scripts -p test_flow_trackers.py` and
`node --test site-worker/test/*.test.mjs`. Tests cover weights, currency,
estimates, nulls, discontinuities, duplicates, reference stakes, route/controls,
Arabic rendering, lazy loading, retries and sign-out races.

No browser or visual QA was performed, at the user's request. Review the
responsive layout visually before deploying. No new hosting/auth dependency.
