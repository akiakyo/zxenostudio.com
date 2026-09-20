# Client prototype adaptation

The client's `zxeno-hq_2.html` provides functional reference. The admin retains its own shell, palette, typography, default views, form dialogs and shared components. Mock clients, financial figures, chat replies and employee policies are not seeded into the live workspace.

| Prototype capability | Admin integration |
| --- | --- |
| Dashboard summaries | Greeting, headline counts, on-time delivery, stat strip, work due this week, today's schedule, pipeline bar, workload, who is in and the review queue, above the existing panels |
| Project board, list and timeline | Additional Projects tabs; keyboard status selectors alongside drag/drop; board cards carry a project code, work type, client mark, progress, team and due date |
| Project owners, teams and budgets | Existing project editor and project detail, with spend from recorded expenses |
| Tasks and milestones | Existing persistent task lists, board, calendar and milestone actions |
| Week calendar and agenda | Existing calendar plus date-specific events, attendees, Manila times and room/location |
| Channels and direct messages | Chat with a grouped channel rail, participant-only DMs, a room per live project, per-conversation unread badges, polling, message search, pinning, reactions and asset links |
| Approvals | New review queue, assigned reviewers, explicit revision/approval states, resubmission versions, image pins, comments, image/video previews |
| Assets | Existing library plus folders, list view, previews, file-size metadata and actual clipboard links |
| Clients and pipeline | Client cards with the client's own mark, industry, status and live project count, split into active and onboarding/paused; plus details, account owners, agreement, palette and pipeline board/editors |
| Finance | Cash-basis YTD revenue from paid invoices, monthly comparison, expense categories, outstanding and overdue totals |
| Team | Directory grouped by department with presence and DM links, sharing one tab strip with workload and leave |
| Handbook | Searchable, editable documents; executives publish and edit, members read |
| Global tools | Search (Ctrl/Cmd K), quick creation and per-user notification read state; existing theme settings retained |
| Sidebar counts | Unread chat and pending approval counts on the sidebar, scoped to what each person may act on |
| Presence | Live active/idle/offline dot on avatars from a workspace-wide heartbeat, a who-is-in grid on the dashboard and a legend |
| Sound | A short tone for a new chat message or a new notification, with an on/off switch in Settings |

Sparklines are drawn only where real history exists: money actually received per month, and tasks by the day they fall due. Where the workspace keeps no history, such as how many projects were active last week, no line is drawn rather than inventing one. A flat or single-point series draws nothing.

Project codes are assigned by the database from a sequence and are never editable, so a code stays put once people start quoting it. The sequence advances past the highest code in use, so deleting a project does not hand its code to the next one.

The board keeps the workspace's five statuses, including On hold, rather than the prototype's four. The prototype simply used a different status set; the live records did not change.

## Project rooms

Every live project the reader is assigned to gets a room in the chat rail, named after the project. Only the project lead and the people on its team may open it, post in it, react in it or delete from it. Executives are not exempt, which matches how direct messages already work: an executive who is not on a project sees no room, and their sidebar count never includes its messages. An unassigned reader gets "not found" rather than "forbidden", so the existence of a room is not leaked. Archived and completed projects drop out of the rail.

This means an executive who creates a project but does not assign themselves will not see its room until they are added to the team.

## Presence and sound

Presence is worked out from a heartbeat the whole workspace sends every thirty seconds while its tab is visible, not from chat polling alone. Someone is active when they have interacted in the last five minutes, idle when the heartbeat continues without interaction, and offline once the heartbeat stops for ninety seconds. The dot on an avatar means presence; where someone is working stays a separate badge, because the two answer different questions.

A tab that is not being looked at keeps polling, slowly, so a message can still announce itself; it sends seen=0 so that a background poll never clears the unread badge for a conversation nobody actually read. The chat draft lives in its own component, so a keystroke re-renders one textarea rather than every message on screen.

Notification and message tones are generated in the browser rather than shipped as audio files. Browsers refuse to play sound before someone has interacted with the page, so the audio context is unlocked on the first click or keypress and the tone is simply skipped if it is still locked. The preference is per device and lives in Settings.

## Permissions and persistence

All new records use the authenticated API and Postgres. UI role checks are backed by API checks. Only the assigned reviewer or an executive decides approvals. Approved versions cannot be edited; requested revisions can be resubmitted. Concurrent decisions use optimistic locking. Leave reasons are visible only to their requester and executives and do not enter the shared activity feed. Executives cannot approve their own leave. DMs remain private to participants, including when another executive requests reactions or deletion.

Sidebar counts follow the same rules as the pages they point at. The chat count covers unread channel messages and direct messages addressed to the reader, never someone else's conversation. The approval count shows only what the reader can decide: every pending item for executives, assigned items for a reviewer, and nothing for a submitter awaiting someone else's decision.

Members can view finance and workload, following the existing shared invoice model. Expenses, capacity plans and handbook edits require executive access. Capacity is explicitly planned hours divided by available hours, with missing plans shown as unplanned rather than invented percentages.

## Files

The existing asset-link model is retained. Files remain on their host (Drive, Dropbox, Frame.io, or direct web URLs). “Open / download original” opens the real URL; the host controls access and downloads. Supported direct image/video/audio URLs can render inline. This change does not provision an upload/storage service.

## Migration and deployment

`db/migrations/20260920-studio-hq.sql` is additive and re-runnable. `scripts/members.ts` loads it after the base schema. Existing chat messages remain in `general`.

Before deploying the application, test the migration on a database branch, then run `npm run migrate-admin` with the approved target's direct `DATABASE_URL_UNPOOLED` in `.env.local`. This command applies schema only and never seeds or resets accounts. The code changes do not automatically migrate or deploy production.

Validation: `npm run build` and `npm run test:admin`. Tests use isolated PGlite Postgres and exercise the real API through browser request routing, including refresh persistence, permissions, calendar date isolation, finance totals and DM privacy. No production credentials or records are used. If Playwright's bundled browser is absent, set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` to an installed Chrome executable.
