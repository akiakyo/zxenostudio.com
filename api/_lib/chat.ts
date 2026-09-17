/* Studio chat: one room for every member. Vercel Functions can't hold a
   socket open, so clients poll GET /api/admin/chat?since=<server time> every
   few seconds and merge what comes back by message id. Each poll also marks
   the person as seen, which is how "online" is worked out. */
import type { Session } from "./auth.js";
import { camelRow } from "./crud.js";
import { one, query } from "./db.js";
import { HttpError, isExecutive, notFound } from "./http.js";

/* Lucide icon names; the client maps each to its icon. */
export const REACTIONS = [
  "thumbs-up",
  "heart",
  "flame",
  "laugh",
  "party-popper",
  "eye",
  "rocket",
  "circle-check",
] as const;

const PAGE = 50;
const MAX_LENGTH = 4000;
const ONLINE_SECONDS = 45;

const MESSAGE_SELECT = `
  SELECT m.id::text AS id, m.author, u.name AS author_name,
         u.title AS author_title, u.access AS author_access,
         m.body, m.created_at, m.updated_at, m.deleted_at,
         coalesce((
           SELECT json_agg(json_build_object('reaction', r.reaction, 'users', r.users)
                           ORDER BY r.first)
             FROM (SELECT reaction, array_agg(username ORDER BY created_at) AS users,
                          min(created_at) AS first
                     FROM admin_chat_reactions
                    WHERE message_id = m.id
                    GROUP BY reaction) r
         ), '[]'::json) AS reactions
    FROM admin_chat_messages m
    JOIN admin_users u ON u.username = m.author`;

function present(row: Record<string, any>) {
  const message = camelRow(row);
  return message.deletedAt ? { ...message, body: "", reactions: [] } : message;
}

async function members() {
  const rows = await query(
    `SELECT username, name, title, access,
            coalesce(last_seen_at > now() - make_interval(secs => $1), false) AS online
       FROM admin_users
      ORDER BY access = 'executive' DESC, name`,
    [ONLINE_SECONDS],
  );
  return rows.map(camelRow);
}

/* at most one presence write per person every 15 seconds */
async function touch(session: Session) {
  await query(
    `UPDATE admin_users SET last_seen_at = now()
      WHERE username = $1
        AND (last_seen_at IS NULL OR last_seen_at < now() - interval '15 seconds')`,
    [session.username],
  );
}

export async function read(session: Session, search: URLSearchParams) {
  await touch(session);
  const since = search.get("since");
  const before = search.get("before");
  const clock = await one<{ now: string }>(`SELECT now() AS now`);
  let rows;
  let hasMore = false;

  if (since) {
    const date = new Date(since);
    if (Number.isNaN(date.getTime())) throw new HttpError(400, "Invalid since");
    rows = await query(
      `${MESSAGE_SELECT} WHERE m.updated_at > $1 ORDER BY m.id LIMIT 500`,
      [date.toISOString()],
    );
  } else {
    const params: unknown[] = [PAGE + 1];
    let where = "m.deleted_at IS NULL";
    if (before) {
      if (!/^\d+$/.test(before)) throw new HttpError(400, "Invalid before");
      params.push(before);
      where += ` AND m.id < $2`;
    }
    rows = await query(
      `${MESSAGE_SELECT} WHERE ${where} ORDER BY m.id DESC LIMIT $1`,
      params,
    );
    hasMore = rows.length > PAGE;
    rows = rows.slice(0, PAGE).reverse();
  }

  return {
    now: new Date(clock!.now).toISOString(),
    messages: rows.map(present),
    hasMore,
    members: await members(),
  };
}

async function load(id: string) {
  const row = await one(`${MESSAGE_SELECT} WHERE m.id = $1`, [id]);
  return row ? present(row) : null;
}

export async function send(session: Session, body: Record<string, unknown>) {
  const text = typeof body.body === "string" ? body.body.trim() : "";
  if (!text) throw new HttpError(400, "Write a message first");
  if (text.length > MAX_LENGTH) {
    throw new HttpError(400, `Messages can be up to ${MAX_LENGTH} characters`);
  }
  const row = await one<{ id: string }>(
    `INSERT INTO admin_chat_messages (author, body) VALUES ($1, $2) RETURNING id::text`,
    [session.username, text],
  );
  await touch(session);
  return load(row!.id);
}

/* People delete their own messages; executives can remove any. */
export async function remove(session: Session, id: string | null) {
  if (!id || !/^\d+$/.test(id)) throw notFound();
  const message = await one(
    `SELECT author FROM admin_chat_messages WHERE id = $1 AND deleted_at IS NULL`,
    [id],
  );
  if (!message) throw notFound();
  if (message.author !== session.username && !isExecutive(session)) {
    throw new HttpError(403, "You can only delete your own messages");
  }
  await query(`DELETE FROM admin_chat_reactions WHERE message_id = $1`, [id]);
  await query(
    `UPDATE admin_chat_messages
        SET body = '', deleted_at = now(), updated_at = now()
      WHERE id = $1`,
    [id],
  );
  return { ok: true };
}

/* Adds the reaction, or takes it away if this person already gave it. */
export async function toggleReaction(
  session: Session,
  body: Record<string, unknown>,
) {
  const id = typeof body.messageId === "string" ? body.messageId : "";
  const reaction = body.reaction;
  if (!/^\d+$/.test(id)) throw notFound();
  if (typeof reaction !== "string" || !(REACTIONS as readonly string[]).includes(reaction)) {
    throw new HttpError(400, "Unknown reaction");
  }
  const message = await one(
    `SELECT id FROM admin_chat_messages WHERE id = $1 AND deleted_at IS NULL`,
    [id],
  );
  if (!message) throw notFound();
  const removed = await query(
    `DELETE FROM admin_chat_reactions
      WHERE message_id = $1 AND username = $2 AND reaction = $3
      RETURNING reaction`,
    [id, session.username, reaction],
  );
  if (!removed.length) {
    await query(
      `INSERT INTO admin_chat_reactions (message_id, username, reaction)
       VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
      [id, session.username, reaction],
    );
  }
  await query(`UPDATE admin_chat_messages SET updated_at = now() WHERE id = $1`, [id]);
  return load(id);
}
