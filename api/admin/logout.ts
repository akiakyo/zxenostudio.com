import { clearedCookie, json, sameOrigin } from "../_lib/auth.js";

export function POST(request: Request): Response {
  if (!sameOrigin(request)) {
    return json({ error: "Forbidden" }, { status: 403 });
  }
  return json(
    { ok: true },
    { status: 200, headers: { "set-cookie": clearedCookie() } },
  );
}
