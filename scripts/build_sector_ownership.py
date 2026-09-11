#!/usr/bin/env python3
"""Which sectors of the exchange own each other.

The ownership board draws named holders against the companies they hold. Some
of those holders are not outsiders at all: they are other listed companies. A
bank holds a quarter of an insurer, a developer holds a third of another
developer, a holding company holds most of a food producer. Drawn one company
at a time that is 1,041 separate facts; drawn sector by sector it is a shape —
where the exchange's own money sits inside itself.

WHAT IS CLAIMED, AND WHAT IS NOT
--------------------------------
A link here says: the holder named on THIS company's filed register is the
listed company of that name, and the filing says how much. Two things follow
from that being an identity claim rather than a resemblance:

* The name rule is equality, not overlap (`insider_identity.names_one_company`).
  Egyptian corporate names share their category words, so an overlap rule joins
  Raya Holding to Prime Holding. Every candidate refused here is listed in
  `refused` with the reason, so a thin graph reads as caution and not absence.

* A company never owns itself. Where a filer's name matches the issuer they
  filed on, that is a same-named parent — QNB Alahli's register names Qatar
  National Bank — and the two cannot be told apart from the name alone, so the
  link is refused rather than drawn as a company holding itself.

Percentages are never summed. A stake is a percentage OF ONE COMPANY, and 30%
of one issuer plus 20% of another is not 50% of anything; the board says so and
this agrees with it. What CAN be added across companies is money: a stake's
market value is percent × the held company's market capitalisation, and EGP is
EGP whichever company it sits in. So sector totals are in money, never in
points, and a company with no published market value contributes a link with no
value rather than a guessed one.
"""

from __future__ import annotations

import argparse
import collections
import datetime
import json
import pathlib

import insider_identity

REPO = pathlib.Path(__file__).resolve().parent.parent
DIRECTORY = REPO / "public" / "data" / "v1" / "companies.json"
PEOPLE = REPO / "public" / "data" / "v1" / "insider-people.json"
OUT = REPO / "public" / "data" / "v1" / "sector-ownership.json"

UNCLASSIFIED = "Unclassified"


def listed(directory):
    """The exchange's companies, keyed by every name they answer to."""
    rows = []
    for company in directory.get("companies", []):
        ticker = company.get("ticker")
        if not ticker:
            continue
        names = [n for n in (company.get("name_ar"), company.get("name_en")) if n]
        keys = set()
        for name in names:
            keys |= insider_identity.company_keys(name)
        rows.append(dict(
            ticker=ticker,
            name=company.get("name_en") or company.get("name_ar") or ticker,
            nameAr=company.get("name_ar") or company.get("name_en") or ticker,
            sector=company.get("sector") or UNCLASSIFIED,
            sectorAr=company.get("sector_ar") or company.get("sector") or UNCLASSIFIED,
            cap=company.get("market_cap") if isinstance(company.get("market_cap"), (int, float)) else None,
            official=company.get("sector_source") == "EGX",
            keys=keys,
        ))
    return rows


def owner_of(holder: str, companies):
    """The listed company a holder's name IS, or a reason it is nobody's.

    Dual-listed classes file under one name — `SEIG` and `SEIGA` are the same
    company twice — so several tickers matching is not an ambiguity as long as
    they are one company in one sector. Tickers in DIFFERENT sectors sharing a
    name is a real ambiguity and refused: the whole output is a claim about
    which sector a stake belongs to.

    Where the classifications disagree, the exchange's own taxonomy decides.
    SEIG and SEIGA are one company whose two lines are filed under `Non-bank
    financial services` by the exchange and `Finance` by a scan of a page; a
    disagreement between a source and a guess is not an ambiguity about the
    company. Sectors disagreeing WITHIN the official taxonomy is.
    """
    keys = insider_identity.company_keys(holder)
    if not keys:
        return None, None
    hits = [c for c in companies if c["keys"] & keys]
    if not hits:
        return None, None
    official = [c for c in hits if c["official"]] or hits
    sectors = {c["sector"] for c in official}
    if len(sectors) > 1:
        return None, (f"the name matches {len(official)} listed companies in "
                      f"{len(sectors)} different sectors")
    # The company, not one of its share classes: the exchange's own line first,
    # then the primary ticker, which is the one without a class letter on it.
    official.sort(key=lambda c: (not c["official"], len(c["ticker"]), -(c["cap"] or 0)))
    return official[0], None


def build(directory, people):
    companies = listed(directory)
    by_ticker = {c["ticker"]: c for c in companies}
    links, refused = [], []
    outside = 0

    for position in people.get("positions", []):
        if position.get("kind") != "firm":
            continue
        percent = position.get("percent")
        if not isinstance(percent, (int, float)) or percent <= 0:
            continue
        held = by_ticker.get(position.get("ticker"))
        if held is None:
            continue
        holder = position.get("holder") or ""
        owner, why = owner_of(holder, companies)
        if why:
            refused.append(dict(holder=holder, ticker=held["ticker"], why=why))
            continue
        if owner is None:
            outside += 1
            continue
        if owner["ticker"] == held["ticker"]:
            refused.append(dict(
                holder=holder, ticker=held["ticker"],
                why="the filer's name is the issuer's own, which reads as a "
                    "same-named parent rather than a company holding itself"))
            continue
        value = (round(percent / 100 * held["cap"], 2)
                 if isinstance(held["cap"], (int, float)) and held["cap"] > 0 else None)
        links.append(dict(
            owner=owner["ticker"], ownerName=owner["name"], ownerNameAr=owner["nameAr"],
            ownerSector=owner["sector"], ownerSectorAr=owner["sectorAr"],
            held=held["ticker"], heldName=held["name"], heldNameAr=held["nameAr"],
            heldSector=held["sector"], heldSectorAr=held["sectorAr"],
            holder=holder, percent=round(percent, 4), value=value,
            asOf=position.get("asOf"), basis=position.get("basis"),
            filingId=position.get("filingId"), source=position.get("source"),
        ))

    links.sort(key=lambda l: (l["ownerSector"], l["owner"], l["held"]))

    flows = collections.OrderedDict()
    for link in links:
        key = (link["ownerSector"], link["heldSector"])
        flow = flows.setdefault(key, dict(
            fromSector=link["ownerSector"], fromSectorAr=link["ownerSectorAr"],
            toSector=link["heldSector"], toSectorAr=link["heldSectorAr"],
            links=0, value=0.0, valued=0, companies=[]))
        flow["links"] += 1
        if link["value"] is not None:
            flow["value"] += link["value"]
            flow["valued"] += 1
        if link["held"] not in flow["companies"]:
            flow["companies"].append(link["held"])
    for flow in flows.values():
        flow["value"] = round(flow["value"], 2) if flow["valued"] else None

    seen = {link["ownerSector"] for link in links} | {link["heldSector"] for link in links}
    sectors = []
    for name in sorted(seen):
        members = [c for c in companies if c["sector"] == name]
        sectors.append(dict(
            id=name,
            nameAr=next((c["sectorAr"] for c in members), name),
            companies=len(members),
            cap=round(sum(c["cap"] or 0 for c in members), 2) or None,
            holds=sum(1 for l in links if l["ownerSector"] == name),
            heldBy=sum(1 for l in links if l["heldSector"] == name),
        ))

    return dict(
        schemaVersion=1,
        generated=datetime.datetime.now(datetime.timezone.utc)
            .isoformat(timespec="seconds").replace("+00:00", "Z"),
        source=people.get("source"),
        asOf=people.get("generated"),
        basis="A link is one listed company's filed stake in another, at the "
              "level the last form printed. Percentages belong to one company "
              "each and are never added together; sector totals are the market "
              "value of the stakes, which is money and can be.",
        basisAr="كل خط حصة مُفصح عنها لشركة مقيدة في شركة مقيدة أخرى، بالنسبة "
                "التي أثبتها آخر نموذج. النسب تخص شركة واحدة ولا تُجمع؛ "
                "إجماليات القطاعات بالقيمة السوقية للحصص، وهي مبالغ تُجمع.",
        linkCount=len(links),
        outsideHolderCount=outside,
        links=links,
        flows=list(flows.values()),
        sectors=sectors,
        refused=refused,
    )


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", default=str(OUT))
    parser.add_argument("--check", action="store_true",
                        help="build and report without writing")
    parser.add_argument("--quiet", action="store_true")
    args = parser.parse_args()

    directory = json.loads(DIRECTORY.read_text())
    people = json.loads(PEOPLE.read_text())
    result = build(directory, people)

    if not args.check:
        path = pathlib.Path(args.out)
        # Atomic: a reader never sees half a document.
        tmp = path.with_suffix(".tmp")
        tmp.write_text(json.dumps(result, ensure_ascii=False, indent=1))
        tmp.replace(path)
    if not args.quiet:
        print(f"   Sector ownership: {result['linkCount']} company-to-company "
              f"stakes across {len(result['flows'])} sector pairs "
              f"({result['outsideHolderCount']} holders are not listed here, "
              f"{len(result['refused'])} refused)"
              + (" (check ok)" if args.check else ""))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
