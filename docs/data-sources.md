# Where every number comes from

Every upstream this app reads, what it is used for, how it is collected, and on
what terms. §50 marks each *figure* on screen as a fact, a calculation or an
interpretation; this is the same discipline one level up — the page a regulator,
a journalist, or a reader who does not believe us would ask for first.

`test_sources.py` fails the build if a host appears in `scripts/` and not here,
so this cannot quietly fall out of date.

Last reviewed: 30 August 2026.

---

## The exchange itself

| Source | What we take | How | Terms |
|---|---|---|---|
| **EGX** — `egx.com.eg` | Disclosures filed by listed companies, and the net-profit figures inside them | A real browser via Scrapling; the page is JS-rendered and refuses plain HTTP. **Serialised — never in parallel**, after being blocked once for fanning three agents at it | Public filings. Arabic only, and the ticker is stamped into every title by the exchange rather than inferred by us |
| **EGX investor statistics** — `beta.egx.com.eg` | Who actually traded: the market split by Egyptians, Arabs and non-Arab foreigners, each as individuals and as institutions, with value bought, value sold and the net between them | `/api/bff/egx/investor-full-statistics`, one GET, the same host and the same WAF-aware request path the filing archive already uses. Found by reading what the exchange's own `/en/market/investors` page calls, rather than guessing endpoint names at a host that has blocked us before | The exchange's own figures and its own labels in both languages, so nothing here is translated by us. Stated **period to date, not per session**, which the screen says — and there is no intraday breakdown on this endpoint, so the site draws no curve. `Arabs & Foreigners` is the exchange's convenience total, the sum of the two beside it, and is flagged rather than counted as a fourth party |
| **TradingView scanner** — `scanner.tradingview.com` | The daily snapshot: every listed share's close, change, volume and market cap, plus the three index levels | Public scanner endpoint, one request a session | Consumed as published. The app never learns the provider's name (§14) |
| **FoudaLens** — `foudalens.com` | Nothing of its own: the issuer's **own filed results attachment**, mirrored under a stable same-origin PDF URL, for filings whose figures the exchange's announcement states only as a single net profit | A mirror, and the *first* place asked, because the exchange's own attachment host answers a headless browser with a decoy and rate-limits a real one. Filing pages are read at `/en/news/{code}`, keyed on the EGX filing code already stored in every company document, and the PDF is fetched from the link that page carries | `robots.txt` publishes `Allow: /` and disallows `/api/` and the signed-in areas; both paths used here are permitted. What is taken is the **issuer's** document, not FoudaLens's own work, and every figure read out of it is re-proved against the exchange's own announced net profit before it is published |

## The official record

Three collectors that read the bodies which *make* the record, rather than the
ones that report on it. Listed here first and published nowhere yet — see the
note under the table.

| Source | What we take | How | Terms |
|---|---|---|---|
| **FRA** — `fra.gov.eg` | The regulator's own public record: news, regulations, company decrees, administrative actions and criminal-procedure notices — seven post types — with every PDF link they carry | The site's public pages run on WordPress, so its standard REST API at `/wp-json/wp/v2` answers for each type, a hundred objects a page, filtered by date. The raw objects are kept beside a normalised ledger, so a later change of mind about parsing never has to go back to the site | A regulator's published record. It serves no `robots.txt` — the path answers a WAF rejection page — so there is no crawl directive to honour, and it is read at the rate a person would. **A general FRA decision is never attached to a listed issuer unless the document names that issuer**, which is the discipline the collector is built around: the tempting inference is exactly the one that would put an enforcement action against the wrong company |
| **Central Bank of Egypt** — `www.cbe.org.eg` | The official exchange rates, and the daily interbank rates and volumes | Both pages sit behind a browser challenge, so they are read through the same real-browser path the exchange's own pages need. The source HTML is stored immutably and only labelled tables are parsed; a future date with no figure published against it stays null rather than becoming a zero | The central bank's own statistics. No `robots.txt` is served — the path answers a WAF rejection carrying a support ID — so there is nothing published to honour. Two pages a day is the whole load |
| **MCDR** — `www.mcdr.com.eg` | The public issuing-companies registry: issuer name and security code, reconciled against the ISINs already held | One plain request to the registry page. Kept as an independent cross-check on ISIN and issuer name rather than as a source of new figures — the value is that it disagrees with us when we are wrong | Public registry. **MCDR's full shareholder register and its scheduled-operations inquiry are authenticated services, and this collector does not touch either** — the row is here as much to record that boundary as to record the data. The site serves no `robots.txt` and its 404 carries `noindex` |

**None of this is on a screen.** These three land raw snapshots under
`data-source/official/`; nothing built from them is published, and no figure in
the app or on the website comes from any of them today. They are declared here
because `test_sources.py` requires every host named in `scripts/` to be
declared, and because the point of this page is what the pipeline *reaches* —
a source collected quietly and disclosed later is the thing the test exists to
prevent.

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
| **Al Mal** — `almalnews.com` | Headlines, the article's own lead picture, and the time it was published | No feed and no usable sitemap — the paper runs on Next.js, `/wp-json/` 404s and the 75 sitemaps carry `lastmod` values from 1899 to 2009. Read instead from its own three finance sections (`stocks`, `economy-markets`, `banks`), whose cards carry the full headline in a `title` attribute; the timestamp comes from each article's `NewsArticle` JSON-LD, fetched once per story and never again | Their headline and their photograph, on a card that links straight back to their article |
| **Enterprise** — `enterpriseam.com` | Headlines and the lead picture. The only English-language outlet in this list | Ordinary WordPress RSS | `robots.txt` allows `*` and sets `Content-Signal: search=yes,ai-train=no,use=reference` — which is the bargain this pipeline already makes with every outlet: headline and link, never the body, and nothing fed to a model |
| **Zawya** — `zawya.com` | Nothing today | Tried and unreachable: RSS answers 200 with zero items | Listed because a source that was tried and failed is a fact about the feed |
| **GDELT** — `api.gdeltproject.org` | Reporting that explains what each macro series has been doing — shipping coverage for Suez, oil-market coverage for Brent, demand coverage for the metals | Free, no key, one narrow query per series. Rate-limits hard, so it retries; a card without coverage is still a card | Used **only with a tight query**, which is the feature — the queries live in `macro_sources.QUERIES` and are the reason it works. A broad Egypt query returns currency-rate SEO listicles, and the two domains that served them are named in `FILLER_DOMAINS` and dropped. Headlines are carried verbatim with the publishing domain and a link back, never rewritten or summarised. Not used as a general news feed: Al Borsa and Hapi are better for Egyptian company news |

## Who a company is

| Source | What we take | How | Terms |
|---|---|---|---|
| **Mubasher** — `english.mubasher.info` | The one description of a listed company anywhere: its industry, where it is based, when it was incorporated and listed, its auditor, its shareholders with stakes, and its subsidiaries with stakes | `GET /markets/EGX/stocks/{TICKER}/profile`, server-rendered HTML, keyed on the app's own ticker. Same fetch this repo already makes for financial statements, at a different path | `robots.txt` publishes `Crawl-delay: 5` for `*` and does not disallow `/markets/`. Harvested at six seconds, one company at a time, and named on screen wherever its text appears |

**Why this source and not the exchange.** The exchange publishes no business
description on any surface reachable to us. Its BFF `stock-info` endpoint
returns 260 companies of identity and market metrics; its old site's
`CompanyDetails.aspx?ISIN=` is nineteen fields of the same kind; its SME portal
matches. And the 191,484 filings already held cannot substitute: their bodies
are one sentence each (median 135 characters after boilerplate), `attachments`
is empty on every row so the real releases are unfetched pointers, and across
the whole archive "is engaged in" appears zero times, "business description"
zero, "principal activities" once. The eighteen filings that mention a
company's *purpose* are all notices of intent to **amend** it.

**What it is not.** An identity card, not a segment breakdown. It says Ataqa
makes steel in Cairo and who owns it; it does not say how Ataqa earns, where
its plants are, or what its margins do. The app labels it "Who the company is"
for that reason. The profile also carries each company's own website, which is
the obvious next step if a fuller description is ever wanted.

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
