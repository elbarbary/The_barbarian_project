#!/usr/bin/env python3
"""Read the name off a post-execution disclosure, because nothing else carries it.

The daily EGX summary names the RELATIONSHIP and never the person: every row
says "insider" or "related parties of insider", and `ownership-ledger.json`
records that in its own limitations —

    "Daily EGX summaries identify the party relationship but not the party name."
    "MCDR's complete shareholder register is not a public dataset available to
     this collector."

So a reader could see that an insider at Misr Beni Suef sold 9,400 shares and
never learn who, at what price, or what it did to their stake. The individual
post-execution form (نموذج إفصاح بعد التنفيذ) carries all four. It is a scan —
`pdftotext` returns one byte — so it is read the way this repository already
reads scanned financial statements: through the model, with the answer checked
against what the exchange separately published.

What comes back is a named natural person trading a named listed company, which
is a fact the exchange publishes and not a judgement about either. Nothing here
scores, ranks or advises (§8): it records who traded, how much, at what price,
and the stake before and after.

    python3 scripts/build_named_insiders.py --limit 5
    python3 scripts/build_named_insiders.py --refresh 292249
"""

from __future__ import annotations

import argparse
import base64
import json
import pathlib
import re
import subprocess
import sys
import tempfile
import unicodedata

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))

import gemini  # noqa: E402

REPO = pathlib.Path(__file__).resolve().parent.parent
LEDGER = REPO / "data-source" / "official" / "ownership" / "ownership-ledger.json"
STORE = REPO / "data-source" / "official" / "ownership" / "named-insiders.json"
PDF_DIR = REPO / "data-source" / "official" / "ownership" / "pdfs"

# Scrapling, because this host refuses an ordinary client. `curl` and the
# browser fetcher both come back with a 5 KB viewer wrapper; the plain
# `Fetcher` with stealthy headers returns the 700 KB document.
SCRAPLING_PY = pathlib.Path(
    "/Users/barbary/Library/Application Support/pipx/venvs/scrapling/bin/python"
)

PROMPT = """This is an Egyptian Exchange post-execution disclosure form
(نموذج إفصاح بعد التنفيذ), scanned. Read it and return JSON only:

{
  "investorName": "<the NAMED person or entity that traded, exactly as printed, or null>",
  "investorNameEn": "<ALWAYS give a Latin transliteration when the name is Arabic; null only if the name is already Latin>",
  "relationship": "<their stated relationship to the company, or null>",
  "company": "<the listed company as printed, or null>",
  "action": "buy | sell | null",
  "shares": <integer or null>,
  "price": <number or null>,
  "ownershipBeforePercent": <number or null>,
  "ownershipAfterPercent": <number or null>,
  "legible": true/false
}

Report ONLY what is printed on the page. If a field is not there, use null.
Do not infer, do not calculate, do not carry a number over from another row.
If the scan is too poor to read with confidence, set "legible": false."""


def fetch_pdf(url: str, into: pathlib.Path) -> bool:
    """The document itself, not the viewer around it."""
    if not SCRAPLING_PY.exists():
        return False
    code = (
        "from scrapling.fetchers import Fetcher\n"
        "import sys\n"
        "r = Fetcher.get(sys.argv[1], stealthy_headers=True, follow_redirects=True, timeout=90)\n"
        "b = r.body if isinstance(r.body, (bytes, bytearray)) else str(r.body).encode()\n"
        "open(sys.argv[2], 'wb').write(b)\n"
    )
    try:
        subprocess.run([str(SCRAPLING_PY), "-c", code, url, str(into)],
                       check=True, capture_output=True, timeout=180)
    except (subprocess.SubprocessError, OSError):
        return False
    # A viewer wrapper is HTML and a few kilobytes; the real thing starts %PDF.
    return into.exists() and into.read_bytes()[:4] == b"%PDF"


AGY = pathlib.Path.home() / ".local" / "bin" / "agy"


def _json_from(text: str) -> dict | None:
    raw = (text or "").strip()
    if raw.startswith("```"):
        raw = re.sub(r"^```[a-zA-Z]*\n", "", raw)
        raw = re.sub(r"\n```\s*$", "", raw)
    start, end = raw.find("{"), raw.rfind("}")
    if start < 0 or end <= start:
        return None
    try:
        return json.loads(raw[start:end + 1])
    except json.JSONDecodeError:
        return None


def read_form_agy(pdf: pathlib.Path) -> dict | None:
    """The local agent, which bills nobody here.

    Checked against Vertex on filing 292249 before being trusted with the rest:
    same name, same 9,400 shares, same 246.87, same 6.01% -> 5.99%. It returned
    no transliteration, so the prompt asks for one in as many words.
    """
    if not AGY.exists():
        return None
    try:
        proc = subprocess.run(
            [str(AGY), "--dangerously-skip-permissions",
             "--add-dir", str(pdf.parent),
             "--model", "gemini-3.8-flash-low",
             "--print-timeout", "4m",
             "-p", f"Read the scanned PDF at {pdf}. {PROMPT}"],
            capture_output=True, text=True, timeout=330, cwd=str(pdf.parent),
        )
    except (subprocess.SubprocessError, OSError):
        return None
    return _json_from(proc.stdout)


def read_form(pdf: pathlib.Path) -> dict | None:
    body = json.dumps({
        "contents": [{"role": "user", "parts": [
            {"inlineData": {"mimeType": "application/pdf",
                            "data": base64.b64encode(pdf.read_bytes()).decode()}},
            {"text": PROMPT},
        ]}],
        "generationConfig": {"temperature": 0, "maxOutputTokens": 2000,
                             **gemini.THINKING_OFF},
    }).encode()
    try:
        payload = gemini._post(gemini.MODEL, body, timeout=180)
    except Exception:
        return None
    cands = payload.get("candidates") or []
    if not cands:
        return None
    text = "".join(p.get("text", "")
                   for p in cands[0].get("content", {}).get("parts", []))
    raw = text.strip()
    if raw.startswith("```"):
        raw = re.sub(r"^```[a-zA-Z]*\n", "", raw)
        raw = re.sub(r"\n```\s*$", "", raw)
    start, end = raw.find("{"), raw.rfind("}")
    if start < 0 or end <= start:
        return None
    try:
        return json.loads(raw[start:end + 1])
    except json.JSONDecodeError:
        return None


# ── What a reading has to survive ────────────────────────────────────────────
#
# This publishes a named natural person against a share trade. A model that
# half-read a scan and produced a plausible name would attach a real person to
# a transaction they did not make, and no reader could tell. So a reading is
# kept only when it agrees with what the exchange separately published about
# the same filing.

ARABIC = re.compile(r"[؀-ۿ]")
# A ROLE is not a name: the daily summary already carries these, and one of
# them on screen would read as though "insider" were somebody who bought shares.
#
# A COMPANY is not on this list, and used not to be deliberately. `شركة` was,
# which refused Derayah Financial — a real corporate holder — while letting
# through `شركه اموال العربيه`, the same word spelled with a haa instead of a
# taa marbuta. Corporate holders are legitimate disclosed parties; what has to
# be caught is the ISSUER's own name landing in the holder's field, and that is
# `is_the_issuer` below, which compares against the company the filing is about
# rather than guessing from a prefix.
NOT_A_NAME = re.compile(
    r"^(insider|related part|major|treasury|مساهم رئيس|داخلي|أطراف مرتبطة)", re.I)

# Arabic spelling drifts across scans — taa marbuta for haa, alef forms, the
# definite article — so an issuer match is made on a folded skeleton rather than
# on the exact string.
_FOLD = str.maketrans({"أ": "ا", "إ": "ا", "آ": "ا", "ة": "ه", "ى": "ي",
                       "ؤ": "و", "ئ": "ي"})
_NOISE = re.compile(r"\b(شرك[هة]|مساهمة|مقفلة|ش\.?م\.?م|s\.?a\.?e|co|company|"
                    r"للاستثمار|القابضة|the|for|and|al|el)\b", re.I)


def skeleton(name: str) -> str:
    s = unicodedata.normalize("NFKC", name or "").casefold().translate(_FOLD)
    s = _NOISE.sub(" ", s)
    return " ".join(re.sub(r"[^\w\s]", " ", s).split())


def is_the_issuer(name: str, issuer: str) -> bool:
    """Did the issuer's own name land in the holder's field?

    KABO's form came back with "شركة النصر للملابس والمنسوجات كابو" as the
    party — that is the listed company, not whoever traded it.
    """
    a, b = skeleton(name), skeleton(issuer)
    if not a or not b:
        return False
    if a == b:
        return True
    aw, bw = set(a.split()), set(b.split())
    if not aw or not bw:
        return False
    # Most of one inside the other, in either direction: a scan drops and adds
    # words, so exact equality alone would miss the case this exists for.
    overlap = len(aw & bw) / min(len(aw), len(bw))
    return overlap >= 0.75



# The form prints a registry code beside the name, and the scan sometimes hands
# both back as one string: "الحصن للاستشارات كود موحد ٢٢١٧٣٠٢". Publishing that
# as somebody's name is wrong in a way a reader cannot detect, so the code comes
# off — narrowly. Only a trailing "كود موحد" run, and only an ALL-CAPS Latin
# token of two to six letters at the end of an ARABIC name: "Al Hosn Consulting"
# and "Hesham Ibrahim El Nahas" both end in Latin words and neither is touched.
UNIFIED_CODE = re.compile(r"\s*كود\s*مو?حد\s*[\u0660-\u0669\u06F0-\u06F90-9]+\s*$")
TRAILING_CODE = re.compile(r"\s+[A-Z]{2,6}\s*$")


def clean_name(value: str) -> str:
    name = " ".join((value or "").split())
    name = UNIFIED_CODE.sub("", name)
    if ARABIC.search(name):
        name = TRAILING_CODE.sub("", name)
    return name.strip(" ,-–—:").strip()



def issuer_name(form: dict, ticker: str) -> str:
    """The listed company this filing is about, for the issuer check.

    Taken from the filing's own title, which carries it in both scripts, rather
    than from the directory — the title is what the scan was made from, so the
    spellings match more often.
    """
    for key in ("titleArabic", "title"):
        raw = (form.get(key) or "").strip()
        if not raw:
            continue
        # "مصر بنى سويف للاسمنت (MBSC.CA) - بيان بخصوص ..." — the company is
        # everything before the ticker in brackets.
        cut = raw.split("(" + ticker, 1)[0] if ticker else raw
        cut = cut.split(" - ", 1)[0].strip()
        if len(cut) >= 4:
            return cut
    return ""


def usable_name(value) -> bool:
    if not isinstance(value, str):
        return False
    name = value.strip()
    if len(name) < 6 or len(name) > 120:
        return False
    if NOT_A_NAME.match(name):
        return False
    # A person's name here is at least two words in either script.
    return len(name.split()) >= 2


def vet(reading: dict, expected_ticker: str, summary: dict | None,
        issuer: str = "") -> tuple[dict | None, str]:
    """Returns (record, why-refused)."""
    if not isinstance(reading, dict):
        return None, "no object"
    if reading.get("legible") is not True:
        return None, "the model called the scan illegible"
    name = clean_name(reading.get("investorName") or "")
    if not usable_name(name):
        return None, f"not a usable name: {reading.get('investorName')!r}"
    if issuer and is_the_issuer(name, issuer):
        return None, f"that is the issuer, not the holder: {name!r}"

    shares = reading.get("shares")
    if not isinstance(shares, int) or shares <= 0:
        return None, f"share count is not a positive integer: {shares!r}"

    before = reading.get("ownershipBeforePercent")
    after = reading.get("ownershipAfterPercent")
    for label, pct in (("before", before), ("after", after)):
        if pct is not None and not (isinstance(pct, (int, float)) and 0 <= pct <= 100):
            return None, f"{label} stake outside 0-100: {pct!r}"

    action = reading.get("action")
    if action not in ("buy", "sell"):
        return None, f"action is neither buy nor sell: {action!r}"

    # The direction the stake moved has to match the direction of the trade.
    # This is the check that catches a transposed pair of percentages, which is
    # the most likely way a scan is misread and the least visible afterwards.
    if isinstance(before, (int, float)) and isinstance(after, (int, float)):
        if action == "buy" and after < before:
            return None, f"a purchase that lowers the stake ({before} -> {after})"
        if action == "sell" and after > before:
            return None, f"a sale that raises the stake ({before} -> {after})"

    # And it has to be about the company the exchange said it was about.
    if summary and summary.get("ticker") and expected_ticker:
        if summary["ticker"] != expected_ticker:
            return None, "ticker disagrees with the filing index"

    return {
        "investorName": name,
        "investorNameEn": (reading.get("investorNameEn") or "").strip() or None,
        "relationship": (reading.get("relationship") or "").strip() or None,
        "ticker": expected_ticker,
        "action": action,
        "shares": shares,
        "price": reading.get("price") if isinstance(reading.get("price"), (int, float)) else None,
        "ownershipBeforePercent": before,
        "ownershipAfterPercent": after,
        "nameScript": "ar" if ARABIC.search(name) else "latin",
    }, ""


# ── Driver ───────────────────────────────────────────────────────────────────


def held() -> dict:
    if STORE.exists():
        try:
            return json.loads(STORE.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            pass
    return {"schemaVersion": 1, "readings": {}, "refused": {}}


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=5,
                    help="how many unread filings to attempt this run")
    ap.add_argument("--refresh", default="", help="re-read one filing id")
    ap.add_argument("--engine", choices=("agy", "vertex"), default="agy",
                    help="agy is the local agent and costs nothing here; "
                         "vertex is the metered path the daily build uses")
    args = ap.parse_args()

    if not LEDGER.exists():
        print("no ownership ledger — run the official-sources collector first")
        return 0
    ledger = json.loads(LEDGER.read_text(encoding="utf-8"))
    forms = ledger.get("postExecutionDisclosures") or []
    store = held()
    readings, refused = store["readings"], store["refused"]

    if args.refresh:
        readings.pop(args.refresh, None)
        refused.pop(args.refresh, None)
        forms = [f for f in forms if str(f.get("filingId")) == args.refresh]

    # A refusal is remembered too. Re-reading an illegible scan every run costs
    # money and produces the same answer.
    todo = [f for f in forms
            if str(f.get("filingId")) not in readings
            and str(f.get("filingId")) not in refused
            and f.get("attachments")]
    print(f"── {len(forms)} post-execution forms, "
          f"{len(readings)} already read, {len(refused)} previously refused, "
          f"{len(todo)} to attempt")

    PDF_DIR.mkdir(parents=True, exist_ok=True)
    done = failed = 0
    for form in todo[: max(0, args.limit)]:
        fid = str(form.get("filingId"))
        ticker = form.get("ticker") or ""
        url = form["attachments"][0]
        with tempfile.TemporaryDirectory() as tmp:
            pdf = pathlib.Path(tmp) / f"{fid}.pdf"
            if not fetch_pdf(url, pdf):
                print(f"   {fid} {ticker}: the exchange would not hand over the file")
                failed += 1
                continue
            reading = (read_form_agy(pdf) if args.engine == "agy"
                       else read_form(pdf))
            # A local agent that is missing or wedged should not silently
            # publish nothing; fall back rather than report the form unreadable.
            if reading is None and args.engine == "agy":
                reading = read_form(pdf)
        if reading is None:
            print(f"   {fid} {ticker}: no answer from the model")
            failed += 1
            continue
        record, why = vet(reading, ticker, form, issuer_name(form, ticker))
        if not record:
            refused[fid] = why
            print(f"   {fid} {ticker}: refused — {why}")
            continue
        record["filingId"] = fid
        record["publishedAt"] = form.get("publishedAt")
        record["sessionDate"] = form.get("sessionDate")
        record["source"] = url
        readings[fid] = record
        done += 1
        pct = ""
        if record["ownershipBeforePercent"] is not None:
            pct = f"  {record['ownershipBeforePercent']}% → {record['ownershipAfterPercent']}%"
        print(f"   {fid} {ticker}: {record['investorNameEn'] or record['investorName']}"
              f"  {record['action']} {record['shares']:,}{pct}")

    STORE.parent.mkdir(parents=True, exist_ok=True)
    STORE.write_text(json.dumps(store, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"   {done} read, {failed} unreachable, {len(refused)} refused in total")
    print(f"   {len(readings)} named readings held in {STORE.relative_to(REPO)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
