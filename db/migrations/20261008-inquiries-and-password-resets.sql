-- Project inquiries sent from the public site's booking form, and one-time
-- links for resetting a forgotten password.

CREATE TABLE IF NOT EXISTS admin_inquiries (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name           text NOT NULL,
  email          text NOT NULL,
  company        text NOT NULL DEFAULT '',
  service        text NOT NULL DEFAULT '',
  message        text NOT NULL,
  timeline       text NOT NULL DEFAULT '',
  budget         text NOT NULL DEFAULT '',
  preferred_time text NOT NULL DEFAULT '',
  status         text NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'contacted', 'converted', 'archived')),
  owner          text REFERENCES admin_users (username) ON DELETE SET NULL,
  notes          text NOT NULL DEFAULT '',
  client_id      uuid REFERENCES admin_clients (id) ON DELETE SET NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS admin_inquiries_status_idx ON admin_inquiries (status, created_at DESC);

-- Only a SHA-256 of each token is kept, so a copy of the table can't be used
-- to reset anyone's password. A link works once and for 30 minutes.
CREATE TABLE IF NOT EXISTS admin_password_resets (
  token_hash text PRIMARY KEY,
  username   text NOT NULL REFERENCES admin_users (username) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  used_at    timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS admin_password_resets_user_idx ON admin_password_resets (username);
