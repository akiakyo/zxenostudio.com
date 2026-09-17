-- Admin accounts for admin.zxenostudio.com. Applied by scripts/seed-admins.ts;
-- every statement is safe to re-run.

CREATE TABLE IF NOT EXISTS admin_users (
  username             text PRIMARY KEY,
  password_hash        text NOT NULL,
  must_change_password boolean NOT NULL DEFAULT true,
  -- Milliseconds since the epoch. Sessions carry the value they were issued
  -- under, so changing the password ends every other session for the account.
  password_changed_at  bigint NOT NULL
);

-- Failed sign-in counters, one row per account ("user:<name>") and per client
-- IP ("ip:<address>"). A row whose expires_at has passed counts as zero.
CREATE TABLE IF NOT EXISTS admin_login_failures (
  key        text PRIMARY KEY,
  count      integer NOT NULL,
  expires_at timestamptz NOT NULL
);
