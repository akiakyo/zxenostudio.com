import type { Session } from './auth.js';
import { camelRow } from './crud.js';
import { query, today } from './db.js';
import { CHANNELS } from './chat.js';
import { HttpError, isExecutive } from './http.js';

export async function finance(search:URLSearchParams){
 const year=search.get('year')||today().slice(0,4);
 if(!/^\d{4}$/.test(year)||Number(year)<2000||Number(year)>2100)throw new HttpError(400,'Choose a year from 2000 to 2100');
 const from=`${year}-01-01`,to=year===today().slice(0,4)?today():`${year}-12-31`;
 const [revenue,expenses,outstanding,breakdown]=await Promise.all([
  query(`SELECT substring(paid_date,1,7) AS month, sum(amount)::float8 AS amount FROM admin_invoices WHERE status='paid' AND paid_date BETWEEN $1 AND $2 GROUP BY 1`,[from,to]),
  query(`SELECT substring(date,1,7) AS month, sum(amount)::float8 AS amount FROM admin_expenses WHERE date BETWEEN $1 AND $2 GROUP BY 1`,[from,to]),
  query(`SELECT coalesce(sum(amount),0)::float8 AS amount, coalesce(sum(amount) FILTER (WHERE due_date < $1),0)::float8 AS overdue FROM admin_invoices WHERE status='sent'`,[today()]),
  query(`SELECT category, sum(amount)::float8 AS amount FROM admin_expenses WHERE date BETWEEN $1 AND $2 GROUP BY category ORDER BY sum(amount) DESC`,[from,to]),
 ]);
 const months=Array.from({length:12},(_,i)=>{const month=`${year}-${String(i+1).padStart(2,'0')}`;return {month,revenue:Number(revenue.find(r=>r.month===month)?.amount??0),expenses:Number(expenses.find(r=>r.month===month)?.amount??0)};});
 return {year,through:to,months,revenue:months.reduce((s,m)=>s+m.revenue,0),expenses:months.reduce((s,m)=>s+m.expenses,0),outstanding:outstanding[0].amount,overdue:outstanding[0].overdue,breakdown};
}

export async function notifications(s:Session){
 const rows=await query(`SELECT a.id::text, a.summary, a.action, a.entity_type, a.entity_id, a.created_at,
  u.name AS actor_name, r.activity_id IS NOT NULL AS read
  FROM admin_activity a JOIN admin_users u ON u.username=a.actor
  LEFT JOIN admin_notification_reads r ON r.activity_id=a.id AND r.username=$1
  WHERE a.actor<>$1 ORDER BY a.id DESC LIMIT 50`,[s.username]);
 return rows.map(camelRow);
}
export async function readNotifications(s:Session,body:Record<string,unknown>){
 const ids=body.ids;
 if(!Array.isArray(ids)||ids.length>50||ids.some(id=>typeof id!=='string'||!/^\d+$/.test(id)))throw new HttpError(400,'Choose up to 50 notifications');
 await query(`INSERT INTO admin_notification_reads(username,activity_id) SELECT $1,id FROM admin_activity WHERE id=ANY($2::bigint[]) ON CONFLICT DO NOTHING`,[s.username,ids]);
 return {ok:true};
}

/* Counts for the sidebar. Only what this person can act on: their own unread
   messages, and the approvals they are actually allowed to decide. */
export async function badges(s:Session){
 const [chat,approvals]=await Promise.all([
  query(`SELECT count(*)::int AS n FROM admin_chat_messages m
   LEFT JOIN admin_chat_reads r ON r.username=$1
    AND r.conversation=CASE WHEN m.recipient IS NULL THEN m.channel ELSE 'dm:'||m.author END
   WHERE m.deleted_at IS NULL AND m.author<>$1
     AND (m.recipient IS NULL OR m.recipient=$1)
     AND (m.recipient IS NOT NULL OR m.channel=ANY($2::text[]))
     AND m.id>coalesce(r.last_message_id,0)`,[s.username,CHANNELS]),
  query(`SELECT count(*)::int AS n FROM admin_approvals
   WHERE status='pending' AND ($2 OR reviewer=$1)`,[s.username,isExecutive(s)]),
 ]);
 return {chat:chat[0].n,approvals:approvals[0].n};
}

export async function summary(s:Session){
 const [approvals,projects,workload,people]=await Promise.all([
  query(`SELECT id,title,status,due_date FROM admin_approvals WHERE status='pending' ORDER BY due_date NULLS LAST LIMIT 5`),
  query(`SELECT status,count(*)::int AS count,coalesce(avg(progress),0)::float8 AS progress FROM admin_projects WHERE archived_at IS NULL GROUP BY status`),
  query(`SELECT c.*,u.name FROM admin_capacity c JOIN admin_users u ON u.username=c.member WHERE week_of=date_trunc('week',$1::date)::date::text ORDER BY c.hours::float/c.available DESC LIMIT 5`,[today()]),
  query(`SELECT work_status,count(*)::int AS count FROM admin_users GROUP BY work_status`),
 ]);
 const clock=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Manila',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date());
 const rooms=await query(`SELECT title,location,start_time,end_time FROM admin_events WHERE date=$1 AND start_time<=$2 AND end_time>$2 AND location<>'' ORDER BY start_time`,[today(),clock]);
 return {approvals:approvals.map(camelRow),projects,workload:workload.map(camelRow),people:people.map(camelRow),rooms:rooms.map(camelRow)};
}
