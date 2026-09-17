import { json, readSession } from "../_lib/auth.js";

export async function GET(request: Request): Promise<Response> {
  const session = await readSession(request);
  if (!session) return json({ error: "Unauthorized" }, { status: 401 });
  return json(session);
}
