# Adding macro context — plan, 21 August 2026

What to add after the World Monitor study, and what it changes about the app we
already have.

---

## The problem being solved

ESTHMR is **company-first**. Filings, companies, the scanner, Six Pillars — all
of it starts from an issuer. The one market-wide surface is the rates block on
Today, and it is a list of numbers:

> World indices · Gold and silver · The pound

It says gold costs $4,520 an ounce. It never says what that does to somebody
holding EGX shares. Meanwhile the news feed carries 120 headlines and attaches
its "why you should care" line to **one** of them, because that line only fires
when a story names a listed ticker.

So the gap is not *more numbers*. It is that the market-wide numbers we already
publish have no consequence attached, and the things that actually move the EGX
— the canal, oil, the pound, Gulf money — are either absent or mute.

---

## What gets added

### 1. Suez Canal transits — first, because it is uniquely ours

IMF PortWatch publishes a daily count of vessels through the canal, split by
container, tanker, dry bulk, general cargo and roro, with cargo capacity. Free,
no key, verified working: 41 vessels on 16 August against 57 on the 11th.

Canal dues are among Egypt's largest foreign-currency earners. Nobody else puts
this in front of an Egyptian retail investor, and every step of why it matters
is a published number rather than an opinion.

### 2. A macro glossary, written by a person

`scripts/macro_types.py`, built exactly like `filing_types.py`: a reviewed
dictionary in English and Arabic mapping each macro event to the **mechanism**
it sets off. Code selects the entry; code never writes the sentence.

### 3. `public/data/v1/macro.json`

One document, its own manifest counter, carrying each series with its latest
reading, its recent history, and the glossary key for its mechanism. Static like
everything else (§48), fingerprinted like everything else (§17).

### 4. Later, in order, and only when verified

* **Oil** (U.S. EIA) — Egypt imports energy and the canal carries it.
* **World Bank** — Egypt GDP, CPI, FDI. Annual, so backdrop rather than news.
  Already verified: 4.39% growth, 14.07% inflation, $15.5bn FDI for 2025.
* **GDELT** — event detection. **Not until it answers us**; it returned 429 all
  of 21 August and its Egypt coverage is assumed, not tested.
* **A Gulf panel** — Tadawul, DFM, ADX, Qatar. Needs a quote source we do not
  yet have; Yahoo refused this machine all day.

---

## What this changes about the app we have

### The rates block stops being a list and becomes the point of Today

This is the real design change, and it is a change of **role**, not of layout.
Each row gains one line of mechanism under the number it already shows. Suez
joins as a fourth section. Nothing moves screens, nothing gets a new tab.

### No new navigation slot

The founder cut navigation to four and pulled Research out of it. Macro does not
get a fifth, and it does not get a "Macro" screen either — a screen with no
owner becomes a junk drawer. It belongs where the market-wide numbers already
live.

### §50 finally does the work it was built for

Provenance marks are used lightly today. A macro chain uses all three in one
card, and the distinction stops being decorative:

| Claim | Mark |
|---|---|
| 41 vessels transited on 16 August | **Fact** |
| Down 28% on the week | **Calculation** |
| Which reduces dollar earnings from canal dues | **Interpretation** |

The third is the strongest thing this app would say anywhere. It has to be
marked as ours, and it has to stop at mechanism.

### §8 gets its biggest new surface since the scanner

"Oil rises → import bill rises → margins compress" is one sentence away from
"so sell industrials". The glossary must end at the mechanism and never reach a
position. Concretely, the same rules the scanner lives under: no buy, sell or
hold, no targets, no sizing, no personalisation to a holding — and the
`legal_voice_test` patterns extended to cover the macro strings.

### §49 gets a harder case than it has had

PortWatch lags about five days — the newest transit on 21 August was the 16th.
That is fine and it is not fine silently. `Recency` already exists and every
macro card carries its own date, because a five-day-old number presented beside
a fifteen-minute-old price is the exact thing §49 was written about.

### News gains a "why" for the other 119 headlines

A macro mechanism attaches to an event, not to an issuer, so it can explain a
story without making a claim about any company. That is **safer** than what we
already do for the single ticker-matched story, not riskier.

---

## What we deliberately do not copy

World Monitor's finance radar carries a **composite BUY/CASH verdict**. It is
the most attractive feature in the closest comparable product and it is the one
thing §8 forbids outright. Publishing the inputs is the product; publishing the
conclusion is advice, and we are not licensed to give it.

We also do not take their code. It is AGPL v3, which would take the whole app
with it.

---

## One habit worth adopting from them

They publish a **source catalogue** — every upstream with provider, feed tier,
licence posture and collection method. ESTHMR marks provenance per figure but
has no such page. It should: the same discipline, one level up, and it is the
page a regulator or a journalist would ask for first.

---

## Order of work

1. Suez collector + glossary + `macro.json` + the rates block gaining mechanism
   lines. This is the whole shape, proved on one series.
2. Legal pass: extend `legal_voice_test` over the macro strings before any of it
   ships.
3. Oil, once EIA is tested.
4. The source catalogue page.
5. World Bank backdrop.
6. GDELT and the Gulf panel, only if their sources answer.

## Open questions for the founder

* **Does Suez belong on Home as well?** It may be the single most important
  Egyptian number in the app, and Home currently leads with a filing.
* **How far does a mechanism line go?** "Pressure on the pound" is mechanism.
  "Which historically compresses industrial margins" is closer to a forecast.
  The line needs drawing once, by you, and then it is a rule.
