# Esthmr local review

Run `node scripts/esthmr_preview.mjs` from the repository root, then open
http://localhost:8438/esthmr/.

- The interface comes from your edited local files. Refresh to see changes.
- Sign in with your normal email and the code delivered by the existing service.
- Authentication and financial-data requests use https://esthmr.com. Existing
  security checks and rate limits remain in place; this is not an auth bypass.
- Watchlist changes in this preview stay in server memory and do not update the
  live account. Restarting the preview clears those temporary changes.
- Use localhost, not a LAN address. The server binds to loopback, validates Host
  and Origin, and is not intended for sharing or deployment.
- Codes, session cookies and request bodies are not logged or saved to files.
- Nothing is committed, pushed or deployed by this command.

This tests the local UI against the deployed authentication service. It does not
run a separate local copy of the production backend.
