import { useState, type FormEvent } from "react";
import { ListChecks, Plus } from "lucide-react";
import { post, useApi } from "../lib/api";
import { addDays, todayIso } from "../lib/format";
import type { Task } from "../lib/types";
import { useWorkspace } from "../lib/workspace";
import { useTaskEditor } from "../ui/editors";
import { TaskRow } from "../ui/tasks";
import {
  Button,
  EmptyState,
  ErrorNote,
  Loading,
  PageHeader,
  useAction,
} from "../ui/ui";

/* Sections for a person's own list: overdue first, completed last. */
export function groupTasks(tasks: Task[]) {
  const today = todayIso();
  const weekEnd = addDays(today, 7);
  const open = tasks.filter((t) => t.status !== "done");
  return {
    overdue: open.filter((t) => t.dueDate && t.dueDate < today),
    today: open.filter((t) => t.dueDate === today),
    week: open.filter((t) => t.dueDate && t.dueDate > today && t.dueDate <= weekEnd),
    later: open.filter((t) => t.dueDate && t.dueDate > weekEnd),
    undated: open.filter((t) => !t.dueDate),
    done: tasks
      .filter((t) => t.status === "done")
      .sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? "")),
  };
}

export function QuickAdd({
  placeholder,
  onAdd,
}: {
  placeholder: string;
  onAdd: (title: string) => Promise<unknown>;
}) {
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    const ok = await onAdd(title.trim());
    setBusy(false);
    if (ok) setTitle("");
  }
  return (
    <form className="quick-add" onSubmit={submit}>
      <Plus size={16} aria-hidden />
      <label className="sr-only" htmlFor="quick-add">{placeholder}</label>
      <input id="quick-add" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={placeholder} maxLength={200} />
      <Button type="submit" size="sm" variant="primary" disabled={busy || !title.trim()}>Add</Button>
    </form>
  );
}

export function TaskSection({
  title,
  tasks,
  tone,
  onChange,
  onEdit,
  collapsed,
}: {
  title: string;
  tasks: Task[];
  tone?: "overdue";
  onChange: (task: Task, updated: Task | null) => void;
  onEdit: (task: Task) => void;
  collapsed?: boolean;
}) {
  const [open, setOpen] = useState(!collapsed);
  if (!tasks.length) return null;
  return (
    <section className={`task-group ${tone === "overdue" ? "is-overdue-group" : ""}`}>
      <h2>
        <button type="button" className="group-toggle" aria-expanded={open} onClick={() => setOpen(!open)}>
          {title} <span className="muted">{tasks.length}</span>
        </button>
      </h2>
      {open &&
        tasks.map((task) => (
          <TaskRow
            key={task.id}
            task={task}
            showAssignee={false}
            onEdit={onEdit}
            onChange={(updated) => onChange(task, updated)}
          />
        ))}
    </section>
  );
}

export function MyTasksPage() {
  const { session } = useWorkspace();
  const { data, error, loading, reload, setData } = useApi<Task[]>("tasks?assignee=me&private=0");
  const editor = useTaskEditor(false, () => reload());
  const run = useAction();

  function replace(task: Task, updated: Task | null) {
    setData((list) =>
      updated && updated.assignee === session.username
        ? list?.map((t) => (t.id === task.id ? updated : t))
        : list?.filter((t) => t.id !== task.id),
    );
  }

  const groups = groupTasks(data ?? []);
  const openCount = (data ?? []).filter((t) => t.status !== "done").length;

  return (
    <div className="page page-narrow">
      <PageHeader
        title="My tasks"
        description={`Work assigned to you${openCount ? ` · ${openCount} open` : ""}.`}
        actions={
          <Button variant="primary" icon={Plus} onClick={() => editor.openNew({ assignee: session.username, status: "todo", priority: "medium" })}>
            New task
          </Button>
        }
      />
      <QuickAdd
        placeholder="Add a task for yourself…"
        onAdd={(title) =>
          run(async () => {
            const task = await post<Task>("tasks", { title, assignee: session.username });
            setData((list) => [task, ...(list ?? [])]);
            return task;
          })
        }
      />
      {error && <ErrorNote message={error} onRetry={reload} />}
      {loading && !data && <Loading />}
      {data && !data.length && (
        <EmptyState icon={ListChecks} title="Nothing assigned to you">
          Tasks others assign to you, and ones you add here, show up in this list.
        </EmptyState>
      )}
      <TaskSection title="Overdue" tone="overdue" tasks={groups.overdue} onChange={replace} onEdit={editor.openEdit} />
      <TaskSection title="Today" tasks={groups.today} onChange={replace} onEdit={editor.openEdit} />
      <TaskSection title="Next 7 days" tasks={groups.week} onChange={replace} onEdit={editor.openEdit} />
      <TaskSection title="Later" tasks={groups.later} onChange={replace} onEdit={editor.openEdit} />
      <TaskSection title="No due date" tasks={groups.undated} onChange={replace} onEdit={editor.openEdit} />
      <TaskSection title="Completed" tasks={groups.done} onChange={replace} onEdit={editor.openEdit} collapsed />
      {editor.element}
    </div>
  );
}
