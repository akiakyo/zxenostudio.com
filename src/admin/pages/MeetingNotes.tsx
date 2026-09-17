import { useState } from "react";
import { NotebookPen, Pencil, Plus, Trash2 } from "lucide-react";
import { del, query, useApi } from "../lib/api";
import { formatDate, parseIso, todayIso } from "../lib/format";
import { Link, setSearchParam, useLocation } from "../lib/router";
import type { MeetingNote } from "../lib/types";
import { useWorkspace } from "../lib/workspace";
import { useMeetingNoteEditor } from "../ui/editors";
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
  SearchInput,
  SelectFilter,
  useAction,
  useDebounced,
  useUi,
} from "../ui/ui";

export function MeetingNotesPage() {
  const { session, isExecutive, projects, memberName } = useWorkspace();
  const { search } = useLocation();
  const [text, setText] = useState("");
  const [projectId, setProjectId] = useState("");
  const q = useDebounced(text);
  const { data, error, loading, reload } = useApi<MeetingNote[]>(`meeting-notes${query({ q, projectId })}`);
  const editor = useMeetingNoteEditor((row) => {
    reload();
    setSearchParam("id", row.id);
  });
  const run = useAction();
  const { confirm } = useUi();
  const open = data?.find((n) => n.id === search.get("id"));

  async function remove(note: MeetingNote) {
    if (
      (await confirm({ title: "Delete these meeting notes?", body: note.title, confirmLabel: "Delete", danger: true })) &&
      (await run(() => del(`meeting-notes?id=${note.id}`), "Meeting note deleted"))
    ) {
      setSearchParam("id", null);
      reload();
    }
  }

  return (
    <div className="page page-narrow">
      <PageHeader
        title="Meeting notes"
        description="Agendas, decisions and action items from every meeting."
        actions={
          <Button variant="primary" icon={Plus} onClick={() => editor.openNew({ meetingDate: todayIso(), attendees: [session.username] })}>
            New meeting note
          </Button>
        }
      />
      <FilterBar>
        <SearchInput value={text} onChange={setText} placeholder="Search notes" />
        <SelectFilter label="Project" allLabel="All projects" value={projectId} onChange={setProjectId} options={projects.map((p) => ({ value: p.id, label: p.name }))} />
      </FilterBar>
      {error && <ErrorNote message={error} onRetry={reload} />}
      {loading && !data && <Loading />}
      {data && !data.length && (
        <EmptyState icon={NotebookPen} title={q || projectId ? "No notes match" : "No meeting notes yet"} />
      )}
      <ul className="note-list">
        {data?.map((note) => (
          <li key={note.id}>
            <button type="button" className="note-item" onClick={() => setSearchParam("id", note.id)}>
              <div className="note-date">
                <strong>{Number(note.meetingDate.slice(8))}</strong>
                <span>
                  {parseIso(note.meetingDate).toLocaleDateString("en-PH", { month: "short" })}
                </span>
              </div>
              <div className="note-text">
                <strong>{note.title}</strong>
                <span className="clamp-2">{note.body || "No notes written."}</span>
                <span className="cell-sub">{note.projectName ?? "General"} · by {note.createdByName}</span>
              </div>
              <div className="avatar-stack" aria-label={`${note.attendees.length} attendees`}>
                {note.attendees.slice(0, 4).map((u) => (
                  <Avatar key={u} name={memberName(u)} size={26} />
                ))}
                {note.attendees.length > 4 && <span className="avatar-more">+{note.attendees.length - 4}</span>}
              </div>
            </button>
          </li>
        ))}
      </ul>
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
              <Button variant="primary" icon={Pencil} onClick={() => editor.openEdit(open)}>Edit</Button>
            </>
          )
        }
      >
        {open && (
          <div className="brief-view">
            <dl className="facts">
              <div><dt>Date</dt><dd>{formatDate(open.meetingDate, { weekday: true, year: true })}</dd></div>
              <div><dt>Project</dt><dd>{open.projectId ? <Link to={`/projects/${open.projectId}`}>{open.projectName}</Link> : "General"}</dd></div>
              <div><dt>Written by</dt><dd>{open.createdByName}</dd></div>
              <div className="wide"><dt>Attendees</dt><dd>{open.attendees.length ? open.attendees.map(memberName).join(", ") : "—"}</dd></div>
            </dl>
            <MultilineText text={open.body || "No notes written."} />
          </div>
        )}
      </Modal>
      {editor.element}
    </div>
  );
}
