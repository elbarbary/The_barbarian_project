#!/usr/bin/env python3
"""A company the exchange delisted produces no expected results and no volume event.

Found 13 September 2026: Nile Cotton Ginning — delisted by the Listing
Committee on 9 June 2021, NewsID 211501 — was on the calendar with a nine-month
results window, on the unusual-volume screen at 8.4 times its usual 95 shares,
and on the silent-filer list at 1,917 days.

Two halves. The first feeds each builder a delisted ticker directly, including
through the default path every real caller takes. The second runs the builders
over the committed archive and stores for EVERY ticker the archive currently
says is delisted — not over the published documents, which are the previous
run's output: a notice harvested between two builds would make a test of those
fail before the rebuild that fixes them could run.
"""
import datetime
import json
import unittest

import build_calendar as cal
import build_signals as sig
import build_volume_events as vol
import listing_status

NCGC = {
    "ticker": "NCGC", "isin": "EGS32131C012", "delisted_on": "2021-06-14",
    "news_id": 211501, "kind": "voluntary",
    "link": "https://www.egx.com.eg/en/NewsDetails.aspx?NewsID=211501",
    "title": "Approving the Final Voluntary Deli-sting for Nile Cotton Ginning Co. (NCGC.CA)",
    "title_ar": "الشطب النهائى لشركة النيل لحليج الاقطان (NCGC.CA)",
}
DUE = {"label": "9M", "period_end": "2026-09-30", "expected": "2026-11-14",
       "window_start": "2026-11-12", "window_end": "2026-11-17", "observations": 7}
TODAY = datetime.date(2026, 9, 13)


class Patched(unittest.TestCase):
    def patch(self, owner, name, value):
        real = getattr(owner, name)
        setattr(owner, name, value)
        self.addCleanup(setattr, owner, name, real)


def bars(start: str, count: int, *, spikes: dict[int, int]) -> list[dict]:
    first = datetime.date.fromisoformat(start)
    return [{"date": (first + datetime.timedelta(days=i)).isoformat(), "close": 50.0,
             "volume": spikes.get(i, 95)} for i in range(count)]


class Calendar(Patched):
    def setUp(self):
        self.patch(cal.build_signals, "published_results_due",
                   lambda: {"NCGC": [DUE], "ELEC": [dict(DUE, expected="2026-11-16")]})
        self.known = {"NCGC": "Nile Cotton Ginning", "ELEC": "Electro Cable"}

    def test_a_delisted_company_gets_no_results_window(self):
        rows = cal.expected_rows(TODAY, self.known, delisted={"NCGC": NCGC})
        self.assertEqual([r["ticker"] for r in rows], ["ELEC"])

    def test_the_default_asks_the_exchange_notices(self):
        self.patch(cal.listing_status, "delisted", lambda: {"NCGC": NCGC})
        rows = cal.expected_rows(TODAY, self.known)
        self.assertNotIn("NCGC", [r["ticker"] for r in rows])
        self.assertIn("ELEC", [r["ticker"] for r in rows])

    def test_the_fallback_computation_is_filtered_too(self):
        # With nothing published, the calendar computes the windows itself.
        self.patch(cal.build_signals, "published_results_due", lambda: {})
        self.patch(cal.build_signals, "expected_results", lambda today: {"NCGC": [DUE]})
        self.assertEqual(cal.expected_rows(TODAY, self.known, delisted={"NCGC": NCGC}), [])


class VolumeEvents(Patched):
    def test_no_event_on_or_after_the_delisting(self):
        # Thirty sessions of 95 shares either side of the notice, an 800-share
        # transfer long after it, and a genuine spike while it was listed.
        before = bars("2021-05-01", 40, spikes={35: 900})
        after = bars("2026-08-01", 40, spikes={39: 800})
        doc = vol.build({"NCGC": before + after}, sessions=50, delisted={"NCGC": NCGC},
                        companies={"NCGC"})
        dates = [s["date"] for s in doc["sessions"]]
        self.assertTrue(dates, "the listed-era spike should still be published")
        self.assertTrue(all(d < NCGC["delisted_on"] for d in dates), dates)

    def test_the_same_bars_without_the_notice_would_have_published_it(self):
        # Proves the test above is about the notice and not about the data.
        after = bars("2026-08-01", 40, spikes={39: 800})
        doc = vol.build({"NCGC": after}, delisted={}, companies={"NCGC"})
        self.assertEqual(doc["sessions"][0]["companies"][0]["times"], 8.4)

    def test_the_default_asks_the_exchange_notices(self):
        self.patch(vol.listing_status, "delisted", lambda: {"NCGC": NCGC})
        doc = vol.build({"NCGC": bars("2026-08-01", 40, spikes={39: 800})},
                        companies={"NCGC"})
        self.assertEqual(doc["sessions"], [])


class Signals(Patched):
    def setUp(self):
        weekly = [{"code": i, "heading": "", "headingArabic": "",
                   "dateStamp": (datetime.date(2019, 1, 1)
                                 + datetime.timedelta(days=7 * i)).isoformat()}
                  for i in range(40)]
        # A delisted share keeps its directory row: it still trades over the
        # counter, and the row carries a note saying so.
        self.patch(sig, "directory", lambda: {
            "NCGC": {"ticker": "NCGC", "name_en": "Nile Cotton Ginning"},
            "QUIE": {"ticker": "QUIE", "name_en": "Quiet But Listed"}})
        self.patch(sig, "load_filings", lambda: {"NCGC": weekly, "QUIE": weekly})
        self.patch(sig, "expected_results", lambda today: {"NCGC": [DUE], "QUIE": [DUE]})
        self.patch(sig, "last_prices", lambda: {"NCGC": "2026-09-10", "QUIE": "2026-09-10"})
        self.patch(sig, "streak_breaks", lambda ticker, today: [])
        self.patch(sig, "profile", lambda ticker, filings: {})

    def test_delisted_is_neither_quiet_nor_due_and_says_why(self):
        per_company, index = sig.build(TODAY, delisted={"NCGC": NCGC})
        self.assertEqual([q["ticker"] for q in index["quiet"]], ["QUIE"])
        self.assertEqual(per_company["NCGC"]["results_due"], [])
        self.assertIsNone(per_company["NCGC"]["quiet"])
        self.assertEqual(per_company["NCGC"]["delisted"]["news_id"], 211501)
        self.assertEqual([d["ticker"] for d in index["delisted"]], ["NCGC"])
        # The listed company is untouched.
        self.assertEqual(per_company["QUIE"]["results_due"], [DUE])
        self.assertNotIn("delisted", per_company["QUIE"])

    def test_the_default_asks_the_exchange_notices(self):
        self.patch(sig.listing_status, "delisted", lambda: {"NCGC": NCGC})
        per_company, index = sig.build(TODAY)
        self.assertNotIn("NCGC", [q["ticker"] for q in index["quiet"]])
        self.assertEqual(per_company["NCGC"]["results_due"], [])


@unittest.skipUnless(any(listing_status.FILINGS.glob("*.json.gz")), "no filings archive")
class OverTheCommittedRecord(unittest.TestCase):
    """Every ticker the archive says is delisted, through the real builders."""

    @classmethod
    def setUpClass(cls):
        cls.gone = listing_status.delisted()

    def test_the_calendar_estimates_nothing_for_any_of_them(self):
        known = cal.company_names()
        known.update({ticker: ticker for ticker in self.gone})
        rows = cal.expected_rows(datetime.date.today(), known)
        leaked = sorted({r["ticker"] for r in rows} & set(self.gone))
        self.assertEqual(leaked, [], f"results_expected rows for delisted tickers: {leaked}")

    def test_no_volume_event_for_any_of_them_after_the_notice(self):
        found = {t: b for t, b in vol.daily_bars(vol.BARS).items() if t in self.gone}
        late = {t for t, rows in found.items()
                if any(listing_status.after_delisting(self.gone[t], r.get("date"))
                       for r in rows)}
        if not late:
            self.skipTest("no delisted ticker has a bar after its notice to test against")
        # Every one of them, in the directory or not: this is about the notice.
        doc = vol.build(found, sessions=10_000, companies=set(found))
        leaked = sorted(
            f"{c['ticker']} {s['date']}" for s in doc["sessions"] for c in s["companies"]
            if listing_status.after_delisting(self.gone.get(c["ticker"]), s["date"]))
        self.assertEqual(leaked, [], f"volume events after a delisting: {leaked}")


if __name__ == "__main__":
    unittest.main()
