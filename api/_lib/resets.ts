/* Forgotten passwords. Someone enters their username; if the account has an
   email address on file, a one-time link is sent to it. The answer is the same
   whether or not the account exists or has an address, so the form can't be
   used to find out who works here. Executives can also put an account back to
   its starting password from the Roles & permissions page. */
import { createHash, randomBytes } from "node:crypto";
import type { Session } from "./auth.js";
import { logActivity } from "./crud.js";
import { one, query } from "./db.js";
import { HttpError, requireExecutive } from "./http.js";
import { overLimit } from "./limits.js";
import { notice, sendLater, sendNotice } from "./notices.js";
import {
  defaultPassword,
  hashPassword,
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
} from "./password.js";
import { getUser, setPassword, USERNAME_PATTERN } from "./users.js";

const LINK_MINUTES = 30;
const ADMIN_ORIGIN = "https://admin.zxenostudio.com";

const digest = (token: string) =>
  createHash("sha256").update(token).digest("base64url");

/* Links always point at the real admin host, never at whatever Host header
   the request arrived with, so a forged header can't redirect a reset link.
   Local development is the one exception. */
function origin(request: Request): string {
  const url = new URL(request.url);
  return url.hostname === "127.0.0.1" || url.hostname === "localhost"
    ? url.origin
    : ADMIN_ORIGIN;
}

export async function requestReset(
  request: Request,
  username: string,
  ip: string,
): Promise<void> {
  if (
    await overLimit(
      [
        { key: `reset-user:${username}`, limit: 3 },
        { key: `reset-ip:${ip}`, limit: 10 },
      ],
      15,
    )
  ) {
    throw new HttpError(429, "Too many requests. Try again in 15 minutes.");
  }
  const user = await getUser(username);
  if (!user) return;
  const row = await one(`SELECT email FROM admin_users WHERE username = $1`, [
    username,
  ]);
  const email = String(row?.email ?? "").trim();
  if (!email) return;

  const token = randomBytes(32).toString("base64url");
  /* only the newest link works */
  await query(`DELETE FROM admin_password_resets WHERE username = $1`, [username]);
  await query(
    `INSERT INTO admin_password_resets (token_hash, username, expires_at)
     VALUES ($1, $2, now() + make_interval(mins => $3))`,
    [digest(token), username, LINK_MINUTES],
  );
  /* the token rides in the fragment, which browsers never send to a server
     or put in a Referer header */
  const link = `${origin(request)}/reset-password#${token}`;
  const firstName = user.name.trim().split(/\s+/)[0] || username;
  sendLater(sendNotice(
    [email],
    "Reset your ZXENO HQ password",
    notice({
      eyebrow: "ZXENO HQ",
      title: "Reset your password",
      lines: [
        `Hi ${firstName},`,
        `Someone asked to reset the password for ${username}. The link below works once, for the next ${LINK_MINUTES} minutes.`,
        "If that wasn't you, ignore this email. Your password stays as it is.",
      ],
      button: { label: "Choose a new password", href: link },
      footer: "ZXENO Studio HQ · admin.zxenostudio.com",
    }),
  ), "a password reset link");
}

/* Checks a link without using it, so the page can say early that it expired. */
export async function checkReset(token: string): Promise<string | null> {
  if (!/^[A-Za-z0-9_-]{20,100}$/.test(token)) return null;
  const row = await one(
    `SELECT username FROM admin_password_resets
     WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()`,
    [digest(token)],
  );
  return row?.username ?? null;
}

/* Sets the new password and returns the account, which the endpoint signs in. */
export async function completeReset(token: string, next: string) {
  const username = await checkReset(token);
  if (!username) {
    throw new HttpError(400, "This reset link has expired or was already used. Ask for a new one.");
  }
  if (next.length < MIN_PASSWORD_LENGTH || next.length > MAX_PASSWORD_LENGTH) {
    throw new HttpError(400, `New password must be at least ${MIN_PASSWORD_LENGTH} characters`);
  }
  if (next === defaultPassword(username)) {
    throw new HttpError(400, "Choose a password you have not used for this account");
  }
  /* claim the link first, so two tabs can't both use it */
  const claimed = await query(
    `UPDATE admin_password_resets SET used_at = now()
     WHERE token_hash = $1 AND used_at IS NULL RETURNING username`,
    [digest(token)],
  );
  if (!claimed.length) {
    throw new HttpError(400, "This reset link has expired or was already used. Ask for a new one.");
  }
  const passwordChangedAt = Date.now();
  /* also ends every session the account had */
  await setPassword(username, hashPassword(next), passwordChangedAt);
  await query(`DELETE FROM admin_login_failures WHERE key = $1`, [`user:${username}`]);
  return { username, passwordChangedAt };
}

/* Executives only: back to <username>123, to be replaced at the next sign-in,
   for someone with no email on file. */
export async function resetToStarting(session: Session, body: Record<string, any>) {
  requireExecutive(session);
  const username = typeof body.username === "string" ? body.username : "";
  if (!USERNAME_PATTERN.test(username)) throw new HttpError(400, "Invalid request");
  if (username === session.username) {
    throw new HttpError(400, "Change your own password in Settings");
  }
  const user = await getUser(username);
  if (!user) throw new HttpError(404, "Not found");
  await query(
    `UPDATE admin_users
     SET password_hash = $1, must_change_password = true, password_changed_at = $2
     WHERE username = $3`,
    [hashPassword(defaultPassword(username)), Date.now(), username],
  );
  await query(`DELETE FROM admin_password_resets WHERE username = $1`, [username]);
  await query(`DELETE FROM admin_login_failures WHERE key = $1`, [`user:${username}`]);
  /* reads "Aky reset the password of teammate James" */
  await logActivity(session, "reset the password of", "teammate", username, user.name || username);
  return { ok: true, startingPassword: defaultPassword(username) };
}
