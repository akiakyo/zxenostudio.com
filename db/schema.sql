-- Admin workspace for admin.zxenostudio.com. Applied by scripts/seed-admins.ts;
-- every statement is safe to re-run, and changes are additive so the deployed
-- code keeps working while a migration runs ahead of it.
-- Calendar dates are text in YYYY-MM-DD: they sort and compare correctly as
-- text and come back from every driver unchanged, with no timezone shifts.

CREATE TABLE IF NOT EXISTS admin_users (
  username             text PRIMARY KEY,
  password_hash        text NOT NULL,
  must_change_password boolean NOT NULL DEFAULT true,
  -- Milliseconds since the epoch. Sessions carry the value they were issued
  -- under, so changing the password ends every other session for the account.
  password_changed_at  bigint NOT NULL
);

ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS name text NOT NULL DEFAULT '';
-- Job title shown across the workspace, e.g. "Co-Founder / COO".
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS title text NOT NULL DEFAULT 'Member';
-- Permission level. Only executives change titles and access.
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS access text NOT NULL DEFAULT 'member'
  CHECK (access IN ('executive', 'member'));
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS phone text NOT NULL DEFAULT '';
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS bio text NOT NULL DEFAULT '';

-- Failed sign-in counters, one row per account ("user:<name>") and per client
-- IP ("ip:<address>"). A row whose expires_at has passed counts as zero.
CREATE TABLE IF NOT EXISTS admin_login_failures (
  key        text PRIMARY KEY,
  count      integer NOT NULL,
  expires_at timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS admin_clients (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  email      text NOT NULL DEFAULT '',
  company    text NOT NULL DEFAULT '',
  phone      text NOT NULL DEFAULT '',
  notes      text NOT NULL DEFAULT '',
  created_by text NOT NULL REFERENCES admin_users (username),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS admin_projects (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  client_id   uuid REFERENCES admin_clients (id) ON DELETE SET NULL,
  description text NOT NULL DEFAULT '',
  status      text NOT NULL DEFAULT 'planning'
    CHECK (status IN ('planning', 'active', 'on_hold', 'review', 'completed')),
  progress    integer NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  start_date  text,
  due_date    text,
  archived_at timestamptz,
  created_by  text NOT NULL REFERENCES admin_users (username),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS admin_milestones (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES admin_projects (id) ON DELETE CASCADE,
  title      text NOT NULL,
  due_date   text NOT NULL,
  done       boolean NOT NULL DEFAULT false,
  created_by text NOT NULL REFERENCES admin_users (username),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Private tasks belong to their creator alone: no one else can list, open or
-- change them, and they never appear in the activity feed.
CREATE TABLE IF NOT EXISTS admin_tasks (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   uuid REFERENCES admin_projects (id) ON DELETE CASCADE,
  title        text NOT NULL,
  description  text NOT NULL DEFAULT '',
  status       text NOT NULL DEFAULT 'todo'
    CHECK (status IN ('todo', 'in_progress', 'done')),
  priority     text NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  assignee     text REFERENCES admin_users (username),
  due_date     text,
  is_private   boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  created_by   text NOT NULL REFERENCES admin_users (username),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS admin_invoices (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number     text NOT NULL UNIQUE,
  title      text NOT NULL,
  project_id uuid REFERENCES admin_projects (id) ON DELETE SET NULL,
  client_id  uuid REFERENCES admin_clients (id) ON DELETE SET NULL,
  -- Philippine pesos.
  amount     numeric(14, 2) NOT NULL CHECK (amount >= 0),
  issue_date text NOT NULL,
  due_date   text,
  -- "Overdue" is not stored: it is a sent invoice past its due date.
  status     text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'sent', 'paid', 'void')),
  paid_date  text,
  notes      text NOT NULL DEFAULT '',
  created_by text NOT NULL REFERENCES admin_users (username),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Links only: files stay in Drive, Dropbox, Frame.io and the like.
CREATE TABLE IF NOT EXISTS admin_assets (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  url         text NOT NULL,
  kind        text NOT NULL DEFAULT 'other'
    CHECK (kind IN ('image', 'video', 'document', '3d', 'audio', 'design', 'other')),
  project_id  uuid REFERENCES admin_projects (id) ON DELETE SET NULL,
  description text NOT NULL DEFAULT '',
  tags        text NOT NULL DEFAULT '',
  created_by  text NOT NULL REFERENCES admin_users (username),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS admin_announcements (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title      text NOT NULL,
  body       text NOT NULL,
  pinned     boolean NOT NULL DEFAULT false,
  created_by text NOT NULL REFERENCES admin_users (username),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS admin_meeting_notes (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title        text NOT NULL,
  meeting_date text NOT NULL,
  project_id   uuid REFERENCES admin_projects (id) ON DELETE SET NULL,
  attendees    text[] NOT NULL DEFAULT '{}',
  body         text NOT NULL DEFAULT '',
  created_by   text NOT NULL REFERENCES admin_users (username),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS admin_status_updates (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  week_of    text NOT NULL,
  project_id uuid REFERENCES admin_projects (id) ON DELETE SET NULL,
  done       text NOT NULL,
  next       text NOT NULL DEFAULT '',
  blockers   text NOT NULL DEFAULT '',
  created_by text NOT NULL REFERENCES admin_users (username),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS admin_feedback (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title      text NOT NULL,
  project_id uuid REFERENCES admin_projects (id) ON DELETE SET NULL,
  asset_id   uuid REFERENCES admin_assets (id) ON DELETE SET NULL,
  body       text NOT NULL DEFAULT '',
  status     text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'in_progress', 'resolved')),
  created_by text NOT NULL REFERENCES admin_users (username),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS admin_feedback_comments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feedback_id uuid NOT NULL REFERENCES admin_feedback (id) ON DELETE CASCADE,
  body        text NOT NULL,
  created_by  text NOT NULL REFERENCES admin_users (username),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS admin_briefs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title           text NOT NULL,
  project_id      uuid REFERENCES admin_projects (id) ON DELETE SET NULL,
  client_id       uuid REFERENCES admin_clients (id) ON DELETE SET NULL,
  objective       text NOT NULL DEFAULT '',
  audience        text NOT NULL DEFAULT '',
  deliverables    text NOT NULL DEFAULT '',
  key_message     text NOT NULL DEFAULT '',
  tone            text NOT NULL DEFAULT '',
  reference_notes text NOT NULL DEFAULT '',
  budget          numeric(14, 2) CHECK (budget >= 0),
  due_date        text,
  status          text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'in_review', 'approved')),
  created_by      text NOT NULL REFERENCES admin_users (username),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS admin_activity (
  id          bigserial PRIMARY KEY,
  actor       text NOT NULL REFERENCES admin_users (username),
  action      text NOT NULL,
  entity_type text NOT NULL,
  entity_id   text NOT NULL,
  summary     text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_tasks_assignee_idx ON admin_tasks (assignee);
CREATE INDEX IF NOT EXISTS admin_tasks_project_idx ON admin_tasks (project_id);
CREATE INDEX IF NOT EXISTS admin_tasks_due_idx ON admin_tasks (due_date);
CREATE INDEX IF NOT EXISTS admin_milestones_project_idx ON admin_milestones (project_id);
CREATE INDEX IF NOT EXISTS admin_invoices_due_idx ON admin_invoices (due_date);
CREATE INDEX IF NOT EXISTS admin_activity_created_idx ON admin_activity (created_at DESC);
