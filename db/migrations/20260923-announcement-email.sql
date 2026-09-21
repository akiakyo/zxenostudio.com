-- Announcements by email through Resend: each person's address, and a note on
-- each announcement of when it was last emailed and to how many people.
-- Additive and re-runnable.
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS email text NOT NULL DEFAULT '';
ALTER TABLE admin_announcements ADD COLUMN IF NOT EXISTS emailed_at timestamptz;
ALTER TABLE admin_announcements ADD COLUMN IF NOT EXISTS emailed_count integer NOT NULL DEFAULT 0;
