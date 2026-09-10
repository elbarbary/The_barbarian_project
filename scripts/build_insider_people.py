#!/usr/bin/env python3
"""The people behind the trades, and how their stakes moved.

`build_named_insiders.py` reads one scanned post-execution form at a time and
holds the answer. This turns that store into the two things a reader actually
wants and the daily bulletin cannot give them:

  people    who traded, in which companies, and what their stake was before and
            after — the percentage, not the share count. A million shares is
            10% of a company with ten million and 0.01% of one with ten
            billion; only the percentage says whether anything happened.

  timeline  the same readings by session, so the market-wide direction is
            visible without picking a company first.

Only what a form actually printed. A person with no stake pair contributes to
neither series rather than being carried at zero — an absent number and a zero
are different claims, and the second one is a lie about a real person.

    python3 scripts/build_insider_people.py
"""

from __future__ import annotations

import argparse
import collections
import datetime as dt
import json
import pathlib
import unicodedata

REPO = pathlib.Path(__file__).resolve().parent.parent
STORE = REPO / "data-source" / "official" / "ownership" / "named-insiders.json"
OUT = REPO / "public" / "data" / "v1" / "insider-people.json"
FIXTURE = REPO / "app" / "assets" / "fixtures" / "insider-people.json"
COMPANIES = REPO / "public" / "data" / "v1" / "companies.json"


def key(name: str) -> str:
    """One person, one row, whatever the scan's spacing did.

    Names arrive from OCR, so `محمد  أشرف` and `محمد أشرف` are the same man.
    Normalised and case-folded, never transliterated across scripts: two
    spellings of one name in two alphabets are not safely the same person and
    are not merged here.
    """
    folded = unicodedata.normalize("NFKC", name or "").casefold()
    return " ".join(folded.split())


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true",
                    help="build it and report, but write nothing")
    args = ap.parse_args()
    if not STORE.exists():
        print("no named-insider store yet — run build_named_insiders.py")
        return 0
    held = json.loads(STORE.read_text(encoding="utf-8"))
    readings = list((held.get("readings") or {}).values())
    if not readings:
        print("the store holds no readings")
        return 0

    names = {}
    try:
        for c in json.loads(COMPANIES.read_text(encoding="utf-8")).get("companies", []):
            names[c.get("ticker")] = {"en": c.get("name"), "ar": c.get("name_ar") or c.get("nameAr")}
    except (OSError, json.JSONDecodeError):
        pass

    people = collections.defaultdict(lambda: {"trades": []})
    for r in readings:
        k = key(r.get("investorName"))
        if not k:
            continue
        p = people[k]
        p.setdefault("name", r.get("investorName"))
        p.setdefault("nameEn", r.get("investorNameEn"))
        p.setdefault("script", r.get("nameScript"))
        co = names.get(r.get("ticker")) or {}
        p["trades"].append({
            "filingId": r.get("filingId"),
            "date": (r.get("sessionDate") or (r.get("publishedAt") or "")[:10]) or None,
            "ticker": r.get("ticker"),
            "company": co.get("en"),
            "companyAr": co.get("ar"),
            "action": r.get("action"),
            "shares": r.get("shares"),
            "price": r.get("price"),
            "value": (r["shares"] * r["price"]) if r.get("shares") and r.get("price") else None,
            "stakeBefore": r.get("ownershipBeforePercent"),
            "stakeAfter": r.get("ownershipAfterPercent"),
            "source": r.get("source"),
        })

    rows = []
    for k, p in people.items():
        trades = sorted(p["trades"], key=lambda t: (t["date"] or "", t["filingId"] or ""))
        paired = [t for t in trades if t["stakeBefore"] is not None and t["stakeAfter"] is not None]
        tickers = sorted({t["ticker"] for t in trades if t["ticker"]})
        # A stake is a percentage OF ONE COMPANY. Summing across companies
        # would produce a number that means nothing, so the headline move is
        # only stated when every reading for this person is about one issuer.
        move = None
        if paired and len(tickers) == 1:
            move = {
                "ticker": tickers[0],
                "from": paired[0]["stakeBefore"],
                "to": paired[-1]["stakeAfter"],
                "change": round(paired[-1]["stakeAfter"] - paired[0]["stakeBefore"], 4),
            }
        rows.append({
            "id": k,
            "name": p["name"], "nameEn": p.get("nameEn"), "script": p.get("script"),
            "tickers": tickers,
            "tradeCount": len(trades),
            "boughtCount": sum(1 for t in trades if t["action"] == "buy"),
            "soldCount": sum(1 for t in trades if t["action"] == "sell"),
            "value": round(sum(t["value"] or 0 for t in trades), 2) or None,
            "singleCompanyMove": move,
            "trades": trades,
        })
    rows.sort(key=lambda r: (
        -abs((r["singleCompanyMove"] or {}).get("change") or 0), -r["tradeCount"]))

    # The market-wide series: one point per session that actually has readings.
    by_day = collections.defaultdict(lambda: {"buys": 0, "sells": 0, "value": 0.0,
                                              "stakeAdded": 0.0, "stakeShed": 0.0})
    for r in rows:
        for t in r["trades"]:
            if not t["date"]:
                continue
            d = by_day[t["date"]]
            d["buys" if t["action"] == "buy" else "sells"] += 1
            d["value"] += t["value"] or 0
            if t["stakeBefore"] is not None and t["stakeAfter"] is not None:
                delta = t["stakeAfter"] - t["stakeBefore"]
                if delta >= 0:
                    d["stakeAdded"] += delta
                else:
                    d["stakeShed"] += -delta
    timeline = [{
        "date": day,
        "buys": v["buys"], "sells": v["sells"],
        "value": round(v["value"], 2),
        # Percentage points of company ownership changing hands that session,
        # summed across DIFFERENT companies. A count of how much moved, not a
        # stake in anything — the label on screen has to say so.
        "stakePointsAdded": round(v["stakeAdded"], 4),
        "stakePointsShed": round(v["stakeShed"], 4),
    } for day, v in sorted(by_day.items())]

    doc = {
        "schemaVersion": 1,
        "generated": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"),
        "source": "EGX post-execution disclosure forms (نموذج إفصاح بعد التنفيذ)",
        "basis": ("Read from the individual scanned filing, which is the only "
                  "document that names the party. The daily EGX summary gives "
                  "the relationship and never the name."),
        "basisAr": ("مقروءة من نموذج الإفصاح بعد التنفيذ، وهو المستند الوحيد "
                    "الذي يذكر اسم المتعامل. الملخص اليومي للبورصة يذكر صفة "
                    "المتعامل ولا يذكر اسمه."),
        "peopleCount": len(rows),
        "tradeCount": sum(r["tradeCount"] for r in rows),
        "tickerCount": len({t for r in rows for t in r["tickers"]}),
        "people": rows,
        "timeline": timeline,
    }
    print(f"   {len(rows)} people, {doc['tradeCount']} trades, "
          f"{doc['tickerCount']} companies, {len(timeline)} sessions")
    if args.check:
        # Everything above ran; only the write is skipped. A dry run that
        # skipped the work would report a health it never tested.
        print("   --check: not written")
        return 0
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(doc, ensure_ascii=False, indent=1), encoding="utf-8")
    if FIXTURE.parent.exists():
        FIXTURE.write_text(json.dumps(doc, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"   wrote {OUT.relative_to(REPO)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
