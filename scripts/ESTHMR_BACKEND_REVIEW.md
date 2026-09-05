# Esthmr reliability pass — local, not deployed

The production web API is `site-worker/index.js`. The separate `worker/api`
scaffold is not the API this website calls. Keep one canonical API while
improving it; do not migrate the site by editing the unused scaffold.

## Implemented

- Mount the UI before account and market loading completes. Supporting feeds
  render independently and merge into current data, preserving company documents.
- Bound browser JSON reads, including response bodies; add request deadlines to
  mail-provider calls. Failed reads remain failures, not invented figures.
- Guard company requests by request generation, account generation and ticker.
  A→B→A navigation and sign-out cannot install obsolete company data. Add retry.
- Preserve successful archive months when another fails. Label partial search
  results and retry missing months explicitly instead of caching failure forever.
- Serialize/coalesce queued watchlist snapshots within one browser. Show saving,
  saved and failed states; provide retry. Cancel queued writes across sign-in changes.
- Do not return an empty watchlist when KV throws: return 503/no-store.
- Verify session signatures using Web Crypto, validate payload shape, and reject
  malformed cookies and extra token segments without crashing the data gate.
- Bound incoming auth/watchlist JSON to 16 KiB, including undeclared/chunked bodies.
  Reject non-object JSON. Keep account responses out of caches; require POST to sign out.
- Gate optional direct deployments on successful preceding steps; stop hiding
  deployment failure behind `continue-on-error`.

## Still open — do not treat these as fixed

1. **HIGH: atomic account state.** OTP verification reads then deletes a KV key;
   counters read then replace it. Concurrent requests can race. Watchlists still
   use full-array PUT, so another device/tab or an initial stale mirror can
   overwrite unrelated changes. Client sequencing is only a same-browser improvement.
   Failed-save state is not a durable offline queue across reloads.
   Use per-account transactional storage, one-use OTP consumption, and versioned
   or idempotent add/remove operations. Migrate existing lists once, with a backup
   and rollback plan. Do not implement locking in a Worker-global Map.
   [Cloudflare documents KV's consistency and atomic-operation limits](https://developers.cloudflare.com/kv/concepts/how-kv-works/#consistency).
2. **HIGH: generated-data publishing conflicts.** App, price and live-feed jobs
   still independently rebase generated output and use automatic conflict winners.
   A later-finishing build is not necessarily fresher. Keep collectors parallel,
   but publish their artifacts through one short validation/merge job. Validate
   timestamps, union cumulative filing records, regenerate the final manifest and
   deploy that exact revision. Sharing one concurrency group across long collectors
   would delay prices and can discard pending runs; that is not the intended fix.
3. **MEDIUM: optional-feed coverage and load volume.** Some data adapters catch
   failures internally, so not every missing subdocument reaches the global retry
   notice. Sector history is still eagerly fetched; move it to its screen and
   return explicit per-resource coverage states. Retry only failed resources.
4. **MEDIUM: runtime validation and configuration.** Current automated tests use
   Node with isolated binding mocks, not live Cloudflare storage. Add Workers-runtime
   integration tests before a storage migration and update the compatibility date
   only with that coverage. No binding or secret was changed in this pass.

## Local review

`node scripts/esthmr_preview.mjs` serves http://localhost:8438/esthmr/.
Local UI changes are active there; auth/data are proxied to the deployed service,
and watchlist writes stay local. The new Worker code is tested separately and
is not running on the production account. The user's real email/code login still
needs an interactive trial. No push, deployment, email send or database migration
was performed by this pass.
