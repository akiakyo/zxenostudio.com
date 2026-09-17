import { json, readSession, sameOrigin, sessionCookie } from "../_lib/auth.js";
import {
  defaultPassword,
  hashPassword,
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
  verifyPassword,
} from "../_lib/password.js";
import { getUser, setPassword } from "../_lib/users.js";

export async function POST(request: Request): Promise<Response> {
  if (!sameOrigin(request)) {
    return json({ error: "Forbidden" }, { status: 403 });
  }
  const session = await readSession(request);
  if (!session) return json({ error: "Unauthorized" }, { status: 401 });

  let body: { currentPassword?: unknown; newPassword?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid request" }, { status: 400 });
  }
  const current =
    typeof body.currentPassword === "string" ? body.currentPassword : "";
  const next = typeof body.newPassword === "string" ? body.newPassword : "";

  const user = await getUser(session.username);
  if (!user) return json({ error: "Unauthorized" }, { status: 401 });
  if (!current || !verifyPassword(current, user.passwordHash)) {
    return json({ error: "Current password is incorrect" }, { status: 400 });
  }
  if (next.length < MIN_PASSWORD_LENGTH || next.length > MAX_PASSWORD_LENGTH) {
    return json(
      {
        error: `New password must be at least ${MIN_PASSWORD_LENGTH} characters`,
      },
      { status: 400 },
    );
  }
  if (next === current || next === defaultPassword(session.username)) {
    return json(
      { error: "Choose a password you have not used for this account" },
      { status: 400 },
    );
  }

  const passwordChangedAt = Date.now();
  await setPassword(session.username, hashPassword(next), passwordChangedAt);
  /* Other sessions for this account now fail their passwordChangedAt check;
     this one gets a fresh cookie so the person stays signed in. */
  return json(
    { ok: true },
    {
      status: 200,
      headers: {
        "set-cookie": sessionCookie(session.username, passwordChangedAt),
      },
    },
  );
}
