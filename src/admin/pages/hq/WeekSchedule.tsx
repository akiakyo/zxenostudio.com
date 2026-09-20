import { useState } from 'react';
import { useApi } from '../../lib/api';
import { addDays, formatDate, todayIso, weekStart } from '../../lib/format';
import type { CalendarEvent } from '../../lib/types';
import { Button, ErrorNote, Loading, Panel } from '../../ui/ui';
import { EventChip } from '../../ui/calendar';
export function WeekSchedule(){
 const [start,setStart]=useState(weekStart(todayIso()));
 const {data,error,loading,reload}=useApi<CalendarEvent[]>(`calendar?from=${start}&to=${addDays(start,6)}`);
 return <><div className="toolbar"><Button onClick={()=>setStart(addDays(start,-7))}>Previous week</Button><Button onClick={()=>setStart(weekStart(todayIso()))}>Today</Button><Button onClick={()=>setStart(addDays(start,7))}>Next week</Button><span>Week of {formatDate(start)}</span></div>
 {error&&<ErrorNote message={error} onRetry={reload}/>} {loading&&!data&&<Loading/>}
 <div className="hq-week">{Array.from({length:7},(_,i)=>addDays(start,i)).map(day=><Panel key={day} title={formatDate(day,{weekday:true})}><div className="hq-stack hq-pad">{data?.filter(e=>e.date===day).map(e=><EventChip key={`${e.type}-${e.id}`} event={e}/>)}{data&&!data.some(e=>e.date===day)&&<p className="muted">Nothing scheduled</p>}</div></Panel>)}</div></>;
}
