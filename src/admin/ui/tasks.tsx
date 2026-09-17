import { Check, Lock, Pencil, Trash2 } from "lucide-react";
import { del, patch } from "../lib/api";
import { relativeDay } from "../lib/format";
import { Link } from "../lib/router";
import type { Task } from "../lib/types";
import { useWorkspace } from "../lib/workspace";
import { Avatar, Badge, Menu, useAction, useUi } from "./ui";

/* One task in a list: a completion checkbox, its title and what it belongs to. */
export function TaskRow({
  task,
  onChange,
  onEdit,
  showAssignee = true,
  showProject = true,
}: {
  task: Task;
  onChange: (task: Task | null) => void;
  onEdit: (task: Task) => void;
  showAssignee?: boolean;
  showProject?: boolean;
}) {
  const run = useAction();
  const { confirm } = useUi();
  const { session, isExecutive } = useWorkspace();
  const done = task.status === "done";
  const canDelete = task.isPrivate
    ? task.createdBy === session.username
    : task.createdBy === session.username ||
      task.assignee === session.username ||
      isExecutive;

  async function toggle() {
    const updated = await run(() =>
      patch<Task>(`tasks?id=${task.id}`, { status: done ? "todo" : "done" }),
    );
    if (updated) onChange(updated);
  }

  async function remove() {
    const ok = await confirm({
      title: "Delete this task?",
      body: `"${task.title}" will be removed for everyone.`,
      confirmLabel: "Delete",
      danger: true,
    });
    if (ok && (await run(() => del(`tasks?id=${task.id}`), "Task deleted"))) {
      onChange(null);
    }
  }

  return (
    <div className={`task-row ${done ? "is-done" : ""}`}>
      <button
        type="button"
        className="task-check"
        aria-pressed={done}
        aria-label={done ? `Mark "${task.title}" as not done` : `Mark "${task.title}" as done`}
        onClick={toggle}
      >
        {done && <Check size={14} aria-hidden />}
      </button>
      <button type="button" className="task-main" onClick={() => onEdit(task)}>
        <span className="task-title">
          {task.isPrivate && <Lock size={12} aria-label="Private" />}
          {task.title}
        </span>
        <span className="task-meta">
          {showProject && task.projectName && <span>{task.projectName}</span>}
          {task.dueDate && (
            <span className={task.overdue ? "is-overdue" : ""}>
              {relativeDay(task.dueDate)}
            </span>
          )}
          {task.status === "in_progress" && <span>In progress</span>}
        </span>
      </button>
      {(task.priority === "high" || task.priority === "urgent") && !done && (
        <Badge tone={task.priority === "urgent" ? "red" : "amber"}>
          {task.priority === "urgent" ? "Urgent" : "High"}
        </Badge>
      )}
      {showAssignee && !task.isPrivate && (
        <span className="task-assignee" title={task.assigneeName ?? "Unassigned"}>
          <Avatar name={task.assigneeName ?? "?"} size={26} />
        </span>
      )}
      <Menu
        items={[
          { label: "Edit", icon: Pencil, onSelect: () => onEdit(task) },
          canDelete && { label: "Delete", icon: Trash2, danger: true, onSelect: remove },
        ]}
      />
    </div>
  );
}

export function ProjectLink({
  id,
  name,
}: {
  id: string | null;
  name: string | null;
}) {
  if (!id || !name) return <span className="muted">—</span>;
  return <Link to={`/projects/${id}`}>{name}</Link>;
}
