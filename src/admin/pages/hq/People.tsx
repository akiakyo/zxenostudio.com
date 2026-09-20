import { useState } from 'react';
import { patch, useApi } from '../../lib/api';
import { addDays, formatDate, todayIso, weekStart } from '../../lib/format';
import { useWorkspace } from '../../lib/workspace';
import { Button, ErrorNote, Loading, PageHeader, Panel, Tabs, useAction } from '../../ui/ui';
import { PeopleTabs } from './PeopleTabs';
import { Records, type RecordRow } from './Records';
import { capacityConfig, leaveConfig } from './config';

export function LeavePage(){
 const {session,isExecutive}=useWorkspace();const run=useAction();const [busy,setBusy]=useState(false);
 return <div className="page"><PageHeader title="Leave" description="Request time off and track decisions. Members see their own requests; executives review the team."/><PeopleTabs/>
 <Records config={leaveConfig} extra={(r,reload)=>r.status==='pending'&&<>{(r.createdBy===session.username?['cancelled']:isExecutive?['approved','declined']:[]).map(status=><Button key={status} size="sm" disabled={busy} onClick={async()=>{setBusy(true);try{if(await run(()=>patch(`leave?id=${r.id}`,{status}),'Request updated'))reload();}finally{setBusy(false);}}}>{status==='cancelled'?'Cancel request':status==='approved'?'Approve':'Decline'}</Button>)}</>}/></div>;
}
export function WorkloadPage(){
 const {team,memberName}=useWorkspace();const [tab,setTab]=useState('forecast');const [start,setStart]=useState(weekStart(todayIso()));
 const {data,error,loading,reload}=useApi<RecordRow[]>(`capacity?view=${tab}`);
 const weeks=Array.from({length:4},(_,i)=>addDays(start,i*7));
 return <div className="page"><PageHeader title="Workload" description="Four-week capacity forecast. Plan around an 80% target; allocations above 100% need attention."/><PeopleTabs/>
  <Tabs label="Workload view" value={tab} onChange={setTab} tabs={[{value:'forecast',label:'Forecast'},{value:'plans',label:'Capacity plans'}]}/>
  {tab==='plans'?<Records config={{...capacityConfig,columns:capacityConfig.columns.map((c,i)=>i===0?{...c,render:r=>memberName(r.member)}:c)}}/>:<>
   <div className="toolbar"><Button onClick={()=>setStart(addDays(start,-7))}>Previous week</Button><Button onClick={()=>setStart(weekStart(todayIso()))}>This week</Button><Button onClick={()=>setStart(addDays(start,7))}>Next week</Button></div>
   {error&&<ErrorNote message={error} onRetry={reload}/>} {loading&&!data&&<Loading/>}
   <Panel><div className="table-wrap"><table className="table"><thead><tr><th>Person</th>{weeks.map(w=><th key={w}>{formatDate(w)}</th>)}</tr></thead><tbody>{team.map(m=><tr key={m.username}><td>{m.name}</td>{weeks.map(w=>{const r=data?.find(r=>r.member===m.username&&r.weekOf===w);return <td key={w}>{r?<span className={r.hours>r.available?'is-overdue':''}>{Math.round(r.hours/r.available*100)}% <small>({r.hours}/{r.available} h)</small></span>:<span className="muted">Not planned</span>}</td>})}</tr>)}</tbody></table></div></Panel>
  </>}
 </div>;
}
