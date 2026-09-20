import { useState } from 'react';
import { patch, useApi } from '../../lib/api';
import { label, money, options } from '../../lib/format';
import { useWorkspace } from '../../lib/workspace';
import { ErrorNote, Loading, Tabs, useAction } from '../../ui/ui';
import { Records, type RecordRow } from './Records';
import { dealConfig } from './config';
const STAGES=['lead','discovery','proposal','negotiation','won','lost'];
export function Pipeline(){
 const [view,setView]=useState('board');const {data,error,loading,reload}=useApi<RecordRow[]>(`deals?view=${view}`);const run=useAction();const {memberName}=useWorkspace();const [busy,setBusy]=useState(false);
 return <><div className="toolbar"><Tabs label="Pipeline view" value={view} onChange={setView} tabs={[{value:'board',label:'Pipeline board'},{value:'records',label:'Manage deals'}]}/><strong>Open value: {money((data??[]).filter(d=>!['won','lost'].includes(d.stage)).reduce((s,d)=>s+d.amount,0))}</strong></div>
 {view==='records'?<Records config={dealConfig}/>:<>{error&&<ErrorNote message={error} onRetry={reload}/>} {loading&&!data&&<Loading/>}<div className="board" style={{['--columns' as string]:6}}>{STAGES.map(stage=>{const ds=(data??[]).filter(d=>d.stage===stage);return <section className="board-column" key={stage}><h2>{label(stage)}</h2><span className="muted">{money(ds.reduce((s,d)=>s+d.amount,0))}</span><div className="board-cards">{ds.map(d=><article className="board-card" key={d.id}><strong>{d.title}</strong><span className="cell-sub">{d.clientName}</span><p>{d.nextStep}</p><div className="row-buttons"><span>{memberName(d.owner)}</span><strong>{money(d.amount)}</strong></div><label className="board-card-move">Stage <select aria-label={`Stage for ${d.title}`} value={d.stage} disabled={busy} onChange={async e=>{setBusy(true);try{if(await run(()=>patch(`deals?id=${d.id}`,{stage:e.target.value}),'Deal updated'))reload();}finally{setBusy(false);}}}>{options(STAGES).map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select></label></article>)}</div></section>})}</div></>}
 </>;
}
