/* Admin accounts and login throttling, stored in Neon Postgres (connected to
   the Vercel project through the Marketplace, which sets DATABASE_URL).
   Tables are defined in db/schema.sql; accounts are created by
   scripts/seed-admins.ts. */
import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

export type User = {
  passwordHash: string;
  mustChangePassword: boolean;
  /* Milliseconds. Sessions carry the value they were issued under, so changing
     the password ends every other session for that account. */
  passwordChangedAt: number;
};

let client: NeonQueryFunction<false, false> | undefined;
function sql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Missing environment variable DATABASE_URL");
  return (client ??= neon(url));
}

export function normalizeUsername(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export async function getUser(username: string): Promise<User | null> {
  if (!/^[a-z0-9._-]{1,64}$/.test(username)) return null;
  const rows = await sql()`
    SELECT password_hash, must_change_password, password_changed_at
    FROM admin_users WHERE username = ${username}`;
  const row = rows[0];
  if (!row) return null;
  return {
    passwordHash: row.password_hash,
    mustChangePassword: row.must_change_password,
    /* bigint arrives as a string */
    passwordChangedAt: Number(row.password_changed_at),
  };
}

export async function setPassword(
  username: string,
  passwordHash: string,
  passwordChangedAt: number,
): Promise<void> {
  await sql()`
    UPDATE admin_users
    SET password_hash = ${passwordHash},
        must_change_password = false,
        password_changed_at = ${passwordChangedAt}
    WHERE username = ${username}`;
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
  const rows = await sql()`
    SELECT key, count FROM admin_login_failures
    WHERE key IN (${`user:${username}`}, ${`ip:${ip}`}) AND expires_at > now()`;
  return rows.some((row) =>
    row.key.startsWith("user:")
      ? row.count >= LIMITS.user
      : row.count >= LIMITS.ip,
  );
}

export async function recordFailure(username: string, ip: string) {
  await sql()`
    INSERT INTO admin_login_failures AS f (key, count, expires_at)
    VALUES (${`user:${username}`}, 1, now() + interval '15 minutes'),
           (${`ip:${ip}`}, 1, now() + interval '15 minutes')
    ON CONFLICT (key) DO UPDATE SET
      count = CASE WHEN f.expires_at > now() THEN f.count + 1 ELSE 1 END,
      expires_at = CASE WHEN f.expires_at > now() THEN f.expires_at
                        ELSE excluded.expires_at END`;
}

export async function clearFailures(username: string) {
  await sql()`DELETE FROM admin_login_failures WHERE key = ${`user:${username}`}`;
}
