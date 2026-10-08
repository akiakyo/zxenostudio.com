/* Forgot-password flow, open to signed-out visitors:
     POST { username }                ask for a reset link by email
     POST { token }                   check a link before showing the form
     POST { token, newPassword }      set the password and sign in */
import { json, sameOrigin, sessionCookie } from "../_lib/auth.js";
import { HttpError } from "../_lib/http.js";
import { MAX_PASSWORD_LENGTH } from "../_lib/password.js";
import { checkReset, completeReset, requestReset } from "../_lib/resets.js";
import { clientIp, normalizeUsername, USERNAME_PATTERN } from "../_lib/users.js";

export async function POST(request: Request): Promise<Response> {
  if (!sameOrigin(request)) {
    return json({ error: "Forbidden" }, { status: 403 });
  }
  let body: { username?: unknown; token?: unknown; newPassword?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid request" }, { status: 400 });
  }
  try {
    if (typeof body.token === "string") {
      if (body.newPassword === undefined) {
        return json({ valid: (await checkReset(body.token)) !== null });
      }
      const next = typeof body.newPassword === "string" ? body.newPassword : "";
      if (next.length > MAX_PASSWORD_LENGTH) {
        return json({ error: "That password is too long" }, { status: 400 });
      }
      const { username, passwordChangedAt } = await completeReset(body.token, next);
      return json(
        { ok: true, username },
        { headers: { "set-cookie": sessionCookie(username, passwordChangedAt) } },
      );
    }
    const username = normalizeUsername(body.username);
    if (!USERNAME_PATTERN.test(username)) {
      return json({ error: "Enter your username" }, { status: 400 });
    }
    await requestReset(request, username, clientIp(request));
    /* the same answer for every username, real or not */
    return json({ ok: true });
  } catch (error) {
    if (error instanceof HttpError) {
      return json({ error: error.message }, { status: error.status });
    }
    console.error(error);
    return json({ error: "Something went wrong" }, { status: 500 });
  }
}
