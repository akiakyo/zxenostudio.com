/* Studio chat: one room for every member. Vercel Functions can't hold a
   socket open, so clients poll GET /api/admin/chat?since=<server time> every
   few seconds and merge what comes back by message id. Each poll also marks
   the person as seen, which is how "online" is worked out. */
import type { Session } from "./auth.js";
import { camelRow } from "./crud.js";
import { one, query, Params } from "./db.js";
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
export const CHANNELS=['general','wins','random','briefs','in-production','reviews','design','production','dev'];
async function destination(s:Session,channel:unknown,recipient:unknown){
 const room=typeof channel==='string'?channel:'general';
 const dm=typeof recipient==='string'&&recipient?recipient:null;
 if(!CHANNELS.includes(room))throw new HttpError(400,'Unknown channel');
 if(dm&&!(await one('SELECT username FROM admin_users WHERE username=$1',[dm])))throw new HttpError(400,'Unknown recipient');
 return {room,dm};
}
function visible(s:Session,m:Record<string,any>){return !m.recipient||m.recipient===s.username||m.author===s.username;}

const MESSAGE_SELECT = `
  SELECT m.id::text AS id, m.author, u.name AS author_name,
         u.title AS author_title, u.access AS author_access,
         m.body, m.channel, m.recipient, m.pinned, m.created_at, m.updated_at, m.deleted_at,
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
  const {room,dm}=await destination(session,search.get('channel')??'general',search.get('recipient'));
  const since = search.get("since");
  const before = search.get("before");
  const clock = await one<{ now: string }>(`SELECT now() AS now`);
  const p=new Params();
  const me=dm?p.add(session.username):'';
  const scope=dm?`((m.author=${me} AND m.recipient=${p.add(dm)}) OR (m.author=${p.add(dm)} AND m.recipient=${me}))`:`m.recipient IS NULL AND m.channel=${p.add(room)}`;
  const conditions=[scope];
  if(since){const date=new Date(since);if(Number.isNaN(date.getTime()))throw new HttpError(400,'Invalid since');conditions.push(`m.updated_at>${p.add(date.toISOString())}`);}
  else conditions.push('m.deleted_at IS NULL');
  if(before){if(!/^\d+$/.test(before))throw new HttpError(400,'Invalid before');conditions.push(`m.id<${p.add(before)}`);}
  const q=search.get('q');if(q&&!since)conditions.push(`m.body ILIKE ${p.add('%'+q.replace(/[\\%_]/g,'\\$&')+'%')}`);
  if(search.get('pinned')==='1'&&!since)conditions.push('m.pinned');
  let rows=await query(`${MESSAGE_SELECT} WHERE ${conditions.join(' AND ')} ORDER BY m.id ${since?'ASC':'DESC'} LIMIT ${since?500:PAGE+1}`,p.values);
  const hasMore=!since&&rows.length>PAGE;
  if(!since)rows=rows.slice(0,PAGE).reverse();
  if(!q&&search.get('pinned')!=='1'&&!before&&rows.length){
    const last=rows.reduce((n,r)=>BigInt(r.id)>n?BigInt(r.id):n,0n).toString();
    await query(`INSERT INTO admin_chat_reads(username,conversation,last_message_id) VALUES($1,$2,$3)
      ON CONFLICT(username,conversation) DO UPDATE SET last_message_id=greatest(admin_chat_reads.last_message_id,excluded.last_message_id)`,[session.username,dm?`dm:${dm}`:room,last]);
  }

  return {
    now: new Date(clock!.now).toISOString(),
    messages: rows.map(row=>{
      const m=present(row);
      return since&&((q&&!m.body.toLowerCase().includes(q.toLowerCase()))||(search.get('pinned')==='1'&&!m.pinned))?{...m,body:'',deletedAt:new Date().toISOString()}:m;
    }),
    hasMore,
    members: (await members()).filter(m=>!dm||m.username===dm||m.username===session.username),
  };
}

async function load(id: string) {
  const row = await one(`${MESSAGE_SELECT} WHERE m.id = $1`, [id]);
  return row ? present(row) : null;
}

export async function send(session: Session, body: Record<string, unknown>) {
  const {room,dm}=await destination(session,body.channel,body.recipient);
  const text = typeof body.body === "string" ? body.body.trim() : "";
  if (!text) throw new HttpError(400, "Write a message first");
  if (text.length > MAX_LENGTH) {
    throw new HttpError(400, `Messages can be up to ${MAX_LENGTH} characters`);
  }
  const row = await one<{ id: string }>(
    `INSERT INTO admin_chat_messages (author, body,channel,recipient) VALUES ($1, $2,$3,$4) RETURNING id::text`,
    [session.username, text,room,dm],
  );
  await touch(session);
  return load(row!.id);
}

/* People delete their own messages; executives can remove any. */
export async function remove(session: Session, id: string | null) {
  if (!id || !/^\d+$/.test(id)) throw notFound();
  const message = await one(
    `SELECT author,recipient FROM admin_chat_messages WHERE id = $1 AND deleted_at IS NULL`,
    [id],
  );
  if (!message || !visible(session,message)) throw notFound();
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
    `SELECT id,author,recipient FROM admin_chat_messages WHERE id = $1 AND deleted_at IS NULL`,
    [id],
  );
  if (!message || !visible(session,message)) throw notFound();
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

export async function pin(session:Session,body:Record<string,unknown>){
 const id=typeof body.messageId==='string'?body.messageId:'';
 if(!/^\d+$/.test(id)||typeof body.pinned!=='boolean')throw new HttpError(400,'Choose a message');
 const m=await load(id);if(!m||m.deletedAt||!visible(session,m))throw notFound();
 await query('UPDATE admin_chat_messages SET pinned=$1,updated_at=now() WHERE id=$2',[body.pinned,id]);
 return load(id);
}

export async function conversations(s:Session){
 const shared=await query(`SELECT c.channel AS conversation,count(m.id)::int AS unread
  FROM unnest($2::text[]) AS c(channel)
  LEFT JOIN admin_chat_reads r ON r.username=$1 AND r.conversation=c.channel
  LEFT JOIN admin_chat_messages m ON m.channel=c.channel AND m.recipient IS NULL AND m.author<>$1 AND m.deleted_at IS NULL AND m.id>coalesce(r.last_message_id,0)
  GROUP BY c.channel`,[s.username,CHANNELS]);
 const direct=await query(`SELECT 'dm:'||u.username AS conversation,count(m.id)::int AS unread
  FROM admin_users u LEFT JOIN admin_chat_reads r ON r.username=$1 AND r.conversation='dm:'||u.username
  LEFT JOIN admin_chat_messages m ON m.author=u.username AND m.recipient=$1 AND m.deleted_at IS NULL AND m.id>coalesce(r.last_message_id,0)
  WHERE u.username<>$1 GROUP BY u.username`,[s.username]);
 return [...shared,...direct];
}
