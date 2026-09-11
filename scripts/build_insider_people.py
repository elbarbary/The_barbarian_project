#!/usr/bin/env python3
"""The people behind the trades, and how their stakes moved.

`build_named_insiders.py` reads one scanned post-execution form at a time and
holds the answer. This turns that store into the two things a reader actually
wants and the daily bulletin cannot give them:

  people    who traded, in which companies, and what their stake was before and
            after — the percentage, not the share count. A million shares is
            10% of a company with ten million and 0.01% of one with ten
            billion; only the percentage says whether anything happened.

  positions where each holder's stake stands NOW — the closing percentage of
            the last form they filed on that company, which is a level the
            document states outright rather than a total of movements that
            would drift with every scan that could not be read.

  periods   the same holdings a trading week at a time, so "what moved" can be
            asked of the whole market without picking a company first.

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

import insider_identity

REPO = pathlib.Path(__file__).resolve().parent.parent
STORE = REPO / "data-source" / "official" / "ownership" / "named-insiders.json"
REGISTERS = REPO / "data-source" / "official" / "ownership" / "shareholder-structure.json"
OUT = REPO / "public" / "data" / "v1" / "insider-people.json"
FIXTURE = REPO / "app" / "assets" / "fixtures" / "insider-people.json"
COMPANIES = REPO / "public" / "data" / "v1" / "companies.json"


def key(name: str) -> str:
    """The name exactly as this filing spelled it, minus stray whitespace.

    Merging spellings is `insider_identity.resolve`'s job and it needs the
    original to do it, so nothing is decided here.
    """
    return " ".join((name or "").split())


def filer(name: str, ticker: str) -> str:
    """The party a filing names, scoped to the company when it names none.

    Most names identify somebody. `اتحاد العاملين المساهمين` does not: it is
    the phrase for a company's shareholding employees' union and eleven
    registers print it, most without saying whose. Merged on the spelling it
    becomes one holder with stakes in eight companies — a cross-holding nobody
    filed. Scoped to the ticker it stays what the document actually said.
    """
    plain = key(name)
    if plain and ticker and insider_identity.names_no_party(plain):
        return f"{plain} ({ticker})"
    return plain


def week_of(date: str) -> str:
    """The Sunday that opens this date's trading week.

    The EGX week runs Sunday to Thursday, so a Monday-anchored week would cut
    every one of them in half and put a Sunday's filings in with the week
    before.
    """
    day = dt.date.fromisoformat(date)
    return (day - dt.timedelta(days=(day.weekday() + 1) % 7)).isoformat()


_MONTHS_EN = ("Jan", "Feb", "Mar", "Apr", "May", "Jun",
              "Jul", "Aug", "Sep", "Oct", "Nov", "Dec")
_MONTHS_AR = ("يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
              "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر")


def week_label(start: str, end: str, months) -> str:
    a = dt.date.fromisoformat(start)
    b = dt.date.fromisoformat(end)
    if a.month == b.month:
        return f"{a.day}–{b.day} {months[b.month - 1]}"
    return f"{a.day} {months[a.month - 1]} – {b.day} {months[b.month - 1]}"


def registers() -> dict:
    """The filed shareholder structures, keyed by ticker.

    Only the reading for each company is kept, not the whole store, and the
    date is the one the form itself states — `asOfDate` — falling back to the
    session it was filed for and then to the day it was published. A register
    dated by our fetch rather than by the document would claim a freshness the
    document does not have.
    """
    if not REGISTERS.exists():
        return {}
    try:
        held = json.loads(REGISTERS.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}
    out = {}
    for reading in (held.get("readings") or {}).values():
        ticker = reading.get("ticker")
        if not ticker:
            continue
        asof = (reading.get("asOfDate") or reading.get("sessionDate")
                or (reading.get("publishedAt") or "")[:10]) or None
        held_row = out.get(ticker)
        if held_row and (held_row.get("asOf") or "") >= (asof or ""):
            continue
        out[ticker] = {
            "ticker": ticker,
            "asOf": asof,
            "filingId": reading.get("filingId"),
            "source": reading.get("source"),
            "totalShares": reading.get("totalShares"),
            "board": reading.get("board") or [],
            "shareholders": reading.get("shareholders") or [],
            "namedWithoutAStake": reading.get("namedWithoutAStake") or [],
        }
    return out


def _dedupe(trades):
    """One executed trade, however many times the exchange filed it.

    Two of the readings are the same trade under two filing numbers — same
    holder, company, session, share count, price and both stake figures. Left
    in, they double the holder's disclosed value and their trade count.
    """
    seen, out = set(), []
    for t in trades:
        mark = (t["ticker"], t["date"], t["shares"], t["price"],
                t["stakeBefore"], t["stakeAfter"], t["action"])
        if mark in seen:
            continue
        seen.add(mark)
        out.append(t)
    return out


def main(argv=None) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true",
                    help="build it and report, but write nothing")
    ap.add_argument("--force", action="store_true",
                    help="publish even if it knows less than what is published")
    args = ap.parse_args(argv)
    # Either store is enough. Trades were the only source once; registers now
    # carry most of the holders, and a machine that has read registers and no
    # trade forms has plenty to publish.
    readings = []
    if STORE.exists():
        try:
            readings = list((json.loads(STORE.read_text(encoding="utf-8"))
                             .get("readings") or {}).values())
        except json.JSONDecodeError:
            readings = []
    books_present = REGISTERS.exists()
    if not readings and not books_present:
        print("nothing read yet — run build_named_insiders.py "
              "and build_ownership_structure.py")
        return 0

    names = {}
    try:
        for c in json.loads(COMPANIES.read_text(encoding="utf-8")).get("companies", []):
            names[c.get("ticker")] = {"en": c.get("name"), "ar": c.get("name_ar") or c.get("nameAr")}
    except (OSError, json.JSONDecodeError):
        pass

    people = collections.defaultdict(lambda: {"trades": []})
    for r in readings:
        k = filer(r.get("investorName"), r.get("ticker"))
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

    # One holder per party, not one per spelling. Two filings that name the
    # same person differently are two nodes on the map and two rows in the
    # list, and their stakes read as separate holdings — `شركة اموال العربيه
    # للاقطان` and `شركه ...`, one letter apart, made KABO look 82% disclosed
    # when one firm holds 41% of it.
    books = registers()

    # Register holders go through the SAME identity resolution as the traders,
    # so a man who filed a trade in August and appears in his company's October
    # register is one holder and not two. They carry no trades, so nothing can
    # corroborate a fuzzy match for them: only an identical folded spelling
    # merges a register name into a trading one, which is the conservative way
    # round — two nodes for one person is a smaller error than one node for two.
    filed = [{"id": k, "nameEn": p.get("nameEn"), "trades": p["trades"]}
             for k, p in people.items()]
    known = {k for k in people}
    for book in books.values():
        for row in book["shareholders"]:
            name = filer(row.get("nameArabic"), book["ticker"])
            if name and name not in known:
                known.add(name)
                filed.append({"id": name, "nameEn": None, "trades": []})
    groups = insider_identity.resolve(filed)

    rows = []
    holder_of = {}
    for group in groups:
        trades = _dedupe(sorted(
            [t for member in group for t in member["trades"]],
            key=lambda t: (t["date"] or "", str(t["filingId"] or ""))))
        # The name as most recently filed, and the fullest rendering when two
        # forms of one session disagree. Every spelling is kept beside it: the
        # reader who searches the name they saw on the exchange's site has to
        # find this row.
        # A register holder has no trades, so `max` over an empty sequence is
        # the ordinary case here rather than the odd one.
        variants = sorted(
            group,
            key=lambda m: (max((t["date"] or "") for t in m["trades"]) if m["trades"] else "",
                           len(m["id"].split())),
            reverse=True)
        head = variants[0]
        source = people.get(head["id"], {})
        for member in group:
            holder_of[member["id"]] = head["id"]
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
            "id": head["id"],
            "name": source.get("name") or head["id"], "nameEn": head.get("nameEn"),
            "script": source.get("script"),
            # A person or a firm, read off the name. The map draws them
            # differently because "who owns the exchange" is a different
            # question when the answer is a fund.
            "kind": "firm" if insider_identity.is_firm(head["id"], head.get("nameEn")) else "person",
            "aliases": sorted(m["id"] for m in group if m["id"] != head["id"]) or None,
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

    # ── where every disclosed stake stands now ───────────────────────────────
    #
    # The closing percentage of the most recent form filed on that company —
    # a level the document prints, not a running total of movements. A holding
    # read down to zero stays in the list at zero: "sold out" and "never held"
    # are different facts and the second one is not ours to claim.
    held = {}
    for r in rows:
        by_ticker = collections.defaultdict(list)
        for t in r["trades"]:
            if t["ticker"] and t["stakeAfter"] is not None:
                by_ticker[t["ticker"]].append(t)
        for ticker, hist in sorted(by_ticker.items()):
            hist.sort(key=lambda t: (t["date"] or "", str(t["filingId"] or "")))
            last = hist[-1]
            held[(r["id"], ticker)] = {
                "holder": r["id"],
                "kind": r["kind"],
                "ticker": ticker,
                "percent": last["stakeAfter"],
                "asOf": last["date"],
                # What kind of document said so. A trade form states the stake
                # one transaction left behind; a register states the holding.
                "basis": "trade",
                "filingId": last["filingId"],
                "source": last["source"],
                "openedAt": hist[0]["date"],
                "openingPercent": hist[0]["stakeBefore"],
                "history": [{"date": t["date"], "percent": t["stakeAfter"]} for t in hist],
            }

    kind_of = {r["id"]: r["kind"] for r in rows}
    for book in books.values():
        for row in book["shareholders"]:
            name = filer(row.get("nameArabic"), book["ticker"])
            holder = holder_of.get(name)
            percent = row.get("percent")
            if not holder or not isinstance(percent, (int, float)) or percent <= 0:
                continue
            mark = (holder, book["ticker"])
            standing = held.get(mark)
            # The newer document wins, and a register that ties with a trade
            # wins too: one states the holding, the other states what a single
            # transaction left behind.
            if standing and (standing["asOf"] or "") > (book["asOf"] or ""):
                continue
            held[mark] = {
                "holder": holder,
                "kind": kind_of.get(holder, "person"),
                "ticker": book["ticker"],
                "percent": float(percent),
                "asOf": book["asOf"],
                "basis": "register",
                "filingId": book["filingId"],
                "source": book["source"],
                "shares": row.get("shares"),
                "openedAt": (standing or {}).get("openedAt"),
                "openingPercent": (standing or {}).get("openingPercent"),
                "history": (standing or {}).get("history") or [],
            }
    # ── one party, two alphabets ─────────────────────────────────────────────
    #
    # `Citadel Capital` in ASEC Mining's filed register and `القلعة للاستشارات
    # المالية` in a post-execution form are the same firm. القلعة IS citadel —
    # a translation, not a transliteration, and no folding of letters reaches
    # from one to the other. Counted apart they gave ASEC Mining 119.94% of
    # itself. Upper Egypt Mills the same, at 108.40%.
    #
    # Nothing in the two names can prove they are one party, so the names are
    # not what decides it. A REGISTER is different in kind from a trade form:
    # it enumerates a company's holders at a date, in one document, internally
    # consistent. A trade form names one party and says nothing about who else
    # holds. So where a company has filed a register, and adding the
    # trade-named holders it does not list would make the company more than
    # wholly owned, the register is kept and those positions are set aside —
    # published as superseded rather than deleted, because a reader who can
    # see both names can see what happened, and we cannot say which is which.
    superseded = []
    by_company = collections.defaultdict(list)
    for position in held.values():
        by_company[position["ticker"]].append(position)
    for ticker, rows_here in by_company.items():
        if ticker not in books:
            continue
        from_register = [p for p in rows_here if p["basis"] == "register"]
        from_trades = [p for p in rows_here if p["basis"] != "register"]
        if not from_register or not from_trades:
            continue
        total = sum(p["percent"] or 0 for p in rows_here)
        if total <= 100.0001:
            continue
        for position in from_trades:
            del held[(position["holder"], ticker)]
            superseded.append({
                "holder": position["holder"],
                "ticker": ticker,
                "percent": position["percent"],
                "asOf": position["asOf"],
                "filingId": position["filingId"],
                "why": (f"the filed register for {ticker} does not list this "
                        f"name, and counting both made the company "
                        f"{total:.2f}% owned"),
            })

    positions = sorted(held.values(),
                       key=lambda p: (-(p["percent"] or 0), p["ticker"]))

    # Companies whose named holders add to more than the company.
    #
    # Every one of these is two documents naming one party twice, and the two
    # found so far are the same shape: a register in English against a trade
    # form in Arabic. `Citadel Capital` at 53.35% and `القلعة للاستشارات
    # المالية` at 50.76% are one firm, and nothing in a name can prove it —
    # a translation is not a transliteration and no folding reaches across.
    #
    # So it is published as a contradiction rather than resolved by guess. The
    # map marks the ring and the panel says the sum; a reader who can see the
    # two names can see what happened, which is more than a silently scaled
    # ring would give them.
    claimed = collections.defaultdict(float)
    counted = collections.Counter()
    for position in positions:
        if (position["percent"] or 0) > 0:
            claimed[position["ticker"]] += position["percent"]
            counted[position["ticker"]] += 1
    over = [{"ticker": t, "percent": round(v, 2), "holders": counted[t]}
            for t, v in sorted(claimed.items()) if v > 100.0001]

    # Who sits on each board. A director is NOT a shareholder and is not
    # counted as one; where the same name appears in both, `holder` joins them.
    boards = []
    for ticker, book in sorted(books.items()):
        if not book["board"]:
            continue
        boards.append({
            "ticker": ticker,
            "asOf": book["asOf"],
            "filingId": book["filingId"],
            "source": book["source"],
            "seats": [{
                "name": (seat.get("nameArabic") or "").strip(),
                "holder": holder_of.get(filer(seat.get("nameArabic"),
                                                book["ticker"])),
                "role": seat.get("role") or None,
                "representing": seat.get("representing") or None,
            } for seat in book["board"] if (seat.get("nameArabic") or "").strip()],
        })

    # ── what moved, a trading week at a time ─────────────────────────────────
    #
    # Weeks rather than months because the readings are not spread evenly: by
    # month this is 1 filing, then 88, then 18, and a period selector whose
    # first stop holds a single form is a broken picture rather than a true
    # one. A week holds between one and thirty.
    weeks = collections.defaultdict(lambda: {
        "buys": 0, "sells": 0, "value": 0.0, "sessions": set(),
        "moves": collections.OrderedDict()})
    for r in rows:
        for t in r["trades"]:
            if not t["date"] or not t["ticker"]:
                continue
            w = weeks[week_of(t["date"])]
            w["buys" if t["action"] == "buy" else "sells"] += 1
            w["value"] += t["value"] or 0
            w["sessions"].add(t["date"])
            mv = w["moves"].setdefault((r["id"], t["ticker"]), {
                "holder": r["id"], "kind": r["kind"], "ticker": t["ticker"],
                "from": t["stakeBefore"], "to": None, "trades": 0, "value": 0.0,
            })
            mv["trades"] += 1
            mv["value"] += t["value"] or 0
            if t["stakeAfter"] is not None:
                mv["to"] = t["stakeAfter"]
    periods = []
    for start, w in sorted(weeks.items()):
        moves = []
        for mv in w["moves"].values():
            change = (None if mv["from"] is None or mv["to"] is None
                      else round(mv["to"] - mv["from"], 4))
            moves.append({**mv, "value": round(mv["value"], 2), "change": change})
        moves.sort(key=lambda m: -abs(m["change"] or 0))
        end = max(w["sessions"])
        periods.append({
            "start": start,
            "end": end,
            "label": week_label(start, end, _MONTHS_EN),
            "labelAr": week_label(start, end, _MONTHS_AR),
            "sessions": len(w["sessions"]),
            "buys": w["buys"], "sells": w["sells"],
            "value": round(w["value"], 2),
            "moves": moves,
        })

    doc = {
        "schemaVersion": 1,
        "generated": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"),
        "source": ("EGX post-execution disclosure forms (نموذج إفصاح بعد التنفيذ) "
                   "and board & shareholder-structure forms "
                   "(نموذج إفصاح عن مجلس الإدارة وهيكل المساهمين)"),
        "basis": ("Read from the scanned filings themselves, which are the only "
                  "documents that name the party: a post-execution form states "
                  "the stake one trade left behind, and a structure form states "
                  "the register. The daily EGX summary gives the relationship "
                  "and never the name."),
        "basisAr": ("مقروءة من الإفصاحات الممسوحة نفسها، وهي المستندات الوحيدة "
                    "التي تذكر الأسماء: نموذج ما بعد التنفيذ يذكر الحصة بعد "
                    "الصفقة، ونموذج هيكل المساهمين يذكر السجل. الملخص اليومي "
                    "للبورصة يذكر صفة المتعامل ولا يذكر اسمه."),
        "peopleCount": len(rows),
        "tradeCount": sum(r["tradeCount"] for r in rows),
        # Every company we can name a holder of, not just the ones somebody
        # traded. It read 51 while the file carried ownership for 162.
        "tickerCount": len({p["ticker"] for p in positions}),
        "tradedTickerCount": len({t for r in rows for t in r["tickers"]}),
        "firmCount": sum(1 for r in rows if r["kind"] == "firm"),
        "personCount": sum(1 for r in rows if r["kind"] == "person"),
        "aliasCount": sum(len(r["aliases"] or ()) for r in rows),
        "registerCount": len(books),
        "overDisclosed": over,
        "supersededByRegister": superseded,
        "seatCount": sum(len(b["seats"]) for b in boards),
        "people": rows,
        "positions": positions,
        "periods": periods,
        "boards": boards,
    }
    live = [p for p in positions if (p["percent"] or 0) > 0]
    print(f"   {len(rows)} holders ({doc['personCount']} people, "
          f"{doc['firmCount']} firms, {doc['aliasCount']} spellings merged), "
          f"{doc['tradeCount']} trades, {doc['tickerCount']} companies")
    print(f"   {len(live)} standing stakes across "
          f"{len({p['ticker'] for p in live})} companies, "
          f"{len(periods)} trading weeks")
    print(f"   {doc['registerCount']} filed registers, {doc['seatCount']} board seats")
    for row in over:
        print(f"   ! {row['ticker']}: {row['holders']} named holders add to "
              f"{row['percent']}% — two documents naming one party twice")
    if args.check:
        # Everything above ran; only the write is skipped. A dry run that
        # skipped the work would report a health it never tested.
        print("   --check: not written")
        return 0

    # A rebuild that knows LESS than the file it is replacing is not a rebuild.
    #
    # The readings this is built from live outside git, so a machine that has
    # not collected them — a CI runner, a fresh clone — rebuilds a thinner
    # document from a thinner store and overwrites months of reading with it.
    # Six trades would replace a hundred and five, and every ring on the map
    # would lose its holders, silently, in a build that reported success.
    if OUT.exists() and not args.force:
        try:
            standing = json.loads(OUT.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            standing = {}
        was = len(standing.get("people") or ())
        if was > len(rows):
            print(f"   refusing to publish: {len(rows)} holders would replace "
                  f"{was} already published. The reading store is thinner than "
                  f"the file — collect the forms, or pass --force if the loss "
                  f"is intended.")
            return 0

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(doc, ensure_ascii=False, indent=1), encoding="utf-8")
    if FIXTURE.parent.exists():
        FIXTURE.write_text(json.dumps(doc, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"   wrote {OUT if REPO not in OUT.parents else OUT.relative_to(REPO)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
