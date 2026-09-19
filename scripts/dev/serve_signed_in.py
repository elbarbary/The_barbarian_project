#!/usr/bin/env python3
"""Local ESTHMR with a test login, so the real page can be LOOKED AT.

WHY THIS EXISTS
Five rounds of design work shipped into a page where three of Home's blocks
did not render — the model lab, the evidence cards, the sector/ownership row —
while 967 tests passed and every deployed file carried the right bytes. None
of that verification touched a running page.

It could not: signed out there is no dataset, and the tests build components
from fixtures and read `renderVals()`. The dom stub has no
`createDocumentFragment`, so `mount()` has never executed in a test and the
template has never been rendered through dc.js outside a browser.

This closes that gap. It serves public/ with a test reader signed in and the
data ungated, so a change can be seen rendering before it ships:

    python3 scripts/dev/serve_signed_in.py      # then open :8899/esthmr/

It is a development tool. It is never deployed, the worker is untouched, and
nothing it fakes reaches a reader.

Serves public/ as-is, answers /esthmr/api/auth/me with a signed-in reader, and
leaves /data/v1/* ungated. Nothing here is deployed or committed — it exists so
a change can be seen rendering before it ships.
"""
import http.server, socketserver, os, json, posixpath

ROOT = '/Users/barbary/esthmr-wt/public'
PORT = 8899

class H(http.server.SimpleHTTPRequestHandler):
    def translate_path(self, path):
        path = path.split('?', 1)[0].split('#', 1)[0]
        if path in ('/', '/esthmr', '/esthmr/'):
            return os.path.join(ROOT, 'esthmr', 'index.html')
        # The app sends the reader to /esthmr/fragility with no extension; the
        # worker maps that to the notebook page. Without this the page 404'd
        # here and a sweep that clicked it lost the tab.
        for route in ('fragility', 'fragility-research', 'template'):
            if path.rstrip('/') == '/esthmr/' + route:
                return os.path.join(ROOT, 'esthmr', route + '.html')
        return os.path.join(ROOT, posixpath.normpath(path).lstrip('/'))

    def _json(self, obj, code=200):
        body = json.dumps(obj).encode()
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        p = self.path.split('?', 1)[0]
        # A hidden browser tab never fires requestAnimationFrame, and dc.js
        # coalesces redraws behind one rAF — so an automated look at the page
        # (the desktop app's browser pane is a hidden tab) hung on a blank
        # shell whenever the first redraw was queued before a patch landed.
        # The shim is served with the page, before any module runs. Dev only.
        if p in ('/', '/esthmr', '/esthmr/'):
            html = open(os.path.join(ROOT, 'esthmr', 'index.html'), 'rb').read()
            shim = (b'<script>if (document.hidden) { window.requestAnimationFrame = '
                    b'(cb) => setTimeout(() => cb(performance.now()), 16); }</script>')
            html = html.replace(b'</head>', shim + b'</head>', 1)
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.send_header('Content-Length', str(len(html)))
            self.end_headers()
            return self.wfile.write(html)
        if p == '/esthmr/api/auth/me':
            return self._json({'email': 'test@local', 'admin': False})
        if p.startswith('/esthmr/api/watchlist'):
            return self._json({'tickers': ['COMI', 'SWDY', 'ORAS', 'ETEL']})
        if p.startswith('/esthmr/api/'):
            return self._json({})
        return super().do_GET()

    def do_POST(self):
        return self._json({'ok': True})

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def log_message(self, *a):
        pass

socketserver.TCPServer.allow_reuse_address = True
with socketserver.TCPServer(('127.0.0.1', PORT), H) as s:
    print(f'serving {ROOT} on {PORT} with a test login', flush=True)
    s.serve_forever()
