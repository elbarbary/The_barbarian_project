# Price-session policy (16 September 2026)

## No-trade history

A company has no history bar for a session with explicit volume zero. Windows
in `measures.py` use that company's held trade sessions, not an exchange-wide
calendar. Missing volume is unknown: its price can be retained, but it cannot
supply a volume denominator. Price changes of zero remain valid measurements. A thin company can therefore
show an older retained session: TOUR’s remaining volume history ends in 2017,
MEGM has one traded bar from 2022, and DCCC’s retained prices have unknown
volume. These are dated historical measurements, not evidence of trading today.

The saved TradingView scans show zero-volume current-day chart placeholders
that are absent from subsequent morning histories (for example MEGM's
6 September capture). `egx_history.barsOf` copies the socket values without
creating dates or volumes. The old `completedBars` filter removed only the
capture's Cairo date: a placeholder seen after midnight therefore qualified
as completed, and `persist_history` kept it permanently. Git confirms a
9 September zero bar in `26014abd3`, and no 13 September bar in `55e9ca6b9`.
The provider's internal reason for changing its responses is not known.
The fix does not depend on it: both response shapes normalize identically.

`completedTradeBars`, `history_union`, `persist_history` and the measurements
reader all exclude explicit zero-volume bars. `with_closing_bar` does not add
a zero-volume close in the evening. Market breadth reads the current quote
capture separately, so idle companies are still counted without pretending
that their last traded volume happened today.

The migration command is:

    python3 scripts/build_market_api.py --normalize-history

It reads the existing archive only and uses the normal writer, removing 817
explicit zero-volume bars from 54 histories in the audited checkout. Positive
and unknown-volume bars are preserved exactly. There is no backfill: missing
dates cannot establish historical listing status or prove that no trade took
place. Old sealed lab forecasts and commitments remain unchanged. Rebuilt
measurements can change because their windows now have a consistent meaning.

A repeated positive close AND volume alone is not proof that a trade did not
occur. WATP's cited 10 and 13 September quotes did not enter the archived
series; those dates remain absent. We do not heuristically delete matching
positive history bars, which could erase genuine equal trades.

## Holiday and replay captures

Both full and quotes-only market builds call `capture_session`. The Cairo
clock gives a candidate; the archive can prove a broad previous-session replay.
At least 20 positive-volume quotes must all match their latest archived close
and volume, with at least 90% dated to the same earlier session. Any changed
quote or missing comparison prevents that inference. Thin names alone cannot
move the market date, and a bar already dated to the candidate prevents a
replay for that name.

A confirmed replay publishes the previous real date, `is_close: true`, the
actual `captured_at`, and `session_source: previous-session-replay`. This covers
both holidays and captures before a new session has printed changed quotes.
Historical captures `a18d65096`, `75d3f7fcc`, and `f8886c049` all resolve to
26 August instead of the 27 August holiday.

Otherwise the existing clock behavior remains, explicitly marked
`session_source: clock`. This is a conservative replay detector, not an
authoritative holiday calendar: incomplete evidence cannot establish a holiday.
No extra EGX request or relay availability is required in either build path.
