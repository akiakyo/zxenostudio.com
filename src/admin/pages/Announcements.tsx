import { useEffect, useState, type FormEvent } from "react";
import { Mail, Megaphone, Pencil, Pin, PinOff, Plus, Send, Trash2 } from "lucide-react";
import { api, del, patch, post, useApi } from "../lib/api";
import { formatDateTime, timeAgo } from "../lib/format";
import type { Announcement, EmailContact } from "../lib/types";
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
  Modal,
  MultilineText,
  PageHeader,
  useAction,
  useUi,
} from "../ui/ui";

export function AnnouncementsPage() {
  const { isExecutive } = useWorkspace();
  const { data, error, loading, reload } = useApi<Announcement[]>("announcements");
  const [sending, setSending] = useState<Announcement | null>(null);
  const [listOpen, setListOpen] = useState(false);
  const editor = useEditor<Announcement>(
    { resource: "announcements", noun: "announcement", fields: ANNOUNCEMENT_FIELDS },
    (row, created) => {
      reload();
      /* a new announcement goes straight on to "send by email" */
      if (created) setSending(row);
    },
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
            <>
              <Button icon={Mail} onClick={() => setListOpen(true)}>
                Email list
              </Button>
              <Button variant="primary" icon={Plus} onClick={() => editor.openNew()}>
                New announcement
              </Button>
            </>
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
                      { label: "Send by email", icon: Send, onSelect: () => setSending(a) },
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
            {isExecutive && a.emailedAt && (
              <p className="card-foot announcement-emailed" title={formatDateTime(a.emailedAt)}>
                <Mail size={12} aria-hidden /> Emailed to {a.emailedCount} {a.emailedCount === 1 ? "person" : "people"} · {timeAgo(a.emailedAt)}
              </p>
            )}
          </article>
        ))}
      </div>
      {editor.element}
      {isExecutive && (
        <>
          <SendDialog
            announcement={sending}
            onClose={() => setSending(null)}
            onOpenList={() => {
              setSending(null);
              setListOpen(true);
            }}
            onSent={reload}
          />
          <EmailListDialog open={listOpen} onClose={() => setListOpen(false)} />
        </>
      )}
    </div>
  );
}

/* Sends one announcement to everyone on the email list, or to chosen people
   and typed addresses. */
function SendDialog({
  announcement,
  onClose,
  onOpenList,
  onSent,
}: {
  announcement: Announcement | null;
  onClose: () => void;
  onOpenList: () => void;
  onSent: () => void;
}) {
  const { toast } = useUi();
  const { data: contacts } = useApi<EmailContact[]>(announcement ? "announcement-emails" : null);
  const [mode, setMode] = useState<"all" | "some">("all");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (announcement) {
      setMode("all");
      setPicked(new Set());
      setTyped("");
      setFormError("");
    }
  }, [announcement]);

  const withEmail = (contacts ?? []).filter((c) => c.email);
  const extra = typed.split(/[\s,;]+/).map((v) => v.trim()).filter(Boolean);
  const chosen = mode === "all" ? withEmail.map((c) => c.email) : [...picked, ...extra];

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!announcement) return;
    setBusy(true);
    setFormError("");
    try {
      const result = await post<{ sent: number }>("announcement-send", {
        id: announcement.id,
        to: mode === "all" ? "all" : chosen,
      });
      toast(`Emailed to ${result.sent} ${result.sent === 1 ? "person" : "people"}`);
      onSent();
      onClose();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Could not send");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={!!announcement}
      title="Send by email"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Not now</Button>
          <Button type="submit" form="announcement-send" variant="primary" icon={Send} disabled={busy || !chosen.length}>
            {busy ? "Sending…" : `Send to ${chosen.length} ${chosen.length === 1 ? "person" : "people"}`}
          </Button>
        </>
      }
    >
      <form id="announcement-send" className="stack-form" onSubmit={submit}>
        <p className="hint">
          "{announcement?.title}" goes out from announcement@zxenostudio.com. Each person gets their own copy.
        </p>
        <div className="segmented" role="radiogroup" aria-label="Recipients">
          <button type="button" role="radio" aria-checked={mode === "all"} onClick={() => setMode("all")}>
            Send to all
          </button>
          <button type="button" role="radio" aria-checked={mode === "some"} onClick={() => setMode("some")}>
            Send to email
          </button>
        </div>
        {!contacts && <Loading />}
        {contacts && mode === "all" && (
          <p className="hint">
            {withEmail.length
              ? `Everyone on the email list: ${withEmail.map((c) => c.name || c.username).join(", ")}.`
              : "No one on the team has an email address yet."}{" "}
            <button type="button" className="link-button" onClick={onOpenList}>
              Edit the email list
            </button>
          </p>
        )}
        {contacts && mode === "some" && (
          <>
            {withEmail.length > 0 && (
              <div className="field">
                <span className="field-label">Team members</span>
                <div className="member-picks">
                  {withEmail.map((c) => (
                    <label key={c.username} className={picked.has(c.email) ? "is-on" : ""} title={c.email}>
                      <input
                        type="checkbox"
                        checked={picked.has(c.email)}
                        onChange={() =>
                          setPicked((current) => {
                            const next = new Set(current);
                            if (!next.delete(c.email)) next.add(c.email);
                            return next;
                          })
                        }
                      />
                      {c.name || c.username}
                    </label>
                  ))}
                </div>
              </div>
            )}
            <div className="field">
              <label htmlFor="announcement-send-to">Other email addresses</label>
              <textarea
                id="announcement-send-to"
                rows={3}
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                placeholder="name@example.com, another@example.com"
              />
              <small>Separate addresses with commas or new lines.</small>
            </div>
          </>
        )}
        {formError && <p className="form-error" role="alert">{formError}</p>}
      </form>
    </Modal>
  );
}

/* Executives keep every member's email address in one place. */
function EmailListDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { toast } = useUi();
  const { data, error, reload } = useApi<EmailContact[]>(open ? "announcement-emails" : null);
  const [emails, setEmails] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (data) {
      setEmails(Object.fromEntries(data.map((c) => [c.username, c.email])));
      setFormError("");
    }
  }, [data]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setFormError("");
    try {
      await api("announcement-emails", { method: "PATCH", body: { emails } });
      toast("Email list saved");
      onClose();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      title="Email list"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" form="announcement-emails" variant="primary" disabled={busy || !data}>
            {busy ? "Saving…" : "Save email list"}
          </Button>
        </>
      }
    >
      <form id="announcement-emails" className="stack-form" onSubmit={submit}>
        <p className="hint">"Send to all" emails everyone with an address here. Leave a box empty to leave that person out.</p>
        {error && <ErrorNote message={error} onRetry={reload} />}
        {!data && !error && <Loading />}
        {data?.map((c) => (
          <div className="field" key={c.username}>
            <label htmlFor={`email-${c.username}`}>
              {c.name || c.username} <span className="muted">· {c.title}</span>
            </label>
            <input
              id={`email-${c.username}`}
              type="email"
              value={emails[c.username] ?? ""}
              onChange={(e) => setEmails((current) => ({ ...current, [c.username]: e.target.value }))}
              maxLength={200}
              placeholder="name@example.com"
              autoComplete="off"
            />
          </div>
        ))}
        {formError && <p className="form-error" role="alert">{formError}</p>}
      </form>
    </Modal>
  );
}
