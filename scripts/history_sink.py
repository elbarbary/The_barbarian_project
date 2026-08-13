#!/usr/bin/env python3
"""A tiny local endpoint that receives price history fetched by a real browser.

Why this exists: Yahoo (like TradingView) returns 429 to direct server-side
requests from this machine, but the same request succeeds from a real browser
session on finance.yahoo.com. So the browser does the fetching and POSTs the
result here, and `build_market_api.py` merges it in.

The exchange scan already covers most of the market; this fills the tail it
could not fetch. Nothing is generated — a ticker the browser could not resolve
is simply left without a series.

    python3 scripts/history_sink.py          # listens on 127.0.0.1:8477

Then, from a finance.yahoo.com tab:

    fetch('http://127.0.0.1:8477/save', {method:'POST', body: JSON.stringify(data)})
"""

from __future__ import annotations

import json
import pathlib
from http.server import BaseHTTPRequestHandler, HTTPServer

OUT = pathlib.Path(__file__).resolve().parent.parent / "data-source" / "prices"
PORT = 8477


class Sink(BaseHTTPRequestHandler):
    def _cors(self) -> None:
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")

    def do_OPTIONS(self) -> None:  # noqa: N802
        self.send_response(204)
        self._cors()
        self.end_headers()

    def do_POST(self) -> None:  # noqa: N802
        length = int(self.headers.get("Content-Length", 0))
        raw = self.rfile.read(length)
        try:
            payload = json.loads(raw)
        except json.JSONDecodeError as e:
            self.send_response(400)
            self._cors()
            self.end_headers()
            self.wfile.write(f"bad json: {e}".encode())
            return

        series = payload.get("data", payload)
        OUT.mkdir(parents=True, exist_ok=True)
        written = 0
        for ticker, rows in series.items():
            bars = [
                {"date": d, "close": float(c)}
                for d, c in rows
                if d and c is not None
            ]
            if len(bars) < 2:
                continue
            (OUT / f"{ticker}.json").write_text(
                json.dumps({"ticker": ticker, "source": "yahoo", "bars": bars},
                           separators=(",", ":")) + "\n",
                encoding="utf-8",
            )
            written += 1

        print(f"saved {written} series to {OUT}")
        self.send_response(200)
        self._cors()
        self.end_headers()
        self.wfile.write(f"saved {written}".encode())

    def log_message(self, *args) -> None:
        pass


if __name__ == "__main__":
    print(f"listening on http://127.0.0.1:{PORT}/save  ->  {OUT}")
    HTTPServer(("127.0.0.1", PORT), Sink).serve_forever()
