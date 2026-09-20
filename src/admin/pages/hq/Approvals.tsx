import { useEffect, useState } from 'react';
import { Check, Plus, ShieldCheck } from 'lucide-react';
import { patch, post, useApi } from '../../lib/api';
import { formatDate, timeAgo } from '../../lib/format';
import type { Asset } from '../../lib/types';
import { useWorkspace } from '../../lib/workspace';
import { useEditor } from '../../ui/editors';
import { Button, EmptyState, ErrorNote, Loading, Modal, MultilineText, PageHeader, StatusBadge, Tabs, useAction } from '../../ui/ui';
import type { RecordRow } from './Records';
import { useLocation } from '../../lib/router';

export function ApprovalsPage(){
 const {search}=useLocation();const [selected,setSelected]=useState<string|null>(search.get('id'));
 const selectedId=search.get('id');useEffect(()=>setSelected(selectedId),[selectedId]);
 const [tab,setTab]=useState('pending');const {session,isExecutive}=useWorkspace();
 const {data,error,loading,reload}=useApi<RecordRow[]>('approvals');
 const assets=useApi<Asset[]>('assets');
 const editor=useEditor<RecordRow>({resource:'approvals',noun:'approval',fields:[
  {name:'title',label:'Title',type:'text',required:true},{name:'projectId',label:'Project',type:'project'},
  {name:'assetId',label:'Asset to review',type:'select',options:(assets.data??[]).map(a=>({value:a.id,label:a.name}))},
  {name:'reviewer',label:'Reviewer',type:'member',required:true},{name:'dueDate',label:'Due date',type:'date'},
  {name:'notes',label:'Submission notes',type:'textarea'},
 ]},()=>reload());
 const list=(data??[]).filter(a=>tab==='all'||a.status===tab);
 const approval=data?.find(a=>a.id===selected);
 return <div className="page"><PageHeader title="Approvals" description="Submit deliverables, review versions and keep feedback with the work." actions={<Button variant="primary" icon={Plus} onClick={()=>editor.openNew()}>Submit for approval</Button>}/>
  <Tabs label="Approval status" value={tab} onChange={setTab} tabs={['pending','revision','approved','all'].map(v=>({value:v,label:`${v==='revision'?'Needs revision':v[0].toUpperCase()+v.slice(1)} (${(data??[]).filter(a=>v==='all'||a.status===v).length})`}))}/>
  {error&&<ErrorNote message={error} onRetry={reload}/>} {loading&&!data&&<Loading/>}
  {data&&!list.length&&<EmptyState icon={ShieldCheck} title="No approvals in this view"/>}
  {!!list.length&&<div className="table-wrap"><table className="table"><thead><tr><th>Submission</th><th>Project</th><th>Reviewer</th><th>Version</th><th>Due</th><th>Status</th></tr></thead><tbody>{list.map(a=><tr key={a.id}><td><button className="text-btn cell-title" onClick={()=>setSelected(a.id)}>{a.title}</button></td><td>{a.projectName||'—'}</td><td>{a.reviewerName||a.reviewer}</td><td>v{a.version}</td><td>{a.dueDate?formatDate(a.dueDate):'—'}</td><td><StatusBadge value={a.status}/></td></tr>)}</tbody></table></div>}
  {approval&&<ApprovalDetail key={approval.id} approval={approval} canDecide={isExecutive||approval.reviewer===session.username} canEdit={isExecutive||approval.createdBy===session.username} onClose={()=>setSelected(null)} onEdit={()=>editor.openEdit(approval)} reload={reload}/>}{editor.element}
 </div>;
}

function ApprovalDetail({approval:a,canDecide,canEdit,onClose,onEdit,reload}:{approval:RecordRow;canDecide:boolean;canEdit:boolean;onClose:()=>void;onEdit:()=>void;reload:()=>void}){
 const comments=useApi<RecordRow[]>(`approval-comments?approvalId=${a.id}`);const run=useAction();
 const [body,setBody]=useState('');const [pin,setPin]=useState<{x:number;y:number}|null>(null);const [pinMode,setPinMode]=useState(false);const [busy,setBusy]=useState(false);
 async function decide(status:string){setBusy(true);try{if(await run(()=>patch(`approvals?id=${a.id}`,{status}),'Approval updated'))reload();}finally{setBusy(false);}}
 const pins=(comments.data??[]).filter(c=>c.x!==null&&c.y!==null&&c.version===a.version);
 return <Modal open title={a.title} onClose={onClose} size="lg" footer={<>
  {canEdit&&a.status!=='approved'&&<Button onClick={onEdit}>Edit submission</Button>}
  {a.status==='pending'&&canDecide&&<><Button disabled={busy} onClick={()=>decide('revision')}>Request revision</Button><Button disabled={busy} variant="primary" icon={Check} onClick={()=>decide('approved')}>Approve</Button></>}
  {a.status==='revision'&&canEdit&&<Button disabled={busy} variant="primary" onClick={()=>decide('pending')}>Submit next version</Button>}
 </>}>
  <div className="hq-stack"><div className="row-buttons"><StatusBadge value={a.status}/><span>Version {a.version} · {a.reviewerName||a.reviewer}</span></div><MultilineText text={a.notes}/>
  {a.assetUrl&&<><a href={a.assetUrl} target="_blank" rel="noopener noreferrer">Open {a.assetName||'asset'}</a>
   {a.assetKind==='image'&&<><Button size="sm" onClick={()=>setPinMode(!pinMode)} aria-pressed={pinMode}>{pinMode?'Cancel pin':'Pin a comment'}</Button>
    <div className="hq-preview"><button className="hq-image-target" disabled={!pinMode} aria-label="Place comment pin on image" onClick={e=>{const r=e.currentTarget.getBoundingClientRect();setPin({x:Math.round((e.clientX-r.left)/r.width*100),y:Math.round((e.clientY-r.top)/r.height*100)});setPinMode(false);}}><img src={a.assetUrl} alt={a.assetName||a.title}/></button>
     {pins.map((p,i)=><span key={p.id} className="hq-pin" style={{left:`${p.x}%`,top:`${p.y}%`}} title={p.body}>{i+1}</span>)}
    </div></>}
   {a.assetKind==='video'&&<video className="hq-media" controls preload="metadata" src={a.assetUrl}/>}
  </>}
  <h3>Comments</h3>{comments.error&&<ErrorNote message={comments.error} onRetry={comments.reload}/>}
  {(comments.data??[]).map(c=><article className="panel hq-pad" key={c.id}><strong>{c.createdByName||c.createdBy}</strong><span className="cell-sub">v{c.version} · {timeAgo(c.createdAt)}{c.x!==null?` · Pin (${c.x}%, ${c.y}%)`:''}</span><MultilineText text={c.body}/></article>)}
  <form className="hq-stack" onSubmit={async e=>{e.preventDefault();setBusy(true);try{if(await run(()=>post('approval-comments',{approvalId:a.id,body,...(pin??{})}),'Comment added')){setBody('');setPin(null);comments.reload();}}finally{setBusy(false);}}}>
   {pin&&<div className="row-buttons">Pin at {pin.x}%, {pin.y}% <Button size="sm" onClick={()=>setPin(null)}>Remove pin</Button></div>}
   {pinMode&&<div className="row-buttons"><label>X % <input type="number" min="0" max="100" defaultValue="50" id="pin-x"/></label><label>Y % <input type="number" min="0" max="100" defaultValue="50" id="pin-y"/></label><Button onClick={()=>{const x=Number((document.getElementById('pin-x') as HTMLInputElement).value),y=Number((document.getElementById('pin-y') as HTMLInputElement).value);if(Number.isInteger(x)&&Number.isInteger(y)&&x>=0&&x<=100&&y>=0&&y<=100){setPin({x,y});setPinMode(false);}}}>Set pin</Button></div>}
   <label className="field">Comment<textarea required value={body} onChange={e=>setBody(e.target.value)} maxLength={20000}/></label><Button type="submit" variant="primary" disabled={busy||!body.trim()}>Add comment</Button>
  </form></div>
 </Modal>;
}
