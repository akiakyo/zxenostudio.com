import { useApi } from '../../lib/api';
import { label, relativeDay, workStatus } from '../../lib/format';
import { Link } from '../../lib/router';
import { Avatar, ErrorNote, Panel, Progress, StatusBadge } from '../../ui/ui';
import { useWorkspace } from '../../lib/workspace';
import type { RecordRow } from './Records';
type Summary={approvals:RecordRow[];projects:{status:string;count:number;progress:number}[];workload:RecordRow[];people:{workStatus:string;count:number}[];rooms:RecordRow[]};
export function DashboardSummary(){
 const {data,error,reload}=useApi<Summary>('hq-summary');
 const {team}=useWorkspace();
 if(error)return <ErrorNote message={error} onRetry={reload}/>;if(!data)return null;
 return <div className="dash-grid">
  <Panel title="Awaiting approval" action={<Link className="panel-link" to="/approvals">Review queue</Link>}><div className="hq-stack hq-pad">{data.approvals.map(a=><Link key={a.id} to={`/approvals?id=${a.id}`} className="simple-item"><strong>{a.title}</strong><span className="muted">{relativeDay(a.dueDate)}</span></Link>)}{!data.approvals.length&&<p className="muted">Nothing waiting for review.</p>}</div></Panel>
  <Panel title="Project stages" action={<Link className="panel-link" to="/projects?view=board">Open board</Link>}><div className="hq-stack hq-pad">{data.projects.map(p=><div key={p.status}><div className="row-buttons"><StatusBadge value={p.status}/><span>{p.count} projects · {Math.round(p.progress)}% average progress</span></div><Progress value={p.progress}/></div>)}{!data.projects.length&&<p className="muted">No active projects.</p>}</div></Panel>
  <Panel title="This week's workload" action={<Link className="panel-link" to="/workload">Capacity forecast</Link>}><div className="hq-stack hq-pad">{data.workload.map(w=><div className="row-buttons" key={w.id}><strong>{w.name}</strong><span className={w.hours>w.available?'is-overdue':''}>{Math.round(w.hours/w.available*100)}%</span></div>)}{!data.workload.length&&<p className="muted">No capacity plans for this week.</p>}</div></Panel>
  <Panel title="Studio today" action={<Link className="panel-link" to="/team">Team directory</Link>}><div className="hq-stack hq-pad">
   <ul className="presence-grid">{team.map(m=><li key={m.username}><Link to={`/chat?dm=${encodeURIComponent(m.username)}`} className="presence-person">
    <Avatar name={m.name||m.username} size={36} status={m.workStatus}/>
    <span className="presence-name">{(m.name||m.username).split(' ')[0]}</span>
    <span className="sr-only">{workStatus(m.workStatus)}. Send a direct message.</span>
   </Link></li>)}</ul>
   <p className="presence-legend">{data.people.map(p=><span key={p.workStatus}><i className={`presence-dot is-${p.workStatus}`} aria-hidden="true"/>{p.count} {workStatus(p.workStatus).toLowerCase()}</span>)}</p>
   <h3>In use now</h3>{data.rooms.map((r,i)=><div key={i}><strong>{r.location}</strong><span className="cell-sub">{r.title} · until {r.endTime}</span></div>)}{!data.rooms.length&&<p className="muted">No room bookings in progress.</p>}</div></Panel>
 </div>;
}
