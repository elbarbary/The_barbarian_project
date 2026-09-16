#!/usr/bin/env python3
"""Build `macro.json` — the world outside the exchange, and how it reaches it.

Three things go in, and the third is the one that makes the other two worth
publishing:

  1. **The series** — Suez transits, Brent, WTI, gold, silver, and Egypt's own
     annual line from the World Bank.
  2. **The mechanism** — one reviewed sentence per series from `macro_types`,
     saying what it does to somebody holding EGX shares. Written by a person,
     never generated (§43).
  3. **How closely each one has actually moved with the EGX 30** — measured,
     not asserted.

The third exists because a mechanism is an argument and a correlation is a
measurement, and the two should be allowed to disagree in front of the reader.
If oil is supposed to reach Egyptian industry and the number says the two have
barely moved together this year, that is worth knowing, and hiding it would
make the mechanism a claim rather than an explanation.

**A correlation is not a cause and is labelled as one.** Two series moving
together says nothing about which moves the other, or whether anything connects
them at all — and over a few hundred sessions it can be coincidence outright.
The figure ships with the number of sessions behind it so a reader can weigh it.

Usage:
    python3 scripts/build_macro_api.py [--check]
"""

from __future__ import annotations

import argparse
import datetime
import json
import pathlib
import statistics
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))

import macro_sources as sources  # noqa: E402
import macro_types as glossary  # noqa: E402

REPO = pathlib.Path(__file__).resolve().parent.parent
OUT = REPO / "public" / "data" / "v1" / "macro.json"
FIXTURE = REPO / "app" / "assets" / "fixtures" / "macro.json"
HISTORY = REPO / "public" / "data" / "v1" / "market-history.json"

# A year of sessions is enough to draw and enough to correlate against. More
# would grow the file without making the sentence any truer.
KEEP = 260

# Below this a correlation is arithmetic on too little to mean anything, and
# printing it would lend a number more weight than it has earned.
MIN_PAIRS = 60


def load(path: pathlib.Path) -> dict:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}


def correlation(a: dict[str, float], b: dict[str, float]) -> tuple[float, int] | None:
    """Pearson's r on the **daily changes**, not on the levels.

    Correlating levels is the classic way to manufacture a relationship out of
    nothing: any two series that drift upward over a year correlate near 1
    whether or not they have anything to do with each other. Changes ask the
    question actually being asked — when this moved, did that move too.
    """
    shared = sorted(set(a) & set(b))
    if len(shared) < MIN_PAIRS + 1:
        return None
    left, right = [], []
    for previous, current in zip(shared, shared[1:]):
        if a[previous] and b[previous]:
            left.append(a[current] / a[previous] - 1)
            right.append(b[current] / b[previous] - 1)
    if len(left) < MIN_PAIRS:
        return None
    try:
        r = statistics.correlation(left, right)
    except (statistics.StatisticsError, ValueError):
        return None
    return round(r, 3), len(left)


def series_entry(
    key: str, points: dict[str, float], *, unit: str, source: str
) -> dict:
    days = sorted(points)[-KEEP:]
    # Reporting that explains what this series has been doing. Somebody else's
    # words, linked back to them — the only part of a macro card that is not
    # ours, which is why each item keeps the domain that published it.
    try:
        reporting = sources.coverage(key)
    except Exception:  # noqa: BLE001 - a card without coverage is still a card
        reporting = []
    return {
        "coverage": reporting,
        "id": key,
        "label": glossary.label(key),
        "label_ar": glossary.label_ar(key),
        "meaning": glossary.meaning(key),
        "meaning_ar": glossary.meaning_ar(key),
        "chain": glossary.chain(key),
        "chain_ar": glossary.chain_ar(key),
        "yardstick": glossary.yardstick(key),
        "yardstick_ar": glossary.yardstick_ar(key),
        "cadence": glossary.cadence(key),
        "cadence_ar": glossary.cadence_ar(key),
        "unit": unit,
        "as_of": days[-1],
        "latest": points[days[-1]],
        "previous": points[days[-2]] if len(days) > 1 else None,
        "history": [{"date": d, "value": points[d]} for d in days],
        "source": source,
    }


def lost(previous: dict, entries: list[dict], now: str) -> list[dict]:
    """The series this document has carried and this build did not produce.

    `previous` is the published document this build replaces. A series it
    carried, or one it already records as missing, is missing now unless it
    is in `entries`.

    Compared only with the document before, a series is missed exactly once:
    the first build without oil writes a document without oil, and the build
    after it has nothing left to miss. That is how Brent and WTI were gone from
    10 to 16 Sep 2026 behind a green run. So the record travels in the document
    itself, and a series that stays gone is named by every build until it comes
    back. Each keeps the time it was first missed. A series retired on purpose
    is taken out of `missing` by hand, in the commit that retires it.
    """
    produced = {entry["id"] for entry in entries}
    since: dict[str, str] = {}
    for row in previous.get("missing") or []:
        if isinstance(row, dict) and isinstance(row.get("id"), str):
            since[row["id"]] = str(row.get("since") or now)
    for series in previous.get("series") or []:
        if isinstance(series, dict) and isinstance(series.get("id"), str):
            since.setdefault(series["id"], now)
    return [
        {"id": key, "since": since[key]}
        for key in sorted(since)
        if key not in produced
    ]


def warn(missing: list[dict], notes: list[str]) -> None:
    """One annotation on the run that names every missing series and why.

    A `::warning` shows on the run page. Before this, a lost series was one
    "unavailable" line in a forty-minute log.
    """
    if not missing:
        return
    names = ", ".join(f"{row['id']} (since {row['since'][:10]})" for row in missing)
    why = "; ".join(notes) if notes else "no source reported a failure"
    message = f"macro.json no longer carries {names}. {why}"
    # A workflow command ends at a newline, and % starts an escape.
    message = message.replace("%", "%25").replace("\r", "%0D").replace("\n", "%0A")
    print(f"::warning title=Macro series missing::{message}")


def note(source: str, error: Exception) -> str:
    """`source: reason`, prefixed once.

    Most sources already put their name on the message, so prefixing again
    published "oil: oil: no instrument id beside 'Brent Oil Futures'".
    """
    text = str(error)
    return text if text.startswith(f"{source}:") else f"{source}: {text}"


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args(argv)

    print("── Macro context")
    today = datetime.date.today().isoformat()
    since = (datetime.date.today() - datetime.timedelta(days=430)).isoformat()

    entries: list[dict] = []
    notes: list[str] = []

    # Suez, which is the one nobody else puts in front of an Egyptian reader.
    try:
        transits = sources.suez(400)
        points = {r["date"]: float(r["vessels"]) for r in transits}
        entries.append(
            series_entry(
                "suez", points, unit="vessels",
                source="https://portwatch.imf.org",
            )
        )
        print(f"   suez        {len(points)} days, newest {max(points)}")
    except sources.MacroUnavailable as error:
        notes.append(note("suez", error))
        print(f"   suez        unavailable — {error}")

    try:
        barrels = sources.oil(since, today)
        for key, points in (("brent", barrels["BRENT"]), ("wti", barrels["WTI"])):
            entries.append(
                series_entry(
                    key, points, unit="USD/barrel",
                    source="https://www.investing.com/commodities",
                )
            )
            print(f"   {key:11} {len(points)} sessions, ${points[max(points)]:,.2f}")
    except sources.MacroUnavailable as error:
        notes.append(note("oil", error))
        print(f"   oil         unavailable — {error}")

    # Gold and silver are already collected beside the indices; re-used rather
    # than fetched again so the two screens cannot disagree about a price.
    history = load(HISTORY).get("sessions") or []
    for key, metal in (("gold", "XAU"), ("silver", "XAG")):
        points = {
            s["date"]: float(s["metals"][metal])
            for s in history
            if (s.get("metals") or {}).get(metal)
        }
        if points:
            entries.append(
                series_entry(
                    key, points, unit="USD/ounce",
                    source="https://www.investing.com/currencies",
                )
            )
            print(f"   {key:11} {len(points)} sessions, ${points[max(points)]:,.2f}")

    # Egypt's own line. Annual and revised, so it is backdrop and is dated.
    indicators: list[dict] = []
    try:
        for key, row in sources.egypt_indicators().items():
            indicators.append(
                {
                    "id": key,
                    "label": glossary.label(key),
                    "label_ar": glossary.label_ar(key),
                    "meaning": glossary.meaning(key),
                    "meaning_ar": glossary.meaning_ar(key),
                    "chain": glossary.chain(key),
                    "chain_ar": glossary.chain_ar(key),
                    "yardstick": glossary.yardstick(key),
                    "yardstick_ar": glossary.yardstick_ar(key),
                    "cadence": glossary.cadence(key),
                    "cadence_ar": glossary.cadence_ar(key),
                    "year": row["year"],
                    "value": round(row["value"], 3),
                    "source": "https://data.worldbank.org",
                }
            )
        print(f"   indicators  {len(indicators)} from the World Bank")
    except sources.MacroUnavailable as error:
        notes.append(note("world bank", error))
        print(f"   indicators  unavailable — {error}")

    # How closely each has actually moved with the exchange.
    egx = {
        s["date"]: float(s["indices"]["EGX30"])
        for s in history
        if (s.get("indices") or {}).get("EGX30")
    }
    correlations: list[dict] = []
    for entry in entries:
        points = {p["date"]: p["value"] for p in entry["history"]}
        measured = correlation(points, egx)
        if measured is None:
            continue
        r, pairs = measured
        correlations.append(
            {"id": entry["id"], "against": "EGX30", "r": r, "sessions": pairs}
        )
        print(f"   {entry['id']:11} moved with the EGX 30 at r={r:+.3f} "
              f"over {pairs} sessions")

    # Before the empty-build exit below, so a build that collected nothing
    # still says which series it lost.
    now = datetime.datetime.now(datetime.UTC).isoformat(timespec="seconds")
    missing = lost(load(OUT), entries, now)
    warn(missing, notes)

    if not entries:
        print("   nothing collected — leaving the published document alone")
        return 1

    doc = {
        "updated_at": now,
        "series": entries,
        "indicators": indicators,
        "correlations": correlations,
        # Named, not hidden. A source that could not be reached is a fact about
        # the document and the screen says so rather than quietly shrinking.
        "unavailable": notes,
        # And what that cost: every series this document has carried and this
        # build did not produce, with when it was first missed. See lost().
        "missing": missing,
    }
    if args.check:
        return 0

    body = json.dumps(doc, ensure_ascii=False, separators=(",", ":"))
    for path in (OUT, FIXTURE):
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(body, encoding="utf-8")
    print(f"\nwrote {OUT.relative_to(REPO)} ({len(body) / 1000:.0f} kB)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
