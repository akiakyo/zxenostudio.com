-- @mentions in chat: one row per person named in a message they can see.
-- read_at is set when they open the conversation or clear the notification.
CREATE TABLE IF NOT EXISTS admin_chat_mentions (
  message_id bigint NOT NULL REFERENCES admin_chat_messages (id) ON DELETE CASCADE,
  username   text NOT NULL REFERENCES admin_users (username) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at    timestamptz,
  PRIMARY KEY (message_id, username)
);
CREATE INDEX IF NOT EXISTS admin_chat_mentions_unread_idx ON admin_chat_mentions (username, read_at);
