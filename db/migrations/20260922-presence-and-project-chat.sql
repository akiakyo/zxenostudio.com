-- Live presence, and a chat room per project that only the people assigned to
-- that project can open. Additive and re-runnable.
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS last_active_at timestamptz;
ALTER TABLE admin_chat_messages ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES admin_projects(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS admin_chat_project_idx ON admin_chat_messages (project_id, updated_at);
