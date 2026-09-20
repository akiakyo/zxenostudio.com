import { useState } from 'react';
import { Clock } from 'lucide-react';
import { patch } from '../../lib/api';
import { daysBetween, formatDate, label, money, options, relativeDay, todayIso } from '../../lib/format';
import { Link } from '../../lib/router';
import type { Project, ProjectStatus } from '../../lib/types';
import { useWorkspace } from '../../lib/workspace';
import { Avatar, Badge, ClientMark, Progress, StatusBadge, useAction } from '../../ui/ui';
const STAGES:ProjectStatus[]=['planning','active','on_hold','review','completed'];
/* colour by kind, reusing the workspace's existing badge tones */
const KIND_TONES: Record<string, "blue" | "green" | "amber" | "violet" | "red" | "neutral"> = {
  video: "blue",
  web: "green",
  poster: "amber",
  social: "violet",
  photo: "red",
  doc: "neutral",
  other: "neutral",
};

export function ProjectBoard({projects,reload}:{projects:Project[];reload:()=>void}){
 const run=useAction();const [busy,setBusy]=useState(false);const {clients,memberName}=useWorkspace();
 async function move(id:string,status:ProjectStatus){setBusy(true);try{if(await run(()=>patch(`projects?id=${id}`,{status}),'Project moved'))reload();}finally{setBusy(false);}}
 return <div className="board" style={{['--columns' as string]:5}}>{STAGES.map(status=>{
  const column=projects.filter(p=>p.status===status);
  return <section key={status} className="board-column" aria-label={label(status)} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();const id=e.dataTransfer.getData('text/plain');if(!busy&&projects.some(p=>p.id===id))move(id,status);}}>
   <h2><span className={`column-dot column-${status}`} aria-hidden="true"/>{label(status)} <span className="muted">{column.length}</span></h2>
   <div className="board-cards">{column.map(p=>{
    const client=clients.find(c=>c.id===p.clientId);
    return <article key={p.id} className="board-card project-card" draggable={!busy} onDragStart={e=>e.dataTransfer.setData('text/plain',p.id)}>
     <div className="project-card-top"><span className="project-code">{p.code}</span><Badge tone={KIND_TONES[p.kind]??'neutral'}>{label(p.kind)}</Badge></div>
     <Link className="board-card-title" to={`/projects/${p.id}`}>{p.name}</Link>
     <span className="project-card-client"><ClientMark name={client?.name??p.clientName} palette={client?.palette} size={20}/>{p.clientName||'No client'}</span>
     <div className="project-card-progress"><Progress value={p.progress}/><small>{p.progress}%</small></div>
     <div className="project-card-foot">
      <span className="avatar-stack">{(p.team??[]).slice(0,3).map(u=><Avatar key={u} name={memberName(u)} size={24}/>)}{(p.team?.length??0)>3&&<span className="avatar-more">+{(p.team?.length??0)-3}</span>}</span>
      <span className={p.overdue?'is-overdue':'muted'}><Clock size={13} aria-hidden/> {relativeDay(p.dueDate)}</span>
     </div>
     <select className="board-card-move" aria-label={`Move ${p.name}`} value={p.status} disabled={busy} onChange={e=>move(p.id,e.target.value as ProjectStatus)}>{options(STAGES).map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select>
    </article>;
   })}{!column.length&&<p className="board-empty">Nothing here</p>}</div>
  </section>;
 })}</div>;
}

export function ProjectTimeline({projects}:{projects:Project[]}){
 const dates=projects.flatMap(p=>[p.startDate,p.dueDate]).filter((d):d is string=>!!d).sort();const from=dates[0]||todayIso(),to=dates.at(-1)||from,span=Math.max(1,daysBetween(from,to)+1);
 return <div className="table-wrap"><table className="table"><thead><tr><th>Project</th><th>Start</th><th>Due</th><th>Timeline · {formatDate(from)} – {formatDate(to)}</th><th>Status</th></tr></thead><tbody>{projects.map(p=><tr key={p.id}><td><Link to={`/projects/${p.id}`}>{p.name}</Link></td><td>{p.startDate?formatDate(p.startDate):'—'}</td><td>{p.dueDate?formatDate(p.dueDate):'—'}</td><td><div className="hq-timeline">{p.startDate&&p.dueDate?<span style={{marginLeft:`${Math.max(0,daysBetween(from,p.startDate))/span*100}%`,width:`${Math.max(1,daysBetween(p.startDate,p.dueDate)+1)/span*100}%`}}/>:<small className="muted">Set start and due dates</small>}</div></td><td><StatusBadge value={p.status}/></td></tr>)}</tbody></table></div>;
}
export function ProjectFacts({project:p}:{project:Project}){
 const {memberName}=useWorkspace();return <div className="row-buttons hq-project-facts"><span>Lead: {p.lead?memberName(p.lead):'Unassigned'}</span><span>Team: {p.team?.length?p.team.map(memberName).join(', '):'Not assigned'}</span><span>Budget: {p.budget===null?'Not set':money(p.budget)}</span><span className={p.budget!==null&&p.spent>p.budget?'is-overdue':''}>Spent: {money(p.spent)}</span></div>;
}
