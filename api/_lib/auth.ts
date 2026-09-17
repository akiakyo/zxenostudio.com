/* Admin sessions for admin.zxenostudio.com.
   The cookie carries the username, an expiry and the account's
   passwordChangedAt, signed with HMAC-SHA256 using ADMIN_SESSION_SECRET
   (32+ random bytes, a Vercel environment variable). Each request re-reads the
   account, so a deleted account or a changed password ends the session.
   Rotating ADMIN_SESSION_SECRET ends every session at once.
   Files under api/_lib are not deployed as functions (leading underscore). */
import { createHmac, timingSafeEqual } from "node:crypto";
import { getUser } from "./users.js";

export const COOKIE_NAME = "__Host-zxeno_admin";
const SESSION_SECONDS = 8 * 60 * 60;

function secret(): string {
  const value = process.env.ADMIN_SESSION_SECRET;
  if (!value) throw new Error("Missing environment variable ADMIN_SESSION_SECRET");
  return value;
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function sessionCookie(username: string, passwordChangedAt: number) {
  const exp = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
  const payload = Buffer.from(
    JSON.stringify({ u: username, exp, pv: passwordChangedAt }),
  ).toString("base64url");
  const token = `${payload}.${sign(payload)}`;
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_SECONDS}`;
}

export function clearedCookie(): string {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}

export type Session = {
  username: string;
  expiresAt: number;
  mustChangePassword: boolean;
};

function readToken(request: Request) {
  const header = request.headers.get("cookie") ?? "";
  const match = header
    .split(/;\s*/)
    .find((part) => part.startsWith(`${COOKIE_NAME}=`));
  if (!match) return null;
  const [payload, signature] = match.slice(COOKIE_NAME.length + 1).split(".");
  if (!payload || !signature) return null;
  const expected = Buffer.from(sign(payload));
  const actual = Buffer.from(signature);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    return null;
  }
  try {
    const { u, exp, pv } = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    );
    if (typeof u !== "string" || typeof exp !== "number") return null;
    if (typeof pv !== "number" || exp * 1000 <= Date.now()) return null;
    return { username: u, expiresAt: exp * 1000, passwordVersion: pv };
  } catch {
    return null;
  }
}

/* Any signed-in session, including one that still has to replace its starting
   password. Only the password endpoint should accept that; everything else
   uses requireSession. */
export async function readSession(request: Request): Promise<Session | null> {
  const token = readToken(request);
  if (!token) return null;
  const user = await getUser(token.username);
  if (!user || user.passwordChangedAt !== token.passwordVersion) return null;
  return {
    username: token.username,
    expiresAt: token.expiresAt,
    mustChangePassword: user.mustChangePassword,
  };
}

/* For admin endpoints: a session that has set its own password. */
export async function requireSession(
  request: Request,
): Promise<Session | null> {
  const session = await readSession(request);
  return session && !session.mustChangePassword ? session : null;
}

/* State-changing requests must come from the page's own origin. SameSite=Strict
   already keeps the cookie off cross-site requests; this is the second layer. */
export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
}

export function json(body: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json");
  headers.set("cache-control", "no-store");
  return new Response(JSON.stringify(body), { ...init, headers });
}
