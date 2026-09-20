/* Read-mostly endpoints that combine several tables: the dashboard, calendar,
   deadlines, the executive overview, the activity feed, the team and each
   person's own profile. */
import type { Session } from "./auth.js";
import { camelRow, isDate, isUuid, logActivity, parseFields } from "./crud.js";
import { one, Params, query, today, type Row } from "./db.js";
import { HttpError, requireExecutive } from "./http.js";
import { USERNAME_PATTERN } from "./users.js";

export type CalendarEvent = {
  type: "project" | "milestone" | "task" | "invoice" | "event";
  id: string;
  projectId: string | null;
  projectName: string | null;
  title: string;
  date: string;
  status: string;
  done: boolean;
  assignee: string | null;
  assigneeName: string | null;
  isPrivate: boolean;
};

/* Everything with a date on it, across projects, milestones, tasks and
   invoices. Archived projects and their work are left out; other people's
   private tasks never appear. */
export async function events(
  session: Session,
  range: { from: string; to: string; projectId?: string | null },
): Promise<CalendarEvent[]> {
  const p = new Params();
  const from = p.add(range.from);
  const to = p.add(range.to);
  const me = p.add(session.username);
  const project = range.projectId ? p.add(range.projectId) : null;
  const onProject = (column: string) =>
    project ? `AND ${column} = ${project}` : "";
  const rows = await query(
    `SELECT 'project' AS type, pr.id::text AS id, pr.id::text AS project_id,
            pr.name AS project_name, pr.name AS title, pr.due_date AS date,
            pr.status, pr.status = 'completed' AS done,
            NULL::text AS assignee, NULL::text AS assignee_name,
            false AS is_private
       FROM admin_projects pr
      WHERE pr.archived_at IS NULL AND pr.due_date BETWEEN ${from} AND ${to}
            ${onProject("pr.id")}
     UNION ALL
     SELECT 'milestone', m.id::text, pr.id::text, pr.name, m.title, m.due_date,
            CASE WHEN m.done THEN 'done' ELSE 'open' END, m.done,
            NULL, NULL, false
       FROM admin_milestones m JOIN admin_projects pr ON pr.id = m.project_id
      WHERE pr.archived_at IS NULL AND m.due_date BETWEEN ${from} AND ${to}
            ${onProject("pr.id")}
     UNION ALL
     SELECT 'task', k.id::text, pr.id::text, pr.name, k.title, k.due_date,
            k.status, k.status = 'done', k.assignee, u.name, k.is_private
       FROM admin_tasks k
       LEFT JOIN admin_projects pr ON pr.id = k.project_id
       LEFT JOIN admin_users u ON u.username = k.assignee
      WHERE (NOT k.is_private OR k.created_by = ${me})
        AND (k.project_id IS NULL OR pr.archived_at IS NULL)
        AND k.due_date BETWEEN ${from} AND ${to}
            ${onProject("k.project_id")}
     UNION ALL
     SELECT 'invoice', i.id::text, pr.id::text, pr.name,
            i.number || ' · ' || i.title, i.due_date,
            i.status, i.status IN ('paid', 'void'), NULL, NULL, false
       FROM admin_invoices i
       LEFT JOIN admin_projects pr ON pr.id = i.project_id
      WHERE i.status <> 'void' AND i.due_date BETWEEN ${from} AND ${to}
            ${onProject("i.project_id")}
     UNION ALL
     SELECT 'event', e.id::text, e.project_id::text, pr.name,
            e.start_time || ' · ' || e.title, e.date, e.kind, e.date < ${p.add(today())}, NULL, NULL, false
       FROM admin_events e LEFT JOIN admin_projects pr ON pr.id=e.project_id
      WHERE e.date BETWEEN ${from} AND ${to} ${onProject('e.project_id')}
     ORDER BY date, type, title`,
    p.values,
  );
  return rows.map((row) => camelRow(row) as CalendarEvent);
}

export async function calendar(session: Session, search: URLSearchParams) {
  const from = search.get("from");
  const to = search.get("to");
  if (!isDate(from) || !isDate(to) || from > to) {
    throw new HttpError(400, "from and to must be dates");
  }
  const projectId = search.get("projectId");
  return events(session, {
    from,
    to,
    projectId: isUuid(projectId) ? projectId : null,
  });
}

export async function deadlines(session: Session, search: URLSearchParams) {
  const days = Math.min(Math.max(Number(search.get("days")) || 30, 1), 365);
  const now = today();
  const all = await events(session, { from: "0000-01-01", to: today(days) });
  const open = all.filter((event) => !event.done);
  const mine = search.get("mine") === "1";
  const relevant = mine
    ? open.filter((e) => e.type !== "task" || e.assignee === session.username)
    : open;
  return {
    today: now,
    overdue: relevant.filter((event) => event.date < now),
    upcoming: relevant.filter((event) => event.date >= now),
  };
}

const ACTIVITY_SELECT = `SELECT a.id::text AS id, a.actor, u.name AS actor_name,
    a.action, a.entity_type, a.entity_id, a.summary, a.created_at
  FROM admin_activity a JOIN admin_users u ON u.username = a.actor`;

export async function activity(search: URLSearchParams) {
  const limit = Math.min(Math.max(Number(search.get("limit")) || 50, 1), 100);
  const before = search.get("before");
  const p = new Params();
  const conditions: string[] = [];
  if (before && /^\d+$/.test(before))
    conditions.push(`a.id < ${p.add(before)}`);
  const actor = search.get("actor");
  if (actor && USERNAME_PATTERN.test(actor)) {
    conditions.push(`a.actor = ${p.add(actor)}`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const rows = await query(
    `${ACTIVITY_SELECT} ${where} ORDER BY a.id DESC LIMIT ${limit}`,
    p.values,
  );
  return rows.map(camelRow);
}

export async function dashboard(session: Session) {
  const now = today();
  const me = session.username;
  const [stats, myTasks, upcoming, announcements, recent, updates, projects] =
    await Promise.all([
      one(
        `SELECT
          (SELECT count(*)::int FROM admin_projects
            WHERE archived_at IS NULL AND status <> 'completed') AS active_projects,
          (SELECT count(*)::int FROM admin_tasks
            WHERE assignee = $1 AND NOT is_private AND status <> 'done') AS my_open_tasks,
          (SELECT count(*)::int FROM admin_tasks
            WHERE assignee = $1 AND status <> 'done' AND due_date < $2
              AND (NOT is_private OR created_by = $1)) AS my_overdue_tasks,
          (SELECT count(*)::int FROM admin_feedback WHERE status <> 'resolved') AS open_feedback`,
        [me, now],
      ),
      query(
        `SELECT t.id, t.title, t.status, t.priority, t.due_date,
                p.name AS project_name, t.project_id
           FROM admin_tasks t LEFT JOIN admin_projects p ON p.id = t.project_id
          WHERE t.assignee = $1 AND NOT t.is_private AND t.status <> 'done'
          ORDER BY t.due_date IS NULL, t.due_date, t.created_at DESC LIMIT 6`,
        [me],
      ),
      events(session, { from: "0000-01-01", to: today(14) }),
      query(
        `SELECT t.id, t.title, t.body, t.pinned, t.created_at,
                u.name AS created_by_name, u.title AS created_by_title
           FROM admin_announcements t JOIN admin_users u ON u.username = t.created_by
          ORDER BY t.pinned DESC, t.created_at DESC LIMIT 3`,
      ),
      query(`${ACTIVITY_SELECT} ORDER BY a.id DESC LIMIT 10`),
      query(
        `SELECT t.id, t.week_of, t.done, t.next, t.blockers, t.created_at,
                p.name AS project_name, u.name AS created_by_name,
                u.title AS created_by_title
           FROM admin_status_updates t
           JOIN admin_users u ON u.username = t.created_by
           LEFT JOIN admin_projects p ON p.id = t.project_id
          ORDER BY t.week_of DESC, t.created_at DESC LIMIT 4`,
      ),
      query(
        `SELECT id, name, status, progress, due_date FROM admin_projects
          WHERE archived_at IS NULL AND status <> 'completed'
          ORDER BY due_date IS NULL, due_date LIMIT 5`,
      ),
    ]);
  const open = upcoming.filter((event) => !event.done);
  return {
    today: now,
    stats: {
      ...camelRow(stats!),
      dueThisWeek: open.filter((e) => e.date >= now && e.date <= today(7))
        .length,
    },
    myTasks: myTasks.map(camelRow),
    deadlines: open.slice(0, 8),
    announcements: announcements.map(camelRow),
    activity: recent.map(camelRow),
    statusUpdates: updates.map(camelRow),
    projects: projects.map(camelRow),
  };
}

export async function executiveOverview(session: Session) {
  requireExecutive(session);
  const now = today();
  const month = now.slice(0, 7);
  const year = now.slice(0, 4);
  const [money, overdueProjects, atRisk, workload, executives] =
    await Promise.all([
      one(
        `SELECT
          coalesce(sum(amount) FILTER (WHERE status = 'paid' AND paid_date LIKE $1), 0)::float8 AS paid_this_month,
          coalesce(sum(amount) FILTER (WHERE status = 'paid' AND paid_date LIKE $2), 0)::float8 AS paid_this_year,
          coalesce(sum(amount) FILTER (WHERE status = 'sent'), 0)::float8 AS outstanding,
          count(*) FILTER (WHERE status = 'sent')::int AS outstanding_count,
          coalesce(sum(amount) FILTER (WHERE status = 'sent' AND due_date < $3), 0)::float8 AS overdue,
          count(*) FILTER (WHERE status = 'sent' AND due_date < $3)::int AS overdue_count,
          count(*) FILTER (WHERE status = 'draft')::int AS draft_count
         FROM admin_invoices`,
        [`${month}-%`, `${year}-%`, now],
      ),
      query(
        `SELECT p.id, p.name, p.status, p.progress, p.due_date, c.name AS client_name
           FROM admin_projects p LEFT JOIN admin_clients c ON c.id = p.client_id
          WHERE p.archived_at IS NULL AND p.status <> 'completed' AND p.due_date < $1
          ORDER BY p.due_date`,
        [now],
      ),
      query(
        `SELECT p.id, p.name, p.status, p.progress, p.due_date, c.name AS client_name
           FROM admin_projects p LEFT JOIN admin_clients c ON c.id = p.client_id
          WHERE p.archived_at IS NULL AND p.status <> 'completed'
            AND p.due_date BETWEEN $1 AND $2 AND p.progress < 75
          ORDER BY p.due_date`,
        [now, today(14)],
      ),
      query(
        `SELECT u.username, u.name, u.title,
            count(t.id) FILTER (WHERE t.status <> 'done')::int AS open_tasks,
            count(t.id) FILTER (WHERE t.status <> 'done' AND t.due_date < $1)::int AS overdue_tasks,
            count(t.id) FILTER (WHERE t.status = 'done' AND t.completed_at > now() - interval '7 days')::int AS done_this_week
           FROM admin_users u
           LEFT JOIN admin_tasks t ON t.assignee = u.username AND NOT t.is_private
          GROUP BY u.username ORDER BY open_tasks DESC, u.name`,
        [now],
      ),
      query(
        `SELECT username, name, title, phone FROM admin_users
          WHERE access = 'executive' ORDER BY name`,
      ),
    ]);
  const projectCounts = await one(
    `SELECT count(*) FILTER (WHERE status <> 'completed')::int AS active,
            count(*) FILTER (WHERE status = 'completed')::int AS completed
       FROM admin_projects WHERE archived_at IS NULL`,
  );
  return {
    today: now,
    money: camelRow(money!),
    projects: camelRow(projectCounts!),
    overdueProjects: overdueProjects.map(camelRow),
    atRiskProjects: atRisk.map(camelRow),
    workload: workload.map(camelRow),
    executives: executives.map(camelRow),
  };
}

const MEMBER_COLUMNS = `u.username, u.name, u.title, u.access, u.phone, u.bio, u.department, u.work_status,
  (SELECT count(*)::int FROM admin_tasks t
    WHERE t.assignee = u.username AND NOT t.is_private AND t.status <> 'done') AS open_tasks`;

export async function team() {
  const rows = await query(
    `SELECT ${MEMBER_COLUMNS} FROM admin_users u
      ORDER BY u.access = 'executive' DESC, u.name`,
  );
  return rows.map(camelRow);
}

/* Executives set a member's title and access. At least one executive must
   remain, so nobody can lock the studio out of this page. */
export async function updateMember(
  session: Session,
  username: string | null,
  body: Record<string, unknown>,
) {
  requireExecutive(session);
  if (!username || !USERNAME_PATTERN.test(username)) {
    throw new HttpError(404, "Not found");
  }
  const member = await one(
    `SELECT access FROM admin_users WHERE username = $1`,
    [username],
  );
  if (!member) throw new HttpError(404, "Not found");
  const values = parseFields(
    {
      title: { kind: "text", label: "Role", required: true, max: 80 },
      access: {
        kind: "enum",
        label: "Access",
        values: ["executive", "member"],
      },
    },
    body,
    "update",
  );
  if (!values.size) throw new HttpError(400, "Nothing to change");
  if (member.access === "executive" && values.get("access") === "member") {
    const others = await one(
      `SELECT count(*)::int AS n FROM admin_users
        WHERE access = 'executive' AND username <> $1`,
      [username],
    );
    if (!others?.n) {
      throw new HttpError(400, "The studio needs at least one executive");
    }
  }
  const p = new Params();
  const sets = [...values].map(
    ([column, value]) => `${column} = ${p.add(value)}`,
  );
  await query(
    `UPDATE admin_users SET ${sets.join(", ")} WHERE username = ${p.add(username)}`,
    p.values,
  );
  const row = await one(
    `SELECT ${MEMBER_COLUMNS} FROM admin_users u WHERE u.username = $1`,
    [username],
  );
  const updated = camelRow(row!);
  await logActivity(
    session,
    "changed the role of",
    "member",
    username,
    `${updated.name || username} → ${updated.title} (${updated.access})`,
  );
  return updated;
}

export async function profile(session: Session) {
  const row = await one(
    `SELECT username, name, title, access, phone, bio, department, work_status FROM admin_users
      WHERE username = $1`,
    [session.username],
  );
  return camelRow(row!);
}

/* People edit their own name, phone and bio; username and role stay fixed. */
export async function updateProfile(
  session: Session,
  body: Record<string, unknown>,
) {
  const values = parseFields(
    {
      name: { kind: "text", label: "Name", required: true, max: 80 },
      phone: { kind: "text", label: "Phone", max: 40 },
      bio: { kind: "text", label: "Bio", max: 1000 },
      department: {kind:'text',label:'Department',max:80},
      workStatus: {kind:'enum',label:'Work status',values:['studio','remote','shoot','off']},
    },
    body,
    "update",
  );
  if (values.size) {
    const p = new Params();
    const sets = [...values].map(
      ([column, value]) => `${column} = ${p.add(value)}`,
    );
    await query(
      `UPDATE admin_users SET ${sets.join(", ")}
        WHERE username = ${p.add(session.username)}`,
      p.values,
    );
  }
  return profile(session);
}

export type { Row };
