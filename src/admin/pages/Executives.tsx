import { Crown, ShieldCheck, TriangleAlert } from "lucide-react";
import { useApi } from "../lib/api";
import { formatDate, money, relativeDay } from "../lib/format";
import { Link } from "../lib/router";
import { useWorkspace } from "../lib/workspace";
import {
  Avatar,
  EmptyState,
  ErrorNote,
  Loading,
  PageHeader,
  Panel,
  Progress,
  StatusBadge,
} from "../ui/ui";

type ProjectRow = {
  id: string;
  name: string;
  status: string;
  progress: number;
  dueDate: string;
  clientName: string | null;
};

type Overview = {
  today: string;
  money: {
    paidThisMonth: number;
    paidThisYear: number;
    outstanding: number;
    outstandingCount: number;
    overdue: number;
    overdueCount: number;
    draftCount: number;
  };
  projects: { active: number; completed: number };
  overdueProjects: ProjectRow[];
  atRiskProjects: ProjectRow[];
  workload: {
    username: string;
    name: string;
    title: string;
    openTasks: number;
    overdueTasks: number;
    doneThisWeek: number;
  }[];
  executives: { username: string; name: string; title: string; phone: string }[];
};

export function ExecutivesPage() {
  const { isExecutive } = useWorkspace();
  const { data, error, loading, reload } = useApi<Overview>(isExecutive ? "executive" : null);

  if (!isExecutive) {
    return (
      <div className="page page-narrow">
        <PageHeader title="Executives" />
        <EmptyState icon={ShieldCheck} title="Only executives can open this page">
          It holds the studio's finances and team workload.
        </EmptyState>
      </div>
    );
  }

  const maxOpen = Math.max(1, ...(data?.workload ?? []).map((w) => w.openTasks));

  return (
    <div className="page">
      <PageHeader
        eyebrow={<><Crown size={14} aria-hidden /> Executives only</>}
        title="Executive overview"
        description="Money, project health and team workload at a glance."
      />
      {error && <ErrorNote message={error} onRetry={reload} />}
      {loading && !data && <Loading />}
      {data && (
        <>
          <section className="stats stats-4" aria-label="Finances">
            <Link to="/invoices?" className="stat"><span>Paid this month</span><strong>{money(data.money.paidThisMonth)}</strong></Link>
            <div className="stat"><span>Paid this year</span><strong>{money(data.money.paidThisYear)}</strong></div>
            <Link to="/invoices" className="stat"><span>Outstanding ({data.money.outstandingCount})</span><strong>{money(data.money.outstanding)}</strong></Link>
            <Link to="/invoices" className={`stat ${data.money.overdueCount ? "is-alert" : ""}`}><span>Overdue ({data.money.overdueCount})</span><strong>{money(data.money.overdue)}</strong></Link>
          </section>

          <div className="dash-grid">
            <Panel title={<>Overdue projects {data.overdueProjects.length > 0 && <TriangleAlert size={15} aria-hidden className="is-overdue" />}</>}>
              <ProjectList rows={data.overdueProjects} empty="No project is past its due date." />
            </Panel>
            <Panel title="At risk (due in 14 days, under 75%)">
              <ProjectList rows={data.atRiskProjects} empty="Nothing looks at risk." />
            </Panel>

            <Panel title="Team workload" className="span-2">
              <div className="table-wrap">
                <table className="table workload">
                  <thead>
                    <tr>
                      <th scope="col">Member</th>
                      <th scope="col">Open tasks</th>
                      <th scope="col" className="num">Overdue</th>
                      <th scope="col" className="num">Done in 7 days</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.workload.map((w) => (
                      <tr key={w.username}>
                        <td>
                          <div className="author">
                            <Avatar name={w.name || w.username} size={28} />
                            <div><strong>{w.name || w.username}</strong><span>{w.title}</span></div>
                          </div>
                        </td>
                        <td className="cell-load">
                          <span className="load-bar"><span style={{ width: `${(w.openTasks / maxOpen) * 100}%` }} /></span>
                          {w.openTasks}
                        </td>
                        <td className={`num ${w.overdueTasks ? "is-overdue" : ""}`}>{w.overdueTasks}</td>
                        <td className="num">{w.doneThisWeek}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>

            <Panel title="Projects">
              <dl className="facts">
                <div><dt>Active</dt><dd className="big-number">{data.projects.active}</dd></div>
                <div><dt>Completed</dt><dd className="big-number">{data.projects.completed}</dd></div>
                <div><dt>Invoice drafts</dt><dd className="big-number">{data.money.draftCount}</dd></div>
              </dl>
            </Panel>

            <Panel title="The executives">
              <ul className="exec-list">
                {data.executives.map((e) => (
                  <li key={e.username}>
                    <Avatar name={e.name || e.username} size={34} />
                    <div>
                      <strong>{e.name || e.username}</strong>
                      <span>{e.title}</span>
                    </div>
                  </li>
                ))}
              </ul>
              <Link to="/roles" className="panel-more">Manage roles →</Link>
            </Panel>
          </div>
        </>
      )}
    </div>
  );
}

function ProjectList({ rows, empty }: { rows: ProjectRow[]; empty: string }) {
  if (!rows.length) return <p className="muted">{empty}</p>;
  return (
    <ul className="project-mini">
      {rows.map((p) => (
        <li key={p.id}>
          <Link to={`/projects/${p.id}`} className="project-mini-link">
            <span className="simple-title">{p.name}</span>
            <span className="simple-meta">
              {p.clientName ?? "No client"} · due {formatDate(p.dueDate)} ({relativeDay(p.dueDate)}) · <StatusBadge value={p.status} />
            </span>
            <Progress value={p.progress} />
          </Link>
        </li>
      ))}
    </ul>
  );
}
