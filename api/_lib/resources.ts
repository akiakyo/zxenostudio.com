/* One declaration per list-and-form section. Permissions follow the model
   shown on the Roles & permissions page: every member creates and edits shared
   work; executives alone post announcements and delete projects, clients and
   invoices; people delete what they wrote; private tasks belong to their
   creator only. Keep that page (src/admin/pages/Roles.tsx) in step with this. */
import type { Session } from "./auth.js";
import { isUuid, type Resource } from "./crud.js";
import { one, Params, today, type Row } from "./db.js";
import { HttpError, isExecutive } from "./http.js";
import { HQ_RESOURCES } from './hq-resources.js';

const ownerOrExecutive = (session: Session, row: Row) =>
  row.createdBy === session.username || isExecutive(session);
const executiveOnly = (session: Session) => isExecutive(session);

const author = `LEFT JOIN admin_users au ON au.username = t.created_by`;
const authorName = `au.name AS created_by_name`;

function search(...columns: string[]) {
  return (value: string, p: Params) => {
    const pattern = p.add(`%${value.replace(/[\\%_]/g, "\\$&")}%`);
    return `(${columns.map((c) => `${c} ILIKE ${pattern}`).join(" OR ")})`;
  };
}

function equals(column: string, check?: (value: string) => boolean) {
  return (value: string, p: Params) =>
    !check || check(value) ? `${column} = ${p.add(value)}` : "false";
}

const PROJECT_STATUSES = [
  "planning",
  "active",
  "on_hold",
  "review",
  "completed",
] as const;

function projectDates(_s: Session, values: Map<string,unknown>, row:Row={}) {
 const start=values.has('start_date')?values.get('start_date'):row.startDate;
 const due=values.has('due_date')?values.get('due_date'):row.dueDate;
 if(start&&due&&String(start)>String(due))throw new HttpError(400,'Due date cannot be before the start date');
}

export const clients: Resource = {
  table: "admin_clients",
  entity: "client",
  fields: {
    name: { kind: "text", label: "Name", required: true, max: 120 },
    email: { kind: "email", label: "Email" },
    company: { kind: "text", label: "Company", max: 120 },
    phone: { kind: "text", label: "Phone", max: 40 },
    notes: { kind: "longtext", label: "Notes" },
    status: { kind: 'enum', label: 'Status', values: ['active','onboarding','paused','in_house'] },
    owner: { kind: 'user', label: 'Account owner' },
    agreement: { kind: 'text', label: 'Agreement' },
    industry: { kind: 'text', label: 'Industry' },
    palette: { kind: 'text', label: 'Brand colours' },
  },
  select: `t.*, ${authorName},
    (SELECT count(*)::int FROM admin_projects p WHERE p.client_id = t.id) AS project_count`,
  joins: author,
  order: "lower(t.name)",
  filters: { q: search("t.name", "t.company", "t.email") },
  title: (row) => row.name,
  canDelete: executiveOnly,
};

export const projects: Resource = {
  prepareCreate:projectDates,
  prepareUpdate:projectDates,
  table: "admin_projects",
  entity: "project",
  fields: {
    name: { kind: "text", label: "Project name", required: true, max: 140 },
    clientId: { kind: "uuid", label: "Client" },
    description: { kind: "longtext", label: "Description" },
    status: { kind: "enum", label: "Status", values: PROJECT_STATUSES },
    progress: { kind: "int", label: "Progress", min: 0, max: 100 },
    lead: { kind: 'user', label: 'Project lead' },
    team: { kind: 'users', label: 'Project team' },
    budget: { kind: 'money', label: 'Budget' },
    startDate: { kind: "date", label: "Start date" },
    dueDate: { kind: "date", label: "Due date" },
    archived: { kind: "stamp", label: "Archived", column: "archived_at" },
  },
  select: `t.*, t.budget::float8 AS budget,
    (SELECT coalesce(sum(e.amount),0)::float8 FROM admin_expenses e WHERE e.project_id=t.id) AS spent,
    t.archived_at IS NOT NULL AS archived, c.name AS client_name,
    ${authorName},
    (SELECT count(*)::int FROM admin_tasks k
      WHERE k.project_id = t.id AND NOT k.is_private) AS task_count,
    (SELECT count(*)::int FROM admin_tasks k
      WHERE k.project_id = t.id AND NOT k.is_private AND k.status = 'done') AS done_task_count,
    (SELECT min(m.due_date) FROM admin_milestones m
      WHERE m.project_id = t.id AND NOT m.done) AS next_milestone`,
  joins: `LEFT JOIN admin_clients c ON c.id = t.client_id ${author}`,
  order: "t.due_date IS NULL, t.due_date, t.created_at DESC",
  filters: {
    archived: (value) =>
      value === "1" ? "t.archived_at IS NOT NULL" : "t.archived_at IS NULL",
    status: equals("t.status"),
    clientId: equals("t.client_id", isUuid),
    q: search("t.name", "c.name"),
  },
  title: (row) => row.name,
  canDelete: executiveOnly,
  updateAction: (before, after) => {
    if (before.archived !== after.archived) {
      return after.archived ? "archived" : "restored";
    }
    if (before.status !== "completed" && after.status === "completed") {
      return "completed";
    }
    return "updated";
  },
  decorate: (row) => ({
    ...row,
    overdue:
      !row.archived &&
      row.status !== "completed" &&
      !!row.dueDate &&
      row.dueDate < today(),
  }),
};

export const milestones: Resource = {
  table: "admin_milestones",
  entity: "milestone",
  fields: {
    projectId: { kind: "uuid", label: "Project", required: true },
    title: { kind: "text", label: "Milestone", required: true, max: 140 },
    dueDate: { kind: "date", label: "Date", required: true },
    done: { kind: "bool", label: "Done" },
  },
  select: `t.*, p.name AS project_name`,
  joins: `JOIN admin_projects p ON p.id = t.project_id`,
  order: "t.due_date, t.created_at",
  filters: { projectId: equals("t.project_id", isUuid) },
  title: (row) => `${row.title} (${row.projectName})`,
  updateAction: (before, after) =>
    !before.done && after.done ? "completed" : "updated",
};

export const tasks: Resource = {
  table: "admin_tasks",
  entity: "task",
  fields: {
    title: { kind: "text", label: "Task", required: true, max: 200 },
    description: { kind: "longtext", label: "Description" },
    projectId: { kind: "uuid", label: "Project" },
    status: {
      kind: "enum",
      label: "Status",
      values: ["todo", "in_progress", "done"],
    },
    priority: {
      kind: "enum",
      label: "Priority",
      values: ["low", "medium", "high", "urgent"],
    },
    assignee: { kind: "user", label: "Assignee" },
    dueDate: { kind: "date", label: "Due date" },
    isPrivate: { kind: "bool", label: "Private" },
  },
  select: `t.*, p.name AS project_name, u.name AS assignee_name, ${authorName}`,
  joins: `LEFT JOIN admin_projects p ON p.id = t.project_id
    LEFT JOIN admin_users u ON u.username = t.assignee ${author}`,
  order: "t.due_date IS NULL, t.due_date, t.created_at DESC",
  visible: (session, p) =>
    `(NOT t.is_private OR t.created_by = ${p.add(session.username)})`,
  filters: {
    projectId: equals("t.project_id", isUuid),
    assignee: (value, p, session) =>
      `t.assignee = ${p.add(value === "me" ? session.username : value)}`,
    status: equals("t.status"),
    priority: equals("t.priority"),
    private: (value) => (value === "1" ? "t.is_private" : "NOT t.is_private"),
    archived: (value) =>
      value === "0" ? "(t.project_id IS NULL OR p.archived_at IS NULL)" : null,
    q: search("t.title", "t.description"),
  },
  title: (row) => row.title,
  canUpdate: (session, row) =>
    !row.isPrivate || row.createdBy === session.username,
  canDelete: (session, row) =>
    row.isPrivate
      ? row.createdBy === session.username
      : row.createdBy === session.username ||
        row.assignee === session.username ||
        isExecutive(session),
  prepareCreate: (session, values) => {
    /* a private task is always its creator's own */
    if (values.get("is_private")) values.set("assignee", session.username);
    if (values.get("status") === "done")
      values.set("completed_at", new Date().toISOString());
  },
  prepareUpdate: (session, values, row) => {
    if (values.has("is_private") && row.createdBy !== session.username) {
      throw new HttpError(
        403,
        "Only the person who made a task can change whether it is private",
      );
    }
    if (values.get("is_private") ?? row.isPrivate) {
      values.set("assignee", session.username);
    }
    if (values.has("status")) {
      const done = values.get("status") === "done";
      if (done && row.status !== "done") {
        values.set("completed_at", new Date().toISOString());
      }
      if (!done) values.set("completed_at", null);
    }
  },
  updateAction: (before, after) => {
    if (before.status !== "done" && after.status === "done") return "completed";
    if (before.assignee !== after.assignee && after.assignee) return "assigned";
    return "updated";
  },
  logged: (row) => !row.isPrivate,
  decorate: (row) => ({
    ...row,
    overdue: row.status !== "done" && !!row.dueDate && row.dueDate < today(),
  }),
};

async function nextInvoiceNumber(): Promise<string> {
  const year = today().slice(0, 4);
  const row = await one(
    `SELECT count(*)::int AS n FROM admin_invoices WHERE number LIKE $1`,
    [`ZX-${year}-%`],
  );
  return `ZX-${year}-${String((row?.n ?? 0) + 1).padStart(3, "0")}`;
}

export const invoices: Resource = {
  table: "admin_invoices",
  entity: "invoice",
  fields: {
    number: { kind: "text", label: "Invoice number", max: 40 },
    title: { kind: "text", label: "Description", required: true, max: 200 },
    projectId: { kind: "uuid", label: "Project" },
    clientId: { kind: "uuid", label: "Client" },
    amount: { kind: "money", label: "Amount", required: true },
    issueDate: { kind: "date", label: "Issue date" },
    dueDate: { kind: "date", label: "Due date" },
    status: {
      kind: "enum",
      label: "Status",
      values: ["draft", "sent", "paid", "void"],
    },
    paidDate: { kind: "date", label: "Paid date" },
    notes: { kind: "longtext", label: "Notes" },
  },
  select: `t.*, t.amount::float8 AS amount, p.name AS project_name,
    c.name AS client_name, c.company AS client_company, ${authorName}`,
  joins: `LEFT JOIN admin_projects p ON p.id = t.project_id
    LEFT JOIN admin_clients c ON c.id = t.client_id ${author}`,
  order: "t.issue_date DESC, t.created_at DESC",
  filters: {
    projectId: equals("t.project_id", isUuid),
    clientId: equals("t.client_id", isUuid),
    status: (value, p) =>
      value === "overdue"
        ? `(t.status = 'sent' AND t.due_date < ${p.add(today())})`
        : `t.status = ${p.add(value)}`,
    q: search("t.number", "t.title", "c.name"),
  },
  title: (row) => `${row.number} · ${row.title}`,
  canDelete: executiveOnly,
  prepareCreate: async (_session, values) => {
    if (!values.get("number")) values.set("number", await nextInvoiceNumber());
    if (!values.get("issue_date")) values.set("issue_date", today());
    if (values.get("status") === "paid" && !values.get("paid_date")) {
      values.set("paid_date", today());
    }
    /* an invoice raised from a project bills that project's client */
    const projectId = values.get("project_id");
    if (projectId && !values.get("client_id")) {
      const project = await one(
        `SELECT client_id FROM admin_projects WHERE id = $1`,
        [projectId],
      );
      if (project?.client_id) values.set("client_id", project.client_id);
    }
  },
  prepareUpdate: (_session, values, row) => {
    if (values.has("number") && !values.get("number")) values.delete("number");
    if (values.has("issue_date") && !values.get("issue_date")) {
      values.delete("issue_date");
    }
    if (values.get("status") === "paid" && row.status !== "paid") {
      if (!values.get("paid_date") && !row.paidDate) {
        values.set("paid_date", today());
      }
    }
  },
  updateAction: (before, after) =>
    before.status !== after.status ? `marked ${after.status}` : "updated",
  decorate: (row) => ({
    ...row,
    overdue: row.status === "sent" && !!row.dueDate && row.dueDate < today(),
  }),
};

export const assets: Resource = {
  table: "admin_assets",
  entity: "asset",
  fields: {
    name: { kind: "text", label: "Name", required: true, max: 160 },
    url: { kind: "url", label: "Link", required: true },
    kind: {
      kind: "enum",
      label: "Type",
      values: ["image", "video", "document", "3d", "audio", "design", "other"],
    },
    projectId: { kind: "uuid", label: "Project" },
    description: { kind: "longtext", label: "Description" },
    tags: { kind: "text", label: "Tags", max: 200 },
    folder: { kind: 'text', label: 'Folder' },
    sizeLabel: { kind: 'text', label: 'File size' },
  },
  select: `t.*, p.name AS project_name, ${authorName}`,
  joins: `LEFT JOIN admin_projects p ON p.id = t.project_id ${author}`,
  order: "t.created_at DESC",
  filters: {
    kind: equals("t.kind"),
    projectId: equals("t.project_id", isUuid),
    q: search("t.name", "t.tags", "t.description"),
  },
  title: (row) => row.name,
  canDelete: ownerOrExecutive,
};

export const announcements: Resource = {
  table: "admin_announcements",
  entity: "announcement",
  fields: {
    title: { kind: "text", label: "Title", required: true, max: 160 },
    body: { kind: "longtext", label: "Message", required: true },
    pinned: { kind: "bool", label: "Pinned" },
  },
  select: `t.*, ${authorName}, au.title AS created_by_title`,
  joins: author,
  order: "t.pinned DESC, t.created_at DESC",
  title: (row) => row.title,
  canCreate: executiveOnly,
  canUpdate: executiveOnly,
  canDelete: executiveOnly,
};

export const meetingNotes: Resource = {
  table: "admin_meeting_notes",
  entity: "meeting note",
  fields: {
    title: { kind: "text", label: "Title", required: true, max: 160 },
    meetingDate: { kind: "date", label: "Meeting date", required: true },
    projectId: { kind: "uuid", label: "Project" },
    attendees: { kind: "users", label: "Attendees" },
    body: { kind: "longtext", label: "Notes" },
  },
  select: `t.*, p.name AS project_name, ${authorName}`,
  joins: `LEFT JOIN admin_projects p ON p.id = t.project_id ${author}`,
  order: "t.meeting_date DESC, t.created_at DESC",
  filters: {
    projectId: equals("t.project_id", isUuid),
    q: search("t.title", "t.body"),
  },
  title: (row) => row.title,
  canDelete: ownerOrExecutive,
};

export const statusUpdates: Resource = {
  table: "admin_status_updates",
  entity: "weekly update",
  fields: {
    weekOf: { kind: "date", label: "Week of", required: true },
    projectId: { kind: "uuid", label: "Project" },
    done: { kind: "longtext", label: "Done this week", required: true },
    next: { kind: "longtext", label: "Next week" },
    blockers: { kind: "longtext", label: "Blockers" },
  },
  select: `t.*, p.name AS project_name, ${authorName}, au.title AS created_by_title`,
  joins: `LEFT JOIN admin_projects p ON p.id = t.project_id ${author}`,
  order: "t.week_of DESC, t.created_at DESC",
  filters: {
    projectId: equals("t.project_id", isUuid),
    author: equals("t.created_by"),
  },
  title: (row) =>
    `week of ${row.weekOf}${row.projectName ? ` · ${row.projectName}` : ""}`,
  canUpdate: ownerOrExecutive,
  canDelete: ownerOrExecutive,
  limit: 200,
};

export const feedback: Resource = {
  table: "admin_feedback",
  entity: "feedback",
  fields: {
    title: { kind: "text", label: "Title", required: true, max: 160 },
    projectId: { kind: "uuid", label: "Project" },
    assetId: { kind: "uuid", label: "Asset" },
    body: { kind: "longtext", label: "Feedback" },
    status: {
      kind: "enum",
      label: "Status",
      values: ["open", "in_progress", "resolved"],
    },
  },
  select: `t.*, p.name AS project_name, a.name AS asset_name, a.url AS asset_url,
    ${authorName},
    (SELECT count(*)::int FROM admin_feedback_comments fc
      WHERE fc.feedback_id = t.id) AS comment_count`,
  joins: `LEFT JOIN admin_projects p ON p.id = t.project_id
    LEFT JOIN admin_assets a ON a.id = t.asset_id ${author}`,
  order: "CASE t.status WHEN 'resolved' THEN 1 ELSE 0 END, t.updated_at DESC",
  filters: {
    status: equals("t.status"),
    projectId: equals("t.project_id", isUuid),
  },
  title: (row) => row.title,
  canDelete: ownerOrExecutive,
  updateAction: (before, after) =>
    before.status !== "resolved" && after.status === "resolved"
      ? "resolved"
      : "updated",
};

export const feedbackComments: Resource = {
  table: "admin_feedback_comments",
  entity: "comment",
  fields: {
    feedbackId: { kind: "uuid", label: "Feedback", required: true },
    body: { kind: "longtext", label: "Comment", required: true },
  },
  select: `t.*, f.title AS feedback_title, ${authorName}, au.title AS created_by_title`,
  joins: `JOIN admin_feedback f ON f.id = t.feedback_id ${author}`,
  order: "t.created_at",
  filters: { feedbackId: equals("t.feedback_id", isUuid) },
  title: (row) => `on ${row.feedbackTitle}`,
  canUpdate: (session, row) => row.createdBy === session.username,
  canDelete: ownerOrExecutive,
};

export const briefs: Resource = {
  table: "admin_briefs",
  entity: "creative brief",
  fields: {
    title: { kind: "text", label: "Title", required: true, max: 160 },
    projectId: { kind: "uuid", label: "Project" },
    clientId: { kind: "uuid", label: "Client" },
    objective: { kind: "longtext", label: "Objective" },
    audience: { kind: "longtext", label: "Audience" },
    deliverables: { kind: "longtext", label: "Deliverables" },
    keyMessage: { kind: "longtext", label: "Key message" },
    tone: { kind: "text", label: "Tone", max: 200 },
    referenceNotes: { kind: "longtext", label: "References" },
    budget: { kind: "money", label: "Budget" },
    dueDate: { kind: "date", label: "Due date" },
    status: {
      kind: "enum",
      label: "Status",
      values: ["draft", "in_review", "approved"],
    },
  },
  select: `t.*, t.budget::float8 AS budget, p.name AS project_name,
    c.name AS client_name, ${authorName}`,
  joins: `LEFT JOIN admin_projects p ON p.id = t.project_id
    LEFT JOIN admin_clients c ON c.id = t.client_id ${author}`,
  order: "t.updated_at DESC",
  filters: {
    status: equals("t.status"),
    projectId: equals("t.project_id", isUuid),
    q: search("t.title", "t.objective"),
  },
  title: (row) => row.title,
  canDelete: ownerOrExecutive,
  updateAction: (before, after) =>
    before.status !== "approved" && after.status === "approved"
      ? "approved"
      : "updated",
};

export const RESOURCES: Record<string, Resource> = {
  ...HQ_RESOURCES,
  clients,
  projects,
  milestones,
  tasks,
  invoices,
  assets,
  announcements,
  "meeting-notes": meetingNotes,
  "status-updates": statusUpdates,
  feedback,
  "feedback-comments": feedbackComments,
  briefs,
};
