import { useState, type DragEvent } from "react";
import { Columns3, Lock, Plus } from "lucide-react";
import { patch, query, useApi } from "../lib/api";
import { label, options, relativeDay } from "../lib/format";
import type { Task, TaskStatus } from "../lib/types";
import { useWorkspace } from "../lib/workspace";
import { useTaskEditor } from "../ui/editors";
import {
  Avatar,
  Badge,
  Button,
  EmptyState,
  ErrorNote,
  FilterBar,
  Loading,
  PageHeader,
  SelectFilter,
  useAction,
} from "../ui/ui";

const COLUMNS: TaskStatus[] = ["todo", "in_progress", "done"];

export function TaskBoardPage() {
  const { team, projects } = useWorkspace();
  const [projectId, setProjectId] = useState("");
  const [assignee, setAssignee] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const { data, error, loading, reload, setData } = useApi<Task[]>(
    `tasks${query({ private: 0, archived: 0, projectId, assignee, priority })}`,
  );
  const editor = useTaskEditor(false, () => reload());
  const run = useAction();
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<TaskStatus | null>(null);

  async function move(task: Task, next: TaskStatus) {
    if (task.status === next) return;
    setData((list) => list?.map((t) => (t.id === task.id ? { ...t, status: next } : t)));
    const updated = await run(() => patch<Task>(`tasks?id=${task.id}`, { status: next }));
    if (updated) setData((list) => list?.map((t) => (t.id === task.id ? updated : t)));
    else reload();
  }

  function drop(event: DragEvent, column: TaskStatus) {
    event.preventDefault();
    setOver(null);
    const task = data?.find((t) => t.id === event.dataTransfer.getData("text/plain"));
    if (task) move(task, column);
  }

  const columns = status ? COLUMNS.filter((c) => c === status) : COLUMNS;

  return (
    <div className="page page-wide">
      <PageHeader
        title="Task overview"
        description="Every shared task across the studio. Drag cards between columns to change their status."
        actions={
          <Button variant="primary" icon={Plus} onClick={() => editor.openNew({ status: "todo", priority: "medium", projectId })}>
            New task
          </Button>
        }
      />
      <FilterBar>
        <SelectFilter label="Project" allLabel="All projects" value={projectId} onChange={setProjectId} options={projects.map((p) => ({ value: p.id, label: p.name }))} />
        <SelectFilter label="Assignee" allLabel="All assignees" value={assignee} onChange={setAssignee} options={team.map((m) => ({ value: m.username, label: m.name || m.username }))} />
        <SelectFilter label="Status" allLabel="All statuses" value={status} onChange={setStatus} options={options(COLUMNS)} />
        <SelectFilter label="Priority" allLabel="All priorities" value={priority} onChange={setPriority} options={options(["urgent", "high", "medium", "low"])} />
      </FilterBar>
      {error && <ErrorNote message={error} onRetry={reload} />}
      {loading && !data && <Loading />}
      {data && !data.length && (
        <EmptyState icon={Columns3} title="No tasks match these filters" />
      )}
      {data && data.length > 0 && (
        <div className="board" style={{ ["--columns" as string]: columns.length }}>
          {columns.map((column) => {
            const tasks = data.filter((t) => t.status === column);
            return (
              <section
                key={column}
                className={`board-column ${over === column ? "is-over" : ""}`}
                aria-label={label(column)}
                onDragOver={(e) => {
                  e.preventDefault();
                  setOver(column);
                }}
                onDragLeave={() => setOver((o) => (o === column ? null : o))}
                onDrop={(e) => drop(e, column)}
              >
                <h2>
                  <span className={`column-dot column-${column}`} aria-hidden="true" />
                  {label(column)} <span className="muted">{tasks.length}</span>
                </h2>
                <div className="board-cards">
                  {tasks.map((task) => (
                    <article
                      key={task.id}
                      className={`board-card ${dragging === task.id ? "is-dragging" : ""}`}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData("text/plain", task.id);
                        e.dataTransfer.effectAllowed = "move";
                        setDragging(task.id);
                      }}
                      onDragEnd={() => setDragging(null)}
                    >
                      <button type="button" className="board-card-title" onClick={() => editor.openEdit(task)}>
                        {task.isPrivate && <Lock size={12} aria-label="Private" />}
                        {task.title}
                      </button>
                      {task.projectName && <span className="board-card-project">{task.projectName}</span>}
                      <div className="board-card-foot">
                        <Badge tone={task.priority === "urgent" ? "red" : task.priority === "high" ? "amber" : task.priority === "medium" ? "blue" : "neutral"}>
                          {label(task.priority)}
                        </Badge>
                        {task.dueDate && (
                          <span className={`board-card-due ${task.overdue ? "is-overdue" : ""}`}>{relativeDay(task.dueDate)}</span>
                        )}
                        <span className="board-card-assignee" title={task.assigneeName ?? "Unassigned"}>
                          <Avatar name={task.assigneeName ?? "?"} size={24} />
                        </span>
                      </div>
                      <label className="board-card-move">
                        <span className="sr-only">Status of {task.title}</span>
                        <select value={task.status} onChange={(e) => move(task, e.target.value as TaskStatus)}>
                          {COLUMNS.map((c) => (
                            <option key={c} value={c}>{label(c)}</option>
                          ))}
                        </select>
                      </label>
                    </article>
                  ))}
                  {!tasks.length && <p className="board-empty">No tasks</p>}
                </div>
              </section>
            );
          })}
        </div>
      )}
      {editor.element}
    </div>
  );
}
