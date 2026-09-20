# Client prototype adaptation

The client's `zxeno-hq_2.html` provides functional reference. The admin retains its own shell, palette, typography, default views, form dialogs and shared components. Mock clients, financial figures, chat replies and employee policies are not seeded into the live workspace.

| Prototype capability | Admin integration |
| --- | --- |
| Dashboard summaries | Existing dashboard plus review queue, project stages, capacity and studio/room status |
| Project board, list and timeline | Additional Projects tabs; keyboard status selectors alongside drag/drop |
| Project owners, teams and budgets | Existing project editor and project detail, with spend from recorded expenses |
| Tasks and milestones | Existing persistent task lists, board, calendar and milestone actions |
| Week calendar and agenda | Existing calendar plus date-specific events, attendees, Manila times and room/location |
| Channels and direct messages | Existing Studio chat, channel selector, participant-only DMs, unread counts, polling, message search, pinning, reactions and asset links |
| Approvals | New review queue, assigned reviewers, explicit revision/approval states, resubmission versions, image pins, comments, image/video previews |
| Assets | Existing library plus folders, list view, previews, file-size metadata and actual clipboard links |
| Clients and pipeline | Existing client table plus details, account owners, industry, agreement, palette and pipeline board/editors |
| Finance | Cash-basis YTD revenue from paid invoices, monthly comparison, expense categories, outstanding and overdue totals |
| Team | Existing directory plus departments, work status and DM links; workload and leave sections |
| Handbook | Searchable, editable documents; executives publish and edit, members read |
| Global tools | Search (Ctrl/Cmd K), quick creation and per-user notification read state; existing theme settings retained |

## Permissions and persistence

All new records use the authenticated API and Postgres. UI role checks are backed by API checks. Only the assigned reviewer or an executive decides approvals. Approved versions cannot be edited; requested revisions can be resubmitted. Concurrent decisions use optimistic locking. Leave reasons are visible only to their requester and executives and do not enter the shared activity feed. Executives cannot approve their own leave. DMs remain private to participants, including when another executive requests reactions or deletion.

Members can view finance and workload, following the existing shared invoice model. Expenses, capacity plans and handbook edits require executive access. Capacity is explicitly planned hours divided by available hours, with missing plans shown as unplanned rather than invented percentages.

## Files

The existing asset-link model is retained. Files remain on their host (Drive, Dropbox, Frame.io, or direct web URLs). “Open / download original” opens the real URL; the host controls access and downloads. Supported direct image/video/audio URLs can render inline. This change does not provision an upload/storage service.

## Migration and deployment

`db/migrations/20260920-studio-hq.sql` is additive and re-runnable. `scripts/members.ts` loads it after the base schema. Existing chat messages remain in `general`.

Before deploying the application, test the migration on a database branch, then run `npm run migrate-admin` with the approved target's direct `DATABASE_URL_UNPOOLED` in `.env.local`. This command applies schema only and never seeds or resets accounts. The code changes do not automatically migrate or deploy production.

Validation: `npm run build` and `npm run test:admin`. Tests use isolated PGlite Postgres and exercise the real API through browser request routing, including refresh persistence, permissions, calendar date isolation, finance totals and DM privacy. No production credentials or records are used. If Playwright's bundled browser is absent, set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` to an installed Chrome executable.
