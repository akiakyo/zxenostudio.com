-- A checklist inside each task: small steps ticked off one by one. Items
-- belong to their task and go with it when it is deleted.
CREATE TABLE IF NOT EXISTS admin_task_checklist (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id    uuid NOT NULL REFERENCES admin_tasks (id) ON DELETE CASCADE,
  title      text NOT NULL,
  done       boolean NOT NULL DEFAULT false,
  position   integer NOT NULL DEFAULT 0,
  created_by text NOT NULL REFERENCES admin_users (username),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS admin_task_checklist_task_idx ON admin_task_checklist (task_id, position);
