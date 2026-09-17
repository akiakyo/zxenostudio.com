import { useState } from "react";
import { Lock, Plus } from "lucide-react";
import { post, useApi } from "../lib/api";
import { todayIso } from "../lib/format";
import type { Task } from "../lib/types";
import { useTaskEditor } from "../ui/editors";
import {
  Button,
  EmptyState,
  ErrorNote,
  Loading,
  PageHeader,
  Tabs,
  useAction,
} from "../ui/ui";
import { QuickAdd, TaskSection } from "./MyTasks";

type View = "upcoming" | "overdue" | "completed";

export function PrivateTasksPage() {
  const { data, error, loading, reload, setData } = useApi<Task[]>("tasks?private=1");
  const editor = useTaskEditor(true, () => reload());
  const run = useAction();
  const [view, setView] = useState<View>("upcoming");
  const today = todayIso();

  const all = data ?? [];
  const overdue = all.filter((t) => t.status !== "done" && t.dueDate && t.dueDate < today);
  const upcoming = all.filter((t) => t.status !== "done" && (!t.dueDate || t.dueDate >= today));
  const completed = all
    .filter((t) => t.status === "done")
    .sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""));
  const lists = { upcoming, overdue, completed };

  function replace(task: Task, updated: Task | null) {
    setData((list) =>
      updated ? list?.map((t) => (t.id === task.id ? updated : t)) : list?.filter((t) => t.id !== task.id),
    );
  }

  return (
    <div className="page page-narrow">
      <PageHeader
        title="Private tasks"
        description={
          <span className="private-note">
            <Lock size={14} aria-hidden /> Only you can see these. They never show in the activity feed.
          </span>
        }
        actions={
          <Button variant="primary" icon={Plus} onClick={() => editor.openNew({ status: "todo", priority: "medium" })}>
            New private task
          </Button>
        }
      />
      <QuickAdd
        placeholder="Add a private task…"
        onAdd={(title) =>
          run(async () => {
            const task = await post<Task>("tasks", { title, isPrivate: true });
            setData((list) => [task, ...(list ?? [])]);
            setView("upcoming");
            return task;
          })
        }
      />
      <Tabs
        label="Private tasks"
        value={view}
        onChange={setView}
        tabs={[
          { value: "overdue", label: "Overdue", count: overdue.length },
          { value: "upcoming", label: "Upcoming", count: upcoming.length },
          { value: "completed", label: "Completed", count: completed.length },
        ]}
      />
      {error && <ErrorNote message={error} onRetry={reload} />}
      {loading && !data && <Loading />}
      {data && !lists[view].length && (
        <EmptyState icon={Lock} title={view === "overdue" ? "Nothing overdue" : view === "completed" ? "Nothing completed yet" : "No upcoming private tasks"} />
      )}
      <TaskSection
        title={view === "overdue" ? "Overdue" : view === "completed" ? "Completed" : "Upcoming"}
        tone={view === "overdue" ? "overdue" : undefined}
        tasks={lists[view]}
        onChange={replace}
        onEdit={editor.openEdit}
      />
      {editor.element}
    </div>
  );
}
