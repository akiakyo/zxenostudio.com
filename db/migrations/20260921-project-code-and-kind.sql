-- A short human code and a work type for projects, so the board reads like the
-- studio's own shorthand. Additive and re-runnable.
ALTER TABLE admin_projects ADD COLUMN IF NOT EXISTS code text;
ALTER TABLE admin_projects ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'other' CHECK (kind IN ('video','poster','web','doc','social','photo','other'));
CREATE SEQUENCE IF NOT EXISTS admin_project_code_seq;
WITH ordered AS (SELECT id, row_number() OVER (ORDER BY created_at, id) AS n FROM admin_projects WHERE code IS NULL) UPDATE admin_projects p SET code = 'PJ-' || lpad(o.n::text, 3, '0') FROM ordered o WHERE p.id = o.id;
SELECT setval('admin_project_code_seq', greatest((SELECT last_value FROM admin_project_code_seq), coalesce((SELECT max(substring(code, 4)::int) FROM admin_projects WHERE code ~ '^PJ-[0-9]+'), 0), 1), (SELECT is_called FROM admin_project_code_seq) OR coalesce((SELECT max(substring(code, 4)::int) FROM admin_projects WHERE code ~ '^PJ-[0-9]+'), 0) > 0);
ALTER TABLE admin_projects ALTER COLUMN code SET DEFAULT 'PJ-' || lpad(nextval('admin_project_code_seq')::text, 3, '0');
CREATE UNIQUE INDEX IF NOT EXISTS admin_projects_code_key ON admin_projects (code);
