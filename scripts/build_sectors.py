#!/usr/bin/env python3
"""Every sector read against its own companies — the middle of the range, and
which way the group is moving.

The review sheet answers "how is this one company doing against its own
history". Standing a step back, a reader asks a wider question: *is the whole
sector moving, and where does a typical company in it sit?* This builds that,
per sector, from figures the app already computes — the per-company metric
directions and the sector medians the review pipeline produces — with no new
source and no network.

WHAT IT IS, AND WHAT IT REFUSES TO BE
-------------------------------------
It is counts and medians. For each sector it reports, per metric, how many of
its companies are rising, falling or flat, and the median company's figure. It
does **not** grade a sector, rank sectors by momentum, or sum the arrows into a
score. Sectors are ordered by how many companies they hold — a structural fact
— never by how they are moving, because "the sector that is moving most" one
screen away from a price is a recommendation wearing arithmetic, and §8 forbids
it. The prose read (added separately, vetted) may say a sector is broadly
widening its assets; it may never say the sector is a place to put money.

A sector needs at least five companies to be read as a group — the same floor
the medians already use (`MIN_PEERS`), for the same reason: the middle of four
is not the middle of a market. Sectors under the floor are named, so a reader
knows they exist and why they are held back, and nothing more is claimed.
"""

from __future__ import annotations

import argparse
import collections
import datetime
import glob
import hashlib
import json
import pathlib
import re

REPO = pathlib.Path(__file__).resolve().parent.parent
DIRECTORY = REPO / "public" / "data" / "v1" / "companies.json"
REVIEW = REPO / "public" / "data" / "v1" / "review"
REVIEW_INDEX = REPO / "public" / "data" / "v1" / "review.json"
# The vetted natural-language read per sector, generated separately by
# build_sector_reads.py and merged in here so this stays network-free.
READS = pathlib.Path(__file__).resolve().parent / "sector_reads.json"
OUT = REPO / "public" / "data" / "v1" / "sectors"
INDEX = REPO / "public" / "data" / "v1" / "sectors.json"
FIXTURES = REPO / "app" / "assets" / "fixtures"

# A sector is read as a group only with at least this many companies carrying a
# review — the same five the medians use. Fewer is a handful, not a sector.
SECTOR_MIN = 5

# The metrics that carry a real direction. dividend_yield is a single published
# figure with no history, and pb is not emitted by the review builder; both are
# excluded from the movement counts (dividend_yield still appears as a median).
DIRECTIONAL = ["profit", "eps", "assets", "roe", "roa",
               "cash_conversion", "debt_equity", "pe"]

# The three the index card leads with: how big it is getting, what it earns, and
# whether that earning is arriving as cash — the honest counterweight.
CURATED = ["profit", "assets", "cash_conversion"]

# How to print each median, mirroring metrics_for in build_review.py.
UNIT = {"profit": "egp_m", "assets": "egp_m", "eps": "egp",
        "dividend_yield": "percent"}


def load(path: pathlib.Path) -> dict:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}


def slug_of(sector: str) -> str:
    """A stable, filename- and route-safe id for a sector name.

    Lower-cased, every run of non-alphanumerics collapsed to one dash, trimmed.
    Computed identically here and read back by the app, so the shard a card
    points at is the shard this wrote.
    """
    return re.sub(r"[^a-z0-9]+", "-", sector.lower()).strip("-")


def tally(docs: list[dict], key: str) -> dict:
    """How many of these companies have `key` rising, falling, flat, unknown."""
    counts = {"rising": 0, "falling": 0, "flat": 0, "unknown": 0}
    for doc in docs:
        metric = next((m for m in doc.get("metrics", []) if m.get("key") == key),
                      None)
        direction = metric.get("direction") if metric else None
        counts[direction if direction in counts else "unknown"] += 1
    return counts


def has_metric(docs: list[dict], key: str) -> bool:
    return any(any(m.get("key") == key for m in d.get("metrics", [])) for d in docs)


def pattern_counts(doc: dict) -> tuple[int, int, int]:
    """(improving, deteriorating, readable) off a review doc's pattern, or zeros.

    Counts of metric names, never a score — the same thing the pattern card
    shows, read here to rank which companies have the most measures moving one
    way. A company with no pattern (too few readable directions) counts as zero.
    """
    pattern = doc.get("pattern") or {}
    return (len(pattern.get("improving", [])),
            len(pattern.get("deteriorating", [])),
            pattern.get("readable", 0))


def headline_peer(doc: dict) -> tuple[str | None, str | None]:
    """(peer, peerKey) on a company's headline metric — profit, else assets.

    Where a company sits against its sector on the one figure a reader leads
    with. Absent when the sector is too small to carry that median.
    """
    for key in ("profit", "assets"):
        metric = next((m for m in doc.get("metrics", []) if m.get("key") == key),
                      None)
        if metric and metric.get("peer"):
            return metric["peer"], key
    return None, None


def named(ticker: str, names: dict) -> dict:
    entry = names.get(ticker) or {}
    return {"ticker": ticker,
            "name_en": entry.get("name_en") or ticker,
            "name_ar": entry.get("name_ar")}


def first_sentence(text: str) -> str:
    """The lead sentence of a read, for the card teaser."""
    for stop in (". ", "۔ ", "؟ ", "? "):
        cut = text.find(stop)
        if cut != -1:
            return text[:cut + 1].strip()
    return text.strip()


def build(today: datetime.date) -> tuple[dict, dict]:
    directory = load(DIRECTORY).get("companies") or []
    names = {c["ticker"]: c for c in directory if c.get("ticker")}
    sector_of = {c["ticker"]: c.get("sector")
                 for c in directory if c.get("ticker")}

    review_index = load(REVIEW_INDEX)
    medians = review_index.get("sector_medians") or {}
    generated = review_index.get("generated") or today.isoformat()
    source = review_index.get("source") or ""

    # Group the review docs by sector.
    by_sector: dict[str, list[dict]] = collections.defaultdict(list)
    for path in sorted(glob.glob(str(REVIEW / "*.json"))):
        doc = load(pathlib.Path(path))
        ticker = doc.get("ticker") or pathlib.Path(path).stem
        sector = doc.get("sector") or sector_of.get(ticker)
        if sector:
            doc["_ticker"] = ticker
            by_sector[sector].append(doc)

    reads = load(READS)
    gated: list[dict] = []
    held_back: list[dict] = []
    shards: dict[str, dict] = {}

    for sector, docs in by_sector.items():
        if len(docs) < SECTOR_MIN:
            held_back.append({"sector": sector, "companies": len(docs)})
            continue

        slug = slug_of(sector)

        movement = []
        for key in DIRECTIONAL:
            if has_metric(docs, key):
                movement.append({"key": key, **tally(docs, key)})

        median_rows = []
        for key in (["pe", "roe", "roa", "debt_equity", "dividend_yield",
                     "profit", "eps", "assets", "cash_conversion", "pb"]):
            value = medians.get(f"{sector}|{key}")
            if value is not None:
                median_rows.append({"key": key, "value": round(value, 4),
                                    "unit": UNIT.get(key, "ratio")})

        ranked = sorted(
            docs,
            key=lambda d: (-pattern_counts(d)[0], pattern_counts(d)[1],
                           d["_ticker"]),
        )
        standouts = [
            {**named(d["_ticker"], names),
             "improving": pattern_counts(d)[0],
             "deteriorating": pattern_counts(d)[1],
             "readable": pattern_counts(d)[2]}
            for d in ranked if d.get("pattern")
        ][:5]

        members = []
        for d in ranked:
            imp, det, rd = pattern_counts(d)
            peer, peer_key = headline_peer(d)
            members.append({**named(d["_ticker"], names),
                            "improving": imp, "deteriorating": det,
                            "readable": rd, "peer": peer, "peerKey": peer_key})

        lead_key = "assets" if has_metric(docs, "assets") else "profit"
        lead = {"key": lead_key, **tally(docs, lead_key)}

        read = reads.get(slug) or {}
        read_en = (read.get("read") or "").strip()
        read_ar = (read.get("read_ar") or "").strip()
        if read_en:
            teaser = first_sentence(read_en)
        else:
            teaser = (f"{lead['rising']} of {len(docs)} companies show "
                      f"rising {lead_key.replace('_', ' ')}.")

        shard = {
            "slug": slug,
            "sector": sector,
            "generated": generated,
            "companies": len(docs),
            "read": read_en or None,
            "read_ar": read_ar or None,
            "movement": movement,
            "medians": median_rows,
            "standouts": standouts,
            "members": members,
        }
        shards[slug] = shard

        gated.append({
            "slug": slug,
            "sector": sector,
            "companies": len(docs),
            "readTeaser": teaser,
            "lead": lead,
            "movement": [m for m in movement if m["key"] in CURATED],
            "medianPe": next((m["value"] for m in median_rows
                              if m["key"] == "pe"), None),
            "medianDividendYield": next((m["value"] for m in median_rows
                                         if m["key"] == "dividend_yield"), None),
        })

    gated.sort(key=lambda s: (-s["companies"], s["sector"]))
    held_back.sort(key=lambda s: (-s["companies"], s["sector"]))

    # A featured sector for the home card, rotated deterministically each build
    # so no sector is a standing "pick" — the hash of the build date picks from
    # those that have a read, falling back to the largest gated sector.
    with_read = [s["slug"] for s in gated if shards[s["slug"]].get("read")]
    pool = with_read or [s["slug"] for s in gated]
    featured = ""
    if pool:
        seed = int(hashlib.sha1(generated.encode()).hexdigest(), 16)
        featured = pool[seed % len(pool)]

    index = {
        "generated": generated,
        "source": source,
        "sectorCount": len(gated),
        "featured": featured,
        "sectors": gated,
        "heldBack": held_back,
    }
    return shards, index


def write(shards: dict, index: dict) -> None:
    for root in (REPO / "public" / "data" / "v1", FIXTURES):
        if not root.exists():
            continue
        folder = root / "sectors"
        folder.mkdir(parents=True, exist_ok=True)
        for stale in folder.glob("*.json"):
            if stale.stem not in shards:
                stale.unlink()
        for slug, shard in shards.items():
            (folder / f"{slug}.json").write_text(
                json.dumps(shard, ensure_ascii=False, separators=(",", ":")),
                encoding="utf-8",
            )
        (root / "sectors.json").write_text(
            json.dumps(index, ensure_ascii=False, separators=(",", ":")),
            encoding="utf-8",
        )


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()

    today = datetime.date.today()
    shards, index = build(today)
    if not shards:
        print("── Sectors: no sector reaches the floor — leaving it alone")
        return 0

    print(f"── Sectors: {index['sectorCount']} of "
          f"{index['sectorCount'] + len(index['heldBack'])} sectors read")
    for summary in index["sectors"]:
        reads = "read" if shards[summary["slug"]].get("read") else "counts"
        print(f"   {summary['sector']:<22} {summary['companies']:>3} companies "
              f"({reads})")
    if index["heldBack"]:
        held = ", ".join(f"{s['sector']} ({s['companies']})"
                         for s in index["heldBack"])
        print(f"   held back (<{SECTOR_MIN}): {held}")
    if args.check:
        return 0
    write(shards, index)
    print(f"   written to {OUT}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
