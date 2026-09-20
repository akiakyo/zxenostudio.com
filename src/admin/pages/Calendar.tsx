import { CalendarView } from "../ui/calendar";
import { PageHeader, Tabs } from "../ui/ui";
import { setSearchParam, useLocation } from '../lib/router';
import { Records } from './hq/Records';
import { eventConfig } from './hq/config';
import { WeekSchedule } from './hq/WeekSchedule';

export function CalendarPage() {
  const {search}=useLocation();const view=search.get('view')||'month';
  return (
    <div className="page">
      <PageHeader
        title="Calendar"
        description="Milestones, task due dates, invoice due dates and project deadlines in one place."
      />
      <Tabs label="Calendar view" value={view} onChange={v=>setSearchParam('view',v)} tabs={[{value:'month',label:'Month'},{value:'week',label:'Week'},{value:'agenda',label:'Events & agenda'}]}/>
      {view==='agenda'?<Records config={eventConfig}/>:view==='week'?<WeekSchedule/>:<section className="panel">
        <CalendarView />
      </section>}
    </div>
  );
}
