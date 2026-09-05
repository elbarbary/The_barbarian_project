#!/bin/bash
# The clock, once every fifteen minutes, from this Mac.
#
# WHY THIS EXISTS
# ---------------
# A STANDBY. NOT INSTALLED — no plist is loaded for it. Install it only if the
# Cloudflare clock stops again; see the block at the bottom of this comment.
#
# GitHub delivers this repository's cron events 3.4-7.8 hours late — a platform
# regression, not a misconfiguration. `worker/clock` moved the clock to
# Cloudflare, and for about a day Cloudflare did not invoke it at all. Deleting
# the trigger in the dashboard and re-adding it fixed that, though it took
# about eighteen minutes to take effect rather than the next quarter hour; it
# has been punctual to the second ever since. The Worker is the clock.
#
# This is the spare, because a scheduler that quietly did nothing for a day
# while reporting itself scheduled is one worth being able to replace in a
# minute. Do not run both: two schedulers dispatch the same slot twice.
#
# The GitHub crons are deliberately still declared underneath both. They are
# late, but they are a floor. See scripts/clock_tick.mjs for what one tick does.
#
# WHERE IT RUNS, AND WHY NOT IN YOUR CHECKOUT
# -------------------------------------------
# macOS refuses a launchd agent access to ~/Documents outright: the agent fails
# with "Operation not permitted" and exit 126 before the script starts, so
# nothing reaches the job log to debug from. Both this script and the JavaScript
# it runs must live outside Documents, which is why they are installed to
# ~/Library/Application Support/esthmr/ rather than run from the repository.
# harvest_local.sh learned this the same way.
#
# Unlike the harvest this needs no clone at all — it dispatches workflows and
# reads their status through `gh`, and touches no file in the repository.
#
# To reinstall after editing the canonical copies:
#   install -m 755 scripts/clock_local.sh \
#     ~/Library/Application\ Support/esthmr/clock_local.sh
#   install -m 644 scripts/clock_tick.mjs \
#     ~/Library/Application\ Support/esthmr/clock_tick.mjs
#   install -m 644 worker/clock/src/index.js \
#     ~/Library/Application\ Support/esthmr/clock.js
#
# BOTH of the last two, every time. clock_tick.mjs imports the schedule from
# clock.js rather than restating it, so shipping one without the other is how
# the Mac and the Worker start disagreeing about a trading day.
set -u

HERE="$HOME/Library/Application Support/esthmr"
LOG="$HOME/Library/Logs/esthmr-clock.log"
LOCK="$HOME/.esthmr-clock.lock"

mkdir -p "$(dirname "$LOG")"
say() { printf '%s  %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*" >> "$LOG"; }

# launchd gives an agent almost no PATH. Homebrew on Apple silicon, then Intel,
# then whatever the system has — `gh` and `node` are both needed and neither
# lives in the default one.
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"

for tool in gh node; do
  command -v "$tool" >/dev/null 2>&1 || { say "no $tool on PATH — nothing dispatched"; exit 0; }
done

# One at a time. mkdir is atomic; a lock older than fifteen minutes belonged to
# a run that has died rather than one still working, because a tick that cannot
# finish inside its own interval is a tick that has failed.
if ! mkdir "$LOCK" 2>/dev/null; then
  if [ -n "$(find "$LOCK" -maxdepth 0 -mmin +15 2>/dev/null)" ]; then
    say "clearing a stale lock"; rmdir "$LOCK" 2>/dev/null; mkdir "$LOCK" 2>/dev/null || exit 0
  else
    say "another tick holds the lock — skipping"; exit 0
  fi
fi
trap 'rmdir "$LOCK" 2>/dev/null' EXIT

# A tick is a handful of API calls. Anything past two minutes is a hang, and a
# hung tick that outlives its interval would collide with the next one.
if command -v timeout >/dev/null 2>&1; then
  timeout 120 node "$HERE/clock_tick.mjs" >> "$LOG" 2>&1
else
  node "$HERE/clock_tick.mjs" >> "$LOG" 2>&1
fi
status=$?
[ "$status" -eq 0 ] || say "tick exited $status"

# Keep the log to something a person can read. 2,000 lines is about a week.
if [ "$(wc -l < "$LOG" 2>/dev/null || echo 0)" -gt 4000 ]; then
  tail -n 2000 "$LOG" > "$LOG.trim" && mv "$LOG.trim" "$LOG"
fi
