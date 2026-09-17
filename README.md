# ZXENO Studio

React + TypeScript + Vite. Native SVG logo portal, procedural Three.js studio composition, and the studio's actual films.

```sh
npm install
npm run dev
npm run build
npm run preview
```

The dev server runs at http://127.0.0.1:5173. `dist/` is the deployable static site.

## Brand palette

Defined once as custom properties at the top of `src/style.css`. Off-white is the ground, green is the accent, and the WebGL scenes in `logo-scene.ts` / `tools-scene.ts` mirror the same values as hex literals.

| Token          | Value     | Role                                                                                                          |
| -------------- | --------- | ------------------------------------------------------------------------------------------------------------- |
| `--brand`      | `#55A630` | Brand green: fills, bands, buttons. Ink on it is 6.9:1.                                                       |
| `--brand-text` | `#4A9227` | Green display text on paper, 3.4:1 — clears AA for large text, which `--brand` alone does not.                |
| `--brand-deep` | `#2F6B1E` | Small green text and hairlines on paper, 5.7:1.                                                               |
| `--brand-lift` | `#8FD45F` | Green on the dark sections, 11.8:1 on ink.                                                                    |
| `--brand-soft` | `#DFE8D4` | Pale green wash for hovers.                                                                                   |
| `--paper`      | `#F2F1EC` | Warm off-white ground.                                                                                        |
| `--ink`        | `#0F1E09` | Typography and the dark grounds. A near-black carrying the brand hue rather than pure black, 15.3:1 on paper. |

Section grounds come from `data-tone` on each `<section>` (`paper`, `green`, `dark`); the fixed navigation reads the tone of whatever sits beneath it and recolours to match.

### Light and dark

Both themes are defined as two token sets: `:root` and `:root[data-theme="dark"]`. `--ink` and `--paper` are roles rather than fixed colours — `--ink` is always the reading contrast and `--paper` the recessive surface — so every ink/paper pair in the stylesheet inverts on its own. Surfaces that must stay dark in either theme (the film player, the reel portal, video mattes) use `--contrast` instead, and text sitting on bright brand green uses `--on-brand`.

The toggle is the Lucide sun/moon button in the navigation. An explicit choice is stored in `localStorage` under `zxeno-theme` and wins from then on; with nothing stored the site follows `prefers-color-scheme` and keeps following it if the system flips. A small inline script in `index.html` resolves the theme before first paint so there is no light flash. `tools-scene.ts` reads `--tool-body`, `--tool-side` and `--tool-symbol` from the stylesheet and repaints its materials when `data-theme` changes, so the WebGL tools follow the page.

## Motion

`src/reveal.ts` handles entrance motion. Display headings are split into per-line spans at their `<br>` boundaries and rise out of a mask, staggered; everything else fades up as it reaches the reveal line. Absolutely positioned children (the contact arrow) are left out of the split so a mask cannot clip them into a corner.

The trigger is a scroll sweep rather than an `IntersectionObserver`, deliberately. An observer got two cases wrong: content in the final screenful could never satisfy a negative bottom `rootMargin` and stayed invisible permanently, and fast or programmatic scrolling let elements pass through without a callback ever firing. The sweep reveals anything at or above the line, including anything already scrolled past, so no element can end up stranded at `opacity: 0`. Under `prefers-reduced-motion` nothing is split or transitioned — everything is simply marked visible.

Accent words share one voice: `MOTION`, `POSSIBILITIES` and the contact heading's `MATTER.` are Georgia italic in `--brand-text`, set by the `.accent` class.

## Content and media

- `src/content.tsx`: homepage projects, role-based disciplines, and the 12-member team directory. The 10 supplied member emails are linked; Kierre Paolo uses `zaevara.zxeno@gmail.com` as confirmed. John Kenneth Bergonio and V1nks have no supplied email, so none is invented.
- `src/App.tsx`: React page composition and experience lifecycle.
- `src/experience.ts`: intro handoff, media and player wiring, and hashless in-page navigation — section links scroll and focus without ever writing a fragment, so the address bar stays on a bare `/`. A shared `/#section` link still lands on that section, then drops the fragment.
- `src/components/Sections.tsx`: homepage sections, navigation and custom film player.
- `src/logo-scene.ts`: actual extruded ZXENO logo geometry, beveled edges, perspective and directional lighting.
- `src/intro.ts`: 3D assembly, handoff to the original `Main Logo.png` luminance mask, organic SVG openings, and transition into the hero. Plays once per tab session, with a skip control during the intro.
- `src/tools-scene.ts`: actual beveled WebGL objects and extruded tool symbols. The scene spans the whole creative section; dragging a tool moves that tool freely within the section (clamped to the visible plane so it cannot leave), while dragging empty space still turns the cluster. **Reset** returns every tool to its resting position. Set `modelUrl` in `toolModels` to replace an object with a GLB export, centred at the origin, facing +Z, approximately 1.7 units across.
- `public/media`: generated WebP posters, muted 12-second preview loops, and optimized full films. Originals remain in `assets/projects`.
- `scripts/prepare-media.cjs`: optional Windows media regeneration (`node scripts/prepare-media.cjs`). FFmpeg is a development dependency only.

The general studio email and location are based on the existing sibling ZXENO project; member roles, member emails and disciplines follow the updated team brief. No project dates or social accounts were invented. **Red Line** leads the hero reel; **DITO MAXX** follows it in Selected work. Original media files are retained. Section, project and service numbering has been removed.

The supplied `snaptik_7641307590445583630_v3.mp4` reference was reviewed frame by frame. Its small central form, reveal hold and accelerating organic expansion guide the native intro, adapted to the ZXENO identity and a real 3D mark.

Video previews load when visible and pause offscreen, while a film dialog is open, or when the tab is hidden. Full films load only on request. Three.js is essential to the intro; the additional tool geometry loads near its section, caps pixel ratio and pauses offscreen. Drag sideways, select a tool, or use the arrow keys to explore the tools; Home and Reset restore the composition. Mobile preserves vertical page scrolling. Reduced motion disables preview autoplay, continuous 3D motion and scroll masking, and simplifies the intro. When WebGL is unavailable, the native logo reveal, typography and tool labels remain accessible.

## Validation

```sh
npx playwright install chromium
npm test
```

An existing Chromium installation can be used by setting `PLAYWRIGHT_CHROMIUM_EXECUTABLE` to its executable path. Tests cover the session intro and skip control, six responsive widths, lazy video loading, WebGL canvas, player controls, navigation and reduced motion. Screenshots are written to `test-results/`.

Three.js renderer and extrusion implementation follow the [official renderer documentation](https://threejs.org/docs/pages/WebGLRenderer.html) and [ExtrudeGeometry documentation](https://threejs.org/docs/pages/ExtrudeGeometry.html). The bundled Helvetiker font retains its license in `src/fonts/LICENSE`.

## September 2026 multipage update

The site now has separate `/`, `/services`, `/work`, `/about`, `/pricing`, and `/book` routes. `npm run build` emits an `index.html` in each route directory for static hosts. Configure the host to serve directory index files and use `404.html` for unknown paths. Navigation uses standard links, including browser back/forward behavior.

Typography uses locally hosted Bricolage Grotesque; its license is in `public/fonts/OFL.txt`. Pricing is in PHP with ₱10,000,000 explicitly labeled as a temporary placeholder, not an agreed quote. Booking opens a prefilled email to the supplied studio address; it does not claim to reserve a calendar slot.

The supplied Google document was retrieved and its linked folders reviewed. Assets include six PNG website icons, four JPG service illustrations (web, motion, graphic design, merchandise), and 3D sample subfolders for VFX, iPhone, JBL headset and Sauvage Dior. The four service illustrations are included in `public/media/services`. The existing 3D toolkit and film media are preserved. Additional icon and 3D sample files are not imported. The homepage identifies brands featured in the existing portfolio rather than inventing endorsements.

Validation: `npm run build` and `npx playwright test tests/multipage.spec.ts`. Set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` to your Chrome path if Playwright browsers are not installed. Older tests asserting every section exists on the homepage describe the previous single-page layout.

## Admin (admin.zxenostudio.com)

A separate Vite entry (`admin/index.html` → `src/admin/`) served on its own subdomain from the same Vercel project. `middleware.ts` serves the admin app for every page path on `admin.zxenostudio.com` and returns 404 for `/admin` on any other host; `vercel.json` adds `noindex` and anti-framing headers on the admin host. DNS is an A record for `admin` at Namecheap pointing to Vercel. Brand tokens and the font live in `src/tokens.css`, shared by both entries.

Everything lives in Neon Postgres (Vercel Marketplace, `DATABASE_URL`); the tables are in `db/schema.sql`, and every change to it must stay additive and re-runnable. Sign-in uses four functions in `api/admin/` (`login`, `logout`, `me`, `password`). All workspace data goes through one catch-all function, `api/admin/[resource].ts`, which keeps the project well inside the Hobby plan's 12-function limit:

- `api/_lib/router.ts` picks the section from the last path segment (`/api/admin/projects`, `/api/admin/calendar`, …).
- `api/_lib/resources.ts` declares each list-and-form table: its fields and validation, filters, and who may change or delete rows. `api/_lib/crud.ts` runs them and writes the activity feed.
- `api/_lib/views.ts` holds the combined endpoints: dashboard, calendar, deadlines, executive overview, activity, team and profile.

### Workspace

The sidebar groups the sections as Overview (dashboard with quick actions, announcements, activity feed and weekly updates), Projects (projects with a schedule timeline and calendar, calendar, deadlines, archives), Tasks (my tasks, task overview board, private tasks), Creative (briefs, feedback loop, meeting notes, asset library), Business (clients, invoices) and Team (directory, executive overview, roles & permissions), then Settings.

- **Access.** Each account has a free-text role title (e.g. "Co-Founder / COO") and an access level, `executive` or `member`. Executives change roles and access, post announcements, delete projects, clients and invoices, and open the executive overview; at least one executive always remains. The full matrix is on the Roles & permissions page (`src/admin/pages/Roles.tsx`) and must match `api/_lib/resources.ts`.
- **Private tasks** are visible only to the person who made them, even to executives, and never reach the activity feed.
- **Assets** are links (Drive, Dropbox, Frame.io); nothing is uploaded.
- **Money** is Philippine pesos. "Overdue" invoices are sent invoices past their due date; it is computed, not stored.
- **Dates** are stored as `YYYY-MM-DD` text, and "today" is Manila time.
- **Settings.** People edit their own name, phone and bio. Usernames never change; roles only through executives.

### Accounts and migrations

- **Accounts.** `scripts/members.ts` lists each member's username, name, role and access. `npm run seed-admins` applies the schema and creates any missing account with the starting password `<username>123`. It fills in name, role and access only for accounts whose name is still blank, so edits made in the workspace are never overwritten. Run it against production before deploying a schema change. `npm run seed-admins -- --reset <username>` puts one account back to its starting password. Both read `.env.local` (`vercel env pull .env.local`).
- **First sign-in.** An account on its starting password must set a new one before it can do anything else. The starting password can never be chosen again, and new passwords need at least 10 characters.
- **Sessions.** A signed, `HttpOnly`, `Secure`, `SameSite=Strict` host-only cookie lasting 8 hours, signed with `ADMIN_SESSION_SECRET`. Each request re-reads the account, so changing a password signs out that account's other devices; rotating the secret signs out everyone. Login, logout and password changes also require a same-origin `Origin` header.
- **Lockout.** 5 failed sign-ins for one account, or 20 from one IP, block sign-in for 15 minutes.
- **New admin endpoints** should call `requireSession(request)` from `api/_lib/auth.ts` and return 401 when it is `null`. It also rejects accounts still on their starting password. The admin page itself is a public shell; the data behind it is what is protected.

`npm run dev` serves the page at `/admin/` but not the functions; use `vercel dev` to run both locally.
