import { json, sameOrigin, sessionCookie } from "../_lib/auth.js";
import {
  hashPassword,
  MAX_PASSWORD_LENGTH,
  verifyPassword,
} from "../_lib/password.js";
import {
  clearFailures,
  clientIp,
  getUser,
  isLockedOut,
  normalizeUsername,
  recordFailure,
} from "../_lib/users.js";

/* Checked against when the account does not exist, so a wrong username takes
   as long as a wrong password and response time reveals nothing. */
const DUMMY_HASH = hashPassword("not-a-real-account");

export async function POST(request: Request): Promise<Response> {
  if (!sameOrigin(request)) {
    return json({ error: "Forbidden" }, { status: 403 });
  }
  let body: { username?: unknown; password?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid request" }, { status: 400 });
  }
  const username = normalizeUsername(body.username);
  const password = typeof body.password === "string" ? body.password : "";
  if (!username || !password || password.length > MAX_PASSWORD_LENGTH) {
    return json({ error: "Invalid username or password" }, { status: 401 });
  }

  const ip = clientIp(request);
  if (await isLockedOut(username, ip)) {
    return json(
      { error: "Too many attempts. Try again in 15 minutes." },
      { status: 429 },
    );
  }

  const user = await getUser(username);
  const passwordOk = verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !passwordOk) {
    await recordFailure(username, ip);
    return json({ error: "Invalid username or password" }, { status: 401 });
  }

  await clearFailures(username);
  return json(
    { username, mustChangePassword: user.mustChangePassword },
    {
      status: 200,
      headers: {
        "set-cookie": sessionCookie(username, user.passwordChangedAt),
      },
    },
  );
}
