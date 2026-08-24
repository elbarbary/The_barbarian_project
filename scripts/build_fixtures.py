#!/usr/bin/env python3
"""Generate the Flutter app's bundled development fixtures (spec §57).

Phase 1 completes the whole UI against 5-10 companies before the exchange is
ingested. Two rules govern what goes in here:

  * Research data is REAL. The Cash or Trash index is copied straight from the
    published criteria document via build_cash_or_trash_api.py, so the app shows
    the actual seven investigations and their actual scores.

  * Market data and the scanner report are REAL too, and are written by
    build_market_api.py and build_opportunity_api.py. This script now only
    writes the manifest and copies the Cash or Trash index across.

Usage:
    python3 scripts/build_fixtures.py
"""

from __future__ import annotations

import datetime
import json
import shutil
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
API = REPO / "public" / "data" / "v1"
FIXTURES = REPO / "app" / "assets" / "fixtures"

SESSION = "2026-08-11"

# ticker, English name, Arabic name, sector, close, previous close
COMPANIES = [
    ("COMI", "Commercial International Bank", "البنك التجارى الدولى", "Banks", 78.30, 78.80),
    ("EFIH", "e-finance Investment", "إى فاينانس للاستثمار", "Telecom & IT", 19.84, 19.43),
    ("ETEL", "Telecom Egypt", "المصرية للاتصالات", "Telecom & IT", 36.15, 36.05),
    ("HRHO", "EFG Holding", "المجموعة المالية هيرميس", "Banks", 24.60, 24.25),
    ("ORAS", "Orascom Construction", "أوراسكوم كونستراكشون", "Industrials", 412.10, 410.29),
    ("SWDY", "El Sewedy Electric", "السويدى اليكتريك", "Industrials", 65.42, 64.26),
    ("TMGH", "Talaat Moustafa Group", "مجموعة طلعت مصطفى", "Real estate", 54.75, 55.42),
    ("MCQE", "Misr Cement Qena", "مصر قنا للأسمنت", "Industrials", 243.60, 240.15),
    ("CIRA", "Cairo for Investment and Real Estate Development", "القاهرة للاستثمار والتنمية العقارية", "Education", 36.80, 36.95),
    ("KWIN", "Cairo National for Investment & Securities", "القاهرة الوطنية للاستثمار والأوراق المالية", "Financial services", 4.62, 4.71),
    ("AMES", "Alexandria New Medical Center", "الإسكندرية للخدمات الطبية", "Healthcare", 118.40, 119.90),
    ("NCCW", "Nasr Company for Civil Works", "النصر للأعمال المدنية", "Industrials", 27.35, 27.10),
    ("DGTZ", "Digitize for Investment and Technology", "ديچيتايز للاستثمار والتكنولوجيا", "Telecom & IT", 2.94, 3.02),
    ("BIOC", "GlaxoSmithKline S.A.E.", "جلاكسو سميثكلاين", "Healthcare", 74.20, 74.05),
]



def price_series(last: float, sessions: int, seed: int) -> list[dict]:
    """A deterministic pseudo-random walk ending at `last`.

    Deterministic so fixtures are stable across runs and diffs stay readable.
    """
    import datetime

    state = seed
    deltas: list[float] = []
    for _ in range(sessions):
        state = (1_103_515_245 * state + 12_345) % (2**31)
        deltas.append((state / (2**31)) - 0.5)

    closes: list[float] = [last]
    for d in reversed(deltas[:-1]):
        prev = closes[0] / (1 + d * 0.028)
        closes.insert(0, round(prev, 2))

    day = datetime.date.fromisoformat(SESSION)
    points = []
    for close in reversed(closes):
        # EGX trades Sunday to Thursday.
        while day.weekday() in (4, 5):
            day -= datetime.timedelta(days=1)
        points.append({"date": day.isoformat(), "close": round(close, 2)})
        day -= datetime.timedelta(days=1)
    return list(reversed(points))


def write(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(f"  {path.relative_to(REPO)}")


RESOURCES = {
    "market": ["market.json"],
    "market_history": ["market-history.json"],
    "companies": ["companies.json"],
    "opportunities": ["opportunities/latest.json"],
    "cash_or_trash": ["cash-or-trash/index.json"],
    "news": ["news/latest.json"],
    "rates": ["rates/latest.json"],
    "disclosures": ["disclosures/latest.json"],
    "macro": ["macro.json"],
    "connections": ["connections.json"],
    "calendar": ["calendar.json"],
}

# Documents with no manifest counter of their own. They are guarded by
# `data_version`, so their bytes must be part of it — otherwise a company file
# can change with the fingerprint standing still, and StaticApi keeps serving
# the cached copy forever. This is the whole per-company dataset, so the
# fingerprint moves whenever any one of 282 companies does.
# The disclosure archive and the per-company indexes ride the `disclosures`
# counter but are separate files, so their bytes have to reach the fingerprint
# the same way the company documents do — otherwise a month of newly kept
# filings lands on the CDN with the fingerprint standing still and no phone
# ever asks for it.
UNVERSIONED = [
    "companies",
    "opportunities/history",
    "prices",
    "disclosures/archive",
    "disclosures/documents",
]


def content_fingerprint() -> tuple[str, dict]:
    """A version string that changes whenever any published document changes.

    This is the hinge of the whole update path: the app drops its cache when
    `data_version` differs from the one it stored, so if this string does not
    move when the content moves, a website update never reaches a device.
    Hashing the actual bytes means it cannot silently fail to change.

    The bytes hashed are the **published** ones under `public/data/v1/`, because
    those are what an installed app actually downloads. The bundled fixture copy
    is only a cold-start fallback, and hashing it instead meant the fingerprint
    described a file no device would ever fetch.
    """
    import hashlib

    parts, versions = {}, {}
    for name, paths in RESOURCES.items():
        h = hashlib.sha256()
        for rel in paths:
            f = API / rel
            # The path is hashed as well as the bytes, so "file missing" and
            # "file empty" cannot produce the same digest.
            h.update(rel.encode())
            h.update(f.read_bytes() if f.exists() else b"\0absent")
        digest = h.hexdigest()
        parts[name] = digest
        # A stable positive integer per resource, so the per-resource version
        # comparison works the same way the network path does.
        versions[name] = int(digest[:8], 16) % 100_000_000

    # Everything with no counter of its own folds into data_version.
    h = hashlib.sha256()
    for folder in UNVERSIONED:
        base = API / folder
        if not base.is_dir():
            continue
        for f in sorted(base.rglob("*.json")):
            h.update(str(f.relative_to(API)).encode())
            h.update(f.read_bytes())
    parts["_unversioned"] = h.hexdigest()

    combined = hashlib.sha256("".join(parts[k] for k in sorted(parts)).encode())
    return combined.hexdigest()[:16], versions


def check_fixtures_match() -> list[str]:
    """Fixtures that differ from what is published.

    A fixture is meant to be a frozen copy of the published document, so the app
    has something to show before its first successful download. If the two drift
    the app can open on one dataset and refresh into a different one.
    """
    drifted = []
    for paths in RESOURCES.values():
        for rel in paths:
            published, bundled = API / rel, FIXTURES / rel
            if not published.exists():
                continue
            if not bundled.exists() or bundled.read_bytes() != published.read_bytes():
                drifted.append(rel)
    return drifted


def main() -> int:
    print("fixtures:")

    cash_or_trash_src = API / "cash-or-trash" / "index.json"
    if not cash_or_trash_src.exists():
        print("error: run build_cash_or_trash_api.py first")
        return 1
    studied = json.loads(cash_or_trash_src.read_text(encoding="utf-8"))
    researched = {c["ticker"] for c in studied["companies"]}

    market_date = SESSION
    market_file = FIXTURES / "market.json"
    if market_file.exists():
        market_date = json.loads(market_file.read_text(encoding="utf-8"))["date"]

    shutil.copyfile(cash_or_trash_src, _ensure(FIXTURES / "cash-or-trash" / "index.json"))
    print(f"  {(FIXTURES / 'cash-or-trash' / 'index.json').relative_to(REPO)}  (real research)")

    drifted = check_fixtures_match()
    if drifted:
        print("error: bundled fixtures differ from published data:")
        for rel in drifted:
            print(f"  {rel}")
        return 1

    data_version, versions = content_fingerprint()

    # `generated_at` is kept from the previous manifest when the fingerprint has
    # not moved, so an unchanged publish produces a byte-identical file.
    #
    # It used to be stamped with the clock on every run, which quietly defeated
    # two things at once: the CI guard checked only whether manifest.json
    # appeared in the diff, and it always did, so it could never fail; and the
    # workflow saw a change every run and committed and pushed a no-op. A
    # timestamp that moves on its own is not evidence that anything happened.
    generated_at = datetime.datetime.now(datetime.UTC).replace(microsecond=0).isoformat()
    published = API / "manifest.json"
    if published.exists():
        try:
            previous = json.loads(published.read_text(encoding="utf-8"))
            if previous.get("data_version") == data_version:
                generated_at = previous.get("generated_at", generated_at)
        except (json.JSONDecodeError, OSError):
            pass

    manifest = {
        "schema_version": 1,
        "data_version": data_version,
        "generated_at": generated_at,
        "market_date": market_date,
        "versions": versions,
    }

    # Written to BOTH roots, and this is the whole update path.
    #
    # It used to be written only into the app bundle. That meant an installed
    # app asking the website "has anything changed?" got a 404, treated the
    # answer as "no", and served its bundled copy forever — the site could
    # publish all it liked and no device ever noticed.
    write(API / "manifest.json", manifest)
    write(FIXTURES / "manifest.json", manifest)
    print(f"  data_version {data_version}")

    print(f"\n{len(COMPANIES)} companies, {studied['studied']} real investigations")
    return 0


def _ensure(path: Path) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    return path


if __name__ == "__main__":
    raise SystemExit(main())
