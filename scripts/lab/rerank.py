#!/usr/bin/env python3
"""The layer that reads the other models and forms its own view.

WHY THIS IS LAWFUL WHERE A PUBLISHED RANKING WOULD NOT BE
---------------------------------------------------------
A ranked list of named securities, fixed by this publisher and put in front
of a reader, is a recommendation whatever the wording around it — that is the
whole reason the reader-facing side of this project is built out of the
reader's own rulebooks instead.

This is not that. It is a MODEL, entered in the same arena as Kronos and the
baselines: its scores are committed, salted and timestamped, and scored like
theirs. What reaches Home is its RECORD — "the re-rank's five did this much
against the market over these sessions" — which names no security at all.
What it said about named companies is shown only behind the session gate and
the experiment warning, company by company and never as a list in its order.

If that ever stops being true, this file has become the thing the project
exists not to be.

THE TWO LEAKS THIS MUST NOT HAVE, AND THE ONE RULE THAT CLOSES BOTH
-------------------------------------------------------------------
A language model is not like the others here, and it can cheat in two ways no
amount of trimming bars will prevent.

  **It may remember.** Its weights were trained on text that may include this
  exchange's price history. Asked to rank a session from last August, it might
  be recalling the answer rather than forecasting it.

  **Its context may be newer than the basis.** The filings, headlines and
  measurements it reads are rebuilt through the day. Fed to a run
  reconstructed from August, those are facts from after the session being
  forecast.

One rule closes both: **this runs only on a basis session that has just
closed.** Never a reconstruction, never a back-loaded night, never a date the
market has already answered. `refuse()` enforces it.

WHY IT IS A SECOND PASS OVER A SEALED NIGHT
-------------------------------------------
It used to run inside `run.py`, after the nine. Three things were wrong with
that. The Google token minted at the start of the job had to outlive Kronos,
which on a slow runner takes most of an hour. A Vertex outage lost the whole
night's re-rank for good, because the night was sealed with it missing. And
the re-rank could never be added to a night that had already been sealed.

So it reads the night after the night is sealed: `run-<basis>.json` is opened,
never modified, and this writes `rerank-<basis>.json` beside it with its own
commitment, its own timestamp, and the fingerprint of the run it read — so a
reading cannot be quietly moved onto a different night. The retry schedule
gets a second chance at a reading that failed outright; a night that has been
read is never read again.

WHY SIXTEEN READINGS, AND NOT ONE
---------------------------------
A reader can switch four kinds of evidence on and off: the latest filings,
the news, this project's rule book, and the company's own measurements. A
switch that only re-drew the same answer would be a claim that the evidence
was read when it was not. So every combination is its own question to the
model, asked the same night of the same forecasts, and sealed and scored like
any other model. The one called plain `rerank` — filings, news and the rule
book — is the default the Home page reports; the other fifteen are named
`rerank:<layers>`, and in six weeks the record answers the question the
switches ask: does reading the filings actually help?

WHAT IT IS ASKED FOR
--------------------
A score per company, and a count — how many of the top it thinks are worth
anything tonight. The count is the question made measurable: a layer that
says "eleven" on a good night and "none" on a bad one is worth something
different from one that always says twenty, and only a record of both can
tell them apart.
"""

from __future__ import annotations

import argparse
import collections
import concurrent.futures
import datetime
import hashlib
import itertools
import json
import math
import pathlib
import re
import sys
import time

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))

import commit as cm
import forecast as fc
import measures as ms
import panel as pricing
import run as lab
import timestamp as ts
import eligibility

REPO = pathlib.Path(__file__).resolve().parent.parent.parent
RUNS = REPO / "data-source" / "lab"
COMMITMENTS = REPO / "public" / "data" / "v1" / "research" / "commitments"
DATA = REPO / "public" / "data" / "v1"
RULEBOOK = pathlib.Path(__file__).resolve().parent / "rulebook.md"

NAME = "rerank"
PREFIX = NAME + ":"

# The four kinds of evidence a reader can switch on, in the one order every
# name, key and file is spelled in. Order matters only so that the same set
# always has the same name.
LAYERS = ("filings", "news", "rulebook", "measures")

# What the plain `rerank` reads: the filings, the news and the rule book. Not
# its own measurements by default, because those are this project's arithmetic
# rather than evidence anybody filed — a reader can add them and see whether
# the reading changes.
DEFAULT = ("filings", "news", "rulebook")

SCORE_MIN, SCORE_MAX = 0, 100

# The windows. Deliberately short and stated in the record: "the latest
# filings" that reach back a year are a different question.
FILING_DAYS = 14
FILINGS_PER_COMPANY = 3
FILINGS_MAX = 240
NEWS_HOURS = 48
NEWS_PER_COMPANY = 3
NEWS_MAX = 160
TITLE_CHARS = 140

# The measurements a reader means by "its own measurements": the published
# arithmetic of the filings and the tape, the same numbers any reader can see,
# and nothing that is itself an opinion.
MEASURES = ("market_cap", "pe", "eps", "net_income_growth", "revenue",
            "relative_volume_20", "change_5", "change_20",
            "sessions_since_filing", "results_due_in_days")


# ── names ────────────────────────────────────────────────────────────────────

def canonical(layers) -> tuple[str, ...]:
    """The layers, known ones only, each once, in the one spelling order."""
    chosen = set(layers or ())
    return tuple(layer for layer in LAYERS if layer in chosen)


def key_of(layers) -> str:
    """The file-safe key of a set of layers. `models` is the empty set: the
    reading that is given nothing but the forecasts."""
    ordered = canonical(layers)
    return "-".join(ordered) if ordered else "models"


def name_of(layers) -> str:
    """The model name a reading is sealed and scored under."""
    ordered = canonical(layers)
    return NAME if ordered == DEFAULT else PREFIX + key_of(ordered)


def layers_of(name: str) -> tuple[str, ...] | None:
    """The layers behind a model name, or None if it is not a reading."""
    if name == NAME:
        return DEFAULT
    if not name.startswith(PREFIX):
        return None
    key = name[len(PREFIX):]
    if key == "models":
        return ()
    parts = tuple(key.split("-"))
    return parts if canonical(parts) == parts and parts else None


def is_reading(name: str) -> bool:
    return layers_of(name) is not None


def readings() -> list[tuple[str, ...]]:
    """Every combination, fewest layers first, the default among them once."""
    out = []
    for size in range(len(LAYERS) + 1):
        out.extend(itertools.combinations(LAYERS, size))
    return out


# ── the rule ─────────────────────────────────────────────────────────────────

def refuse(document: dict, today: str | None) -> str | None:
    """Why this may not run on this document, or None if it may.

    The single rule. A reconstruction is refused because the model may
    remember the outcome and because the evidence it would be shown is newer
    than the session; a basis that is not the session which just closed is
    refused for the same two reasons at once.
    """
    if document.get("reconstructed"):
        return ("a reconstructed run: this layer may have been trained on the "
                "outcome, and the evidence it reads is newer than the session")
    basis = document.get("basisSession")
    if not basis:
        return "the run has no basis session"
    if not today:
        return "the exchange did not say which session had closed"
    if basis != today:
        return (f"the basis is {basis} and the session that just closed is "
                f"{today}: a model that may remember is not asked about a "
                "session the market has already answered")
    return None


# ── what it reads ────────────────────────────────────────────────────────────

def forecasters(document: dict) -> list[str]:
    """The models whose answers it reads — never a reading of its own."""
    return sorted(m for m in (document.get("models") or {}) if not is_reading(m))


def _number(value) -> str:
    if not isinstance(value, (int, float)) or isinstance(value, bool):
        return ""
    return f"{value:.4g}"


def table(document: dict, excluded=()) -> tuple[list[str], str]:
    """One row per company: what every forecaster said.

    Compact on purpose. The whole market has to fit in one call, because a
    reranker shown a third of the field at a time is ranking three different
    fields.
    """
    models = forecasters(document)
    by_ticker: dict[str, dict] = {}
    for model in models:
        for guess in document["models"][model].get("forecasts") or []:
            ticker = guess.get("ticker")
            if ticker and ticker not in excluded:
                by_ticker.setdefault(ticker, {})[model] = guess

    tickers = sorted(by_ticker)
    head = ["ticker"]
    for model in models:
        head += [f"{model}_h{h}" for h in fc.HORIZONS]

    lines = [",".join(head)]
    for ticker in tickers:
        cells = [ticker]
        for model in models:
            guess = by_ticker[ticker].get(model) or {}
            returns = guess.get("returns") or {}
            ranked = guess.get("ranked_by") or {}
            for h in fc.HORIZONS:
                value = ranked.get(str(h), returns.get(str(h)))
                cells.append(_number(value))
        lines.append(",".join(cells))
    return tickers, "\n".join(lines)


def _read(path: pathlib.Path) -> dict:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {}


def _tickers_of(item: dict) -> list[str]:
    out = []
    for entry in item.get("tickers") or []:
        name = entry if isinstance(entry, str) else (entry or {}).get("ticker")
        if isinstance(name, str) and name.strip():
            out.append(name.strip().upper())
    return out


def _flat(text) -> str:
    """One line, trimmed. A newline inside a headline would read, to the model,
    as a second headline about a company it was never about."""
    return re.sub(r"\s+", " ", str(text or "")).strip()[:TITLE_CHARS]


def _moment(value: str | None) -> datetime.datetime | None:
    if not value:
        return None
    try:
        when = datetime.datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except ValueError:
        return None
    return when if when.tzinfo else when.replace(tzinfo=datetime.timezone.utc)


def filings_block(disclosures: dict, tickers: set[str], basis: str,
                  until: datetime.datetime) -> dict:
    """Exchange disclosures by these companies in the fortnight to the basis.

    Newest first, a few per company, and nothing dated after the moment of
    the question — a filing the model could not have been shown tonight has
    no business in tonight's reading.
    """
    start = (datetime.date.fromisoformat(basis)
             - datetime.timedelta(days=FILING_DAYS)).isoformat()
    last = until.astimezone(lab.CAIRO).date().isoformat()
    per: dict[str, int] = {}
    rows = []
    items = sorted((disclosures.get("items") or []),
                   key=lambda i: (str(i.get("date") or ""), str(i.get("id") or "")),
                   reverse=True)
    for item in items:
        date = str(item.get("date") or "")[:10]
        if not (start <= date <= last):
            continue
        for ticker in _tickers_of(item):
            if ticker not in tickers or per.get(ticker, 0) >= FILINGS_PER_COMPANY:
                continue
            per[ticker] = per.get(ticker, 0) + 1
            rows.append((ticker, date, _flat(item.get("event_label") or "filing"),
                         _flat(item.get("title"))))
        if len(rows) >= FILINGS_MAX:
            break
    rows = rows[:FILINGS_MAX]
    rows.sort(key=lambda r: (r[0], r[1]), reverse=False)
    text = "\n".join(" | ".join(r) for r in rows) or "(none in this window)"
    return {"text": text, "items": len(rows), "companies": len(per),
            "from": start, "to": last}


def news_block(news: dict, tickers: set[str], until: datetime.datetime) -> dict:
    """Headlines that name these companies, from the two days before the question."""
    since = until - datetime.timedelta(hours=NEWS_HOURS)
    per: dict[str, int] = {}
    rows = []
    items = sorted((news.get("items") or []),
                   key=lambda i: str(i.get("published") or ""), reverse=True)
    for item in items:
        when = _moment(item.get("published"))
        if when is None or not (since <= when <= until):
            continue
        for ticker in _tickers_of(item):
            if ticker not in tickers or per.get(ticker, 0) >= NEWS_PER_COMPANY:
                continue
            per[ticker] = per.get(ticker, 0) + 1
            rows.append((ticker, when.strftime("%Y-%m-%d %H:%MZ"),
                         _flat(item.get("event_label") or "news"),
                         _flat(item.get("headline"))))
        if len(rows) >= NEWS_MAX:
            break
    rows = rows[:NEWS_MAX]
    rows.sort(key=lambda r: (r[0], r[1]))
    text = "\n".join(" | ".join(r) for r in rows) or "(none in this window)"
    return {"text": text, "items": len(rows), "companies": len(per),
            "since": since.isoformat(timespec="minutes").replace("+00:00", "Z"),
            "until": until.isoformat(timespec="minutes").replace("+00:00", "Z")}


def measures_block(measures: dict, tickers: set[str]) -> dict:
    rows = [r for r in measures.get("rows") or []
            if str(r.get("ticker") or "").upper() in tickers]
    dated = collections.Counter(r["as_of"] for r in rows if r.get("as_of"))
    # Ties choose the newest session, independent of source row order.
    session = max(dated, key=lambda d: (dated[d], d)) if dated else None
    lines = [",".join(("ticker", "as_of") + MEASURES)]
    for row in sorted(rows, key=lambda r: str(r.get("ticker") or "")):
        ticker = str(row.get("ticker") or "").upper()
        lines.append(",".join([ticker, str(row.get("as_of") or "")] +
                              [_number(row.get(c)) for c in MEASURES]))
    return {"text": "\n".join(lines), "companies": len(rows), "asOf": session,
            "otherSessionCompanies": sum(n for d, n in dated.items() if d != session),
            "undatedCompanies": len(rows) - sum(dated.values()),
            "sessions": dict(sorted(dated.items()))}


def refresh_measures(measures: dict, tickers: set[str], basis: str,
                     panel: dict[str, list[dict]] | None) -> tuple[dict, dict]:
    """Recompute the session-dependent columns before asking, never rewrite a
    published table or a sealed night. Unverifiable rows are omitted from the
    evidence, not from the forecast universe or from any reading.

    The fresh lab panel uses the exchange's dated close, so a holiday needs
    no guessed weekday calendar and a late app-data rebuild cannot stale it.
    Published financial figures retain their source; tape and elapsed-time
    figures are recomputed together from the same completed bars.
    """
    held = {str(r.get("ticker") or "").upper(): r
            for r in measures.get("rows") or []}
    rows, excluded = [], {}
    for ticker in sorted(tickers):
        row = dict(held.get(ticker) or {"ticker": ticker})
        if panel is not None:
            bars = [b for b in panel.get(ticker, []) if b.get("date", "") <= basis]
            stamp = ms.as_of(bars)
            if stamp != basis:
                excluded[ticker] = f"no verified measurements for {basis}; newest session: {stamp or 'missing'}"
                continue
            row["as_of"] = stamp
            row.update(relative_volume_20=ms.rv20(bars),
                       change_5=ms.change_over(bars, 5),
                       change_20=ms.change_over(bars, 20),
                       sessions_since_filing=ms.sessions_since(bars, row.get("last_filing_date")))
            due = row.get("results_due_from")
            try:
                row["results_due_in_days"] = (datetime.date.fromisoformat(due) -
                                              datetime.date.fromisoformat(basis)).days
            except (TypeError, ValueError):
                row["results_due_in_days"] = None
        elif row.get("as_of") != basis:
            excluded[ticker] = f"published measurements are from {row.get('as_of') or 'an unknown session'}"
            continue
        rows.append(row)
    return {"rows": rows}, excluded


def rulebook_block(path: pathlib.Path = RULEBOOK) -> dict:
    try:
        text = path.read_text(encoding="utf-8").strip()
    except OSError:
        text = ""
    return {"text": text or "(the rule book could not be read)",
            "chars": len(text),
            "sha256": hashlib.sha256(text.encode("utf-8")).hexdigest()}


def gather(document: dict, *, until: datetime.datetime,
           data: pathlib.Path = DATA, rulebook: pathlib.Path = RULEBOOK,
           panel: dict[str, list[dict]] | None = None) -> dict:
    """Everything any reading may be shown, read once so every reading of the
    same night reads the same evidence."""
    tickers = set(document.get("universe") or [])
    basis = document["basisSession"]
    published = _read(data / "measures.json")
    input_sessions = measures_block(published, tickers)["sessions"]
    measures, excluded = refresh_measures(published, tickers, basis, panel)
    block = measures_block(measures, tickers)
    block.update(excluded=excluded, excludedCompanies=len(excluded),
                 refreshed=panel is not None, inputSessions=input_sessions)
    # Mandatory risk facts are not an optional investment thesis. They travel
    # with ALL readings, even 'models only', and are recorded in the seal.
    try:
        known = eligibility.directory(data)
    except (OSError, ValueError, KeyError):
        known = {}
    measure_rows = {r['ticker']: r for r in measures.get('rows', [])}
    ineligible = {t: why for t in tickers
                  if (why := eligibility.exclusion(known.get(t, {}), basis))}
    events = eligibility.issuer_clarifications(basis)
    facts = {t: eligibility.risk_facts(known.get(t, {}), measure_rows.get(t, {}), basis, events.get(t, ()))
             for t in sorted(tickers)}
    # Compact CSV keeps sixteen context combinations affordable. The richer
    # bilingual metadata stays in the sealed evidence, not in every prompt.
    lines = ["ticker,financial_period,period_age_days,change20_pct,income_growth_pct,warnings"]
    for ticker, fact in facts.items():
        if ticker in ineligible:
            continue
        values = [ticker, fact["financialPeriod"] or "unknown", fact["financialAgeDays"],
                  fact["change20"], fact["netIncomeGrowth"], "; ".join(fact["flags"])]
        lines.append(",".join("" if v is None else str(v) for v in values))
        for event in fact["events"]:
            lines.append(f"SOURCE {ticker} {event['date']} {event['link']} {event['excerpt']}")
    safety = {"version": 1, "asOf": basis, "excluded": ineligible, "companies": facts,
              "text": "\n".join(lines)}
    return {
        "safety": safety,
        "filings": filings_block(_read(data / "disclosures" / "latest.json"),
                                 tickers, basis, until),
        "news": news_block(_read(data / "news" / "latest.json"), tickers, until),
        "rulebook": rulebook_block(rulebook),
        "measures": block,
    }


# ── the question ─────────────────────────────────────────────────────────────

SECTIONS = {
    "filings": ("LATEST FILINGS",
                "Disclosures these companies filed with the exchange between "
                "{from} and {to}, as TICKER | date | kind | title. Titles are "
                "often Arabic."),
    "news": ("NEWS",
             "Headlines from Egyptian financial outlets that name these "
             "companies, published between {since} and {until}, as "
             "TICKER | time | kind | headline. Headlines are often Arabic."),
    "rulebook": ("THE RULE BOOK",
                 "How this project weighs evidence about a company on this "
                 "exchange. Weigh what you are shown by these rules."),
    "measures": ("MEASUREMENTS",
                 "Measurements as CSV, with the completed price/volume session in as_of. "
                 "Financial figures are the latest published figures. "
                 "Missing companies have no verified measurements for the basis "
                 "session; still score them from the other evidence. Market value "
                 "in Egyptian pounds, price to earnings, earnings per share, "
                 "net income growth in percent, revenue, volume against its own "
                 "20-session median, its 5- and 20-session change in percent, "
                 "sessions since its last filing, and days until results are "
                 "due. An empty cell means the figure is not published."),
}


def prompt(basis: str, body: str, count: int, context: dict | None = None,
           layers=()) -> str:
    ordered = canonical(layers)
    context = context or {}
    given = (" Weigh the forecasts against the evidence below."
             if ordered else
             " Rank from the forecasts and mandatory risk facts only; no optional evidence is supplied.")
    sections = []
    for layer in ordered:
        title, lead = SECTIONS[layer]
        block = context.get(layer) or {}
        fields = {k: v for k, v in block.items() if isinstance(v, (str, int))}
        try:
            lead = lead.format(**fields)
        except (KeyError, IndexError):
            pass
        sections.append(f"{title}\n{lead}\n\n{block.get('text') or '(not available)'}")
    extra = ("\n\n" + "\n\n".join(sections)) if sections else ""
    safety = (context.get("safety") or {}).get("text", "Risk metadata unavailable; not evidence of safety.")
    extra += ("\n\nMANDATORY RISK FACTS (apply with every context combination):\n"
              + safety + "\nPrice models do not know listing status, reporting quality, "
              "issuer denials or wrongdoing. A large forecast or fall is not evidence "
              "of a recovery. Missing/stale financials earn no fundamental support. "
              "Downgrade unsupported reversals and severe evidence gaps; count may be zero. "
              "A dated issuer denial is negative evidence, not proof of manipulation; "
              "only a later verified material filing can explain a subsequent move. "
              "Never infer manipulation from a price pattern. Headlines are not full filings; "
              "absence from the short news window is not proof there were no earlier adverse events.")
    return f"""You are one entrant in a forecasting contest on the Egyptian Exchange.

Below is every forecasting model's answer for the session that closed on
{basis}, for {count} companies, as CSV. Columns ending _h1, _h5 and _h20 are
that model's value for the next 1, 5 and 20 trading sessions: a predicted
percentage return for kronos, chronos2, timesfm25, toto2, sundial, drift and
flat, and a ranking score — higher ranks higher, not a return — for the
momentum and reversal rules. An empty cell means that model declined to
answer.

Form your OWN view of which companies are most likely to do better than the
rest over the next five sessions. You may disagree with every model shown.{given}

Answer with JSON and nothing else:

{{"scores": {{"TICKER": 0-100, ...}}, "count": N, "note": "one sentence"}}

  scores  a whole number from 0 to 100 for EVERY ticker listed, where a higher
          score means you expect it to do better than a lower-scored one over
          the next five sessions. Only the ordering is read, so do not worry
          about the absolute level. Score every ticker; omitting one is
          recorded as a refusal to answer about it.
  count   how many of your highest-scored companies you believe are actually
          worth anything this session. It is allowed to be 0 on a session
          where you think nothing is, and that is a useful answer.
  note    one sentence on what drove your ordering tonight.

FORECASTS CSV:
{body}{extra}
"""


def parse(text: str, allowed: list[str]) -> dict:
    """The answer, with every ticker checked back against what was supplied.

    The same discipline `gemini.extract` uses and for the same reason: a model
    may return a plausible ticker that was never in the question. One that was
    not supplied is dropped rather than scored, and one supplied but not
    returned is an abstention, counted like any other model's.
    """
    match = re.search(r"\{.*\}", text or "", re.S)
    if not match:
        return {"scores": {}, "count": None, "note": None,
                "invented": [], "why": "no JSON in the answer"}
    try:
        payload = json.loads(match.group(0))
    except ValueError:
        return {"scores": {}, "count": None, "note": None,
                "invented": [], "why": "the answer was not valid JSON"}
    if not isinstance(payload, dict):
        return {"scores": {}, "count": None, "note": None,
                "invented": [], "why": "the answer was not a JSON object"}

    permitted = set(allowed)
    scores, invented = {}, []
    raw_scores = payload.get("scores")
    if not isinstance(raw_scores, dict):
        return {"scores": {}, "count": None, "note": None,
                "invented": [], "why": "scores were not a JSON object"}
    for ticker, value in raw_scores.items():
        name = str(ticker).strip().upper()
        if name not in permitted:
            invented.append(name)
            continue
        if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value):
            continue
        scores[name] = max(SCORE_MIN, min(SCORE_MAX, float(value)))

    count = payload.get("count")
    if isinstance(count, bool) or not isinstance(count, int) or count < 0:
        count = None
    elif count > len(scores):
        # It may not claim more opportunities than it scored companies.
        count = len(scores)

    note = payload.get("note")
    return {
        "scores": scores,
        "count": count,
        "note": str(note)[:300] if isinstance(note, str) else None,
        "invented": sorted(set(invented)),
        "why": None,
    }


def _score(value: float):
    """A whole number where the model gave one, so a sealed record is not a
    column of `72.0`; anything finer is kept as it was said."""
    return int(value) if float(value).is_integer() else round(value, 4)


def rank(document: dict, *, today: str | None, layers=DEFAULT,
         context: dict | None = None, ask=None) -> dict:
    """One reading's block for the night, whether or not it managed to answer."""
    ordered = canonical(layers)
    why = refuse(document, today)
    if why:
        return {"forecasts": [], "answered": 0, "abstained": 0,
                "abstentions": {why: 1}, "asked": False, "layers": list(ordered)}

    if ask is None:
        import gemini
        ask = gemini.generate

    known = eligibility.directory()
    candidates, _ = table(document)
    excluded = {t for t in candidates
                if eligibility.exclusion(known.get(t, {}), document["basisSession"])}
    excluded.update(((context or {}).get("safety") or {}).get("excluded") or {})
    tickers, body = table(document, excluded)
    if not tickers:
        return {"forecasts": [], "answered": 0, "abstained": 0,
                "abstentions": {"no other model answered, so there was "
                                "nothing to rerank": 1},
                "asked": False, "layers": list(ordered)}

    question = prompt(document["basisSession"], body, len(tickers), context, ordered)
    started = time.monotonic()
    try:
        text, usage = ask(question)
    except Exception as error:  # noqa: BLE001 — a layer that throws abstains
        return {"forecasts": [], "answered": 0, "abstained": len(tickers),
                "abstentions": {f"{type(error).__name__}: {error}"[:300]: len(tickers)},
                "asked": True, "layers": list(ordered),
                "promptSha256": hashlib.sha256(question.encode("utf-8")).hexdigest(),
                "seconds": round(time.monotonic() - started, 1)}

    answer = parse(text, tickers)
    scored = answer["scores"]
    forecasts = [{"ticker": t,
                  # A ranking model publishes no return. It is not claiming
                  # this company will rise 72%; it is claiming it will do
                  # better than the one it scored 40.
                  "returns": {},
                  "ranked_by": {str(h): _score(scored[t]) for h in fc.HORIZONS}}
                 for t in sorted(scored)]

    missing = [t for t in tickers if t not in scored]
    reasons: dict[str, int] = {}
    if missing:
        reasons["the layer returned no score for it"] = len(missing)
    if answer["why"]:
        reasons[answer["why"]] = len(tickers)

    return {
        "forecasts": forecasts,
        "answered": len(forecasts),
        "abstained": len(missing) or (len(tickers) if answer["why"] else 0),
        "abstentions": reasons,
        "asked": True,
        "layers": list(ordered),
        # Its own answer to "how many are worth anything tonight", kept beside
        # the ranking so the two can be scored separately.
        "count": answer["count"],
        "note": answer["note"],
        # Tickers it returned that were never in the question. Should always
        # be empty; if it is not, the layer is inventing companies and the
        # record says so rather than dropping them silently.
        "invented": answer["invented"],
        "usage": usage if isinstance(usage, dict) else None,
        # The exact question, fingerprinted. The evidence it read is kept in
        # the layer document, so the prompt can be rebuilt and checked.
        "promptSha256": hashlib.sha256(question.encode("utf-8")).hexdigest(),
        "seconds": round(time.monotonic() - started, 1),
    }


def _failed(block: dict) -> bool:
    return bool(block.get("asked")) and not block.get("answered")


def rank_all(document: dict, *, today: str | None, context: dict | None,
             ask=None, workers: int = 3) -> dict[str, dict]:
    """Every reading of the night, each asked separately, each recorded.

    A few at a time rather than all sixteen at once: a new project's
    per-minute quota trips on a burst, and `gemini._post` already waits and
    retries a 429. A reading that still fails is asked once more at the end,
    alone, and what happened the second time is what is recorded.
    """
    order = readings()
    results: dict[str, dict] = {}

    def one(layers):
        return name_of(layers), rank(document, today=today, layers=layers,
                                     context=context, ask=ask)

    with concurrent.futures.ThreadPoolExecutor(max_workers=max(1, workers)) as pool:
        for name, block in pool.map(one, order):
            results[name] = block

    for layers in order:
        name = name_of(layers)
        if _failed(results[name]):
            _, again = one(layers)
            again["attempts"] = 2
            results[name] = again

    return {name_of(layers): results[name_of(layers)] for layers in order}


# ── the second pass, sealed ──────────────────────────────────────────────────

def newest_night(runs: pathlib.Path) -> tuple[pathlib.Path, dict] | None:
    """The newest run that was frozen on the night, never a reconstruction."""
    for path in sorted(runs.glob("run-*.json"), reverse=True):
        document = _read(path)
        if not document.get("basisSession") or document.get("reconstructed"):
            continue
        return path, document
    return None


def layer_document(document: dict, blocks: dict[str, dict], *, ran_at: str,
                   context: dict, source: str) -> dict:
    """What was read, over which sealed night, and what every reading said."""
    evidence = {layer: {k: v for k, v in block.items() if k != "text"}
                for layer, block in context.items()}
    return {
        "schemaVersion": 1,
        "layer": NAME,
        "ranAt": ran_at,
        "basisSession": document["basisSession"],
        # The night it read, bound by the run's own fingerprint: a reading
        # moved onto a different night's forecasts no longer matches it.
        "reads": {"run": source, "fingerprint": document.get("fingerprint")},
        "universe": document.get("universe") or [],
        "universeSize": document.get("universeSize"),
        "horizons": list(fc.HORIZONS),
        "layers": list(LAYERS),
        "default": list(DEFAULT),
        "evidence": evidence,
        # The evidence itself, as it was shown, so any reading's prompt can be
        # rebuilt from this file and checked against its fingerprint.
        "context": {layer: block.get("text") for layer, block in context.items()},
        "what": "Sixteen readings of one sealed night by a language model: the "
                "same forecasts each time, with a different combination of "
                "filings, news, the rule book and measurements beside them. "
                "Every reading is scored as its own model.",
        "models": blocks,
    }


def _short(path: pathlib.Path) -> str:
    try:
        return str(path.relative_to(REPO))
    except ValueError:
        return str(path)


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--runs", type=pathlib.Path, default=RUNS)
    parser.add_argument("--commitments", type=pathlib.Path, default=COMMITMENTS)
    parser.add_argument("--data", type=pathlib.Path, default=DATA)
    # Writing is the flag, not the default, for the reason run.py gives: a
    # reading made by hand against the real path would pre-empt the scheduled
    # one, and the record keeps whichever came first forever.
    parser.add_argument("--write", action="store_true",
                        help="seal this reading; without it nothing is written")
    parser.add_argument("--no-timestamp", action="store_true")
    parser.add_argument("--today", help="the session the exchange calls closed "
                                        "(asked of the exchange when omitted)")
    parser.add_argument("--scan", type=pathlib.Path,
                        help="fresh lab scan used to rebuild measurements before asking")
    parser.add_argument("--workers", type=int, default=3)
    args = parser.parse_args(argv)

    found = newest_night(args.runs)
    if not found:
        print("   no frozen run to read")
        return 0
    source, document = found
    basis = document["basisSession"]

    settled = args.runs / f"rerank-{basis}.json"
    if settled.exists() and args.write:
        print(f"   {settled.name} already exists — {basis} has been read and "
              "is not read again")
        return 0

    today = args.today
    closed = {}
    if today is None:
        try:
            watch, status = pricing.fetch_today()
            today = pricing.last_closed(watch, status)
            # A dated close is usable after midnight too, while the timing
            # guard below still prevents any first-horizon leakage.
            _, closed = pricing.closed_bars(watch, status)
            print(f"   the exchange is closed and its newest session is "
                  f"{today}" if today else "   the exchange does not say it is "
                  "closed after a session")
        except Exception as error:  # noqa: BLE001 — any refusal, same answer
            print(f"   the exchange did not answer ({type(error).__name__})")

    why = refuse(document, today)
    if why:
        print(f"   not read: {why}")
        return 0

    timing = lab.commitment_timing(basis, lab.now_in_cairo())
    if timing["compromised"]:
        print(f"   not read: {basis}'s first horizon has already been priced")
        return 0

    now = datetime.datetime.now(datetime.timezone.utc).replace(microsecond=0)
    ran_at = now.isoformat().replace("+00:00", "Z")
    panel = None
    sources = None
    if args.scan:
        scan = lab.read_scan(args.scan)
        built = pricing.build(scan, today=closed)
        panel, sources = built["panel"], built["sources"]
    context = gather(document, until=now, data=args.data, panel=panel)
    if sources is not None:
        context["measures"]["priceSources"] = sources
    print(f"   evidence: {context['filings']['items']} filings by "
          f"{context['filings']['companies']} companies, "
          f"{context['news']['items']} headlines naming "
          f"{context['news']['companies']}, measurements for "
          f"{context['measures']['companies']} on {context['measures']['asOf']} "
          f"({context['measures']['excludedCompanies']} unavailable), rule book "
          f"{context['rulebook']['chars']} characters")

    blocks = rank_all(document, today=today, context=context, workers=args.workers)
    for name, block in blocks.items():
        state = (f"{block['answered']:>4} answered" if block.get("asked")
                 else "not asked")
        kept = (f"  · keeps {block['count']}" if block.get("count") is not None
                else "")
        reason = ""
        if not block.get("answered") and block.get("abstentions"):
            reason = "  · " + next(iter(block["abstentions"]))[:90]
        print(f"   {name:<38} {state}{kept}  {block.get('seconds', 0):>5.1f}s{reason}")

    if not any(block.get("answered") for block in blocks.values()):
        # Nothing was said, so there is nothing to seal and nothing to protect
        # — and sealing sixteen refusals would stop the retry schedule from
        # getting the answers tonight.
        print("   no reading answered — nothing sealed, so a later run may try")
        return 0

    layer = layer_document(document, blocks, ran_at=ran_at, context=context,
                           source=source.name)
    layer["fingerprint"] = lab.fingerprint(layer)
    layer["commitment"] = timing

    public, secret = cm.commitment(layer)
    public["layer"] = NAME
    public["reads"] = layer["reads"]
    public["committedBeforeOpen"] = timing["beforeOpen"]
    if not args.no_timestamp:
        public["timestamp"] = ts.stamp(public["merkleRoot"])
        state = ("stamped by " + public["timestamp"]["authority"]
                 if public["timestamp"]["timestamped"]
                 else "NOT stamped — no authority answered")
    else:
        state = "not stamped (asked not to)"
    print(f"   root {public['merkleRoot'][:16]}  {public['leaves']} leaves  ·  {state}")

    if not args.write:
        return 0

    layer["nonces"] = secret["nonces"]
    settled.write_text(json.dumps(layer, ensure_ascii=False, separators=(",", ":")),
                       encoding="utf-8")
    print(f"   wrote {_short(settled)} ({settled.stat().st_size // 1024} KB)")
    args.commitments.mkdir(parents=True, exist_ok=True)
    promise = args.commitments / f"{basis}.{NAME}.json"
    promise.write_text(json.dumps(public, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"   wrote {_short(promise)} (public: a root, no forecasts)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
