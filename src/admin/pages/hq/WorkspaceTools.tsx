import { useEffect, useRef, useState } from 'react';
import { Bell, Plus, Search } from 'lucide-react';
import { post, useApi } from '../../lib/api';
import { navigate } from '../../lib/router';
import { useWorkspace } from '../../lib/workspace';
import { useInvoiceEditor, useProjectEditor, useTaskEditor, useEditor } from '../../ui/editors';
import { Button, ErrorNote, Menu, Modal, SearchInput, useAction } from '../../ui/ui';
import type { RecordRow } from './Records';
import { eventConfig } from './config';
import { chime } from '../../lib/sound';

const PAGES=[['Dashboard','/'],['Projects','/projects'],['My tasks','/tasks/mine'],['Calendar','/calendar'],['Chat','/chat'],['Approvals','/approvals'],['Asset library','/assets'],['Clients','/clients'],['Finance','/finance'],['Invoices','/invoices'],['Team','/team'],['Workload','/workload'],['Leave','/leave'],['Handbook','/handbook'],['Settings','/settings']];
export function WorkspaceTools(){
 const [open,setOpen]=useState(false),[bell,setBell]=useState(false),[q,setQ]=useState('');
 const {projects,clients,team}=useWorkspace();const run=useAction();
 const notifications=useApi<RecordRow[]>('notifications');
 const unread=(notifications.data??[]).filter(n=>!n.read).length;
 const reloadNotifications=notifications.reload;
 /* keep the bell honest while someone sits on one page */
 useEffect(()=>{const t=setInterval(()=>{if(!document.hidden)reloadNotifications();},60000);return()=>clearInterval(t);},[reloadNotifications]);
 /* a sound only when the count actually grows, never on the first load */
 const lastUnread=useRef<number|null>(null);
 useEffect(()=>{
  if(!notifications.data)return;
  if(lastUnread.current!==null&&unread>lastUnread.current)chime.notification();
  lastUnread.current=unread;
 },[unread,notifications.data]);
 const tasks=useApi<RecordRow[]>(open?'tasks':null),docs=useApi<RecordRow[]>(open?'handbook':null),assets=useApi<RecordRow[]>(open?'assets':null);
 const project=useProjectEditor(r=>navigate(`/projects/${r.id}`));const task=useTaskEditor(false,()=>navigate('/tasks/mine'));
 const invoice=useInvoiceEditor(()=>navigate('/invoices'));const event=useEditor(eventConfig,()=>navigate('/calendar?view=agenda'));
 useEffect(()=>{const key=(e:KeyboardEvent)=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();setOpen(v=>!v);}};document.addEventListener('keydown',key);return()=>document.removeEventListener('keydown',key);},[]);
 const entries=[...PAGES.map(([title,to])=>({title,to,kind:'Page'})),...projects.map(p=>({title:p.name,to:`/projects/${p.id}`,kind:'Project'})),...clients.map(c=>({title:c.name,to:`/clients?id=${c.id}`,kind:'Client'})),...team.map(m=>({title:m.name,to:`/chat?dm=${encodeURIComponent(m.username)}`,kind:'Person'})),...(tasks.data??[]).map(t=>({title:t.title,to:t.isPrivate?'/tasks/private':t.projectId?`/projects/${t.projectId}?tab=tasks`:'/tasks/mine',kind:'Task'})),...(docs.data??[]).map(d=>({title:d.title,to:`/handbook?id=${d.id}`,kind:'Document'})),...(assets.data??[]).map(a=>({title:a.name,to:`/assets?id=${a.id}`,kind:'Asset'}))];
 const results=entries.filter(e=>(e.title+' '+e.kind).toLowerCase().includes(q.toLowerCase())).slice(0,40);
 return <>
  <div className="hq-tools" aria-label="Workspace tools"><Button size="sm" icon={Search} onClick={()=>setOpen(true)}>Search <kbd>Ctrl K</kbd></Button><Button size="sm" icon={Bell} className={unread?'has-unread':''} onClick={()=>{setBell(true);notifications.reload();}}>Notifications{unread>0&&<span className="unread-dot" aria-hidden="true"/>}{unread>0&&<span className="sr-only">, {unread} unread</span>}</Button><Menu label="Create new" items={[{label:'New project',icon:Plus,onSelect:()=>project.openNew()},{label:'New task',icon:Plus,onSelect:()=>task.openNew()},{label:'New event',icon:Plus,onSelect:()=>event.openNew(eventConfig.defaults)},{label:'New invoice',icon:Plus,onSelect:()=>invoice.openNew()}]}/></div>
  <Modal open={open} title="Search workspace" onClose={()=>setOpen(false)}><SearchInput value={q} onChange={setQ} placeholder="Projects, clients, people, tasks, files or pages"/>{[tasks.error,docs.error,assets.error].filter(Boolean).map((e,i)=><ErrorNote key={i} message={e}/>)}<div className="hq-search-results">{results.map((e,i)=><button className="nav-link" key={i} onClick={()=>{setOpen(false);navigate(e.to);}}>{e.title}<small className="muted">{e.kind}</small></button>)}{!results.length&&<p className="muted">No results found.</p>}</div></Modal>
  <Modal open={bell} title="Notifications" onClose={()=>setBell(false)} footer={<Button disabled={!unread} onClick={async()=>{if(await run(()=>post('notifications',{ids:(notifications.data??[]).filter(n=>!n.read).map(n=>n.id)}),'Notifications marked read'))notifications.reload();}}>Mark all read</Button>}>
   {notifications.error&&<ErrorNote message={notifications.error} onRetry={notifications.reload}/>}<div className="hq-stack">{notifications.data?.map(n=><article key={n.id} className="panel hq-pad"><strong>{!n.read?'• ':''}{n.actorName}</strong> {n.action} {n.summary}<span className="cell-sub">{new Date(n.createdAt).toLocaleString()}</span>{!n.read&&<Button size="sm" onClick={async()=>{if(await run(()=>post('notifications',{ids:[n.id]})))notifications.reload();}}>Mark read</Button>}</article>)}{notifications.data?.length===0&&<p className="muted">You're all caught up.</p>}</div>
  </Modal>{project.element}{task.element}{invoice.element}{event.element}
 </>;
}
