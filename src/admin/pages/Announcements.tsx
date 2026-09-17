import { Megaphone, Pencil, Pin, PinOff, Plus, Trash2 } from "lucide-react";
import { del, patch, useApi } from "../lib/api";
import { formatDateTime, timeAgo } from "../lib/format";
import type { Announcement } from "../lib/types";
import { useWorkspace } from "../lib/workspace";
import { ANNOUNCEMENT_FIELDS, useEditor } from "../ui/editors";
import {
  Avatar,
  Badge,
  Button,
  EmptyState,
  ErrorNote,
  Loading,
  Menu,
  MultilineText,
  PageHeader,
  useAction,
  useUi,
} from "../ui/ui";

export function AnnouncementsPage() {
  const { isExecutive } = useWorkspace();
  const { data, error, loading, reload } = useApi<Announcement[]>("announcements");
  const editor = useEditor<Announcement>(
    { resource: "announcements", noun: "announcement", fields: ANNOUNCEMENT_FIELDS },
    () => reload(),
  );
  const run = useAction();
  const { confirm } = useUi();

  async function togglePin(a: Announcement) {
    if (await run(() => patch(`announcements?id=${a.id}`, { pinned: !a.pinned }), a.pinned ? "Unpinned" : "Pinned")) {
      reload();
    }
  }

  async function remove(a: Announcement) {
    if (
      (await confirm({ title: "Delete this announcement?", body: `"${a.title}" will be removed for everyone.`, confirmLabel: "Delete", danger: true })) &&
      (await run(() => del(`announcements?id=${a.id}`), "Announcement deleted"))
    ) {
      reload();
    }
  }

  return (
    <div className="page page-narrow">
      <PageHeader
        title="Announcements"
        description={isExecutive ? "Share news with the whole studio." : "News from the studio's executives."}
        actions={
          isExecutive && (
            <Button variant="primary" icon={Plus} onClick={() => editor.openNew()}>
              New announcement
            </Button>
          )
        }
      />
      {error && <ErrorNote message={error} onRetry={reload} />}
      {loading && !data && <Loading />}
      {data && !data.length && (
        <EmptyState icon={Megaphone} title="No announcements yet">
          {isExecutive ? "Post the first one for the team." : "Executives will post studio news here."}
        </EmptyState>
      )}
      <div className="stack">
        {data?.map((a) => (
          <article key={a.id} className={`card announcement ${a.pinned ? "is-pinned" : ""}`}>
            <div className="card-head">
              <div className="author">
                <Avatar name={a.createdByName} size={36} />
                <div>
                  <strong>{a.createdByName}</strong>
                  <span title={formatDateTime(a.createdAt)}>
                    {a.createdByTitle} · {timeAgo(a.createdAt)}
                  </span>
                </div>
              </div>
              <div className="card-tools">
                {a.pinned && <Badge tone="green"><Pin size={11} aria-hidden /> Pinned</Badge>}
                {isExecutive && (
                  <Menu
                    items={[
                      { label: "Edit", icon: Pencil, onSelect: () => editor.openEdit(a) },
                      { label: a.pinned ? "Unpin" : "Pin to top", icon: a.pinned ? PinOff : Pin, onSelect: () => togglePin(a) },
                      { label: "Delete", icon: Trash2, danger: true, onSelect: () => remove(a) },
                    ]}
                  />
                )}
              </div>
            </div>
            <h2>{a.title}</h2>
            <MultilineText text={a.body} />
          </article>
        ))}
      </div>
      {editor.element}
    </div>
  );
}
