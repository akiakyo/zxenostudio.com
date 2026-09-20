/* Every workspace request goes through this one function, so the whole admin
   stays a handful of Vercel Functions (the Hobby plan allows 12). The last path
   segment picks the section: /api/admin/projects, /api/admin/calendar, … */
import { json, requireSession, sameOrigin, type Session } from "./auth.js";
import * as chat from "./chat.js";
import * as crud from "./crud.js";
import { databaseError, HttpError, readBody } from "./http.js";
import { RESOURCES } from "./resources.js";
import * as views from "./views.js";
import * as hq from './hq.js';

type Handler = (
  session: Session,
  request: Request,
  url: URL,
) => Promise<unknown>;

const VIEWS: Record<string, Partial<Record<string, Handler>>> = {
  finance: { GET: (_s,_r,url)=>hq.finance(url.searchParams) },
  'hq-summary': { GET: s=>hq.summary(s) },
  notifications: { GET: s=>hq.notifications(s), POST: async(s,r)=>hq.readNotifications(s,await readBody(r)) },
  dashboard: { GET: (s) => views.dashboard(s) },
  calendar: { GET: (s, _r, url) => views.calendar(s, url.searchParams) },
  deadlines: { GET: (s, _r, url) => views.deadlines(s, url.searchParams) },
  executive: { GET: (s) => views.executiveOverview(s) },
  activity: { GET: (_s, _r, url) => views.activity(url.searchParams) },
  team: {
    GET: () => views.team(),
    PATCH: async (s, r, url) =>
      views.updateMember(
        s,
        url.searchParams.get("username"),
        await readBody(r),
      ),
  },
  chat: {
    GET: (s, _r, url) => chat.read(s, url.searchParams),
    POST: async (s, r) => chat.send(s, await readBody(r)),
    DELETE: (s, _r, url) => chat.remove(s, url.searchParams.get("id")),
  },
  "chat-reactions": {
    POST: async (s, r) => chat.toggleReaction(s, await readBody(r)),
  },
  'chat-pins': { POST: async(s,r)=>chat.pin(s,await readBody(r)) },
  'chat-conversations': { GET: s=>chat.conversations(s) },
  profile: {
    GET: (s) => views.profile(s),
    PATCH: async (s, r) => views.updateProfile(s, await readBody(r)),
  },
};

async function dispatch(request: Request, session: Session, url: URL) {
  const name = url.pathname.split("/").filter(Boolean).pop() ?? "";
  const method = request.method;

  const view = Object.hasOwn(VIEWS, name) ? VIEWS[name] : undefined;
  if (view) {
    const handler = view[method];
    if (!handler) throw new HttpError(405, "Method not allowed");
    return handler(session, request, url);
  }

  const resource = Object.hasOwn(RESOURCES, name) ? RESOURCES[name] : undefined;
  if (!resource) throw new HttpError(404, "Not found");
  const id = url.searchParams.get("id");
  switch (method) {
    case "GET":
      return id
        ? crud.get(resource, session, id)
        : crud.list(resource, session, url.searchParams);
    case "POST":
      return crud.create(resource, session, await readBody(request));
    case "PATCH":
      if (!id) throw new HttpError(400, "id is required");
      return crud.update(resource, session, id, await readBody(request));
    case "DELETE":
      if (!id) throw new HttpError(400, "id is required");
      return crud.remove(resource, session, id);
    default:
      throw new HttpError(405, "Method not allowed");
  }
}

export async function handle(request: Request): Promise<Response> {
  if (request.method !== "GET" && !sameOrigin(request)) {
    return json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const session = await requireSession(request);
    if (!session) return json({ error: "Unauthorized" }, { status: 401 });
    const url = new URL(request.url);
    const result = await dispatch(request, session, url);
    return json(result, { status: request.method === "POST" ? 201 : 200 });
  } catch (error) {
    const known = error instanceof HttpError ? error : databaseError(error);
    if (known) return json({ error: known.message }, { status: known.status });
    console.error(error);
    return json({ error: "Something went wrong" }, { status: 500 });
  }
}
