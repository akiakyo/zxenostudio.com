import { useState } from 'react';
import { patch } from '../../lib/api';
import { daysBetween, formatDate, label, money, options, relativeDay, todayIso } from '../../lib/format';
import { Link } from '../../lib/router';
import type { Project, ProjectStatus } from '../../lib/types';
import { useWorkspace } from '../../lib/workspace';
import { Progress, StatusBadge, useAction } from '../../ui/ui';
const STAGES:ProjectStatus[]=['planning','active','on_hold','review','completed'];
export function ProjectBoard({projects,reload}:{projects:Project[];reload:()=>void}){
 const run=useAction();const [busy,setBusy]=useState(false);
 async function move(id:string,status:ProjectStatus){setBusy(true);try{if(await run(()=>patch(`projects?id=${id}`,{status}),'Project moved'))reload();}finally{setBusy(false);}}
 return <div className="board" style={{['--columns' as string]:5}}>{STAGES.map(status=><section key={status} className="board-column" aria-label={label(status)} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();const id=e.dataTransfer.getData('text/plain');if(!busy&&projects.some(p=>p.id===id))move(id,status);}}><h2>{label(status)} <span className="muted">{projects.filter(p=>p.status===status).length}</span></h2><div className="board-cards">{projects.filter(p=>p.status===status).map(p=><article key={p.id} className="board-card" draggable={!busy} onDragStart={e=>e.dataTransfer.setData('text/plain',p.id)}><Link className="board-card-title" to={`/projects/${p.id}`}>{p.name}</Link><span className="cell-sub">{p.clientName||'No client'}</span><Progress value={p.progress}/><span className={p.overdue?'is-overdue':'muted'}>{relativeDay(p.dueDate)}</span><label className="board-card-move">Move to <select aria-label={`Move ${p.name}`} value={p.status} disabled={busy} onChange={e=>move(p.id,e.target.value as ProjectStatus)}>{options(STAGES).map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select></label></article>)}</div></section>)}</div>;
}
export function ProjectTimeline({projects}:{projects:Project[]}){
 const dates=projects.flatMap(p=>[p.startDate,p.dueDate]).filter((d):d is string=>!!d).sort();const from=dates[0]||todayIso(),to=dates.at(-1)||from,span=Math.max(1,daysBetween(from,to)+1);
 return <div className="table-wrap"><table className="table"><thead><tr><th>Project</th><th>Start</th><th>Due</th><th>Timeline · {formatDate(from)} – {formatDate(to)}</th><th>Status</th></tr></thead><tbody>{projects.map(p=><tr key={p.id}><td><Link to={`/projects/${p.id}`}>{p.name}</Link></td><td>{p.startDate?formatDate(p.startDate):'—'}</td><td>{p.dueDate?formatDate(p.dueDate):'—'}</td><td><div className="hq-timeline">{p.startDate&&p.dueDate?<span style={{marginLeft:`${Math.max(0,daysBetween(from,p.startDate))/span*100}%`,width:`${Math.max(1,daysBetween(p.startDate,p.dueDate)+1)/span*100}%`}}/>:<small className="muted">Set start and due dates</small>}</div></td><td><StatusBadge value={p.status}/></td></tr>)}</tbody></table></div>;
}
export function ProjectFacts({project:p}:{project:Project}){
 const {memberName}=useWorkspace();return <div className="row-buttons hq-project-facts"><span>Lead: {p.lead?memberName(p.lead):'Unassigned'}</span><span>Team: {p.team?.length?p.team.map(memberName).join(', '):'Not assigned'}</span><span>Budget: {p.budget===null?'Not set':money(p.budget)}</span><span className={p.budget!==null&&p.spent>p.budget?'is-overdue':''}>Spent: {money(p.spent)}</span></div>;
}
