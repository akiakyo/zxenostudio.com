/* The public site's booking form posts here. Open to anyone, so it is
   same-origin only, rate limited per address, and stores nothing but the
   inquiry itself. */
import { json, sameOrigin } from "./_lib/auth.js";
import { HttpError } from "./_lib/http.js";
import { submit } from "./_lib/inquiries.js";
import { clientIp } from "./_lib/users.js";

export async function POST(request: Request): Promise<Response> {
  if (!sameOrigin(request)) {
    return json({ error: "Forbidden" }, { status: 403 });
  }
  let body: Record<string, unknown>;
  try {
    const parsed = await request.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw 0;
    body = parsed;
  } catch {
    return json({ error: "Invalid request" }, { status: 400 });
  }
  try {
    await submit(body, clientIp(request));
    return json({ ok: true }, { status: 201 });
  } catch (error) {
    if (error instanceof HttpError) {
      return json({ error: error.message }, { status: error.status });
    }
    console.error(error);
    return json(
      { error: "Something went wrong. Please email zxenostudio@gmail.com instead." },
      { status: 500 },
    );
  }
}
