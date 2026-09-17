/* Vercel Routing Middleware: splits one deployment into two sites by hostname.
   It runs before static files are matched, which vercel.json rewrites do not —
   a rewrite could never replace the main site's dist/index.html on "/".
     admin.zxenostudio.com   every page path serves the admin app
     any other host          /admin is not found, so the admin app only
                             exists on its own subdomain */
import { next, rewrite } from "@vercel/functions";

const ADMIN_HOST = "admin.zxenostudio.com";

export const config = {
  /* API routes, bundled assets and fonts pass straight through on every host. */
  matcher: "/((?!api/|assets/|fonts/).*)",
};

export default function middleware(request: Request): Response {
  const url = new URL(request.url);
  if (url.hostname === ADMIN_HOST) {
    return rewrite(new URL("/admin/index.html", url));
  }
  if (url.pathname === "/admin" || url.pathname.startsWith("/admin/")) {
    /* No such file, so Vercel answers with 404.html and a 404 status. */
    return rewrite(new URL("/__not-found", url));
  }
  return next();
}
