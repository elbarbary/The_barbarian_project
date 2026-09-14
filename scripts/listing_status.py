#!/usr/bin/env python3
"""Which companies the exchange has delisted, read from its own listing notices.

The directory is whatever the vendor scan carries, and the vendor carries
shares the exchange removed years ago. Nile Cotton Ginning is the case that
found it: the Listing Committee approved its final voluntary delisting on
9 June 2021 (NewsID 211501 — "removed from the stock exchange database as of
the end of the trading session on Thursday 10/06/2021", dealt in since then
only on the transfer-of-ownership system). On 13 September 2026 the app still
published it with a 2.65bn market value, an 8.4x "volume event" on 800 shares
of an over-the-counter transfer, a nine-month results window for a company
that will never file one, and a place on the silent-filer list. The price is
real; the listing is not.

Fourteen directory tickers were in that state, and every one of them has a
final notice in the committed archive. Nothing here is typed by hand: the
exchange published each decision, and this reads it back.

WHAT COUNTS AS DELISTED
-----------------------
A company is delisted when the LATEST listing event the exchange published
about it is a final delisting, and nothing the exchange did afterwards
contradicts that. Three rules, each paid for by a real company:

1. **A final decision, not a step.** A voluntary delisting is announced three
   times — the request, "allowing X to go through the procedures", then the
   final approval — and only the last removes the share. Steps are told apart
   in both languages, because some English headings do not say: NewsID 271913
   reads "Mandatory Delisting for Golden Coast Company" and is, in Arabic,
   السير فى اجراءات الشطب — the procedure opening, four months before the
   decision (278009).

2. **The notice is not always titled as one.** Advanced Pharmaceutical
   Packaging's compulsory delisting (NewsID 205160, 13 December 2020) is filed
   under General with the heading "Decision of the Listing Committee"; only the
   body says "decided to delist". A heading search misses it, so a
   listing-committee decision is also read by its body.

3. **A delisting can be undone.** CIRA was delisted in February 2015 and listed
   again in September 2018; El Mamoura (MMHC) was delisted in 2010 and
   temporarily listed on 28 June 2026; Tourism Urbanization (TOUR) was delisted
   in 2017 and temporarily listed on the SMEs market on 26 August 2026. All
   three are listed today. A later "Listing the shares of" notice ends a
   delisting, and a later "consider listing ... as if it did not exist" — the
   exchange's words when a temporary listing lapses — ends that listing again.

And two checks against the exchange's own behaviour, so that a notice this
misreads can only fail towards leaving a company visible:

* **The exchange kept publishing about it.** A company removed from the
  exchange's database stops appearing in its feed. A filing tagged with the
  ticker or ISIN more than `GRACE_DAYS` after the notice means the listing
  carried on, whatever the notice said. Measured over the whole archive, the
  only companies with a final notice and filings after it are the four that
  were listed again — whose listing notices already decide them above.
* **The exchange's own market-watch still quotes it.** The market-watch only
  carries securities trading on the exchange, so a row dated after the notice
  is the exchange saying otherwise.

A contradicted notice is reported, not silently dropped.

WHAT THIS DOES NOT CLAIM
------------------------
Only what a notice in the archive says. Three gaps, recorded rather than
guessed at:

* The exchange's feed starts in January 2010. A share delisted before that has
  no notice here.
* A notice is matched to a directory ticker through the ticker the exchange
  prints or the ISIN it pairs with it. Where the vendor's ticker is not the
  exchange's — the directory's CID is the exchange's SIDC.CA — a notice about
  that company would not reach its row.
* A temporary listing is a listing. Nineteen directory companies were listed
  that way in 2026 alone (EFAC, NMIN and KNGC among them, ahead of their
  offerings), and a temporarily listed share may not trade on the exchange
  until its offering happens. This says nothing about whether a listed share
  trades; it answers "delisted?" only.

`delisted_on` is the date the exchange PUBLISHED the final decision. The share
often left the trading system a session or two earlier (NCGC: 10 June, notice
14 June); the notice's own words, one tap away on `link`, give the detail.

Usage:
    python3 scripts/listing_status.py            # print the verified list
    python3 scripts/listing_status.py --json     # the same, as JSON
"""

from __future__ import annotations

import argparse
import collections
import datetime
import functools
import glob
import gzip
import json
import pathlib
import re

REPO = pathlib.Path(__file__).resolve().parent.parent
BETA = REPO / "data-source" / "egx-beta"
FILINGS = BETA / "filings"
SNAPSHOTS = BETA / "snapshot-history"
SESSION = BETA / "session.json"
DIRECTORY = REPO / "public" / "data" / "v1" / "companies.json"

DETAIL = "https://www.egx.com.eg/en/NewsDetails.aspx?NewsID={}"

# The exchange's own sections for decisions about a listing: Listing
# Announcements, Listing Committee Decisions, Listing/Delisting Requests.
LISTING_SECTIONS = {11, 12, 13}
# General, where a company's own releases go — and, sometimes, the committee's
# decision about it (rule 2 above).
GENERAL = 3

# How long after a final notice the exchange may still publish about the
# company without that meaning anything. The special-deals window that buys
# out the remaining holders runs for weeks after the decision (NCGC's to
# 2 August 2021), and a company's own release about its delisting lands in the
# days around it (GTHE, two days after).
GRACE_DAYS = 30

TICKER = re.compile(r"\(\s*([A-Z0-9]{2,8})\.CA\s*\)")
REUTERS = re.compile(r"Reuters\s+Code\s*:\s*([A-Z0-9]{2,8})\.CA", re.I)
ISIN = re.compile(r"EG[A-Z0-9]{10}")

# Every spelling in the archive: "De-listing", "Deli-sting" (NCGC's own
# notice), "De – Listing" (IRAX), "De–Listing" (PACH), "Delisting".
DELISTING = re.compile(r"de\s*[-–]?\s*li\s*-?\s*sting", re.I)
DELISTING_AR = re.compile(r"شطب")

# The request and the permission to proceed, which precede the decision.
STEP = re.compile(
    r"request|allowing|\ballow\b|go(?:ing)?\s+through|notify|notifying|"
    r"procedures|consider|stopping|remind", re.I)
STEP_AR = re.compile(r"طلب|السير\s*ف[يى]|العدول|تذكير")

# The same sections delist a treasury bill every month.
NOT_SHARES = re.compile(
    r"treasury|\bbonds?\b|\bbills?\b|sukuk|\bfund\b|certificates|"
    r"securiti[sz]ation|membership|decree", re.I)
NOT_SHARES_AR = re.compile(r"سندات|أذون|اذون|صكوك|صندوق|وثائق|توريق|العضوية")

# Rule 2: a committee decision filed under General, recognised by its body.
COMMITTEE = re.compile(r"listing\s+committee", re.I)
DECIDED = re.compile(
    r"(?:decided|approved)\s+(?:to\s+|the\s+(?:final\s+)?)de\s*[-–]?\s*li\s*-?\s*st", re.I)

# Rule 3.
LISTED = re.compile(r"^\s*(?:re-?\s*)?listing\s+(?:the\s+)?(?:shares?|stocks?)\s+of\b", re.I)
VOIDED = re.compile(r"as\s+if\s+it\s+(?:did\s+not\s+exist|never\s+took\s+place|never\s+existed)",
                    re.I)

KINDS = (
    ("merger", re.compile(r"merger|الاندماج", re.I)),
    ("mandatory", re.compile(r"mandatory|compulsory|forced|obligatory|اجبار|إجبار", re.I)),
    ("voluntary", re.compile(r"voluntary|optional|اختيار", re.I)),
)
# In a body, the kind is the word that qualifies the delisting itself. EITP's
# notice (202743) says "voluntary de-listing" and, three sentences on, the
# "mandatory tender offer" that preceded it.
KIND_PHRASE = re.compile(
    r"(voluntary|optional|mandatory|compulsory|forced|obligatory)\s+de\s*[-–]?\s*li", re.I)


def strip(html: str | None) -> str:
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", html or "")).strip()


def day(stamp: str | None) -> datetime.date | None:
    try:
        return datetime.date.fromisoformat((stamp or "")[:10])
    except ValueError:
        return None


# ------------------------------------------------------------------ inputs


def load_items(folder: pathlib.Path = FILINGS) -> list[dict]:
    items: list[dict] = []
    for path in sorted(glob.glob(str(folder / "*.json.gz"))):
        try:
            doc = json.loads(gzip.decompress(pathlib.Path(path).read_bytes()))
        except (OSError, ValueError):
            continue
        items.extend(i for i in doc.get("items") or [] if isinstance(i, dict))
    return items


def quoted_on_exchange(snapshots: pathlib.Path = SNAPSHOTS,
                       session: pathlib.Path = SESSION) -> dict[str, str]:
    """ticker or ISIN → the newest day the exchange's market-watch quoted it.

    Captures carry the ISIN and the exchange's own `lastTradeDate`. The
    harvested session carries neither, so its date is the harvest's — and only
    a row with a market value counts, because the harvest also holds a bare
    currency for listings its capture dropped, which is not a quote.
    """
    seen: dict[str, str] = {}

    def note(key: str, stamp: str) -> None:
        if key and stamp and stamp > seen.get(key, ""):
            seen[key] = stamp

    for path in sorted(glob.glob(str(snapshots / "*" / "*-market-watch.json.gz"))):
        try:
            payload = json.loads(gzip.decompress(pathlib.Path(path).read_bytes()))
        except (OSError, ValueError):
            continue
        data = (payload.get("payload") or {}).get("data") or {}
        rows = data.get("data") if isinstance(data, dict) else data
        for row in rows if isinstance(rows, list) else []:
            if not isinstance(row, dict):
                continue
            stamp = str(row.get("lastTradeDate") or "")[:10]
            note(str(row.get("reuters") or "").split(".")[0].strip().upper(), stamp)
            note(str(row.get("isin") or "").strip().upper(), stamp)
    try:
        held = json.loads(session.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        held = {}
    stamp = str(held.get("harvested") or "")[:10]
    for ticker, row in (held.get("securities") or {}).items():
        if isinstance(row, dict) and row.get("market_cap"):
            note(str(ticker).strip().upper(), stamp)
    return seen


# ------------------------------------------------------- who a notice names


def _isin_field(item: dict) -> str:
    # The field arrives padded, right-to-left-marked or cut short:
    # "‏EGS74081C01", "  EGS513B1C0".
    return re.sub(r"[^A-Z0-9]", "", str(item.get("isin") or "").upper())


def isin_of(items: list[dict]) -> dict[str, str]:
    """ticker → its ISIN, the one the exchange pairs it with most often.

    Counted rather than taken from any one filing, because the pairing is
    occasionally wrong at source — NAHO's filings carry another company's ISIN
    ten times in 4,839.
    """
    pairs: dict[str, collections.Counter] = collections.defaultdict(collections.Counter)
    for item in items:
        heading = f"{item.get('heading') or ''} {item.get('headingArabic') or ''}"
        tickers = set(TICKER.findall(heading))
        field = _isin_field(item)
        if len(tickers) == 1 and len(field) == 12:
            pairs[next(iter(tickers))][field] += 1
    return {ticker: counts.most_common(1)[0][0] for ticker, counts in pairs.items()}


def named(item: dict, isins: dict[str, str], holders: dict[str, set[str]]) -> set[str]:
    """Every ticker a listing notice is about.

    Only the places the exchange's template reserves for the subject: the
    heading, the "Reuters Code" field and the ISIN field. Never a ticker
    loose in the body, which in a merger notice is the company doing the
    absorbing.
    """
    heading = f"{item.get('heading') or ''} {item.get('headingArabic') or ''}"
    tickers = set(TICKER.findall(heading)) | set(REUTERS.findall(strip(item.get("content"))))
    found = set(ISIN.findall(heading))
    field = _isin_field(item)
    if len(field) == 12:
        found.add(field)
    elif len(field) >= 9:
        matches = {isin for isin in holders if isin.startswith(field)}
        if len(matches) == 1:
            found |= matches
    for isin in found:
        tickers |= holders.get(isin, set())
    return tickers


# ----------------------------------------------------------- what it says


def classify(item: dict) -> tuple[str, str | None] | None:
    """("delisted", kind), ("listed", None), ("voided", None) — or None.

    Pure: the item's section, headings and body decide, nothing else.
    """
    section = item.get("secId")
    if section not in LISTING_SECTIONS and section != GENERAL:
        return None
    english = item.get("heading") or ""
    arabic = item.get("headingArabic") or ""
    if NOT_SHARES.search(english) or NOT_SHARES_AR.search(arabic):
        return None

    if section in LISTING_SECTIONS:
        if VOIDED.search(english):
            return ("voided", None)
        if LISTED.search(english) and not DELISTING.search(english):
            return ("listed", None)
        if not (DELISTING.search(english) or DELISTING_AR.search(arabic)):
            return None
        if STEP.search(english) or STEP_AR.search(arabic):
            return None
        return ("delisted", _kind(f"{english} {arabic}", strip(item.get("content"))))

    if section == GENERAL and COMMITTEE.search(english):
        body = strip(item.get("content"))
        if DECIDED.search(body):
            return ("delisted", _kind(f"{english} {arabic}", body))
    return None


def _kind(heading: str, body: str) -> str | None:
    """voluntary, mandatory or merger — from the heading first, then the body."""
    for kind, pattern in KINDS:
        if pattern.search(heading):
            return kind
    phrase = KIND_PHRASE.search(body)
    if phrase:
        word = phrase.group(1).lower()
        return "voluntary" if word in ("voluntary", "optional") else "mandatory"
    found = [(match.start(), kind) for kind, pattern in KINDS
             for match in [pattern.search(body)] if match]
    return min(found)[1] if found else None


# ------------------------------------------------------------------ status


def derive(items: list[dict], quoted: dict[str, str] | None = None
           ) -> tuple[dict[str, dict], dict[str, dict]]:
    """(delisted, contradicted), both ticker → the final notice behind it.

    `contradicted` holds the companies whose latest listing event is a final
    delisting that the exchange's own later behaviour disputes. They are not
    delisted here; they are returned so a caller can say so.
    """
    quoted = quoted or {}
    isins = isin_of(items)
    holders: dict[str, set[str]] = collections.defaultdict(set)
    for ticker, isin in isins.items():
        holders[isin].add(ticker)

    events: dict[str, list[tuple[str, int, str, str | None, dict]]] = \
        collections.defaultdict(list)
    for item in items:
        verdict = classify(item)
        if not verdict:
            continue
        stamp = str(item.get("dateStamp") or "")
        for ticker in named(item, isins, holders):
            events[ticker].append((stamp, int(item.get("code") or 0), verdict[0],
                                   verdict[1], item))

    notices = {code for rows in events.values() for _, code, _, _, _ in rows}
    activity = _activity(items, notices)
    delisted: dict[str, dict] = {}
    contradicted: dict[str, dict] = {}
    for ticker, rows in events.items():
        rows.sort(key=lambda row: (row[0], row[1]))
        standing = []
        for row in rows:
            if row[2] == "voided":
                # A lapsed temporary listing takes back the listing before it,
                # and only that one.
                for back in range(len(standing) - 1, -1, -1):
                    if standing[back][2] == "listed":
                        del standing[back]
                        break
                continue
            standing.append(row)
        if not standing or standing[-1][2] != "delisted":
            continue
        stamp, code, _, kind, item = standing[-1]
        record = {
            "ticker": ticker,
            "isin": isins.get(ticker),
            "delisted_on": stamp[:10],
            "news_id": code,
            "link": DETAIL.format(code),
            "kind": kind,
            "title": (item.get("heading") or "").strip(),
            "title_ar": (item.get("headingArabic") or "").strip(),
        }
        reason = _disputed(record, activity, quoted)
        if reason:
            contradicted[ticker] = {**record, "contradicted_by": reason}
        else:
            delisted[ticker] = record
    return delisted, contradicted


def _activity(items: list[dict], notices: set[int]) -> dict[str, tuple[str, int]]:
    """ticker or ISIN → the newest filing tagged with it, listing notices aside.

    The notices are left out because the sequence above already reads them: a
    relisting ends a delisting there, and a lapsed one must not end it here.
    """
    newest: dict[str, tuple[str, int]] = {}
    for item in items:
        code = int(item.get("code") or 0)
        if code in notices:
            continue
        stamp = str(item.get("dateStamp") or "")[:10]
        heading = f"{item.get('heading') or ''} {item.get('headingArabic') or ''}"
        keys = set(TICKER.findall(heading))
        field = _isin_field(item)
        if len(field) == 12:
            keys.add(field)
        for key in keys:
            if (stamp, code) > newest.get(key, ("", 0)):
                newest[key] = (stamp, code)
    return newest


def _disputed(record: dict, activity: dict[str, tuple[str, int]],
              quoted: dict[str, str]) -> str | None:
    """Why the exchange's own behaviour says this company is still listed."""
    keys = [key for key in (record["ticker"], record["isin"]) if key]
    for key in keys:
        stamp = quoted.get(key)
        if stamp and stamp > record["delisted_on"]:
            return f"quoted on the exchange's market-watch on {stamp}"
    when = day(record["delisted_on"])
    if not when:
        return None
    horizon = (when + datetime.timedelta(days=GRACE_DAYS)).isoformat()
    for key in keys:
        stamp, code = activity.get(key, ("", 0))
        if stamp > horizon:
            return f"the exchange published about it on {stamp} (NewsID {code})"
    return None


@functools.lru_cache(maxsize=None)
def _cached(folder: str, snapshots: str, session: str) -> tuple[dict, dict]:
    items = load_items(pathlib.Path(folder))
    return derive(items, quoted_on_exchange(pathlib.Path(snapshots), pathlib.Path(session)))


def delisted(folder: pathlib.Path = FILINGS, snapshots: pathlib.Path = SNAPSHOTS,
             session: pathlib.Path = SESSION) -> dict[str, dict]:
    """ticker → the final delisting notice that still stands.

    Empty when the archive is not on disk, which leaves every caller exactly
    as it was before this existed rather than failing its build.
    """
    return _cached(str(folder), str(snapshots), str(session))[0]


def after_delisting(record: dict | None, date: str | None) -> bool:
    """Whether a dated fact about a company falls on or after its removal.

    On, not after: NBKE left the trading system "as of the beginning of the
    trading session on 10/02/2022", the day its notice was published.
    """
    return bool(record and date and str(date)[:10] >= record["delisted_on"])


# ------------------------------------------------------------------- main


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--json", action="store_true", help="print JSON")
    parser.add_argument("--all", action="store_true",
                        help="every delisted ticker, not only the directory's")
    parser.add_argument("--check", action="store_true",
                        help="accepted for build_all symmetry; this never writes")
    args = parser.parse_args()

    items = load_items()
    if not items:
        print(f"── Listing status: no filings harvest under {FILINGS}")
        return 0
    gone, disputed = derive(items, quoted_on_exchange())
    try:
        listed = {row["ticker"] for row in
                  json.loads(DIRECTORY.read_text(encoding="utf-8")).get("companies", [])}
    except (OSError, ValueError, KeyError, TypeError):
        listed = set()
    if not args.all and listed:
        gone = {t: r for t, r in gone.items() if t in listed}
        disputed = {t: r for t, r in disputed.items() if t in listed}

    if args.json:
        print(json.dumps({"delisted": gone, "contradicted": disputed},
                         ensure_ascii=False, indent=1))
        return 0
    scope = "tickers" if args.all or not listed else "directory tickers"
    print(f"── Listing status: {len(gone)} {scope} delisted by a final notice")
    for record in sorted(gone.values(), key=lambda r: (r["delisted_on"], r["ticker"])):
        print(f"   {record['ticker']:<6} {record['delisted_on']}  NewsID {record['news_id']:<7}"
              f" {record['kind'] or '':<9} {record['title'][:70]}")
    for record in sorted(disputed.values(), key=lambda r: r["ticker"]):
        print(f"   {record['ticker']:<6} NOT delisted: final notice {record['news_id']} of "
              f"{record['delisted_on']}, but {record['contradicted_by']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
