import { useApi } from '../../lib/api';
import { money } from '../../lib/format';
import { Link } from '../../lib/router';
import type { Client, Project, Invoice } from '../../lib/types';
import { useWorkspace } from '../../lib/workspace';
import { ErrorNote, Modal, MultilineText, StatusBadge } from '../../ui/ui';
export function ClientDetail({client:c,onClose}:{client:Client;onClose:()=>void}){
 const projects=useApi<Project[]>(`projects?clientId=${c.id}`),invoices=useApi<Invoice[]>(`invoices?clientId=${c.id}`);const {memberName}=useWorkspace();
 return <Modal open title={c.company||c.name} onClose={onClose} size="lg"><div className="hq-stack"><StatusBadge value={c.status}/><p>{c.industry} · Account owner: {memberName(c.owner)}</p><p>Contact: {c.name} {c.email&&<a href={`mailto:${c.email}`}>{c.email}</a>}</p><p>{c.agreement||'No agreement recorded'}</p><div className="row-buttons">{(c.palette||'').split(',').map(v=>v.trim()).filter(v=>/^#[0-9a-f]{6}$/i.test(v)).map((v,i)=><span key={i} style={{background:v,width:32,height:32,borderRadius:6}} title={v} aria-label={v}/>)}</div><MultilineText text={c.notes}/>
 <h3>Projects</h3>{projects.error&&<ErrorNote message={projects.error} onRetry={projects.reload}/>} {projects.data?.map(p=><div key={p.id} className="row-buttons"><Link to={`/projects/${p.id}`}>{p.name}</Link><StatusBadge value={p.status}/></div>)}{projects.data?.length===0&&<p className="muted">No projects yet.</p>}
 <h3>Invoices</h3>{invoices.error&&<ErrorNote message={invoices.error} onRetry={invoices.reload}/>} {invoices.data?.map(i=><div key={i.id} className="row-buttons"><Link to={`/invoices?id=${i.id}`}>{i.number}</Link><span>{money(i.amount)}</span><StatusBadge value={i.overdue?'overdue':i.status}/></div>)}{invoices.data?.length===0&&<p className="muted">No invoices yet.</p>}
 </div></Modal>;
}
