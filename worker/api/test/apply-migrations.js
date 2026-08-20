import { applyD1Migrations, fetchMock, env } from 'cloudflare:test';
import { beforeAll } from 'vitest';

// The schema is applied from the same migration files that run in production,
// so a test suite cannot pass against a table shape that was never deployed.
await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);

beforeAll(() => {
  // Without this the suite reaches the real Google and Apple key endpoints,
  // which answer perfectly well and with keys that are not the test's — so the
  // forgery tests fail for the wrong reason and would keep passing even if the
  // verifier were broken. Net access is cut off entirely so an un-stubbed
  // request is a loud failure rather than a slow one.
  fetchMock.activate();
  fetchMock.disableNetConnect();
});
