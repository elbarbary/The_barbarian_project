#!/bin/sh
# Refresh the forward calendar: pull this month's and last month's filings from
# the exchange, then rebuild the calendar out of everything held.
#
# This is the "search filings before the event" loop. New scheduled events —
# a dividend date, a rights window, a called assembly, a trading resumption —
# arrive as ordinary disclosures days to weeks ahead of the event itself, so
# refreshing the recent months and rebuilding is all it takes to keep a
# forward view current.
#
# Two months, not one, because an event announced late in a month and dated in
# the next needs the announcing month re-read after the boundary. The harvester
# skips a month whose held count already matches the exchange's, so re-reading
# is cheap when nothing changed.
#
# Serialised and paced by harvest_egx_beta.py itself. Safe to run daily; it
# touches only data-source/egx-beta/ and public/data/v1/calendar.json.
set -e
cd "$(dirname "$0")/.."

MONTH=$(date +%Y-%m)
PREV=$(date -v-1m +%Y-%m 2>/dev/null || date -d "-1 month" +%Y-%m)

echo "[$(date '+%Y-%m-%d %H:%M')] refreshing filings $PREV and $MONTH"
python3 scripts/harvest_egx_beta.py --filings --from "$PREV" --to "$MONTH" --force
python3 scripts/build_calendar.py
echo "[$(date '+%Y-%m-%d %H:%M')] calendar rebuilt"
