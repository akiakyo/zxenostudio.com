import {
  AlarmClock,
  CalendarClock,
  FolderPlus,
  ListChecks,
  MessagesSquare,
  NotebookPen,
  Pin,
  Plus,
  Send,
  TriangleAlert,
  FolderKanban,
} from "lucide-react";
import { useApi } from "../lib/api";
import { formatDate, relativeDay, timeAgo, todayIso } from "../lib/format";
import { Link, navigate } from "../lib/router";
import type {
  ActivityItem,
  Announcement,
  CalendarEvent,
  Project,
  StatusUpdate,
  Task,
} from "../lib/types";
import { useWorkspace } from "../lib/workspace";
import { eventHref } from "../ui/calendar";
import {
  useMeetingNoteEditor,
  useProjectEditor,
  useStatusUpdateEditor,
  useTaskEditor,
} from "../ui/editors";
import {
  Avatar,
  Badge,
  EmptyState,
  ErrorNote,
  Loading,
  MultilineText,
  Panel,
  Progress,
  StatusBadge,
} from "../ui/ui";
import { ActivityLine } from "./Activity";

type Dashboard = {
  today: string;
  stats: {
    activeProjects: number;
    myOpenTasks: number;
    myOverdueTasks: number;
    openFeedback: number;
    dueThisWeek: number;
  };
  myTasks: Pick<Task, "id" | "title" | "status" | "priority" | "dueDate" | "projectName" | "projectId">[];
  deadlines: CalendarEvent[];
  announcements: Announcement[];
  activity: ActivityItem[];
  statusUpdates: StatusUpdate[];
  projects: Pick<Project, "id" | "name" | "status" | "progress" | "dueDate">[];
};

function greeting() {
  const hour = Number(
    new Intl.DateTimeFormat("en-PH", {
      hour: "numeric",
      hour12: false,
      timeZone: "Asia/Manila",
    }).format(new Date()),
  );
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function DashboardPage() {
  const { session, isExecutive } = useWorkspace();
  const { data, error, loading, reload } = useApi<Dashboard>("dashboard");
  const projectEditor = useProjectEditor((row) => navigate(`/projects/${row.id}`));
  const updateEditor = useStatusUpdateEditor(() => reload());
  const noteEditor = useMeetingNoteEditor((row) => navigate(`/meeting-notes?id=${row.id}`));
  const taskEditor = useTaskEditor(false, () => reload());
  const firstName = (session.name || session.username).split(" ")[0];

  return (
    <div className="page">
      <header className="hello">
        <div>
          <p className="hello-date">
            {formatDate(todayIso(), { weekday: true, year: true })}
          </p>
          <h1>
            {greeting()}, {firstName}.
          </h1>
          <div className="hello-role">
            <span className="role-pill">{session.title}</span>
            {isExecutive && <Badge tone="green">Executive</Badge>}
          </div>
        </div>
      </header>

      <section className="quick-actions" aria-label="Quick actions">
        <button type="button" className="quick-action" onClick={() => projectEditor.openNew({ status: "planning" })}>
          <span className="qa-icon"><FolderPlus size={20} aria-hidden /></span>
          <span>
            <strong>New project</strong>
            <small>Set dates, client and progress</small>
          </span>
        </button>
        <button type="button" className="quick-action" onClick={() => updateEditor.openNew()}>
          <span className="qa-icon"><Send size={20} aria-hidden /></span>
          <span>
            <strong>Weekly status update</strong>
            <small>What got done, what's next</small>
          </span>
        </button>
        <button type="button" className="quick-action" onClick={() => noteEditor.openNew({ meetingDate: todayIso(), attendees: [session.username] })}>
          <span className="qa-icon"><NotebookPen size={20} aria-hidden /></span>
          <span>
            <strong>New meeting note</strong>
            <small>Decisions and action items</small>
          </span>
        </button>
      </section>

      {error && <ErrorNote message={error} onRetry={reload} />}
      {loading && !data && <Loading />}

      {data && (
        <>
          <section className="stats" aria-label="At a glance">
            <Stat icon={FolderKanban} label="Active projects" value={data.stats.activeProjects} to="/projects" />
            <Stat icon={ListChecks} label="My open tasks" value={data.stats.myOpenTasks} to="/tasks/mine" />
            <Stat icon={TriangleAlert} label="My overdue tasks" value={data.stats.myOverdueTasks} to="/tasks/mine" alert={data.stats.myOverdueTasks > 0} />
            <Stat icon={CalendarClock} label="Due in 7 days" value={data.stats.dueThisWeek} to="/deadlines" />
            <Stat icon={MessagesSquare} label="Open feedback" value={data.stats.openFeedback} to="/feedback" />
          </section>

          <div className="dash-grid">
            <Panel
              title="My tasks"
              action={
                <button type="button" className="panel-link" onClick={() => taskEditor.openNew({ assignee: session.username, status: "todo", priority: "medium" })}>
                  <Plus size={14} aria-hidden /> Add
                </button>
              }
            >
              {data.myTasks.length ? (
                <ul className="simple-list">
                  {data.myTasks.map((task) => (
                    <li key={task.id}>
                      <Link to={task.projectId ? `/projects/${task.projectId}?tab=tasks` : "/tasks/mine"} className="simple-item">
                        <span className="simple-title">{task.title}</span>
                        <span className="simple-meta">
                          {task.projectName ?? "No project"}
                          {task.dueDate && (
                            <span className={task.dueDate < data.today ? "is-overdue" : ""}>
                              {" · "}{relativeDay(task.dueDate)}
                            </span>
                          )}
                        </span>
                      </Link>
                      {task.status === "in_progress" && <StatusBadge value="in_progress" />}
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState icon={ListChecks} title="Nothing assigned to you">Enjoy the calm.</EmptyState>
              )}
              <Link to="/tasks/mine" className="panel-more">All my tasks →</Link>
            </Panel>

            <Panel title="Upcoming deadlines">
              {data.deadlines.length ? (
                <ul className="simple-list">
                  {data.deadlines.map((event) => (
                    <li key={`${event.type}-${event.id}`}>
                      <Link to={eventHref(event)} className="simple-item">
                        <span className="simple-title">
                          <span className={`event-dot event-${event.type}`} aria-hidden="true" /> {event.title}
                        </span>
                        <span className="simple-meta">
                          <span className={event.date < data.today ? "is-overdue" : ""}>{relativeDay(event.date)}</span>
                          {event.projectName && event.type !== "project" && ` · ${event.projectName}`}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState icon={AlarmClock} title="No deadlines in the next two weeks" />
              )}
              <Link to="/deadlines" className="panel-more">All deadlines →</Link>
            </Panel>

            <Panel title="Announcements">
              {data.announcements.length ? (
                <ul className="announce-list">
                  {data.announcements.map((a) => (
                    <li key={a.id}>
                      <div className="announce-head">
                        {a.pinned && <Pin size={13} aria-label="Pinned" />}
                        <strong>{a.title}</strong>
                      </div>
                      <p className="clamp-3">{a.body}</p>
                      <span className="simple-meta">{a.createdByName} · {timeAgo(a.createdAt)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState title="No announcements yet" />
              )}
              <Link to="/announcements" className="panel-more">All announcements →</Link>
            </Panel>

            <Panel title="Active projects">
              {data.projects.length ? (
                <ul className="project-mini">
                  {data.projects.map((p) => (
                    <li key={p.id}>
                      <Link to={`/projects/${p.id}`} className="project-mini-link">
                        <span className="simple-title">{p.name}</span>
                        <span className="simple-meta">
                          {p.dueDate ? `Due ${formatDate(p.dueDate)}` : "No due date"}
                        </span>
                        <Progress value={p.progress} />
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState icon={FolderKanban} title="No active projects" />
              )}
              <Link to="/projects" className="panel-more">All projects →</Link>
            </Panel>

            <Panel
              title="Weekly updates"
              className="span-2"
              action={
                <button type="button" className="panel-link" onClick={() => updateEditor.openNew()}>
                  <Plus size={14} aria-hidden /> Post
                </button>
              }
            >
              {data.statusUpdates.length ? (
                <div className="update-cards">
                  {data.statusUpdates.map((u) => (
                    <article key={u.id} className="update-card">
                      <div className="update-author">
                        <Avatar name={u.createdByName} size={28} />
                        <div>
                          <strong>{u.createdByName}</strong>
                          <span>Week of {formatDate(u.weekOf)}{u.projectName ? ` · ${u.projectName}` : ""}</span>
                        </div>
                      </div>
                      <div className="clamp-4"><MultilineText text={u.done} /></div>
                    </article>
                  ))}
                </div>
              ) : (
                <EmptyState icon={Send} title="No weekly updates yet">Post the first one for this week.</EmptyState>
              )}
              <Link to="/activity?tab=updates" className="panel-more">All weekly updates →</Link>
            </Panel>

            <Panel title="Recent activity">
              {data.activity.length ? (
                <ul className="activity-list compact">
                  {data.activity.map((item) => (
                    <ActivityLine key={item.id} item={item} />
                  ))}
                </ul>
              ) : (
                <EmptyState title="Nothing has happened yet" />
              )}
              <Link to="/activity" className="panel-more">Full activity feed →</Link>
            </Panel>
          </div>
        </>
      )}

      {projectEditor.element}
      {updateEditor.element}
      {noteEditor.element}
      {taskEditor.element}
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  to,
  alert,
}: {
  icon: typeof ListChecks;
  label: string;
  value: number;
  to: string;
  alert?: boolean;
}) {
  return (
    <Link to={to} className={`stat ${alert ? "is-alert" : ""}`}>
      <Icon size={18} aria-hidden />
      <strong>{value}</strong>
      <span>{label}</span>
    </Link>
  );
}
