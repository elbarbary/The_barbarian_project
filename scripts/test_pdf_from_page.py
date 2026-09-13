#!/usr/bin/env python3
"""A page offered instead of a PDF is an answer, not a refusal.

Run: python3 -m unittest discover -s scripts -p 'test_*.py'
"""

from __future__ import annotations

import pathlib
import tempfile
import unittest

import pdf_from_page as rule


def pdf(size: int = rule.MIN_BYTES) -> bytes:
    return b"%PDF-1.7" + b"0" * max(0, size - 8)


PAGE = """
<html><body>
  <a href="#top">top</a>
  <a href="/downloads/Bulletins/335341_1.pdf">Financial statements</a>
  <a href="/downloads/Bulletins/335341_2.pdf">Auditor's report</a>
  <a href="https://elsewhere.example/steal.pdf">elsewhere</a>
  <a href="/news/other">another page</a>
</body></html>
"""


class WhatThePageNames(unittest.TestCase):
    def test_the_links_are_absolute_and_in_order(self):
        found = rule.pdf_links(PAGE, "https://www.egx.com.eg/ar/News.aspx?id=9")
        self.assertEqual(found, [
            "https://www.egx.com.eg/downloads/Bulletins/335341_1.pdf",
            "https://www.egx.com.eg/downloads/Bulletins/335341_2.pdf",
        ])

    def test_a_link_to_another_host_is_not_followed(self):
        # The page is fetched from the internet, so its links are the one part
        # of it that chooses where this pipeline points next.
        found = rule.pdf_links(PAGE, "https://www.egx.com.eg/ar/News.aspx?id=9")
        self.assertTrue(all("egx.com.eg" in u for u in found), found)

    def test_only_a_handful_are_taken(self):
        many = "".join(f'<a href="/d/{n}.pdf">x</a>' for n in range(40))
        found = rule.pdf_links(many, "https://host.example/page")
        self.assertEqual(len(found), rule.MAX_LINKS)

    def test_anchors_and_scripts_are_not_documents(self):
        page = '<a href="#x">a</a><a href="javascript:void(0)">b</a><a href="mailto:x@y">c</a>'
        self.assertEqual(rule.pdf_links(page, "https://host.example/p"), [])

    def test_a_page_naming_nothing_names_nothing(self):
        self.assertEqual(rule.pdf_links("<html><body>no links</body></html>",
                                        "https://host.example/p"), [])


class WhatCountsAsAPdf(unittest.TestCase):
    def test_an_error_page_wearing_the_header_is_not_a_pdf(self):
        # The exchange has served a short body with a PDF header before.
        self.assertFalse(rule.is_pdf(b"%PDF-1.7 not really"))
        self.assertTrue(rule.is_pdf(pdf()))

    def test_html_is_not_a_pdf(self):
        self.assertFalse(rule.is_pdf(b"<html><body>...</body></html>"))


class Following(unittest.TestCase):
    def saved(self, responses, url="https://www.egx.com.eg/downloads/Bulletins/335341_1.pdf"):
        asked = []

        def get(target):
            asked.append(target)
            if target not in responses:
                raise LookupError(target)
            return responses[target]

        with tempfile.TemporaryDirectory() as folder:
            out = pathlib.Path(folder) / "f.pdf"
            served = rule.fetch(url, out, get=get)
            return served, out.read_bytes(), asked

    def test_a_url_that_serves_a_pdf_is_not_parsed_at_all(self):
        url = "https://host.example/a.pdf"
        served, blob, asked = self.saved({url: pdf()}, url=url)
        self.assertEqual(served, url)
        self.assertEqual(asked, [url], "it went looking for links it did not need")
        self.assertTrue(rule.is_pdf(blob))

    def test_a_page_is_followed_to_the_pdf_it_names(self):
        url = "https://www.egx.com.eg/ar/News.aspx?id=9"
        body = pdf()
        served, blob, _ = self.saved({
            url: PAGE.encode(),
            "https://www.egx.com.eg/downloads/Bulletins/335341_1.pdf": body,
        }, url=url)
        self.assertEqual(served,
                         "https://www.egx.com.eg/downloads/Bulletins/335341_1.pdf")
        self.assertEqual(blob, body)

    def test_the_second_link_is_tried_when_the_first_is_not_a_pdf(self):
        url = "https://www.egx.com.eg/ar/News.aspx?id=9"
        body = pdf()
        served, blob, asked = self.saved({
            url: PAGE.encode(),
            "https://www.egx.com.eg/downloads/Bulletins/335341_1.pdf": b"<html>nope</html>",
            "https://www.egx.com.eg/downloads/Bulletins/335341_2.pdf": body,
        }, url=url)
        self.assertEqual(served,
                         "https://www.egx.com.eg/downloads/Bulletins/335341_2.pdf")
        self.assertEqual(blob, body)
        self.assertEqual(len(asked), 3)

    def test_a_page_naming_no_reachable_pdf_is_a_refusal_not_an_empty_file(self):
        url = "https://host.example/page"
        with self.assertRaises(LookupError):
            self.saved({url: b"<html>nothing here</html>"}, url=url)

    def test_it_does_not_follow_a_page_to_another_page(self):
        # One hop. A page linking a page is a site map, and this rule is about
        # a filing naming its own attachments.
        url = "https://host.example/page"
        with self.assertRaises(LookupError):
            self.saved({
                url: b'<a href="/next.pdf">next</a>',
                "https://host.example/next.pdf": b'<a href="/real.pdf">real</a>',
                "https://host.example/real.pdf": pdf(),
            }, url=url)


if __name__ == "__main__":
    unittest.main()
