-- Identity, watchlist and bookmarks (spec §27, §30, §33).
--
-- D1 holds interactive user data only. Prices, statements, disclosures and
-- research stay static on the CDN — see §27, which lists them explicitly — so
-- nothing a reader browses ever touches this database. That is what keeps the
-- whole thing inside the free tier: reads here happen only for people signed
-- in, and only for their own rows.

-- One row per person, and deliberately almost empty.
--
-- We store the provider's stable subject identifier and nothing else. No email,
-- no name, no photo. Apple hands out a private relay address and only on first
-- sign-in; Google offers a profile. Neither is needed to know that this is the
-- same person as last time, and data we never hold cannot leak (§53).
CREATE TABLE users (
  id          TEXT PRIMARY KEY,          -- ours, a UUID
  provider    TEXT NOT NULL,             -- 'apple' | 'google'
  subject     TEXT NOT NULL,             -- the provider's `sub` claim
  created_at  INTEGER NOT NULL,          -- unix seconds
  seen_at     INTEGER NOT NULL,
  UNIQUE (provider, subject)
);

-- A watchlist entry is a ticker and nothing else (§33).
--
-- Not a holding: no share count, no cost basis, no entry price. The moment a
-- row here could say how much of something a person owns, everything the app
-- shows beside it becomes personalised advice, which the publisher is not
-- licensed to give (§8).
CREATE TABLE watchlist (
  user_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ticker    TEXT NOT NULL,
  position  INTEGER NOT NULL,
  added_at  INTEGER NOT NULL,
  PRIMARY KEY (user_id, ticker)
);

CREATE TABLE bookmarks (
  user_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind      TEXT NOT NULL,               -- cash_or_trash | opportunity | research
  item_id   TEXT NOT NULL,
  title     TEXT NOT NULL,
  subtitle  TEXT,
  url       TEXT,
  added_at  INTEGER NOT NULL,
  PRIMARY KEY (user_id, kind, item_id)
);

-- Every read this API performs is "give me one user's rows", so the primary
-- keys above already cover it. These add the orderings the handlers ask for,
-- so a signed-in user with a long watchlist still costs one indexed scan
-- rather than a sort (§29: add appropriate indexes, always paginate).
CREATE INDEX watchlist_by_position ON watchlist (user_id, position);
CREATE INDEX bookmarks_by_added ON bookmarks (user_id, added_at DESC);
