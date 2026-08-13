# The Barbarian — architecture

Spec §60. How the pieces fit, and how to change each one without breaking the
others. See [`app-spec.md`](app-spec.md) for the contract and
[`app-plan.md`](app-plan.md) for delivery status.

---

## The shape of it

```text
  research + market source
            │
            ▼
      scripts/*.py            deterministic, idempotent, refuses bad data
            │
            ▼
      data-source/            human-readable raw data, committed
            │
            ▼
      public/data/v1/         the static app API, committed
            │
            ▼
      Cloudflare              serves public/ as static assets
            │
            ▼
      Flutter app             cache-first, offline-tolerant
```

There is **no server**. Nothing runs between sessions except a scheduled GitHub
Action. That is what keeps the running cost at zero (spec §47).

## How Flutter talks to the data

Three layers, and each one only knows about the layer directly below it.

```text
screens  (lib/features/*)          Riverpod providers  (lib/core/providers.dart)
   │                                        │
   └── watch ───────────────────────────────┘
                                            │
repositories (lib/core/data/*)  ◄───────────┘
   │  MarketRepository · ResearchRepository · UserRepository
   ▼
StaticApi (lib/core/networking/static_api.dart)
   │  cache-first: yields cache, then fresh only if the manifest moved
   ├── DocumentSource   network | bundled fixtures
   └── DocumentCache    files on disk | memory
```

**The cache-first contract.** Every repository method returns a `Stream`, not a
`Future`, and may emit twice: once with whatever was on disk, once more if the
manifest says that resource has a newer version. Startup never waits on the
network (spec §17, §36).

**Provenance travels with the value.** Repositories return `Sourced<T>`, which
carries where the bytes came from and when they were stored. Screens use that to
label data age. Nothing in the app renders a price without saying how old it is
(spec §49).

### Changing the data host

`lib/core/config/app_config.dart` is the only file that knows any URL. Override
at build time:

```bash
flutter run --dart-define=BARBARIAN_DATA_BASE=https://data.thebarbarian.trade
```

### Running on fixtures vs the live API

The app reads the network by default and keeps `app/assets/fixtures/` underneath
as a cold-start seed: a fresh install with no connection opens on the compiled-in
snapshot rather than four empty screens, and the network answer always wins when
there is one (`SeededNetworkDocumentSource`).

To pin it to the bundle — useful when working offline:

```bash
flutter run --dart-define=BARBARIAN_USE_FIXTURES=true
```

While fixtures are pinned the app displays a **Sample data** marker wherever
prices appear.

> This flag defaulted to `true` for most of phase 1, which meant installed builds
> read only the bundle and could never see a website update. If prices or
> research ever appear frozen at the date a build was made, check this first.

## Two clocks

The app carries two kinds of data on two different cadences, and they are kept
deliberately separate.

**Published documents** — research, the company directory, fundamentals, price
history — move once a day. They go through the versioned static API: cache-first,
gated on `manifest.json`, safe to read offline.

**Quotes** move every five minutes and go through nothing of the sort. They have
no manifest entry, no cache generation and no disk copy, because their only value
is being newer than the last publish.

```
public/data/v1/manifest.json   ← the daily publish; drives cache invalidation
quotes.thebarbarianproject.com ← the five-minute feed; overwrites prices only
```

`livePricesProvider` merges the second over the first, and every screen that
shows a price reads that merge, so there is exactly one definition of "the
current price" in the app.

### The delay is not optional

The free feed the project can reach runs **fifteen minutes behind the tape** —
every row comes back tagged `delayed_streaming_900`. `BPriceCaption` states both
that delay and how long ago the app collected the snapshot, because they are
different quantities and showing only one of them misleads. The number comes from
the feed's own tag rather than a constant, so if the tier ever changes the caption
follows without a release.

Outside trading hours the caption says *Market closed · last close …* instead:
a "delayed" price implies a tape that is running.

### The quote Worker

`worker/quotes/` is a separate Cloudflare Worker from the website, on its own
hostname, so a bad quotes deploy cannot take the site down. It re-reads the
exchange at most once every five minutes and serves its cached copy in between —
one upstream request for the whole userbase rather than one per device — and
degrades to the last good snapshot when upstream fails.

```bash
cd worker/quotes && npx wrangler deploy
```

Override the app's endpoint with `--dart-define=BARBARIAN_QUOTES_URL=…`.

## The data pipeline

### Cash or Trash

`scripts/build_cash_or_trash_api.py` parses the published criteria document into
JSON. One direction only — it reads `public/evidence/cash-or-trash/criteria.md`
and writes `public/data/v1/cash-or-trash/index.json`. The live
`cash-or-trash.html` is neither read nor written, so the website cannot break
(spec §25, §58).

```bash
python3 scripts/build_cash_or_trash_api.py --check   # parse and report only
python3 scripts/build_cash_or_trash_api.py           # write the JSON
```

It **refuses to publish** if anything looks wrong (spec §21):

- a ticker appearing in two verdict bands
- a score outside −60..+60
- a pillar table that does not sum to the headline score
- a pillar count other than six
- a missing company name

On failure it writes nothing, so the last good dataset stays published.

**Adding an investigation:** write it into `criteria.md` in the existing format —
`**TICK — Company name · score ±N · D Mon YYYY**`, a `Flags:` line, an italic
one-liner, and the six-row pillar table — then re-run the script. If the company
also gets a dedicated `public/<ticker>-investigation.html`, the script links it
automatically.

### The manifest, and how a website update reaches a phone

`scripts/build_fixtures.py` writes `manifest.json` to **both** roots:

| path | read by |
| --- | --- |
| `public/data/v1/manifest.json` | installed apps, over the network |
| `app/assets/fixtures/manifest.json` | the cold-start seed compiled into a build |

`data_version` is a SHA-256 over the published bytes, so it cannot fail to move
when the content moves. An installed app compares it against the copy it stored
and drops the resources that changed.

The published copy is the load-bearing one. It was missing for a while, which
meant every app asking "has anything changed?" got a 404, read that as "no", and
served its bundled copy forever. `.github/workflows/publish-app-data.yml` now
fails the run if content changes without both manifests moving.

Run the whole pipeline in dependency order — the manifest is built **last**,
because it hashes everything else:

```bash
python3 scripts/build_all.py
```

**The market step needs a scan archive.** `../work/daily_scan_*.json` sits outside
the repository (2 MB a day would bloat the history within weeks), so it exists on
the machine that runs the EGX monitor and nowhere else. Without it the market step
prints a notice, leaves the published market data exactly as it is, and exits
cleanly — CI can still rebuild the research documents, which is the update a
reader actually notices.

### Market data (phase 2, not built yet)

The ingestion side will sit behind a `MarketDataProvider` interface so the app
never learns the vendor's name (spec §14):

```python
class MarketDataProvider:
    def get_daily_prices(...)
    def get_company_metadata(...)
```

`YahooFinanceProvider` is the development implementation. Replacing it with a
licensed EGX feed changes `scripts/` only — no schema change, no app change.

## Canonical tickers

`companies.json` defines the app's identifiers. A vendor's symbol is mapped into
this at ingestion time and never leaks upward (spec §12). Every screen, cache
key, route and fixture keys off the canonical ticker.

## The design system

`lib/core/theme/` holds tokens transcribed from the Claude Design canvas
(`design/The Barbarian.dc.html`), with the per-screen specs extracted into
`docs/design-specs/`.

- **Colours** are a `ThemeExtension`, reached with `context.colors`. Light is the
  canvas; dark is derived — the canvas contains no dark tokens at all, so the
  dark ramp needs a contrast pass before release.
- **Type** is `BarbarianType`. Display text is Outfit at weight 200–300 and is
  never bolder than 400; numerals are never bold. Both families are SIL OFL.
- **Press feedback** is `BPressable`, which scales. There is no ink ripple
  anywhere — the theme sets `NoSplash` deliberately, and `InkWell` is banned.
- **Hairlines** are `BHairline`, applied through `foregroundDecoration`. A CSS
  inset shadow costs no layout; a Flutter `Border` does, and using one would
  shift every row by a pixel.

Three things carry meaning and must never be colour-only (spec §42): price
direction (`BChangeDelta` always draws ▲/▼), verdicts (`BVerdictBadge` always
draws emoji + word + score), and selection (`Semantics(selected:)` plus a shape
change).

## Cloudflare

`public/wrangler.jsonc` sets `assets.directory = "."` and declares no `main`, so
the site is pure static assets. `public/.assetsignore` excludes only
`.wrangler`, `wrangler.jsonc`, `.DS_Store`, `.git` and `node_modules` — which is
why `public/data/v1/` is reachable at `/data/v1/`.

Adding The Pit in phase 4 means adding `"main"` to that config for the Worker.
Static public data stays static; D1 is only for user-generated content
(spec §27, §48).

## Testing

```bash
cd app && flutter test        # 62 tests
cd app && flutter analyze     # zero issues
```

- `test/fixtures_parse_test.dart` — the shipped fixtures parse into the shipped
  models, pillars sum to headline scores, price history is chronological and
  never lands on an EGX non-trading day, and the scanner JSON contains no
  `entry`/`target`/`stop`/`expected_return` key.
- `test/screens_test.dart` — the real screens against the real fixtures, in both
  themes and at 320pt.

Two things worth knowing before writing more widget tests:

1. **Wait on a condition, never a frame count.** Each screen makes a different
   number of async hops before it can paint. `pumpUntil` in
   `test/support/harness.dart` polls a finder; a fixed pump count is a race.
2. **Tests read fixtures from disk, not `rootBundle`.** In widget tests the
   asset channel stops completing after the first test in a run, which would
   leave every later screen stuck on its loading state. `DiskFixtureSource`
   sidesteps it. The real asset path is exercised on device.
