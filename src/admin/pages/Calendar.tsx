import { CalendarView } from "../ui/calendar";
import { PageHeader } from "../ui/ui";

export function CalendarPage() {
  return (
    <div className="page">
      <PageHeader
        title="Calendar"
        description="Milestones, task due dates, invoice due dates and project deadlines in one place."
      />
      <section className="panel">
        <CalendarView />
      </section>
    </div>
  );
}
