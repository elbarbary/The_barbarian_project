# Where every number comes from

Every upstream this app reads, what it is used for, how it is collected, and on
what terms. §50 marks each *figure* on screen as a fact, a calculation or an
interpretation; this is the same discipline one level up — the page a regulator,
a journalist, or a reader who does not believe us would ask for first.

`test_sources.py` fails the build if a host appears in `scripts/` and not here,
so this cannot quietly fall out of date.

Last reviewed: 21 August 2026.

---

## The exchange itself

| Source | What we take | How | Terms |
|---|---|---|---|
| **EGX** — `egx.com.eg` | Disclosures filed by listed companies, and the net-profit figures inside them | A real browser via Scrapling; the page is JS-rendered and refuses plain HTTP. **Serialised — never in parallel**, after being blocked once for fanning three agents at it | Public filings. Arabic only, and the ticker is stamped into every title by the exchange rather than inferred by us |
| **TradingView scanner** — `scanner.tradingview.com` | The daily snapshot: every listed share's close, change, volume and market cap, plus the three index levels | Public scanner endpoint, one request a session | Consumed as published. The app never learns the provider's name (§14) |

## Prices and history

| Source | What we take | How | Terms |
|---|---|---|---|
| **Mubasher** — `mubasher.info`, `static.mubasher.info` | Filed annual and quarterly statements; the full daily price series per company, twenty years deep | Two requests per company, five seconds apart — the `Crawl-delay` their robots.txt publishes. A long run trips a slower limit that answers a good page with a **404**, so the job retries and is resumable | Public pages. Every price series is checked against closes we already hold before it is kept; 40 were refused for not moving with ours |
| **Investing.com** — `investing.com`, `api.investing.com` | Historic index levels (EGX 30/70/100), spot gold and silver, Brent and WTI | Plain HTTP against the public historical endpoint. `/equities/` paths are blocked to us; `/indices/`, `/currencies/` and `/commodities/` are not | Instruments are pinned by **id and by the name the page gives itself**, because an id is a number in a URL and a wrong one yields a plausible chart of the wrong thing |

## Macro

| Source | What we take | How | Terms |
|---|---|---|---|
| **IMF PortWatch** — `portwatch.imf.org`, `services9.arcgis.com` | Daily Suez Canal transits, split by vessel type, with cargo capacity | The ArcGIS feature service. The portal's own GeoJSON endpoint answers 403 without a browser session; this one does not | Public IMF data. Lags about five days, which is why every card carries its own date (§49) |
| **World Bank Open Data** — `api.worldbank.org` | Egypt's GDP growth, inflation, FDI and remittances | Public API, no key | Open data. Annual and revised, so it is backdrop rather than news |
| **gold-api.com** — `api.gold-api.com` | Spot gold and silver, intraday | Public endpoint, no key | Used for the live headline; the *history* comes from Investing.com and the two are checked against each other on the same dated session |
| **open.er-api.com** | The pound against other currencies | Public endpoint, no key | Open exchange-rate data |

## News

| Source | What we take | How | Terms |
|---|---|---|---|
| **Al Borsa** — `alborsaanews.com` | Headlines, excerpts, and the article's own lead picture | WordPress REST API with `_embed=wp:featuredmedia` | Their headline and their photograph, on a card that links straight back to their article |
| **Hapi Journal** — `hapijournal.com` | The same | The same | The same |
| **Arab Finance** — `arabfinance.com` | Headlines recovered from the Google-News sitemap | The slug is the headline with hyphens for spaces. Marked `reconstructed` on the record, because it is a weaker reading than a title field | No feed is published; the sitemap is |
| **Al Mal**, **Zawya** — `almalnews.com`, `zawya.com` | Nothing today | Tried and unreachable: Al Mal's sitemaps are archives dated 2007, Zawya's RSS answers 200 with zero items | Listed because a source that was tried and failed is a fact about the feed |
| **GDELT** — `api.gdeltproject.org` | Reporting that explains what each macro series has been doing — shipping coverage for Suez, oil-market coverage for Brent, demand coverage for the metals | Free, no key, one narrow query per series. Rate-limits hard, so it retries; a card without coverage is still a card | Used **only with a tight query**, which is the feature — the queries live in `macro_sources.QUERIES` and are the reason it works. A broad Egypt query returns currency-rate SEO listicles, and the two domains that served them are named in `FILLER_DOMAINS` and dropped. Headlines are carried verbatim with the publishing domain and a link back, never rewritten or summarised. Not used as a general news feed: Al Borsa and Hapi are better for Egyptian company news |

## Machine assistance

| Source | What we take | How | Terms |
|---|---|---|---|
| **Gemini** — `generativelanguage.googleapis.com` | Filing-type classification from a closed list; Arabic→English drafts; macro insight drafts | Build time only. **Never in the app** (§43) | Gated behind bought prepay credits and currently drafting nothing. Everything it touches has a hand-written fallback, and every draft is refused unless it passes the advice guard |
| **Google Cloud Translation** — `translation.googleapis.com` | Arabic→English, when billing is enabled | Build time only | Preferred over the model for translation: it cannot be talked into answering a headline instead of translating it |

## Our own

| Source | What we take | How | Terms |
|---|---|---|---|
| **thebarbarianproject.com** | The published field note the scanner is read out of | Read direction only — the page is never written (§24, §58) | Ours |

---

## What this page is for

Two things, and the second is the one that matters.

The first is honesty about provenance: a reader who wants to know where a number
came from can find out, and a number with no entry here should not be on screen.

The second is that **it makes the limits visible**. Al Mal and Zawya are listed
with nothing beside them — tried, unreachable, and named for it. GDELT is listed
with the condition attached to it: it works with a narrow query and returns
filler with a broad one, so what was adopted is the queries rather than the
source. Oil is collected from somewhere with no independent second reading, and
that is written down rather than left for somebody to discover later.

A catalogue that lists only what works is marketing. This one is meant to be
the first place somebody looks when they doubt a number.
