import type { Session } from "./auth.js";

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export const forbidden = () =>
  new HttpError(403, "You do not have permission to do that");
export const notFound = () => new HttpError(404, "Not found");

export function isExecutive(session: Session): boolean {
  return session.access === "executive";
}

export function requireExecutive(session: Session) {
  if (!isExecutive(session)) {
    throw new HttpError(403, "Only executives can do that");
  }
}

export async function readBody(request: Request): Promise<Record<string, any>> {
  try {
    const body = await request.json();
    if (body && typeof body === "object" && !Array.isArray(body)) return body;
  } catch {}
  throw new HttpError(400, "Invalid request");
}

/* Postgres constraint errors become messages a person can act on. */
export function databaseError(error: unknown): HttpError | null {
  const code = (error as { code?: string })?.code;
  if (code === "23503") {
    return new HttpError(400, "A linked item no longer exists");
  }
  if (code === "23505") return new HttpError(409, "That already exists");
  if (code === "23514" || code === "22P02") {
    return new HttpError(400, "One of the values is not allowed");
  }
  return null;
}
