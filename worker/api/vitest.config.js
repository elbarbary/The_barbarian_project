import path from 'node:path';
import { defineWorkersConfig, readD1Migrations } from '@cloudflare/vitest-pool-workers/config';

// Read the real migration files and hand them to the pool, so every test worker
// starts from the schema that production runs rather than a copy that can drift.
const migrations = await readD1Migrations(path.join(import.meta.dirname, 'migrations'));

export default defineWorkersConfig({
  test: {
    setupFiles: ['./test/apply-migrations.js'],
    poolOptions: {
      workers: {
        singleWorker: true,
        wrangler: { configPath: './wrangler.jsonc' },
        miniflare: {
          d1Databases: ['DB'],
          bindings: {
            TEST_MIGRATIONS: migrations,
            // wrangler.jsonc ships these empty so a real deploy cannot
            // accidentally inherit a test allow-list. The suite supplies its
            // own, and auth.test.js covers what happens when they are absent.
            GOOGLE_CLIENT_IDS: 'test-client-id',
            APPLE_CLIENT_IDS: 'com.barbarian.app',
          },
        },
      },
    },
  },
});
