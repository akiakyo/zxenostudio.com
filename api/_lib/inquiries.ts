/* Project inquiries from the public site. Visitors send them through the
   booking form (api/inquiry.ts); the team works them on the Inquiries page,
   and "Add as client" turns one into a client and a lead in the pipeline. */
import type { Session } from "./auth.js";
import { camelRow, EMAIL, isUuid, logActivity, type Resource } from "./crud.js";
import { one, Params, query } from "./db.js";
import { HttpError, isExecutive } from "./http.js";
import { overLimit } from "./limits.js";
import { notice, sendLater, sendNotice } from "./notices.js";

export const INQUIRY_STATUSES = ["new", "contacted", "converted", "archived"] as const;
const ADMIN_URL = "https://admin.zxenostudio.com/inquiries";

export const inquiries: Resource = {
  table: "admin_inquiries",
  entity: "inquiry",
  fields: {
    status: { kind: "enum", label: "Status", values: INQUIRY_STATUSES },
    owner: { kind: "user", label: "Owner" },
    notes: { kind: "longtext", label: "Notes" },
  },
  select: "t.*, o.name AS owner_name, c.name AS client_name",
  joins:
    "LEFT JOIN admin_users o ON o.username = t.owner LEFT JOIN admin_clients c ON c.id = t.client_id",
  order: "(t.status = 'new') DESC, t.created_at DESC",
  filters: {
    status: (value, p) =>
      value === "open"
        ? `t.status IN ('new', 'contacted')`
        : (INQUIRY_STATUSES as readonly string[]).includes(value)
          ? `t.status = ${p.add(value)}`
          : "false",
    q: (value, p) => {
      const pattern = p.add(`%${value.replace(/[\\%_]/g, "\\$&")}%`);
      return `(t.name ILIKE ${pattern} OR t.email ILIKE ${pattern} OR t.company ILIKE ${pattern} OR t.message ILIKE ${pattern})`;
    },
  },
  title: (row) => (row.company ? `${row.name} (${row.company})` : row.name),
  /* they only ever arrive from the public form */
  canCreate: () => false,
  canDelete: (session) => isExecutive(session),
};

type Field = { max: number; required?: boolean; label: string };
const FIELDS: Record<string, Field> = {
  name: { max: 120, required: true, label: "Your name" },
  email: { max: 200, required: true, label: "Email" },
  company: { max: 160, label: "Company" },
  service: { max: 120, label: "Service" },
  message: { max: 5000, required: true, label: "Project overview" },
  timeline: { max: 160, label: "Timeline" },
  budget: { max: 160, label: "Budget" },
  preferredTime: { max: 200, label: "Preferred call time" },
};

/* The public form. Returns nothing a visitor could learn from. */
export async function submit(body: Record<string, unknown>, ip: string) {
  /* a field people never see; anything that fills it in is a bot, and it
     gets the same thank-you without anything being stored */
  if (typeof body.website === "string" && body.website.trim()) return;

  const values: Record<string, string> = {};
  for (const [key, field] of Object.entries(FIELDS)) {
    const raw = body[key];
    const value = typeof raw === "string" ? raw.trim() : "";
    if (field.required && !value) throw new HttpError(400, `${field.label} is required`);
    if (value.length > field.max) {
      throw new HttpError(400, `${field.label} must be ${field.max} characters or fewer`);
    }
    values[key] = value;
  }
  if (!EMAIL.test(values.email)) throw new HttpError(400, "Enter a valid email address");

  if (await overLimit([{ key: `inquiry-ip:${ip}`, limit: 5 }], 60)) {
    throw new HttpError(429, "We've received several requests from you already. Please email zxenostudio@gmail.com instead.");
  }

  const row = await one(
    `INSERT INTO admin_inquiries
       (name, email, company, service, message, timeline, budget, preferred_time)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id`,
    [
      values.name,
      values.email,
      values.company,
      values.service,
      values.message,
      values.timeline,
      values.budget,
      values.preferredTime,
    ],
  );

  /* let the executives know by email, without making the visitor wait */
  const people = await query(
    `SELECT email FROM admin_users WHERE access = 'executive' AND email <> ''`,
  );
  if (people.length) {
    const lines: (string | [string, string])[] = [
      ["From", values.company ? `${values.name}, ${values.company}` : values.name],
      ["Email", values.email],
      ...(values.service ? [["Service", values.service] as [string, string]] : []),
      ...(values.timeline ? [["Timeline", values.timeline] as [string, string]] : []),
      ...(values.budget ? [["Budget", values.budget] as [string, string]] : []),
      ...(values.preferredTime ? [["Call time", values.preferredTime] as [string, string]] : []),
      values.message,
    ];
    sendLater(
      sendNotice(
        people.map((p) => String(p.email)),
        `New inquiry: ${values.company || values.name}`,
        notice({
          eyebrow: "New inquiry",
          title: values.service ? `${values.name} · ${values.service}` : values.name,
          lines,
          button: { label: "Open in Studio HQ", href: `${ADMIN_URL}?id=${row!.id}` },
          footer: "Sent from the booking form on zxenostudio.com. Reply to this email to answer them directly.",
        }),
        values.email,
      ),
      "an inquiry alert",
    );
  }
}

/* Creates a client and a lead deal from an inquiry and links them to it. */
export async function convert(session: Session, body: Record<string, any>) {
  const id = body.id;
  if (!isUuid(id)) throw new HttpError(400, "Invalid request");
  const inquiry = await one(`SELECT * FROM admin_inquiries WHERE id = $1`, [id]);
  if (!inquiry) throw new HttpError(404, "Not found");
  if (inquiry.client_id) throw new HttpError(409, "This inquiry is already a client");

  const details = [
    inquiry.service && `Service: ${inquiry.service}`,
    inquiry.timeline && `Timeline: ${inquiry.timeline}`,
    inquiry.budget && `Budget: ${inquiry.budget}`,
  ].filter(Boolean);
  const notes = [
    `From the website inquiry on ${new Date(inquiry.created_at).toISOString().slice(0, 10)}.`,
    ...details,
    "",
    inquiry.message,
  ].join("\n");
  const client = await one(
    `INSERT INTO admin_clients (name, email, company, notes, status, created_by)
     VALUES ($1, $2, $3, $4, 'onboarding', $5) RETURNING id`,
    [inquiry.name, inquiry.email, inquiry.company, notes.slice(0, 20_000), session.username],
  );
  const title = `${inquiry.service || "New project"} · ${inquiry.company || inquiry.name}`;
  await query(
    `INSERT INTO admin_deals (title, client_id, owner, amount, stage, next_step, created_by)
     VALUES ($1, $2, $3, 0, 'lead', $4, $3)`,
    [title.slice(0, 200), client!.id, session.username, "Reply to the website inquiry and book a call"],
  );
  await query(
    `UPDATE admin_inquiries
     SET status = 'converted', client_id = $1, owner = coalesce(owner, $2), updated_at = now()
     WHERE id = $3`,
    [client!.id, session.username, id],
  );
  await logActivity(session, "converted", "inquiry", id, inquiry.company || inquiry.name);
  const p = new Params();
  const row = await one(
    `SELECT ${inquiries.select} FROM admin_inquiries t ${inquiries.joins} WHERE t.id = ${p.add(id)}`,
    p.values,
  );
  return camelRow(row!);
}
