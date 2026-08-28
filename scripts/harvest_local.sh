#!/bin/bash
# Harvest the EGX filing archive from this machine and push it, so a scheduled
# build never depends on the exchange answering a datacenter address.
#
# WHY THIS EXISTS
# ---------------
# The exchange's own JSON API is the only route to the filing archive, and it
# answers a laptop in Cairo more reliably than a GitHub runner. CI still
# attempts its own harvest — this is the belt to those braces. Whichever gets
# there first, the archive is committed carrying the date it was written, and
# `build_staleness_guard.py` passes on that.
#
# WHERE IT RUNS, AND WHY NOT IN YOUR CHECKOUT
# -------------------------------------------
# In its own blobless sparse clone at ~/.esthmr-harvest, which holds only the
# two paths the harvester touches (~90 MB against the 3.4 GB of a full one).
# Two reasons, and the second is the hard one:
#
#   * A scheduled job that resets somebody's working tree while they are
#     mid-edit is a job that eventually eats work.
#   * macOS refuses a launchd agent access to ~/Documents outright — the agent
#     fails with "Operation not permitted" before the script runs. Nothing this
#     job touches may live under Documents, including the script itself, which
#     is why it is installed to ~/Library/Application Support/esthmr/.
#
# To reinstall after editing this file:
#   install -m 755 scripts/harvest_local.sh \
#     ~/Library/Application\ Support/esthmr/harvest_local.sh
#
# The cycle is deliberately sync-then-harvest: the harvester rewrites the whole
# month file from the API, so writing it on top of current upstream makes the
# result authoritative and leaves no conflict to resolve on a gzipped file
# nothing can merge. A failed push is self-healing — the next run resets to
# origin and harvests again.
set -u

TREE="$HOME/.esthmr-harvest"
REMOTE="https://github.com/elbarbary/The_barbarian_project.git"
LOG="$HOME/Library/Logs/esthmr-harvest.log"
LOCK="$HOME/.esthmr-harvest.lock"

mkdir -p "$(dirname "$LOG")"
say() { printf '%s  %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*" >> "$LOG"; }

# One at a time. mkdir is atomic; a lock older than an hour belonged to a run
# that has died rather than one still working.
if ! mkdir "$LOCK" 2>/dev/null; then
  if [ -n "$(find "$LOCK" -maxdepth 0 -mmin +60 2>/dev/null)" ]; then
    say "clearing a stale lock"; rmdir "$LOCK" 2>/dev/null; mkdir "$LOCK" 2>/dev/null || exit 0
  else
    say "another harvest holds the lock — skipping"; exit 0
  fi
fi
trap 'rmdir "$LOCK" 2>/dev/null' EXIT

if [ ! -d "$TREE/.git" ]; then
  say "creating the harvest clone at $TREE"
  git clone --filter=blob:none --sparse --quiet "$REMOTE" "$TREE" >> "$LOG" 2>&1 \
    || { say "!! clone failed"; exit 1; }
  git -C "$TREE" sparse-checkout set scripts data-source/egx-beta/filings >> "$LOG" 2>&1
fi

cd "$TREE" || { say "!! cannot enter $TREE"; exit 1; }
git fetch --quiet origin main || { say "!! fetch failed"; exit 1; }
git reset --hard --quiet origin/main || { say "!! reset failed"; exit 1; }

MONTH="$(date +%Y-%m)"
say "harvesting $MONTH"
python3 scripts/harvest_egx_beta.py --filings --from "$MONTH" --to "$MONTH" >> "$LOG" 2>&1 \
  || say "!! the $MONTH harvest exited non-zero"

# Early in a month, refresh the one that just closed: filings are lodged late.
if [ "$(date +%d)" -le 03 ]; then
  PREV="$(date -v-1m +%Y-%m)"
  say "also refreshing $PREV"
  python3 scripts/harvest_egx_beta.py --filings --from "$PREV" --to "$PREV" >> "$LOG" 2>&1 \
    || say "!! the $PREV harvest exited non-zero"
fi

if [ -z "$(git status --porcelain -- data-source/egx-beta/filings)" ]; then
  say "archive unchanged — nothing to push"
  exit 0
fi

git add -- data-source/egx-beta/filings
git -c user.name="ESTHMR harvest" -c user.email="barbary@yozo.ai" \
  commit --quiet -m "data: EGX filing archive, harvested locally

The exchange answers this address; it intermittently refuses a CI runner's.
Written by scripts/harvest_local.sh so the staleness guard sees an archive
harvested today and the scheduled build has current filings to read." \
  >> "$LOG" 2>&1 || { say "!! commit failed"; exit 1; }

if git push --quiet origin HEAD:main >> "$LOG" 2>&1; then
  say "pushed $(git rev-parse --short HEAD)"
else
  say "push rejected — the next run resets to origin and re-harvests"
fi
