#!/usr/bin/env python3
"""The listing facts the directory knows, on the document beside it.

Three fields the directory carries and the per-company document did not, or
carried differently. Each was the same shape of bug: the market table read one
value and the company screen read another, with nothing to say which was right.

`companies.json` carries the sector EGX itself files a company under; the vendor
scan carries the sector a US data provider guessed. The two disagree for 217 of
284 companies, because the vendor files real estate developers, banks, brokers,
contractors and hotels under one word.

The market build resolves that — and then wrote the vendor's raw column into the
per-company document anyway. So the company screen said "Finance" over a
contractor while the market table one tap away said "Contracting & Construction
Engineering", and the sector screen grouped it a third way.

WHY THIS IS A SEPARATE STEP AND NOT A ONE-LINE FIX

The one-line fix is in `build_market_api` and is made. But that build needs the
daily scan, which is a 2 MB file living outside the repository and present only
on the machine that runs the monitor — in CI there is no scan and the company
documents are not rewritten at all. A correctness rule that only holds when an
optional input is present is not a rule. This runs everywhere, costs nothing,
and makes the contradiction structurally impossible rather than conditionally
absent.

It reads the directory and writes the same string into the document beside it.
No sector is invented: a company the exchange does not classify keeps whatever
the directory holds for it, which is the vendor's guess, and is marked as such
in `sector_source` upstream.

AND THE CURRENCY, for the same reason and with sharper consequences.

Eleven of the exchange's listings are quoted in dollars. The market table was
taught that; the company document was not, so the company screen printed CFGH's
0.118 in a column of pounds — eleven piastres for eleven cents — beside a market
value of 2.83 billion, which really is pounds. Price times shares came to a
fiftieth of the company. Nothing on the screen said the two figures were in
different money.

Absent means the pound, which is 273 of the 284 and does not need saying.

AND IT WAS READ OFF ONE CAPTURE, which is how most of them went missing.

`session.json` holds the LAST market-watch capture and nothing before it, so a
listing's currency lasted exactly as long as its row did. This endpoint returns
a different set of securities every time it is asked — 227 rows on 1 September,
221 on 2 September, 202 on 3 September, against a directory of 284 — and there
is no announcement when a row is not among them.

SAIB was in the 28 August capture at `currShort` "US$" and gone the next
session. GPPL was in the 1 September capture, also "US$", and gone the next
morning. On 3 September the 10:00 capture held ten dollar listings and the
10:08 harvest held three, eight minutes apart, so EGBE, EGSA, FAITA, MOIL,
NAHO, SPHT and TRTO all published as pound listings that afternoon. No filing,
no correction, nothing to notice.

So the quotation currency is now read from EVERY capture on disk, newest wins.
That is the same field of the same endpoint at a different moment — not a
second opinion, just the exchange asked again.

NDRL is not reachable that way at all: no market-watch capture in the archive
has ever carried it. Its own results filing does — "Currency: US Dollar",
archive code 292959, 13 August 2026 — and that archive is committed, complete
back to 2005, and never rewritten. It is the durable signal the capture is not.

BUT A FILING STATES WHAT THE BOOKS ARE IN, NOT WHAT THE SHARE IS QUOTED IN, and
those are different questions with the same answer 218 times out of 222. The
four that differ are the whole reason this does not simply merge the two:

    ORAS   filing "$" (code 293266)          market-watch "L.E"
    EALR   filing "$" (code 291096)          market-watch "L.E"
    EGBE   filing "Egyptian Pound" (293047)  market-watch "US$"
    TRTO   filing "Egyptian Pound" (292912)  market-watch "US$"

Orascom reports in dollars and trades at 822.50 POUNDS. Taking its filing for
its price would have printed a 90.7bn company at $822.50 a share — the CFGH bug
again, in the other direction, on a name in the EGX 30.

Hence: a capture always wins where one exists, and the filing is promoted to
`currency` ONLY for a listing no capture has ever covered. That is one company
today: 63 of the 284 directory rows have never appeared in a capture, and NDRL
is the only one of them whose filing states a foreign currency at all.

The filing's own answer is published beside it as `statement_currency`, because
it is the answer to the other question and the screen needs it: the financials
merge REFUSES a dollar filing (correctly — converting it needs a rate on the
filing's date this app does not hold), and until now it refused silently, so
NDRL, SAIB, ORAS and EALR simply had no net income and no reason given.

WHERE THESE COME FROM

`data-source/egx-beta/session.json` — the exchange's own market-watch, harvested
and committed. Not the directory, which is downstream of it, and not the vendor
scan, which is a 2 MB file outside the repository that CI does not have.

That distinction is the whole point. The market build reads the session, resolves
all three fields correctly, and writes them to the directory — and it only runs
where the scan is. So on the day the sectors were re-keyed, CI rebuilt everything
it could and left 217 company documents contradicting the directory, and the
eleven dollar listings reached no screen at all, because the one step that knew
could not run. Reading the committed session closes that: same authority, same
answer, everywhere, for no network at all.

The two currency signals are committed on the same terms — `snapshot-history/`
holds the raw captures and `filings/` the results archive — so this still runs
with no network and no vendor scan.
"""

from __future__ import annotations

import argparse
import glob
import gzip
import html
import json
import pathlib
import re

REPO = pathlib.Path(__file__).resolve().parent.parent
V1 = REPO / "public" / "data" / "v1"
DIRECTORY = V1 / "companies.json"
COMPANIES = V1 / "companies"
FIXTURES = REPO / "app" / "assets" / "fixtures"
BETA = REPO / "data-source" / "egx-beta"
SESSION = BETA / "session.json"
SNAPSHOTS = BETA / "snapshot-history"
FILINGS = BETA / "filings"

# What the exchange states, and what it is called on a published document.
FIELDS = (("sector", "sector"), ("sector_ar", "sector_ar"))

# Resolved from two sources rather than read off one row — see `currency_of` —
# but written onto the document exactly like the fields above.
CURRENCY_FIELDS = ("currency", "currency_source", "statement_currency")
WRITTEN = tuple(name for _, name in FIELDS) + CURRENCY_FIELDS

# The share count lives in the company document's `profile`, not beside the
# other listing facts, so it is carried separately.
SHARES = "listed_shares"

# Every spelling of a currency this exchange has published, and the symbol the
# app prints for it. BOTH sources below are free text typed by a filer —
# `currShort` is a column of it, the filing's "Currency :" line is a line of it
# — and the archive holds "US Dollar", "US$", "$", "USD", "LE", "L.E", "EGP",
# "Egyptian Pound", "Kuwaiti Dinar", "Swiss Franc", "(CHF)", plus the typos
# "EGB", "Egyptian Poun", "Swess Franc" and "Swis Franc".
#
# A closed list, not a heuristic: a spelling that is not on it records NOTHING
# rather than guessing, because the same regex over the same archive also
# catches prose — "Long-term local currency IDR at 'BB+'" is a Currency line to
# a regex and not to a reader.
POUND = {"le", "l.e", "l.e.", "egp", "egb", "egyptian pound", "egyptian pounds",
         "egyptian poun", "جنيه مصري"}
FOREIGN = {"$": "US$", "us$": "US$", "usd": "US$",
           "us dollar": "US$", "us dollars": "US$",
           "kuwaiti dinar": "KWD",
           "chf": "CHF", "(chf)": "CHF", "swiss franc": "CHF",
           "franc swiss": "CHF", "swess franc": "CHF", "swis franc": "CHF"}

TICKER = re.compile(r"\(([A-Z0-9]{2,8})\.CA\)")
# The filing template writes this line four ways — "Currency: US Dollar",
# "Currency     : $", "Currency&nbsp;&nbsp;&nbsp;&nbsp; : LE" and a bare
# "Currency $" — so the separator is optional and the padding is entities.
CURRENCY_LINE = re.compile(r"Currency\s*:?\s*([^\r\n<]{1,24}?)\s*(?:F/S|ISIN|Net|Source|$)",
                           re.I)


def load(path: pathlib.Path) -> dict:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}


def symbol(raw: str | None) -> str | bool | None:
    """A currency the exchange named, as the app spells it.

    Three answers, and the difference between the last two is the whole rule:
    a symbol means a foreign currency, False means the exchange named the POUND,
    and None means it named nothing this recognises. "Stated as pounds" has to
    outrank a filing; "not stated at all" must not.
    """
    text = (raw or "").strip().lower()
    if not text:
        return None
    if text in POUND:
        return False
    return FOREIGN.get(text)


def flatten(raw: str) -> str:
    """A filing's content as plain text the line regex can match.

    Entities decoded first, then tags, then whitespace. The archive pads this
    column with `&nbsp;` — "Currency&nbsp;&nbsp;&nbsp;&nbsp; : LE" — and
    `&nbsp;` is not `\\s`, so skipping the decode silently drops 3,779 of the
    pound filings and leaves a vocabulary that looks all-foreign.
    """
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", html.unescape(raw or "")))


def quoted() -> dict[str, str | None]:
    """The currency each listing is QUOTED in, from every capture on disk.

    `session.json` is the newest capture and the raw ones under
    `snapshot-history/` are the rest of them, same endpoint and same
    `currShort` column, read newest-last so today's answer wins. Nothing here
    is inferred: a ticker appears only if the exchange typed a currency for it.

    Reading only the newest is what lost nine of the twelve: 202 rows came
    back on 3 September against 284 in the directory, and a listing that falls
    out of one capture publishes as pounds until it comes back.
    """
    out: dict[str, str | None] = {}
    for path in sorted(glob.glob(str(SNAPSHOTS / "*" / "*-market-watch.json.gz"))):
        try:
            payload = json.loads(gzip.decompress(pathlib.Path(path).read_bytes()))
        except (OSError, ValueError):
            continue
        data = ((payload.get("payload") or {}).get("data")) or {}
        rows = data.get("data") if isinstance(data, dict) else data
        for row in rows if isinstance(rows, list) else []:
            if not isinstance(row, dict):
                continue
            ticker = str(row.get("reuters") or "").split(".")[0].strip().upper()
            named = symbol(row.get("currShort"))
            if ticker and named is not None:
                out[ticker] = named or None
    # The harvested session last, because it is the most recent capture of all.
    # An ABSENT currency there is the harvest's own shorthand for "L.E" and so
    # counts as the pound stated. A present one this vocabulary does not know
    # is neither: the harvest copies `currShort` through verbatim, so a spelling
    # nobody has seen yet would otherwise be filed as a pound and outrank the
    # company's own filing on the strength of not being understood.
    for ticker, held in (load(SESSION).get("securities") or {}).items():
        if not isinstance(held, dict):
            continue
        raw = held.get("currency")
        named = symbol(raw)
        if raw and named is None:
            continue
        out[str(ticker).strip().upper()] = named or None
    return out


def filed() -> dict[str, str]:
    """The currency each company's own latest results filing states, if foreign.

    secId 6 only — "Financial Results", the template with a "Currency :" line
    in it. Widening to the whole feed turns 28 clean values into 100, most of
    them sentences about sovereign credit ratings that happen to contain the
    word currency.

    Latest wins because this changes: EALR filed in pounds until 2010 and in
    dollars by July 2026, and a company that redenominates must not keep an
    answer from sixteen years ago.
    """
    latest: dict[str, tuple[str, str]] = {}
    for path in sorted(glob.glob(str(FILINGS / "*.json.gz"))):
        try:
            items = json.loads(gzip.decompress(pathlib.Path(path).read_bytes())).get("items")
        except (OSError, ValueError):
            continue
        for item in items or []:
            if not isinstance(item, dict) or item.get("secId") != 6:
                continue
            ticker = TICKER.search(item.get("heading") or "")
            line = CURRENCY_LINE.search(flatten(item.get("content")))
            if not ticker or not line:
                continue
            named = symbol(line.group(1))
            if named is None:
                continue
            stamp = str(item.get("dateStamp") or "")
            key = ticker.group(1)
            if key not in latest or stamp > latest[key][0]:
                latest[key] = (stamp, named or "")
    return {k: v for k, (_, v) in latest.items() if v}


def currency_of(quotes: dict[str, str | None],
                filings: dict[str, str]) -> dict[str, dict]:
    """The two answers, kept apart, for every listing either one names.

    A capture ALWAYS wins where one exists, including when it says the pound.
    ORAS reports in dollars and trades at 822.50 pounds; EGBE reports in pounds
    and trades in dollars. Merging the two signals gets one of those wrong
    whichever way it is merged, so the filing is promoted to the price's
    currency only where no capture has ever covered the listing — NDRL, and
    nothing else in the archive today (63 directory rows have never been
    captured and it is the only one of them whose filing names a foreign
    currency).
    """
    out: dict[str, dict] = {}
    for ticker in set(quotes) | set(filings):
        facts = {}
        if ticker in quotes:
            if quotes[ticker]:
                facts["currency"] = quotes[ticker]
                facts["currency_source"] = "EGX market-watch"
        elif filings.get(ticker):
            facts["currency"] = filings[ticker]
            facts["currency_source"] = "EGX filing"
        # Published whether or not it also answers the price question: it is
        # why the financials merge has nothing to show for this company.
        if filings.get(ticker):
            facts["statement_currency"] = filings[ticker]
        if facts:
            out[ticker] = facts
    return out


def stated() -> dict[str, dict]:
    """What the exchange states about each listing, from the committed session."""
    securities = load(SESSION).get("securities") or {}
    out = {}
    for ticker, held in securities.items():
        facts = {name: held.get(key) for key, name in FIELDS if held.get(key)}
        if held.get(SHARES):
            facts[SHARES] = held[SHARES]
        if facts:
            out[str(ticker).strip().upper()] = facts
    for ticker, money in currency_of(quoted(), filed()).items():
        out.setdefault(ticker, {}).update(money)
    return out


def align_shares(doc: dict, listed: int | None) -> bool:
    """The exchange's own listed-share count, over the vendor's guess.

    The vendor's `shares_outstanding` contradicts the exchange's market value
    for nineteen companies, by three to two hundred and seventy-four times, and
    it is the denominator of the free float the company screen prints as a
    percentage. The exchange does not publish a count, but `mc / closePrice`
    recovers one exactly (see harvest_egx_session).

    `float_shares` is recomputed with it, because a float derived from a wrong
    denominator is wrong in the same proportion. `free_float` is the vendor's
    own ratio and is left alone.
    """
    if not listed:
        return False
    profile = doc.get("profile")
    if not isinstance(profile, dict) or profile.get("shares_outstanding") == listed:
        return False
    profile["shares_outstanding"] = listed
    profile["shares_outstanding_source"] = "EGX"
    ratio = profile.get("free_float")
    if isinstance(ratio, (int, float)):
        profile["float_shares"] = listed * ratio
    return True


def align(doc: dict, facts: dict) -> bool:
    """Write the stated facts onto a document. True when anything moved.

    A field the exchange does not state is LEFT ALONE, not cleared: it does not
    classify every listing, and an absent sector is not a claim that a company
    has none. What is already published stays until the exchange says otherwise.
    """
    moved = False
    for name in WRITTEN:
        value = facts.get(name)
        if value and doc.get(name) != value:
            doc[name] = value
            moved = True
    return moved


def apply(write: bool = True) -> int:
    print("── Company facts")
    facts = stated()
    if not facts:
        print("   no harvested session — leaving the documents alone")
        return 0

    directory = load(DIRECTORY)
    rows = directory.get("companies") or []
    docs = listed = 0

    for row in rows:
        ticker = str(row.get("ticker") or "").strip().upper()
        if ticker in facts and align(row, facts[ticker]):
            listed += 1
            # The directory records where its classification came from, so a
            # reader of the file can tell the exchange's answer from a guess.
            if facts[ticker].get("sector"):
                row["sector_source"] = "EGX"
    if listed and write:
        DIRECTORY.write_text(
            json.dumps(directory, ensure_ascii=False, separators=(",", ":")),
            encoding="utf-8")
        mirror = FIXTURES / "companies.json"
        if mirror.exists():
            mirror.write_text(
                json.dumps(directory, ensure_ascii=False, separators=(",", ":")),
                encoding="utf-8")

    for ticker, stated_facts in sorted(facts.items()):
        for root in (COMPANIES, FIXTURES / "companies"):
            path = root / f"{ticker}.json"
            doc = load(path)
            if not doc:
                continue
            moved = align(doc, stated_facts)
            moved = align_shares(doc, stated_facts.get(SHARES)) or moved
            if not moved:
                continue
            if root is COMPANIES:
                docs += 1
            if write:
                path.write_text(
                    json.dumps(doc, ensure_ascii=False, separators=(",", ":")),
                    encoding="utf-8")

    verb = "would be" if not write else ""
    foreign = sum(1 for f in facts.values() if f.get("currency"))
    off_capture = sum(1 for f in facts.values()
                      if f.get("currency_source") == "EGX filing")
    books = sum(1 for f in facts.values() if f.get("statement_currency"))
    counted = sum(1 for f in facts.values() if f.get(SHARES))
    print(f"   {len(facts)} listings stated by the exchange, {foreign} priced "
          f"in another currency ({off_capture} off a filing, the rest off a "
          f"capture), {books} keeping books in one, {counted} with a "
          f"listed-share count")
    print(f"   {listed} directory rows and {docs} company documents {verb} "
          f"realigned".replace("  ", " "))
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true",
                        help="report without writing")
    args = parser.parse_args()
    return apply(write=not args.check)


if __name__ == "__main__":
    raise SystemExit(main())
