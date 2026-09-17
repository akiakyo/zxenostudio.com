import { useMemo, useState } from "react";
import {
  Archive,
  ArchiveRestore,
  Check,
  ExternalLink,
  Flag,
  Images,
  ListChecks,
  Pencil,
  Plus,
  Receipt,
  Trash2,
} from "lucide-react";
import { del, patch, query, useApi } from "../lib/api";
import {
  addDays,
  daysBetween,
  formatDate,
  label,
  money,
  relativeDay,
  todayIso,
} from "../lib/format";
import { Link, navigate, setSearchParam, useLocation } from "../lib/router";
import type { Asset, Invoice, Milestone, Project, Task } from "../lib/types";
import { CalendarView } from "../ui/calendar";
import {
  useAssetEditor,
  useEditor,
  useInvoiceEditor,
  useTaskEditor,
} from "../ui/editors";
import { TaskRow } from "../ui/tasks";
import {
  Badge,
  Button,
  EmptyState,
  ErrorNote,
  IconButton,
  Loading,
  Menu,
  MultilineText,
  Progress,
  StatusBadge,
  Tabs,
  useAction,
  useUi,
} from "../ui/ui";
import { useProjectActions } from "./projectActions";

type Tab = "schedule" | "tasks" | "assets" | "invoices";

export function ProjectDetailPage() {
  const { path, search } = useLocation();
  const id = path.split("/")[2];
  const tab = (["schedule", "tasks", "assets", "invoices"].includes(search.get("tab") ?? "")
    ? search.get("tab")
    : "schedule") as Tab;
  const { data: project, error, loading, reload, setData } = useApi<Project>(`projects?id=${id}`);
  const [invoiceVersion, setInvoiceVersion] = useState(0);
  const actions = useProjectActions(
    (updated) => (updated ? setData(updated) : navigate("/projects")),
    () => setInvoiceVersion((v) => v + 1),
  );

  if (error) {
    return (
      <div className="page">
        <Link to="/projects" className="back-link">← Projects</Link>
        <ErrorNote message={error === "Not found" ? "This project no longer exists." : error} onRetry={error === "Not found" ? undefined : reload} />
      </div>
    );
  }
  if (loading && !project) return <div className="page"><Loading /></div>;
  if (!project) return null;

  return (
    <div className="page">
      <Link to={project.archived ? "/archives" : "/projects"} className="back-link">
        ← {project.archived ? "Project archives" : "Projects"}
      </Link>
      <header className="project-head">
        <div className="project-head-main">
          <div className="project-badges">
            <StatusBadge value={project.status} />
            {project.archived && <Badge tone="amber">Archived</Badge>}
            {project.overdue && <Badge tone="red">Overdue</Badge>}
          </div>
          <h1>{project.name}</h1>
          <p className="project-sub">
            {project.clientName ? `For ${project.clientName}` : "No client"}
            {" · "}
            {project.startDate ? formatDate(project.startDate) : "No start"} → {project.dueDate ? formatDate(project.dueDate, { year: true }) : "No due date"}
          </p>
          <div className="project-progress">
            <Progress value={project.progress} />
            <span>{project.progress}% complete</span>
          </div>
        </div>
        <div className="project-buttons">
          <Button icon={Pencil} onClick={() => actions.edit(project)}>Edit</Button>
          <Button icon={Receipt} onClick={() => actions.newInvoice(project)}>New invoice</Button>
          {project.archived ? (
            <Button icon={ArchiveRestore} onClick={() => actions.setArchived(project, false)}>Restore</Button>
          ) : (
            <Button icon={Archive} onClick={() => actions.setArchived(project, true)}>Archive</Button>
          )}
          {actions.canDelete && (
            <Button variant="danger" icon={Trash2} onClick={() => actions.remove(project)}>Delete</Button>
          )}
        </div>
      </header>
      {project.description && (
        <div className="project-description"><MultilineText text={project.description} /></div>
      )}

      <Tabs
        label="Project sections"
        value={tab}
        onChange={(value) => setSearchParam("tab", value)}
        tabs={[
          { value: "schedule", label: "Schedule" },
          { value: "tasks", label: "Tasks", count: project.taskCount },
          { value: "assets", label: "Assets" },
          { value: "invoices", label: "Invoices" },
        ]}
      />

      {tab === "schedule" && <ScheduleTab project={project} onChanged={reload} />}
      {tab === "tasks" && <TasksTab project={project} onChanged={reload} />}
      {tab === "assets" && <AssetsTab project={project} />}
      {tab === "invoices" && (
        <InvoicesTab key={invoiceVersion} project={project} onNew={() => actions.newInvoice(project)} />
      )}
      {actions.elements}
    </div>
  );
}

function ScheduleTab({ project, onChanged }: { project: Project; onChanged: () => void }) {
  const { data: milestones, reload } = useApi<Milestone[]>(`milestones?projectId=${project.id}`);
  const { data: tasks } = useApi<Task[]>(`tasks${query({ projectId: project.id })}`);
  const run = useAction();
  const { confirm } = useUi();
  const [calendarKey, setCalendarKey] = useState(0);
  const editor = useEditor<Milestone>(
    {
      resource: "milestones",
      noun: "milestone",
      size: "sm",
      fields: [
        { name: "title", label: "Milestone", type: "text", required: true, wide: true },
        { name: "dueDate", label: "Date", type: "date", required: true, wide: true },
        { name: "done", label: "Reached", type: "checkbox", wide: true },
      ],
      prepare: (values) => ({ ...values, projectId: project.id }),
    },
    () => {
      reload();
      onChanged();
      setCalendarKey((k) => k + 1);
    },
  );

  async function toggle(m: Milestone) {
    if (await run(() => patch(`milestones?id=${m.id}`, { done: !m.done }))) {
      reload();
      onChanged();
      setCalendarKey((k) => k + 1);
    }
  }

  async function remove(m: Milestone) {
    if (
      (await confirm({ title: "Delete this milestone?", body: m.title, confirmLabel: "Delete", danger: true })) &&
      (await run(() => del(`milestones?id=${m.id}`), "Milestone deleted"))
    ) {
      reload();
      onChanged();
      setCalendarKey((k) => k + 1);
    }
  }

  return (
    <div className="schedule">
      <section className="panel">
        <div className="panel-head">
          <h2>Timeline</h2>
        </div>
        <Timeline project={project} milestones={milestones ?? []} tasks={tasks ?? []} />
      </section>

      <div className="schedule-grid">
        <section className="panel">
          <div className="panel-head">
            <h2>Milestones</h2>
            <Button size="sm" icon={Plus} onClick={() => editor.openNew({ dueDate: project.dueDate ?? todayIso() })}>
              Add milestone
            </Button>
          </div>
          {milestones && !milestones.length && (
            <EmptyState icon={Flag} title="No milestones yet">Break the project into checkpoints like rough cut, review and delivery.</EmptyState>
          )}
          <ul className="milestone-list">
            {milestones?.map((m) => {
              const overdue = !m.done && m.dueDate < todayIso();
              return (
                <li key={m.id} className={m.done ? "is-done" : ""}>
                  <button
                    type="button"
                    className="task-check"
                    aria-pressed={m.done}
                    aria-label={m.done ? `Mark ${m.title} as not reached` : `Mark ${m.title} as reached`}
                    onClick={() => toggle(m)}
                  >
                    {m.done && <Check size={14} aria-hidden />}
                  </button>
                  <div className="milestone-text">
                    <strong>{m.title}</strong>
                    <span className={overdue ? "is-overdue" : ""}>
                      {formatDate(m.dueDate, { weekday: true })}
                      {relativeDay(m.dueDate) !== formatDate(m.dueDate) && ` · ${relativeDay(m.dueDate)}`}
                    </span>
                  </div>
                  <Menu
                    items={[
                      { label: "Edit", icon: Pencil, onSelect: () => editor.openEdit(m) },
                      { label: "Delete", icon: Trash2, danger: true, onSelect: () => remove(m) },
                    ]}
                  />
                </li>
              );
            })}
          </ul>
        </section>
        <section className="panel">
          <CalendarView key={calendarKey} projectId={project.id} types={["milestone", "task", "invoice", "project"]} />
        </section>
      </div>
      {editor.element}
    </div>
  );
}

/* A single bar from start to due date with milestones, task due dates and
   today marked along it. */
function Timeline({
  project,
  milestones,
  tasks,
}: {
  project: Project;
  milestones: Milestone[];
  tasks: Task[];
}) {
  const today = todayIso();
  const range = useMemo(() => {
    const dates = [
      project.startDate,
      project.dueDate,
      ...milestones.map((m) => m.dueDate),
      ...tasks.map((t) => t.dueDate),
    ].filter(Boolean) as string[];
    if (!dates.length) return null;
    let start = project.startDate ?? dates.reduce((a, b) => (a < b ? a : b));
    let end = project.dueDate ?? dates.reduce((a, b) => (a > b ? a : b));
    if (start > end) [start, end] = [end, start];
    if (start === end) end = addDays(start, 1);
    return { start, end, span: daysBetween(start, end) };
  }, [project, milestones, tasks]);

  if (!range) {
    return (
      <EmptyState title="Nothing to plot yet">
        Add a start and due date to the project, or milestones and tasks with dates.
      </EmptyState>
    );
  }

  const position = (date: string) =>
    `${Math.max(0, Math.min(100, (daysBetween(range.start, date) / range.span) * 100))}%`;
  const elapsed = Math.max(0, Math.min(100, (daysBetween(range.start, today) / range.span) * 100));
  const datedTasks = tasks.filter((t) => t.dueDate);

  return (
    <div className="timeline">
      <div className="timeline-scale">
        <span>{formatDate(range.start, { year: true })}</span>
        <span>{range.span} days</span>
        <span>{formatDate(range.end, { year: true })}</span>
      </div>
      <div className="timeline-track">
        <div className="timeline-elapsed" style={{ width: `${elapsed}%` }} />
        <div className="timeline-progress" style={{ width: `${project.progress}%` }} title={`${project.progress}% complete`} />
        {today >= range.start && today <= range.end && (
          <div className="timeline-today" style={{ left: position(today) }}>
            <span>Today</span>
          </div>
        )}
      </div>
      <div className="timeline-lane" aria-label="Milestones">
        <span className="lane-label">Milestones</span>
        <div className="lane-track">
          {milestones.map((m) => (
            <span
              key={m.id}
              className={`lane-marker milestone ${m.done ? "is-done" : ""}`}
              style={{ left: position(m.dueDate) }}
              title={`${m.title} · ${formatDate(m.dueDate)}`}
            >
              <Flag size={12} aria-hidden />
              <span className="lane-text">{m.title}</span>
            </span>
          ))}
        </div>
      </div>
      <div className="timeline-lane" aria-label="Task due dates">
        <span className="lane-label">Tasks</span>
        <div className="lane-track">
          {datedTasks.map((t) => (
            <span
              key={t.id}
              className={`lane-dot ${t.status === "done" ? "is-done" : ""} ${t.overdue ? "is-overdue" : ""}`}
              style={{ left: position(t.dueDate!) }}
              title={`${t.title} · ${label(t.status)} · ${formatDate(t.dueDate)}`}
            />
          ))}
        </div>
      </div>
      <p className="timeline-legend">
        <span><i className="swatch swatch-progress" /> Progress</span>
        <span><i className="swatch swatch-elapsed" /> Time elapsed</span>
      </p>
    </div>
  );
}

function TasksTab({ project, onChanged }: { project: Project; onChanged: () => void }) {
  const { data, error, loading, reload, setData } = useApi<Task[]>(`tasks?projectId=${project.id}`);
  const editor = useTaskEditor(false, () => {
    reload();
    onChanged();
  });
  const groups: [string, Task[]][] = [
    ["To do", (data ?? []).filter((t) => t.status === "todo")],
    ["In progress", (data ?? []).filter((t) => t.status === "in_progress")],
    ["Done", (data ?? []).filter((t) => t.status === "done")],
  ];

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Tasks</h2>
        <Button size="sm" variant="primary" icon={Plus} onClick={() => editor.openNew({ projectId: project.id, status: "todo", priority: "medium" })}>
          Add task
        </Button>
      </div>
      {error && <ErrorNote message={error} onRetry={reload} />}
      {loading && !data && <Loading />}
      {data && !data.length && <EmptyState icon={ListChecks} title="No tasks on this project yet" />}
      {groups.map(([name, list]) =>
        list.length ? (
          <div key={name} className="task-group">
            <h3>{name} <span className="muted">{list.length}</span></h3>
            {list.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                showProject={false}
                onEdit={editor.openEdit}
                onChange={(updated) => {
                  setData((current) =>
                    updated
                      ? current?.map((t) => (t.id === updated.id ? updated : t))
                      : current?.filter((t) => t.id !== task.id),
                  );
                  onChanged();
                }}
              />
            ))}
          </div>
        ) : null,
      )}
      {editor.element}
    </section>
  );
}

function AssetsTab({ project }: { project: Project }) {
  const { data, error, loading, reload } = useApi<Asset[]>(`assets?projectId=${project.id}`);
  const editor = useAssetEditor(() => reload());
  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Assets</h2>
        <Button size="sm" variant="primary" icon={Plus} onClick={() => editor.openNew({ projectId: project.id, kind: "image" })}>
          Add asset link
        </Button>
      </div>
      {error && <ErrorNote message={error} onRetry={reload} />}
      {loading && !data && <Loading />}
      {data && !data.length && <EmptyState icon={Images} title="No assets linked to this project" />}
      <ul className="link-list">
        {data?.map((asset) => (
          <li key={asset.id}>
            <a href={asset.url} target="_blank" rel="noopener noreferrer">
              <strong>{asset.name}</strong>
              <ExternalLink size={13} aria-hidden />
            </a>
            <span className="muted">{label(asset.kind)}{asset.tags ? ` · ${asset.tags}` : ""}</span>
            <IconButton icon={Pencil} label={`Edit ${asset.name}`} onClick={() => editor.openEdit(asset)} />
          </li>
        ))}
      </ul>
      {editor.element}
    </section>
  );
}

function InvoicesTab({ project, onNew }: { project: Project; onNew: () => void }) {
  const { data, error, loading, reload } = useApi<Invoice[]>(`invoices?projectId=${project.id}`);
  const editor = useInvoiceEditor(() => reload());
  const run = useAction();
  const total = (data ?? []).filter((i) => i.status !== "void").reduce((sum, i) => sum + i.amount, 0);
  const paid = (data ?? []).filter((i) => i.status === "paid").reduce((sum, i) => sum + i.amount, 0);

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Invoices</h2>
        <Button size="sm" variant="primary" icon={Plus} onClick={onNew}>New invoice</Button>
      </div>
      {error && <ErrorNote message={error} onRetry={reload} />}
      {loading && !data && <Loading />}
      {data && !data.length && <EmptyState icon={Receipt} title="No invoices for this project" />}
      {data && data.length > 0 && (
        <>
          <p className="invoice-summary">
            Billed <strong>{money(total)}</strong> · Paid <strong>{money(paid)}</strong> · Outstanding <strong>{money(total - paid)}</strong>
          </p>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Invoice</th>
                  <th scope="col">Amount</th>
                  <th scope="col">Due</th>
                  <th scope="col">Status</th>
                  <th scope="col"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {data.map((invoice) => (
                  <tr key={invoice.id}>
                    <td>
                      <span className="cell-title">{invoice.number}</span>
                      <span className="cell-sub">{invoice.title}</span>
                    </td>
                    <td className="num">{money(invoice.amount)}</td>
                    <td>{formatDate(invoice.dueDate)}</td>
                    <td>{invoice.overdue ? <Badge tone="red">Overdue</Badge> : <StatusBadge value={invoice.status} />}</td>
                    <td className="cell-actions">
                      <Menu
                        items={[
                          { label: "Edit", icon: Pencil, onSelect: () => editor.openEdit(invoice) },
                          invoice.status !== "paid" && {
                            label: "Mark paid",
                            icon: Check,
                            onSelect: async () => {
                              if (await run(() => patch(`invoices?id=${invoice.id}`, { status: "paid" }), "Marked paid")) reload();
                            },
                          },
                        ]}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      {editor.element}
    </section>
  );
}

