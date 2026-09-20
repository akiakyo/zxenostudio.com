import { ListChecks, ShieldCheck } from 'lucide-react';
import { useApi } from '../../lib/api';
import { formatDate, label, moneyShort, relativeDay, todayIso, workStatus } from '../../lib/format';
import { Link } from '../../lib/router';
import { useWorkspace } from '../../lib/workspace';
import { Avatar, ErrorNote, Panel, StatusBadge } from '../../ui/ui';
import type { RecordRow } from './Records';

type Summary = {
  approvals: RecordRow[];
  projects: { status: string; count: number; progress: number }[];
  workload: RecordRow[];
  people: { workStatus: string; count: number }[];
  rooms: RecordRow[];
};
type Overview = {
  today: string;
  onTime: { delivered: number; total: number };
  revenue: { month: string; mtd: number; series: number[] };
  tasksDue: { count: number; series: number[] };
  overdueTasks: number;
  approvals: number;
  dueThisWeek: { id: string; name: string; status: string; dueDate: string; clientName: string | null }[];
  schedule: { id: string; title: string; startTime: string; endTime: string; kind: string; location: string }[];
};

/* Only drawn when the numbers actually move. A flat or single-point line says
   nothing, and a line over invented history would say something untrue. */
function Sparkline({ values, title }: { values: number[]; title: string }) {
  if (values.length < 2) return null;
  const max = Math.max(...values);
  const min = Math.min(...values);
  if (max === min) return null;
  const points = values
    .map((v, i) => `${(i / (values.length - 1)) * 90},${26 - ((v - min) / (max - min)) * 24}`)
    .join(' ');
  return (
    <svg className="sparkline" width="90" height="28" viewBox="0 0 90 28" role="img" aria-label={title}>
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Ring({ value, size = 56 }: { value: number; size?: number }) {
  const r = size / 2 - 5;
  const c = 2 * Math.PI * r;
  return (
    <svg className="ring" width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line-strong)" strokeWidth="5" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="var(--accent)"
        strokeWidth="5"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - value / 100)}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text x={size / 2} y={size / 2 + 4} textAnchor="middle" fontSize={size * 0.26} fontWeight="700" fill="var(--text)">
        {value}%
      </text>
    </svg>
  );
}

function greeting() {
  const hour = Number(
    new Intl.DateTimeFormat('en-PH', { hour: 'numeric', hour12: false, timeZone: 'Asia/Manila' }).format(new Date()),
  );
  return hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
}

export function DashboardSummary() {
  const { data, error, reload } = useApi<Summary>('hq-summary');
  const view = useApi<Overview>('hq-overview');
  const { team, session } = useWorkspace();
  if (error) return <ErrorNote message={error} onRetry={reload} />;
  const o = view.data;
  const active = (data?.projects ?? []).filter((p) => p.status !== 'completed').reduce((n, p) => n + p.count, 0);
  const inReview = (data?.projects ?? []).find((p) => p.status === 'review')?.count ?? 0;
  const inProduction = (data?.projects ?? []).find((p) => p.status === 'active')?.count ?? 0;
  const onTimePct = o && o.onTime.total ? Math.round((o.onTime.delivered / o.onTime.total) * 100) : 0;
  const stages = (data?.projects ?? []).filter((p) => p.count > 0);
  const firstName = (session.name || session.username).split(' ')[0];

  return (
    <>
      <section className="dash-hero">
        <div className="dash-hero-text">
          <p className="hello-date">{formatDate(todayIso(), { weekday: true, year: true })}</p>
          <h1>
            {greeting()}, {firstName}.
          </h1>
          <p className="dash-hero-sub">
            {o
              ? `${o.overdueTasks > 0 ? `${o.overdueTasks} overdue task${o.overdueTasks === 1 ? '' : 's'}. ` : ''}${o.approvals} approval${o.approvals === 1 ? '' : 's'} waiting. ${active} project${active === 1 ? '' : 's'} in motion.`
              : 'Pulling together what is happening today.'}
          </p>
          <div className="dash-hero-actions">
            <Link className="btn btn-primary btn-md" to="/tasks/mine">
              <ListChecks size={15} aria-hidden /> View tasks
            </Link>
            <Link className="btn btn-secondary btn-md" to="/approvals">
              <ShieldCheck size={15} aria-hidden /> Approvals
            </Link>
          </div>
        </div>
        <div className="dash-hero-tiles">
          <div className="hero-tile">
            <Ring value={onTimePct} />
            <div>
              <strong>On-time delivery</strong>
              <small>
                {o?.onTime.delivered ?? 0} of {o?.onTime.total ?? 0} projects delivered
              </small>
            </div>
          </div>
          <Link className="hero-tile" to="/projects?view=board">
            <span className="hero-number">
              {active}
              <small>active</small>
            </span>
            <div>
              <strong>Studio pipeline</strong>
              <small>{inReview} in review</small>
            </div>
          </Link>
        </div>
      </section>

      <section className="stat-strip" aria-label="At a glance">
        <Link className="stat-tile" to="/projects">
          <span className="stat-label">Active projects</span>
          <span className="stat-number">{active}</span>
          <span className="stat-sub">{inProduction} in production</span>
        </Link>
        <Link className={`stat-tile ${o?.tasksDue.count ? 'is-hot' : ''}`} to="/tasks/mine">
          <span className="stat-label">Tasks due</span>
          <span className="stat-number">{o?.tasksDue.count ?? 0}</span>
          <span className="stat-sub">In the last seven days</span>
          {o && <Sparkline values={o.tasksDue.series} title="Tasks due per day over the last seven days" />}
        </Link>
        <Link className="stat-tile" to="/approvals">
          <span className="stat-label">Pending approvals</span>
          <span className="stat-number">{o?.approvals ?? 0}</span>
          <span className="stat-sub">Awaiting review</span>
        </Link>
        <Link className="stat-tile" to="/finance">
          <span className="stat-label">Revenue MTD</span>
          <span className="stat-number">{moneyShort(o?.revenue.mtd ?? 0)}</span>
          <span className="stat-sub">Received this month</span>
          {o && <Sparkline values={o.revenue.series} title="Money received per month" />}
        </Link>
      </section>

      <div className="dash-grid">
        <Panel title="Due this week" action={<Link className="panel-link" to="/deadlines">View all</Link>}>
          {o?.dueThisWeek.length ? (
            <ul className="simple-list">
              {o.dueThisWeek.map((p) => (
                <li key={p.id}>
                  <Link to={`/projects/${p.id}`} className="simple-item">
                    <span className="simple-title">{p.name}</span>
                    <span className="simple-meta">
                      <span className={p.dueDate < o.today ? 'is-overdue' : ''}>{relativeDay(p.dueDate)}</span>
                      {p.clientName ? ` · ${p.clientName}` : ''}
                    </span>
                  </Link>
                  <StatusBadge value={p.status} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted hq-pad">Nothing due in the next seven days.</p>
          )}
        </Panel>

        <Panel title="Today's schedule" action={<Link className="panel-link" to="/calendar?view=week">Full calendar</Link>}>
          {o?.schedule.length ? (
            <ul className="schedule-list">
              {o.schedule.map((e) => (
                <li key={e.id} className={`schedule-item kind-${e.kind}`}>
                  <span className="schedule-time">{e.startTime}</span>
                  <span className="schedule-body">
                    <strong>{e.title}</strong>
                    <small>{e.location || label(e.kind)}</small>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted hq-pad">Nothing booked today.</p>
          )}
        </Panel>

        <Panel title="Studio pipeline" action={<Link className="panel-link" to="/projects?view=board">Open board</Link>}>
          <div className="hq-pad">
            <div className="pipeline-bar">
              {stages.map((p) => (
                <i key={p.status} className={`column-${p.status}`} style={{ flex: p.count }} />
              ))}
              {!stages.length && <i className="column-todo" style={{ flex: 1 }} />}
            </div>
            <ul className="pipeline-legend">
              {stages.map((p) => (
                <li key={p.status}>
                  <i className={`column-dot column-${p.status}`} aria-hidden="true" />
                  {label(p.status)} <b>{p.count}</b>
                </li>
              ))}
              {!stages.length && <li className="muted">No active projects.</li>}
            </ul>
          </div>
        </Panel>

        <Panel title="Who's in" action={<Link className="panel-link" to="/team">Team directory</Link>}>
          <div className="hq-pad">
            <ul className="presence-grid">
              {team.map((m) => (
                <li key={m.username}>
                  <Link to={`/chat?dm=${encodeURIComponent(m.username)}`} className="presence-person">
                    <Avatar name={m.name || m.username} size={36} status={m.workStatus} />
                    <span className="presence-name">{(m.name || m.username).split(' ')[0]}</span>
                    <span className="sr-only">{workStatus(m.workStatus)}. Send a direct message.</span>
                  </Link>
                </li>
              ))}
            </ul>
            <p className="presence-legend">
              {(data?.people ?? []).map((p) => (
                <span key={p.workStatus}>
                  <i className={`presence-dot is-${p.workStatus}`} aria-hidden="true" />
                  {p.count} {workStatus(p.workStatus).toLowerCase()}
                </span>
              ))}
            </p>
            {!!data?.rooms.length && (
              <>
                <h3 className="section-heading">In use now</h3>
                {data.rooms.map((r, i) => (
                  <div key={i}>
                    <strong>{r.location}</strong>
                    <span className="cell-sub">
                      {r.title} · until {r.endTime}
                    </span>
                  </div>
                ))}
              </>
            )}
          </div>
        </Panel>

        <Panel title="Team workload" action={<Link className="panel-link" to="/workload">Full view</Link>}>
          <div className="hq-pad">
            {(data?.workload ?? []).map((w) => {
              const pct = Math.round((w.hours / w.available) * 100);
              return (
                <div className="workload-row" key={w.id}>
                  <span className="workload-name">{String(w.name ?? w.member).split(' ')[0]}</span>
                  <span className="workload-bar">
                    <i
                      className={pct > 100 ? 'is-over' : pct > 90 ? 'is-high' : ''}
                      style={{ width: `${(Math.min(pct, 130) / 130) * 100}%` }}
                    />
                  </span>
                  <b className={pct > 100 ? 'is-overdue' : ''}>{pct}%</b>
                </div>
              );
            })}
            {!data?.workload.length && <p className="muted">No capacity plans for this week.</p>}
          </div>
        </Panel>

        <Panel title="Awaiting approval" action={<Link className="panel-link" to="/approvals">Review queue</Link>}>
          <div className="hq-stack hq-pad">
            {(data?.approvals ?? []).map((a) => (
              <Link key={a.id} to={`/approvals?id=${a.id}`} className="simple-item">
                <strong>{a.title}</strong>
                <span className="muted">{relativeDay(a.dueDate)}</span>
              </Link>
            ))}
            {!data?.approvals.length && <p className="muted">Nothing waiting for review.</p>}
          </div>
        </Panel>
      </div>
    </>
  );
}
