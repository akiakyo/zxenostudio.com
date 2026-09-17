/* Admin accounts and login throttling. Tables are defined in db/schema.sql;
   accounts are created by scripts/seed-admins.ts. */
import { one, query } from "./db.js";

export type Access = "executive" | "member";

export type User = {
  username: string;
  passwordHash: string;
  mustChangePassword: boolean;
  /* Milliseconds. Sessions carry the value they were issued under, so changing
     the password ends every other session for that account. */
  passwordChangedAt: number;
  name: string;
  title: string;
  access: Access;
};

export const USERNAME_PATTERN = /^[a-z0-9._-]{1,64}$/;

export function normalizeUsername(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export async function getUser(username: string): Promise<User | null> {
  if (!USERNAME_PATTERN.test(username)) return null;
  const row = await one(
    `SELECT username, password_hash, must_change_password, password_changed_at,
            name, title, access
     FROM admin_users WHERE username = $1`,
    [username],
  );
  if (!row) return null;
  return {
    username: row.username,
    passwordHash: row.password_hash,
    mustChangePassword: row.must_change_password,
    /* bigint arrives as a string */
    passwordChangedAt: Number(row.password_changed_at),
    name: row.name,
    title: row.title,
    access: row.access,
  };
}

export async function setPassword(
  username: string,
  passwordHash: string,
  passwordChangedAt: number,
): Promise<void> {
  await query(
    `UPDATE admin_users
     SET password_hash = $1, must_change_password = false,
         password_changed_at = $2
     WHERE username = $3`,
    [passwordHash, passwordChangedAt, username],
  );
}

/* Failed attempts are counted per account and per client IP over a 15 minute
   window. Past either limit, sign-in is refused until the window ends. */
const LIMITS = { user: 5, ip: 20 };

export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return (
    forwarded?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function isLockedOut(
  username: string,
  ip: string,
): Promise<boolean> {
  const rows = await query(
    `SELECT key, count FROM admin_login_failures
     WHERE key IN ($1, $2) AND expires_at > now()`,
    [`user:${username}`, `ip:${ip}`],
  );
  return rows.some((row) =>
    row.key.startsWith("user:")
      ? row.count >= LIMITS.user
      : row.count >= LIMITS.ip,
  );
}

export async function recordFailure(username: string, ip: string) {
  await query(
    `INSERT INTO admin_login_failures AS f (key, count, expires_at)
     VALUES ($1, 1, now() + interval '15 minutes'),
            ($2, 1, now() + interval '15 minutes')
     ON CONFLICT (key) DO UPDATE SET
       count = CASE WHEN f.expires_at > now() THEN f.count + 1 ELSE 1 END,
       expires_at = CASE WHEN f.expires_at > now() THEN f.expires_at
                         ELSE excluded.expires_at END`,
    [`user:${username}`, `ip:${ip}`],
  );
}

export async function clearFailures(username: string) {
  await query(`DELETE FROM admin_login_failures WHERE key = $1`, [
    `user:${username}`,
  ]);
}
