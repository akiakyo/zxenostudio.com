/* Studio chat: one room for every member. Vercel Functions can't hold a
   socket open, so clients poll GET /api/admin/chat?since=<server time> every
   few seconds and merge what comes back by message id. Each poll also marks
   the person as seen, which is how "online" is worked out. */
import type { Session } from "./auth.js";
import { camelRow } from "./crud.js";
import { one, query, Params } from "./db.js";
import { HttpError, isExecutive, notFound } from "./http.js";
import { notice, sendLater, sendNotice } from "./notices.js";

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

/* Who may open a project's room: the people actually assigned to it. Nobody
   else, executives included, which is the same rule direct messages follow. */
function assignedTo(row:Record<string,any>|null,username:string){
 return !!row && (row.lead===username || (row.team ?? []).includes(username));
}

/* Where a message belongs: a shared channel, a direct message, or a project
   room. A caller may name exactly one of them. */
async function destination(s:Session,channel:unknown,recipient:unknown,project:unknown){
 const room=typeof channel==='string'?channel:'general';
 const dm=typeof recipient==='string'&&recipient?recipient:null;
 const projectId=typeof project==='string'&&project?project:null;
 if(projectId){
  if(dm)throw new HttpError(400,'Choose a project or a person, not both');
  const row=await one('SELECT id::text AS id, name, code, lead, team FROM admin_projects WHERE id = $1',[projectId]);
  /* not found rather than forbidden: an unassigned person should not learn
     that a project room exists at all */
  if(!assignedTo(row,s.username))throw notFound();
  return {room:'project',dm:null,project:row!};
 }
 if(!CHANNELS.includes(room))throw new HttpError(400,'Unknown channel');
 if(dm&&!(await one('SELECT username FROM admin_users WHERE username=$1',[dm])))throw new HttpError(400,'Unknown recipient');
 return {room,dm,project:null as Record<string,any>|null};
}

async function visible(s:Session,m:Record<string,any>){
 const projectId=m.project_id ?? m.projectId;
 if(projectId){
  return assignedTo(await one('SELECT lead, team FROM admin_projects WHERE id = $1',[projectId]),s.username);
 }
 return !m.recipient||m.recipient===s.username||m.author===s.username;
}

const MESSAGE_SELECT = `
  SELECT m.id::text AS id, m.author, u.name AS author_name,
         u.title AS author_title, u.access AS author_access,
         m.body, m.channel, m.recipient, m.project_id, m.pinned, m.created_at, m.updated_at, m.deleted_at,
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

export const PRESENCE = `CASE
  WHEN last_seen_at IS NULL OR last_seen_at < now() - interval '90 seconds' THEN 'offline'
  WHEN last_active_at IS NULL OR last_active_at < now() - interval '5 minutes' THEN 'idle'
  ELSE 'active' END`;

async function members() {
  const rows = await query(
    `SELECT username, name, title, access, ${PRESENCE} AS presence,
            coalesce(last_seen_at > now() - make_interval(secs => $1), false) AS online
       FROM admin_users
      ORDER BY access = 'executive' DESC, name`,
    [ONLINE_SECONDS],
  );
  return rows.map(camelRow);
}

/* The heartbeat the whole workspace sends, not just the chat page. */
export async function heartbeat(session: Session, body: Record<string, unknown>) {
  await query(
    `UPDATE admin_users SET last_seen_at = now(),
       last_active_at = CASE WHEN $2 THEN now() ELSE last_active_at END
      WHERE username = $1`,
    [session.username, body.active === true],
  );
  return { ok: true };
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
  const {room,dm,project}=await destination(session,search.get('channel')??'general',search.get('recipient'),search.get('project'));
  const since = search.get("since");
  const before = search.get("before");
  const clock = await one<{ now: string }>(`SELECT now() AS now`);
  const p=new Params();
  const me=dm?p.add(session.username):'';
  const scope=project?`m.recipient IS NULL AND m.project_id=${p.add(project.id)}`
   :dm?`((m.author=${me} AND m.recipient=${p.add(dm)}) OR (m.author=${p.add(dm)} AND m.recipient=${me}))`
   :`m.recipient IS NULL AND m.project_id IS NULL AND m.channel=${p.add(room)}`;
  const conditions=[scope];
  if(since){const date=new Date(since);if(Number.isNaN(date.getTime()))throw new HttpError(400,'Invalid since');conditions.push(`m.updated_at>${p.add(date.toISOString())}`);}
  else conditions.push('m.deleted_at IS NULL');
  if(before){if(!/^\d+$/.test(before))throw new HttpError(400,'Invalid before');conditions.push(`m.id<${p.add(before)}`);}
  const q=search.get('q');if(q&&!since)conditions.push(`m.body ILIKE ${p.add('%'+q.replace(/[\\%_]/g,'\\$&')+'%')}`);
  if(search.get('pinned')==='1'&&!since)conditions.push('m.pinned');
  let rows=await query(`${MESSAGE_SELECT} WHERE ${conditions.join(' AND ')} ORDER BY m.id ${since?'ASC':'DESC'} LIMIT ${since?500:PAGE+1}`,p.values);
  const hasMore=!since&&rows.length>PAGE;
  if(!since)rows=rows.slice(0,PAGE).reverse();
  if(!q&&search.get('pinned')!=='1'&&!before&&search.get('seen')!=='0'&&rows.length){
    const last=rows.reduce((n,r)=>BigInt(r.id)>n?BigInt(r.id):n,0n).toString();
    await query(`INSERT INTO admin_chat_reads(username,conversation,last_message_id) VALUES($1,$2,$3)
      ON CONFLICT(username,conversation) DO UPDATE SET last_message_id=greatest(admin_chat_reads.last_message_id,excluded.last_message_id)`,[session.username,project?`project:${project.id}`:dm?`dm:${dm}`:room,last]);
    /* a mention on screen has been seen */
    await readMentions(session,rows.map(r=>String(r.id)));
  }

  return {
    now: new Date(clock!.now).toISOString(),
    messages: rows.map(row=>{
      const m=present(row);
      return since&&((q&&!m.body.toLowerCase().includes(q.toLowerCase()))||(search.get('pinned')==='1'&&!m.pinned))?{...m,body:'',deletedAt:new Date().toISOString()}:m;
    }),
    hasMore,
    members: await roomMembers(session,dm,project),
    project: project?{id:project.id,name:project.name,code:project.code}:null,
  };
}

async function roomMembers(session:Session,dm:string|null,project:Record<string,any>|null){
 const all=await members();
 if(dm)return all.filter(m=>m.username===dm||m.username===session.username);
 if(project){
  const on=new Set([project.lead,...(project.team ?? [])].filter(Boolean));
  return all.filter(m=>on.has(m.username));
 }
 return all;
}

async function load(id: string) {
  const row = await one(`${MESSAGE_SELECT} WHERE m.id = $1`, [id]);
  return row ? present(row) : null;
}

export async function send(session: Session, body: Record<string, unknown>) {
  const {room,dm,project}=await destination(session,body.channel,body.recipient,body.project);
  const text = typeof body.body === "string" ? body.body.trim() : "";
  if (!text) throw new HttpError(400, "Write a message first");
  if (text.length > MAX_LENGTH) {
    throw new HttpError(400, `Messages can be up to ${MAX_LENGTH} characters`);
  }
  const row = await one<{ id: string }>(
    `INSERT INTO admin_chat_messages (author, body,channel,recipient,project_id) VALUES ($1, $2,$3,$4,$5) RETURNING id::text`,
    [session.username, text,room,dm,project?project.id:null],
  );
  await recordMentions(session, row!.id, text, room, dm, project);
  await touch(session);
  return load(row!.id);
}

/* "#general", "Halo Labs launch" or "a direct message" */
export function mentionPlace(r: Record<string, any>){
 return r.project_id?String(r.project_name):r.recipient?'a direct message':`#${r.channel}`;
}
/* the chat page query that opens the conversation a mention was said in */
export function mentionLink(r: Record<string, any>,me:string){
 return r.project_id?`project=${r.project_id}`:r.recipient?`dm=${r.recipient===me?r.author:r.recipient}`:`channel=${r.channel}`;
}

/* "@aquio.zxeno" anywhere a word can start; not inside emails like a@b.com */
const MENTION = /(^|[^\w.@])@([a-z0-9][a-z0-9._-]{0,63})/gi;

export function mentionedUsernames(text: string): string[] {
  const names = new Set<string>();
  for (const match of text.matchAll(MENTION)) {
    /* a sentence can end right after a name: "thanks @aquio.zxeno." */
    names.add(match[2].toLowerCase().replace(/[._-]+$/, ""));
  }
  return [...names];
}

/* Only real teammates who can actually read the message are notified: anyone
   in a shared channel, the people on a project's room, the other person in a
   direct message. Nobody is notified of their own mention. */
async function recordMentions(
  session: Session,
  messageId: string,
  text: string,
  room: string,
  dm: string | null,
  project: Record<string, any> | null,
) {
  const named = mentionedUsernames(text).filter((u) => u !== session.username);
  if (!named.length) return;
  const known = await query(`SELECT username FROM admin_users WHERE username = ANY($1)`, [named]);
  const people = known
    .map((r) => r.username as string)
    .filter((u) => (project ? assignedTo(project, u) : dm ? u === dm : true));
  if (!people.length) return;
  await query(
    `INSERT INTO admin_chat_mentions (message_id, username)
     SELECT $1, unnest($2::text[]) ON CONFLICT DO NOTHING`,
    [messageId, people],
  );

  /* and an email to each of them with an address on file, after the reply
     has gone back to the sender */
  const recipients = await query(
    `SELECT username, name, email FROM admin_users WHERE username = ANY($1) AND email <> ''`,
    [people],
  );
  if (!recipients.length) return;
  const author = await one(`SELECT name, email FROM admin_users WHERE username = $1`, [session.username]);
  /* where it was said, in the shape mentionPlace and mentionLink read */
  const row = { channel: room, recipient: dm, project_id: project?.id ?? null, project_name: project?.name ?? null, author: session.username };
  const authorName = String(author?.name || session.username);
  for (const person of recipients) {
    const firstName = String(person.name || person.username).trim().split(/\s+/)[0];
    sendLater(
      sendNotice(
        [String(person.email)],
        `${authorName} mentioned you in ${mentionPlace(row)}`,
        notice({
          eyebrow: "ZXENO HQ chat",
          title: `${authorName} mentioned you`,
          lines: [`Hi ${firstName}, ${authorName} mentioned you in ${mentionPlace(row)}:`, text.slice(0, 1200)],
          button: { label: "Open the conversation", href: `${ADMIN_ORIGIN}/chat?${mentionLink(row, String(person.username))}` },
          footer: "You're getting this because someone @mentioned you in ZXENO HQ.",
        }),
        author?.email ? String(author.email) : undefined,
      ),
      "a mention email",
    );
  }
}

const ADMIN_ORIGIN = "https://admin.zxenostudio.com";

/* This person's mentions they haven't read yet, newest first, with where
   each one was said so the client can link straight to it. */
export async function mentions(session: Session) {
  const rows = await query(
    `SELECT m.id::text AS id, m.author, u.name AS author_name, m.body, m.channel,
            m.recipient, m.project_id::text AS project_id, p.name AS project_name,
            m.created_at
       FROM admin_chat_mentions x
       JOIN admin_chat_messages m ON m.id = x.message_id AND m.deleted_at IS NULL
       JOIN admin_users u ON u.username = m.author
       LEFT JOIN admin_projects p ON p.id = m.project_id
      WHERE x.username = $1 AND x.read_at IS NULL
      ORDER BY m.id DESC LIMIT 20`,
    [session.username],
  );
  return rows.map((r) => ({
    ...camelRow(r),
    place: mentionPlace(r),
    link: mentionLink(r, session.username),
  }));
}

export async function readMentions(session: Session, ids: string[]) {
  if (!ids.length) return;
  await query(
    `UPDATE admin_chat_mentions SET read_at = now()
      WHERE username = $1 AND read_at IS NULL AND message_id = ANY($2::bigint[])`,
    [session.username, ids],
  );
}

/* People delete their own messages; executives can remove any. */
export async function remove(session: Session, id: string | null) {
  if (!id || !/^\d+$/.test(id)) throw notFound();
  const message = await one(
    `SELECT author,recipient,project_id FROM admin_chat_messages WHERE id = $1 AND deleted_at IS NULL`,
    [id],
  );
  if (!message || !(await visible(session,message))) throw notFound();
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
    `SELECT id,author,recipient,project_id FROM admin_chat_messages WHERE id = $1 AND deleted_at IS NULL`,
    [id],
  );
  if (!message || !(await visible(session,message))) throw notFound();
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
 const m=await load(id);if(!m||m.deletedAt||!(await visible(session,m)))throw notFound();
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
 /* one room per live project this person is assigned to; the list itself is
    the access check, so an unassigned project never appears */
 const projects=await query(`SELECT 'project:'||p.id::text AS conversation, p.id::text AS project_id, p.name, p.code,
   count(m.id)::int AS unread
  FROM admin_projects p
  LEFT JOIN admin_chat_reads r ON r.username=$1 AND r.conversation='project:'||p.id::text
  LEFT JOIN admin_chat_messages m ON m.project_id=p.id AND m.recipient IS NULL AND m.author<>$1
    AND m.deleted_at IS NULL AND m.id>coalesce(r.last_message_id,0)
  WHERE p.archived_at IS NULL AND p.status <> 'completed' AND (p.lead=$1 OR $1 = ANY(p.team))
  GROUP BY p.id, p.name, p.code ORDER BY p.name`,[s.username]);
 return [...shared,...direct,...projects.map(camelRow)];
}
