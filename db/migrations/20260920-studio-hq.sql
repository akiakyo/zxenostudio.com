-- Additive HQ features. Apply once before deploying the corresponding API.
ALTER TABLE admin_projects ADD COLUMN IF NOT EXISTS lead text REFERENCES admin_users(username);
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS department text NOT NULL DEFAULT '';
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS work_status text NOT NULL DEFAULT 'studio' CHECK (work_status IN ('studio','remote','shoot','off'));
ALTER TABLE admin_projects ADD COLUMN IF NOT EXISTS team text[] NOT NULL DEFAULT '{}';
ALTER TABLE admin_projects ADD COLUMN IF NOT EXISTS budget numeric(14,2) CHECK (budget >= 0);
ALTER TABLE admin_clients ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','onboarding','paused','in_house'));
ALTER TABLE admin_clients ADD COLUMN IF NOT EXISTS owner text REFERENCES admin_users(username);
ALTER TABLE admin_clients ADD COLUMN IF NOT EXISTS agreement text NOT NULL DEFAULT '';
ALTER TABLE admin_clients ADD COLUMN IF NOT EXISTS industry text NOT NULL DEFAULT '';
ALTER TABLE admin_clients ADD COLUMN IF NOT EXISTS palette text NOT NULL DEFAULT '';
ALTER TABLE admin_assets ADD COLUMN IF NOT EXISTS folder text NOT NULL DEFAULT '';
ALTER TABLE admin_assets ADD COLUMN IF NOT EXISTS size_label text NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS admin_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), title text NOT NULL,
 project_id uuid REFERENCES admin_projects(id) ON DELETE SET NULL,
 date text NOT NULL, start_time text NOT NULL DEFAULT '09:00', end_time text NOT NULL DEFAULT '10:00',
 kind text NOT NULL DEFAULT 'meeting' CHECK (kind IN ('meeting','review','shoot','deadline','internal')),
 location text NOT NULL DEFAULT '', attendees text[] NOT NULL DEFAULT '{}', notes text NOT NULL DEFAULT '',
 created_by text NOT NULL REFERENCES admin_users(username),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK (start_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' AND end_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' AND end_time > start_time)
);
CREATE INDEX IF NOT EXISTS admin_events_date_idx ON admin_events(date);

CREATE TABLE IF NOT EXISTS admin_approvals (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), title text NOT NULL,
 project_id uuid REFERENCES admin_projects(id) ON DELETE SET NULL,
 asset_id uuid REFERENCES admin_assets(id) ON DELETE SET NULL,
 reviewer text NOT NULL REFERENCES admin_users(username), version integer NOT NULL DEFAULT 1 CHECK (version > 0),
 due_date text, notes text NOT NULL DEFAULT '',
 status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','revision','approved')),
 decided_by text REFERENCES admin_users(username), decided_at timestamptz,
 created_by text NOT NULL REFERENCES admin_users(username),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS admin_approval_comments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), approval_id uuid NOT NULL REFERENCES admin_approvals(id) ON DELETE CASCADE,
 body text NOT NULL, version integer NOT NULL DEFAULT 1,
 x integer CHECK (x BETWEEN 0 AND 100), y integer CHECK (y BETWEEN 0 AND 100),
 created_by text NOT NULL REFERENCES admin_users(username),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK ((x IS NULL) = (y IS NULL))
);
CREATE INDEX IF NOT EXISTS admin_approval_comments_parent_idx ON admin_approval_comments(approval_id);

CREATE TABLE IF NOT EXISTS admin_expenses (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), title text NOT NULL,
 project_id uuid REFERENCES admin_projects(id) ON DELETE SET NULL,
 amount numeric(14,2) NOT NULL CHECK (amount > 0), date text NOT NULL,
 category text NOT NULL DEFAULT 'other' CHECK (category IN ('payroll','software','office','production','marketing','other')),
 notes text NOT NULL DEFAULT '', created_by text NOT NULL REFERENCES admin_users(username),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS admin_deals (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), title text NOT NULL,
 client_id uuid REFERENCES admin_clients(id) ON DELETE SET NULL,
 owner text REFERENCES admin_users(username), amount numeric(14,2) NOT NULL DEFAULT 0 CHECK (amount >= 0),
 stage text NOT NULL DEFAULT 'lead' CHECK (stage IN ('lead','discovery','proposal','negotiation','won','lost')),
 next_step text NOT NULL DEFAULT '', due_date text,
 created_by text NOT NULL REFERENCES admin_users(username),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS admin_leave (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), start_date text NOT NULL, end_date text NOT NULL,
 kind text NOT NULL DEFAULT 'vacation' CHECK (kind IN ('vacation','sick','personal','half_day')),
 notes text NOT NULL DEFAULT '', status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','declined','cancelled')),
 decided_by text REFERENCES admin_users(username), decided_at timestamptz,
 created_by text NOT NULL REFERENCES admin_users(username),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK (end_date >= start_date)
);
CREATE TABLE IF NOT EXISTS admin_capacity (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), member text NOT NULL REFERENCES admin_users(username),
 week_of text NOT NULL, hours integer NOT NULL DEFAULT 0 CHECK (hours BETWEEN 0 AND 168),
 available integer NOT NULL DEFAULT 40 CHECK (available BETWEEN 1 AND 168),
 created_by text NOT NULL REFERENCES admin_users(username),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(member, week_of)
);
CREATE TABLE IF NOT EXISTS admin_handbook (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), title text NOT NULL, category text NOT NULL DEFAULT 'Studio', body text NOT NULL,
 created_by text NOT NULL REFERENCES admin_users(username),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE admin_chat_messages ADD COLUMN IF NOT EXISTS channel text NOT NULL DEFAULT 'general';
ALTER TABLE admin_chat_messages ADD COLUMN IF NOT EXISTS recipient text REFERENCES admin_users(username);
ALTER TABLE admin_chat_messages ADD COLUMN IF NOT EXISTS pinned boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS admin_chat_channel_idx ON admin_chat_messages(channel, updated_at);
CREATE INDEX IF NOT EXISTS admin_chat_recipient_idx ON admin_chat_messages(recipient, author, updated_at);
CREATE TABLE IF NOT EXISTS admin_notification_reads (
 username text NOT NULL REFERENCES admin_users(username), activity_id bigint NOT NULL REFERENCES admin_activity(id) ON DELETE CASCADE,
 PRIMARY KEY(username, activity_id)
);
ALTER TABLE admin_approvals ADD COLUMN IF NOT EXISTS lock_version integer NOT NULL DEFAULT 0;
ALTER TABLE admin_leave ADD COLUMN IF NOT EXISTS lock_version integer NOT NULL DEFAULT 0;
CREATE TABLE IF NOT EXISTS admin_chat_reads (
 username text NOT NULL REFERENCES admin_users(username), conversation text NOT NULL,
 last_message_id bigint NOT NULL DEFAULT 0, PRIMARY KEY(username,conversation)
);
