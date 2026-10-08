/* Simple fixed-window counters for public endpoints (password reset requests,
   inquiries). They share admin_login_failures, keyed by a prefix such as
   "reset-ip:<address>"; a row whose expires_at has passed counts as zero. */
import { query } from "./db.js";

/* Counts one attempt against each key and reports whether any of them is now
   past its limit. */
export async function overLimit(
  checks: { key: string; limit: number }[],
  minutes: number,
): Promise<boolean> {
  let over = false;
  for (const { key, limit } of checks) {
    const rows = await query(
      `INSERT INTO admin_login_failures AS f (key, count, expires_at)
       VALUES ($1, 1, now() + make_interval(mins => $2))
       ON CONFLICT (key) DO UPDATE SET
         count = CASE WHEN f.expires_at > now() THEN f.count + 1 ELSE 1 END,
         expires_at = CASE WHEN f.expires_at > now() THEN f.expires_at
                           ELSE excluded.expires_at END
       RETURNING count`,
      [key, minutes],
    );
    if (Number(rows[0]?.count) > limit) over = true;
  }
  return over;
}
