import { useState } from "react";
import { FileText, Pencil, Plus, Trash2 } from "lucide-react";
import { del, query, useApi } from "../lib/api";
import { formatDate, money, options, timeAgo } from "../lib/format";
import { Link, setSearchParam, useLocation } from "../lib/router";
import type { Brief } from "../lib/types";
import { useWorkspace } from "../lib/workspace";
import { BRIEF_FIELDS, useEditor } from "../ui/editors";
import {
  Button,
  EmptyState,
  ErrorNote,
  FilterBar,
  Loading,
  Modal,
  MultilineText,
  PageHeader,
  SearchInput,
  SelectFilter,
  StatusBadge,
  useAction,
  useDebounced,
  useUi,
} from "../ui/ui";

const SECTIONS: [keyof Brief, string][] = [
  ["objective", "Objective"],
  ["audience", "Target audience"],
  ["keyMessage", "Key message"],
  ["deliverables", "Deliverables"],
  ["tone", "Tone & style"],
  ["referenceNotes", "References"],
];

export function BriefsPage() {
  const { session, isExecutive } = useWorkspace();
  const { search } = useLocation();
  const [status, setStatus] = useState("");
  const [text, setText] = useState("");
  const q = useDebounced(text);
  const { data, error, loading, reload } = useApi<Brief[]>(`briefs${query({ status, q })}`);
  const editor = useEditor<Brief>({ resource: "briefs", noun: "creative brief", fields: BRIEF_FIELDS, size: "lg" }, (row) => {
    reload();
    setSearchParam("id", row.id);
  });
  const run = useAction();
  const { confirm } = useUi();
  const openId = search.get("id");
  const open = data?.find((b) => b.id === openId);

  async function remove(brief: Brief) {
    if (
      (await confirm({ title: "Delete this brief?", body: brief.title, confirmLabel: "Delete", danger: true })) &&
      (await run(() => del(`briefs?id=${brief.id}`), "Brief deleted"))
    ) {
      setSearchParam("id", null);
      reload();
    }
  }

  return (
    <div className="page">
      <PageHeader
        title="Creative briefs"
        description="The agreed direction for each piece of work: goals, audience, message and deliverables."
        actions={<Button variant="primary" icon={Plus} onClick={() => editor.openNew({ status: "draft" })}>New brief</Button>}
      />
      <FilterBar>
        <SearchInput value={text} onChange={setText} placeholder="Search briefs" />
        <SelectFilter label="Status" allLabel="All statuses" value={status} onChange={setStatus} options={options(["draft", "in_review", "approved"])} />
      </FilterBar>
      {error && <ErrorNote message={error} onRetry={reload} />}
      {loading && !data && <Loading />}
      {data && !data.length && (
        <EmptyState icon={FileText} title={q || status ? "No briefs match" : "No briefs yet"}>
          Write a brief before production starts so everyone works toward the same thing.
        </EmptyState>
      )}
      <div className="card-grid">
        {data?.map((brief) => (
          <button key={brief.id} type="button" className="card card-button brief-card" onClick={() => setSearchParam("id", brief.id)}>
            <div className="card-head">
              <StatusBadge value={brief.status} />
              {brief.dueDate && <span className="muted">Due {formatDate(brief.dueDate)}</span>}
            </div>
            <h2>{brief.title}</h2>
            <p className="clamp-3">{brief.objective || "No objective written yet."}</p>
            <span className="card-foot">
              {[brief.clientName, brief.projectName].filter(Boolean).join(" · ") || "Unlinked"} · updated {timeAgo(brief.updatedAt)}
            </span>
          </button>
        ))}
      </div>

      <Modal
        open={!!open}
        size="lg"
        title={open?.title ?? ""}
        onClose={() => setSearchParam("id", null)}
        footer={
          open && (
            <>
              {(open.createdBy === session.username || isExecutive) && (
                <Button variant="danger" icon={Trash2} onClick={() => remove(open)}>Delete</Button>
              )}
              <Button variant="primary" icon={Pencil} onClick={() => editor.openEdit(open)}>Edit brief</Button>
            </>
          )
        }
      >
        {open && (
          <div className="brief-view">
            <dl className="facts">
              <div><dt>Status</dt><dd><StatusBadge value={open.status} /></dd></div>
              <div><dt>Client</dt><dd>{open.clientName ?? "—"}</dd></div>
              <div><dt>Project</dt><dd>{open.projectId ? <Link to={`/projects/${open.projectId}`}>{open.projectName}</Link> : "—"}</dd></div>
              <div><dt>Due</dt><dd>{formatDate(open.dueDate, { year: true })}</dd></div>
              <div><dt>Budget</dt><dd>{money(open.budget)}</dd></div>
              <div><dt>Written by</dt><dd>{open.createdByName}</dd></div>
            </dl>
            {SECTIONS.map(([key, heading]) =>
              open[key] ? (
                <section key={key}>
                  <h3>{heading}</h3>
                  <MultilineText text={String(open[key])} />
                </section>
              ) : null,
            )}
          </div>
        )}
      </Modal>
      {editor.element}
    </div>
  );
}
