import { useEffect, useState, type FormEvent } from "react";
import { ExternalLink, MessagesSquare, Pencil, Plus, Trash2 } from "lucide-react";
import { api, del, patch, post, query, useApi } from "../lib/api";
import { formatDateTime, label, options, timeAgo } from "../lib/format";
import { Link, setSearchParam, useLocation } from "../lib/router";
import type { Asset, Feedback, FeedbackComment, FeedbackStatus } from "../lib/types";
import { useWorkspace } from "../lib/workspace";
import { feedbackFields, useEditor } from "../ui/editors";
import {
  Avatar,
  Button,
  EmptyState,
  ErrorNote,
  FilterBar,
  Loading,
  Modal,
  MultilineText,
  PageHeader,
  SelectFilter,
  StatusBadge,
  useAction,
  useUi,
} from "../ui/ui";

export function FeedbackPage() {
  const { projects } = useWorkspace();
  const { search } = useLocation();
  const [status, setStatus] = useState("");
  const [projectId, setProjectId] = useState("");
  const { data, error, loading, reload, setData } = useApi<Feedback[]>(`feedback${query({ status, projectId })}`);
  const [assets, setAssets] = useState<{ value: string; label: string }[]>([]);
  useEffect(() => {
    api<Asset[]>("assets")
      .then((list) => setAssets(list.map((a) => ({ value: a.id, label: a.projectName ? `${a.name} · ${a.projectName}` : a.name }))))
      .catch(() => {});
  }, []);
  const editor = useEditor<Feedback>({ resource: "feedback", noun: "feedback", fields: feedbackFields(assets) }, (row) => {
    reload();
    setSearchParam("id", row.id);
  });
  const openId = search.get("id");
  const open = data?.find((f) => f.id === openId);

  const columns: FeedbackStatus[] = ["open", "in_progress", "resolved"];

  return (
    <div className="page">
      <PageHeader
        title="Feedback loop"
        description="Review notes on work in progress, discussed in threads until they're resolved."
        actions={<Button variant="primary" icon={Plus} onClick={() => editor.openNew({ status: "open" })}>Give feedback</Button>}
      />
      <FilterBar>
        <SelectFilter label="Status" allLabel="All statuses" value={status} onChange={setStatus} options={options(columns)} />
        <SelectFilter label="Project" allLabel="All projects" value={projectId} onChange={setProjectId} options={projects.map((p) => ({ value: p.id, label: p.name }))} />
      </FilterBar>
      {error && <ErrorNote message={error} onRetry={reload} />}
      {loading && !data && <Loading />}
      {data && !data.length && (
        <EmptyState icon={MessagesSquare} title="No feedback yet">
          Share notes on a cut, a design or any asset, and keep the conversation in one thread.
        </EmptyState>
      )}
      <ul className="feedback-list">
        {data?.map((item) => (
          <li key={item.id}>
            <button type="button" className="feedback-item" onClick={() => setSearchParam("id", item.id)}>
              <Avatar name={item.createdByName} size={34} />
              <div className="feedback-text">
                <strong>{item.title}</strong>
                <span className="clamp-2">{item.body || "No details"}</span>
                <span className="cell-sub">
                  {item.createdByName} · {timeAgo(item.updatedAt)}
                  {item.projectName && ` · ${item.projectName}`}
                  {item.assetName && ` · ${item.assetName}`}
                </span>
              </div>
              <div className="feedback-side">
                <StatusBadge value={item.status} />
                <span className="muted">{item.commentCount} {item.commentCount === 1 ? "reply" : "replies"}</span>
              </div>
            </button>
          </li>
        ))}
      </ul>
      {open && (
        <FeedbackThread
          item={open}
          onClose={() => setSearchParam("id", null)}
          onEdit={() => editor.openEdit(open)}
          onChange={(updated) =>
            updated
              ? setData((list) => list?.map((f) => (f.id === updated.id ? updated : f)))
              : (setSearchParam("id", null), reload())
          }
        />
      )}
      {editor.element}
    </div>
  );
}

function FeedbackThread({
  item,
  onClose,
  onEdit,
  onChange,
}: {
  item: Feedback;
  onClose: () => void;
  onEdit: () => void;
  onChange: (item: Feedback | null) => void;
}) {
  const { session, isExecutive } = useWorkspace();
  const { data: comments, reload } = useApi<FeedbackComment[]>(`feedback-comments?feedbackId=${item.id}`);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const run = useAction();
  const { confirm } = useUi();

  async function send(event: FormEvent) {
    event.preventDefault();
    if (!reply.trim()) return;
    setSending(true);
    const ok = await run(() => post("feedback-comments", { feedbackId: item.id, body: reply }));
    setSending(false);
    if (ok) {
      setReply("");
      reload();
      onChange({ ...item, commentCount: item.commentCount + 1 });
    }
  }

  async function setStatus(status: FeedbackStatus) {
    const updated = await run(() => patch<Feedback>(`feedback?id=${item.id}`, { status }), `Marked ${label(status).toLowerCase()}`);
    if (updated) onChange(updated);
  }

  async function removeComment(comment: FeedbackComment) {
    if (await run(() => del(`feedback-comments?id=${comment.id}`))) {
      reload();
      onChange({ ...item, commentCount: Math.max(0, item.commentCount - 1) });
    }
  }

  async function remove() {
    if (
      (await confirm({ title: "Delete this feedback thread?", body: "All replies are deleted too.", confirmLabel: "Delete", danger: true })) &&
      (await run(() => del(`feedback?id=${item.id}`), "Feedback deleted"))
    ) {
      onChange(null);
    }
  }

  return (
    <Modal open size="lg" title={item.title} onClose={onClose}>
      <div className="thread">
        <div className="thread-meta">
          <label className="select-filter">
            <span className="sr-only">Status</span>
            <select value={item.status} onChange={(e) => setStatus(e.target.value as FeedbackStatus)}>
              {(["open", "in_progress", "resolved"] as const).map((s) => (
                <option key={s} value={s}>{label(s)}</option>
              ))}
            </select>
          </label>
          {item.projectId && <Link to={`/projects/${item.projectId}`}>{item.projectName}</Link>}
          {item.assetUrl && (
            <a href={item.assetUrl} target="_blank" rel="noopener noreferrer">
              {item.assetName} <ExternalLink size={12} aria-hidden />
            </a>
          )}
          <span className="spacer" />
          <Button size="sm" icon={Pencil} onClick={onEdit}>Edit</Button>
          {(item.createdBy === session.username || isExecutive) && (
            <Button size="sm" variant="danger" icon={Trash2} onClick={remove}>Delete</Button>
          )}
        </div>
        <article className="comment is-original">
          <Avatar name={item.createdByName} size={32} />
          <div>
            <div className="comment-head">
              <strong>{item.createdByName}</strong>
              <time title={formatDateTime(item.createdAt)}>{timeAgo(item.createdAt)}</time>
            </div>
            <MultilineText text={item.body || "No details given."} />
          </div>
        </article>
        {!comments && <Loading />}
        {comments?.map((comment) => (
          <article key={comment.id} className="comment">
            <Avatar name={comment.createdByName} size={32} />
            <div>
              <div className="comment-head">
                <strong>{comment.createdByName}</strong>
                <time title={formatDateTime(comment.createdAt)}>{timeAgo(comment.createdAt)}</time>
                {(comment.createdBy === session.username || isExecutive) && (
                  <button type="button" className="text-btn" onClick={() => removeComment(comment)}>Delete</button>
                )}
              </div>
              <MultilineText text={comment.body} />
            </div>
          </article>
        ))}
        <form className="reply" onSubmit={send}>
          <label htmlFor="reply" className="sr-only">Reply</label>
          <textarea id="reply" rows={3} value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Write a reply…" />
          <div className="reply-actions">
            {item.status !== "resolved" && (
              <Button onClick={() => setStatus("resolved")}>Mark resolved</Button>
            )}
            <Button type="submit" variant="primary" disabled={sending || !reply.trim()}>
              {sending ? "Sending…" : "Reply"}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
