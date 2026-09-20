/* A small engine behind every list-and-form section of the admin: one
   declaration per table says which fields a person may send, how to validate
   them, who may change or delete a row, and how rows are listed. The router
   turns GET / POST / PATCH / DELETE into the matching operation here. */
import type { Session } from "./auth.js";
import { one, Params, query, today, type Row } from "./db.js";
import { forbidden, HttpError, notFound } from "./http.js";
import { USERNAME_PATTERN } from "./users.js";

type Base = { label: string; required?: boolean; column?: string };
export type Field = Base &
  (
    | { kind: "text"; max?: number }
    | { kind: "longtext" }
    | { kind: "email" }
    | { kind: "url" }
    | { kind: "date" }
    | { kind: "int"; min: number; max: number }
    | { kind: "money" }
    | { kind: "enum"; values: readonly string[] }
    | { kind: "bool" }
    | { kind: "uuid" }
    | { kind: "user" }
    | { kind: "users" }
    /* true stores the current time, false clears it (e.g. archived_at) */
    | { kind: "stamp" }
  );

export type Values = Map<string, unknown>;

export type Resource = {
  table: string;
  /* Singular noun for the activity feed, e.g. "project". */
  entity: string;
  fields: Record<string, Field>;
  /* Select list over the table aliased as t, plus any joins. */
  select: string;
  joins?: string;
  order: string;
  /* Query-string filters: each returns a SQL condition using p.add(value). */
  filters?: Record<
    string,
    (value: string, p: Params, session: Session) => string | null
  >;
  /* A condition every row must meet to be seen by this person at all. */
  visible?: (session: Session, p: Params) => string;
  title: (row: Row) => string;
  canCreate?: (session: Session) => boolean;
  canUpdate?: (session: Session, row: Row) => boolean;
  canDelete?: (session: Session, row: Row) => boolean;
  prepareCreate?: (session: Session, values: Values) => void | Promise<void>;
  prepareUpdate?: (
    session: Session,
    values: Values,
    row: Row,
  ) => void | Promise<void>;
  /* Verb for the activity feed when a row changes; defaults to "updated". */
  updateAction?: (before: Row, after: Row) => string;
  logged?: (row: Row) => boolean;
  decorate?: (row: Row) => Row;
  limit?: number;
  optimistic?: boolean;
};

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function snake(key: string): string {
  return key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
}

export function camelRow(row: Row): Row {
  const out: Row = {};
  for (const [key, value] of Object.entries(row)) {
    out[key.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase())] = value;
  }
  return out;
}

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value);
}

export function isDate(value: unknown): value is string {
  if (typeof value !== "string" || !DATE.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return (
    !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(value)
  );
}

function coerce(field: Field, raw: unknown): unknown {
  const bad = (why: string) => new HttpError(400, `${field.label} ${why}`);
  const empty =
    raw === null ||
    raw === undefined ||
    (typeof raw === "string" && raw.trim() === "");
  if (empty) {
    if (field.required) throw bad("is required");
    switch (field.kind) {
      case "text":
      case "longtext":
      case "email":
      case "url":
        return "";
      case "bool":
      case "stamp":
        return field.kind === "bool" ? false : null;
      case "users":
        return [];
      case "enum":
      case "int":
        throw bad("is required");
      default:
        return null;
    }
  }
  switch (field.kind) {
    case "text":
    case "longtext": {
      if (typeof raw !== "string") throw bad("must be text");
      const value = raw.trim();
      const max = field.kind === "text" ? (field.max ?? 200) : 20_000;
      if (value.length > max) throw bad(`must be ${max} characters or fewer`);
      return value;
    }
    case "email": {
      if (typeof raw !== "string" || !EMAIL.test(raw.trim())) {
        throw bad("must be an email address");
      }
      return raw.trim().slice(0, 200);
    }
    case "url": {
      try {
        const url = new URL(String(raw).trim());
        if (url.protocol !== "https:" && url.protocol !== "http:") throw 0;
        return url.toString().slice(0, 2000);
      } catch {
        throw bad("must be a web link starting with https://");
      }
    }
    case "date":
      if (!isDate(raw)) throw bad("must be a date");
      return raw;
    case "int": {
      const value = typeof raw === "string" ? Number(raw) : raw;
      if (
        typeof value !== "number" ||
        !Number.isInteger(value) ||
        value < field.min ||
        value > field.max
      ) {
        throw bad(`must be a whole number from ${field.min} to ${field.max}`);
      }
      return value;
    }
    case "money": {
      const value = typeof raw === "string" ? Number(raw) : raw;
      if (
        typeof value !== "number" ||
        !Number.isFinite(value) ||
        value < 0 ||
        value >= 1e12
      ) {
        throw bad("must be an amount of zero or more");
      }
      return Math.round(value * 100) / 100;
    }
    case "enum":
      if (typeof raw !== "string" || !field.values.includes(raw)) {
        throw bad("is not a valid choice");
      }
      return raw;
    case "bool":
    case "stamp":
      if (typeof raw !== "boolean") throw bad("must be true or false");
      if (field.kind === "stamp") return raw ? new Date().toISOString() : null;
      return raw;
    case "uuid":
      if (!isUuid(raw)) throw bad("is not a valid choice");
      return raw;
    case "user":
      if (typeof raw !== "string" || !USERNAME_PATTERN.test(raw)) {
        throw bad("is not a team member");
      }
      return raw;
    case "users": {
      if (
        !Array.isArray(raw) ||
        raw.length > 50 ||
        !raw.every((u) => typeof u === "string" && USERNAME_PATTERN.test(u))
      ) {
        throw bad("must be team members");
      }
      return [...new Set(raw as string[])];
    }
  }
}

export function parseFields(
  fields: Record<string, Field>,
  body: Record<string, unknown>,
  mode: "create" | "update",
): Values {
  const values: Values = new Map();
  for (const [key, field] of Object.entries(fields)) {
    if (!Object.prototype.hasOwnProperty.call(body, key)) {
      if (mode === "create" && field.required) {
        throw new HttpError(400, `${field.label} is required`);
      }
      continue;
    }
    values.set(field.column ?? snake(key), coerce(field, body[key]));
  }
  return values;
}

/* team members named in a users field must exist */
async function checkUsers(values: Values) {
  const names = new Set<string>();
  for (const value of values.values()) {
    if (Array.isArray(value)) value.forEach((u) => names.add(u));
  }
  if (!names.size) return;
  const rows = await query(
    `SELECT username FROM admin_users WHERE username = ANY($1)`,
    [[...names]],
  );
  if (rows.length !== names.size) {
    throw new HttpError(400, "Attendees must be team members");
  }
}

export async function logActivity(
  session: Session,
  action: string,
  entityType: string,
  entityId: string,
  summary: string,
) {
  await query(
    `INSERT INTO admin_activity (actor, action, entity_type, entity_id, summary)
     VALUES ($1, $2, $3, $4, $5)`,
    [session.username, action, entityType, entityId, summary.slice(0, 300)],
  );
}

async function fetchRow(
  resource: Resource,
  session: Session,
  id: string,
): Promise<Row | null> {
  if (!isUuid(id)) return null;
  const p = new Params();
  const conditions = [`t.id = ${p.add(id)}`];
  if (resource.visible) conditions.push(resource.visible(session, p));
  const row = await one(
    `SELECT ${resource.select} FROM ${resource.table} t ${resource.joins ?? ""}
     WHERE ${conditions.join(" AND ")}`,
    p.values,
  );
  return row ? present(resource, row) : null;
}

function present(resource: Resource, row: Row): Row {
  const out = camelRow(row);
  return resource.decorate ? resource.decorate(out) : out;
}

export async function list(
  resource: Resource,
  session: Session,
  search: URLSearchParams,
) {
  const p = new Params();
  const conditions: string[] = [];
  if (resource.visible) conditions.push(resource.visible(session, p));
  for (const [name, filter] of Object.entries(resource.filters ?? {})) {
    const value = search.get(name);
    if (value === null || value === "") continue;
    const condition = filter(value, p, session);
    if (condition) conditions.push(condition);
  }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const rows = await query(
    `SELECT ${resource.select} FROM ${resource.table} t ${resource.joins ?? ""}
     ${where} ORDER BY ${resource.order} LIMIT ${resource.limit ?? 500}`,
    p.values,
  );
  return rows.map((row) => present(resource, row));
}

export async function get(resource: Resource, session: Session, id: string) {
  const row = await fetchRow(resource, session, id);
  if (!row) throw notFound();
  return row;
}

export async function create(
  resource: Resource,
  session: Session,
  body: Record<string, unknown>,
) {
  if (resource.canCreate && !resource.canCreate(session)) throw forbidden();
  const values = parseFields(resource.fields, body, "create");
  await resource.prepareCreate?.(session, values);
  await checkUsers(values);
  values.set("created_by", session.username);
  const p = new Params();
  const columns = [...values.keys()];
  const placeholders = columns.map((column) => p.add(values.get(column)));
  const inserted = await one(
    `INSERT INTO ${resource.table} (${columns.join(", ")})
     VALUES (${placeholders.join(", ")}) RETURNING id`,
    p.values,
  );
  const row = (await fetchRow(resource, session, inserted!.id))!;
  if (resource.logged?.(row) ?? true) {
    await logActivity(
      session,
      "created",
      resource.entity,
      row.id,
      resource.title(row),
    );
  }
  return row;
}

export async function update(
  resource: Resource,
  session: Session,
  id: string,
  body: Record<string, unknown>,
) {
  const before = await fetchRow(resource, session, id);
  if (!before) throw notFound();
  if (resource.canUpdate && !resource.canUpdate(session, before)) {
    throw forbidden();
  }
  const values = parseFields(resource.fields, body, "update");
  await resource.prepareUpdate?.(session, values, before);
  if (!values.size) return before;
  await checkUsers(values);
  const p = new Params();
  const sets = [...values].map(
    ([column, value]) => `${column} = ${p.add(value)}`,
  );
  const updated = await query(
    `UPDATE ${resource.table} SET ${sets.join(", ")}, updated_at = now()
     ${resource.optimistic ? ', lock_version = lock_version + 1' : ''}
     WHERE id = ${p.add(id)} ${resource.optimistic ? `AND lock_version = ${p.add(before.lockVersion)}` : ''} RETURNING id`,
    p.values,
  );
  if (!updated.length) throw new HttpError(409, 'This record changed. Refresh before trying again.');
  const after = (await fetchRow(resource, session, id))!;
  if (resource.logged?.(after) ?? true) {
    await logActivity(
      session,
      resource.updateAction?.(before, after) ?? "updated",
      resource.entity,
      id,
      resource.title(after),
    );
  }
  return after;
}

export async function remove(resource: Resource, session: Session, id: string) {
  const row = await fetchRow(resource, session, id);
  if (!row) throw notFound();
  if (resource.canDelete && !resource.canDelete(session, row)) {
    throw forbidden();
  }
  await query(`DELETE FROM ${resource.table} WHERE id = $1`, [id]);
  if (resource.logged?.(row) ?? true) {
    await logActivity(
      session,
      "deleted",
      resource.entity,
      id,
      resource.title(row),
    );
  }
  return { ok: true };
}

export { today };
