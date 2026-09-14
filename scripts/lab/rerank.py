#!/usr/bin/env python3
"""The layer that reads the other models and forms its own view.

WHY THIS IS LAWFUL WHERE A PUBLISHED RANKING WOULD NOT BE
---------------------------------------------------------
A ranked list of named securities, fixed by this publisher and put in front
of a reader, is a recommendation whatever the wording around it — that is the
whole reason the reader-facing side of this project is built out of the
reader's own rulebooks instead.

This is not that. It is a MODEL, entered in the same private arena as Kronos
and the baselines: its ranking is committed, salted and timestamped along with
theirs, kept in `data-source/lab/` which is not served, and opened only when
every horizon in it has matured. What reaches a reader is its SCORE — "the
rerank layer beat the raw models by this much over these sessions" — which is
a statement about forecasters and names no security at all.

If that ever stops being true, this file has become the thing the project
exists not to be.

THE TWO LEAKS THIS MUST NOT HAVE, AND THE ONE RULE THAT CLOSES BOTH
-------------------------------------------------------------------
A language model is not like the others here, and it can cheat in two ways no
amount of trimming bars will prevent.

  **It may remember.** Its weights were trained on text that may include this
  exchange's price history. Asked to rank a session from last August, it might
  be recalling the answer rather than forecasting it.

  **Its context may be newer than the basis.** The measurements it is given
  come from `measures.json`, which is rebuilt three times a trading day. Fed
  to a run reconstructed from August, those are figures from after the
  session being forecast.

One rule closes both: **this runs only on a basis session that has just
closed.** Never a reconstruction, never a back-loaded night, never a date the
market has already answered. `refuse()` enforces it and the run records the
refusal rather than quietly skipping.

WHAT IT IS ASKED FOR
--------------------
A score per company, and a count — how many of the top it thinks are worth
anything tonight. The count is the user's question made measurable: a layer
that says "eleven" on a good night and "none" on a bad one is worth something
different from one that always says twenty, and only a record of both can
tell them apart.
"""

from __future__ import annotations

import json
import pathlib
import re
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))

import forecast as fc

REPO = pathlib.Path(__file__).resolve().parent.parent.parent
MEASURES = REPO / "public" / "data" / "v1" / "measures.json"

NAME = "rerank"

# The measurements it is shown beside the forecasts. Deliberately few and
# deliberately factual: this project's own published arithmetic, the same
# numbers any reader can see, and nothing that is itself an opinion.
CONTEXT = ("relative_volume_20", "change_5", "change_20",
           "sessions_since_filing", "market_cap")

SCORE_MIN, SCORE_MAX = 0, 100


def refuse(document: dict, today: str | None) -> str | None:
    """Why this may not run on this document, or None if it may.

    The single rule. A reconstruction is refused because the model may
    remember the outcome and because the measurements it would be shown are
    newer than the session; a basis that is not the session which just closed
    is refused for the same two reasons at once.
    """
    if document.get("reconstructed"):
        return ("a reconstructed run: this layer may have been trained on the "
                "outcome, and the measurements it reads are newer than the "
                "session")
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


def measurements(path: pathlib.Path = MEASURES) -> dict[str, dict]:
    try:
        held = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {}
    rows = held.get("rows") or held.get("companies") or held
    if isinstance(rows, dict):
        rows = list(rows.values())
    out = {}
    for row in rows if isinstance(rows, list) else []:
        ticker = row.get("ticker")
        if ticker:
            out[ticker] = row
    return out


def _number(value) -> str:
    if not isinstance(value, (int, float)) or isinstance(value, bool):
        return ""
    return f"{value:.4g}"


def table(document: dict, measures: dict) -> tuple[list[str], str]:
    """One row per company: what every model said, and a few public facts.

    Compact on purpose. The whole market has to fit in one call, because a
    reranker shown a third of the field at a time is ranking three different
    fields.
    """
    models = sorted(m for m in (document.get("models") or {}) if m != NAME)
    by_ticker: dict[str, dict] = {}
    for model in models:
        for guess in document["models"][model].get("forecasts") or []:
            ticker = guess.get("ticker")
            if ticker:
                by_ticker.setdefault(ticker, {})[model] = guess

    tickers = sorted(by_ticker)
    head = ["ticker"]
    for model in models:
        head += [f"{model}_h{h}" for h in fc.HORIZONS]
    head += list(CONTEXT)

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
        row = measures.get(ticker) or {}
        cells += [_number(row.get(column)) for column in CONTEXT]
        lines.append(",".join(cells))
    return tickers, "\n".join(lines)


def prompt(basis: str, body: str, count: int) -> str:
    return f"""You are one entrant in a forecasting contest on the Egyptian Exchange.

Below is every model's forecast for the session that closed on {basis}, for
{count} companies, as CSV. Columns ending _h1, _h5 and _h20 are that model's
predicted percentage return over the next 1, 5 and 20 trading sessions. An
empty cell means that model declined to answer. The last columns are published
measurements of the company itself: relative volume against its own 20-session
median, its 5- and 20-session change in percent, how many sessions since its
last filing, and its market value in Egyptian pounds.

Form your OWN view of which companies are most likely to rise over the next
five sessions. You may disagree with every model shown.

Answer with JSON and nothing else:

{{"scores": {{"TICKER": 0-100, ...}}, "count": N, "note": "one sentence"}}

  scores  a number from 0 to 100 for EVERY ticker listed, where a higher
          score means you expect it to do better than a lower-scored one over
          the next five sessions. Only the ordering is read, so do not worry
          about the absolute level. Score every ticker; omitting one is
          recorded as a refusal to answer about it.
  count   how many of your highest-scored companies you believe are actually
          worth anything this session. It is allowed to be 0 on a session
          where you think nothing is, and that is a useful answer.
  note    one sentence on what drove your ordering tonight.

CSV:
{body}
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

    permitted = set(allowed)
    scores, invented = {}, []
    for ticker, value in (payload.get("scores") or {}).items():
        name = str(ticker).strip().upper()
        if name not in permitted:
            invented.append(name)
            continue
        if isinstance(value, bool) or not isinstance(value, (int, float)):
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


def rank(document: dict, *, today: str | None, measures: dict | None = None,
         ask=None) -> dict:
    """This layer's block for the run, whether or not it managed to answer."""
    why = refuse(document, today)
    if why:
        return {"forecasts": [], "answered": 0, "abstained": 0,
                "abstentions": {why: 1}, "asked": False}

    if ask is None:
        import gemini
        ask = gemini.generate

    tickers, body = table(document, measures if measures is not None
                          else measurements())
    if not tickers:
        return {"forecasts": [], "answered": 0, "abstained": 0,
                "abstentions": {"no other model answered, so there was "
                                "nothing to rerank": 1}, "asked": False}

    try:
        text, usage = ask(prompt(document["basisSession"], body, len(tickers)))
    except Exception as error:  # noqa: BLE001 — a layer that throws abstains
        return {"forecasts": [], "answered": 0, "abstained": len(tickers),
                "abstentions": {f"{type(error).__name__}: {error}": len(tickers)},
                "asked": True}

    answer = parse(text, tickers)
    scored = answer["scores"]
    forecasts = [{"ticker": t,
                  # A ranking model publishes no return. It is not claiming
                  # this company will rise 72%; it is claiming it will do
                  # better than the one it scored 40.
                  "returns": {},
                  "ranked_by": {str(h): scored[t] for h in fc.HORIZONS}}
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
        # Its own answer to "how many are worth anything tonight", kept beside
        # the ranking so the two can be scored separately. A layer that says
        # eleven on a good night and none on a bad one is worth something
        # different from one that always says twenty.
        "count": answer["count"],
        "note": answer["note"],
        # Tickers it returned that were never in the question. Should always
        # be empty; if it is not, the layer is inventing companies and the
        # record says so rather than dropping them silently.
        "invented": answer["invented"],
        "usage": usage if isinstance(usage, dict) else None,
    }
