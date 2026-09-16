#!/usr/bin/env python3
"""The exit code a build step uses to say it had work and did none of it.

A best-effort step in `build_all.py` that fails leaves its published document
alone and the build carries on, which is right for a source that blips. It was
wrong for the steps that never did anything at all. From 3 to 16 Sep 2026, in
115 of 116 app-data builds, the Arabic names asked twelve tickers Mubasher has
no page for and learned nothing, and from 10 Sep the named insiders fetched
nothing from a queue of nearly five hundred forms. Both exited 0, so build_all
could not tell "nothing new" from "answered nothing", and every one of those
runs was green.

So a step says which it was:

    0            it did its work, or there was none to do
    NO_PROGRESS  there was work and it finished none of it: nothing fetched,
                 nothing read, the host answered nothing
    other        it failed

build_all counts NO_PROGRESS from a best-effort step as a skip, and a run of
consecutive skips is what turns the build red (`STUCK_AFTER` there).

75 is sysexits' EX_TEMPFAIL, "try again later", which is what these steps do.
Nothing here exits 75 by accident: an uncaught exception is 1, argparse is 2,
and `build_pdf_statements.py` already uses 3 for a lock it could not take.
"""

NO_PROGRESS = 75
