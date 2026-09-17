import { useState } from "react";
import { AlarmClock } from "lucide-react";
import { query, useApi } from "../lib/api";
import { addDays, daysBetween, formatDate, label, relativeDay, weekStart } from "../lib/format";
import { Link } from "../lib/router";
import type { CalendarEvent } from "../lib/types";
import { eventHref } from "../ui/calendar";
import {
  Badge,
  EmptyState,
  ErrorNote,
  FilterBar,
  Loading,
  PageHeader,
  SelectFilter,
  StatusBadge,
} from "../ui/ui";

type Deadlines = { today: string; overdue: CalendarEvent[]; upcoming: CalendarEvent[] };

function bucket(date: string, today: string) {
  if (date === today) return "Today";
  if (date === addDays(today, 1)) return "Tomorrow";
  const thisWeekEnd = addDays(weekStart(today), 6);
  if (date <= thisWeekEnd) return "Later this week";
  if (date <= addDays(thisWeekEnd, 7)) return "Next week";
  return "Later";
}

export function DeadlinesPage() {
  const [days, setDays] = useState("30");
  const [mine, setMine] = useState("");
  const [type, setType] = useState("");
  const { data, error, loading, reload } = useApi<Deadlines>(
    `deadlines${query({ days, mine })}`,
  );

  const filter = (list: CalendarEvent[]) => (type ? list.filter((e) => e.type === type) : list);
  const upcoming = filter(data?.upcoming ?? []);
  const overdue = filter(data?.overdue ?? []);
  const groups = new Map<string, CalendarEvent[]>();
  for (const event of upcoming) {
    const name = bucket(event.date, data!.today);
    groups.set(name, [...(groups.get(name) ?? []), event]);
  }

  return (
    <div className="page page-narrow">
      <PageHeader title="Deadlines" description="What's overdue and what's coming up, across every active project." />
      <FilterBar>
        <SelectFilter
          label="Range"
          allLabel="Next 30 days"
          value={days === "30" ? "" : days}
          onChange={(v) => setDays(v || "30")}
          options={[
            { value: "7", label: "Next 7 days" },
            { value: "14", label: "Next 14 days" },
            { value: "90", label: "Next 90 days" },
          ]}
        />
        <SelectFilter
          label="Type"
          allLabel="All types"
          value={type}
          onChange={setType}
          options={["milestone", "task", "invoice", "project"].map((t) => ({ value: t, label: label(t) }))}
        />
        <SelectFilter
          label="Whose"
          allLabel="Whole studio"
          value={mine}
          onChange={setMine}
          options={[{ value: "1", label: "Only my tasks" }]}
        />
      </FilterBar>
      {error && <ErrorNote message={error} onRetry={reload} />}
      {loading && !data && <Loading />}
      {data && (
        <>
          {overdue.length > 0 && (
            <section className="deadline-group is-overdue-group">
              <h2>Overdue <Badge tone="red">{overdue.length}</Badge></h2>
              <DeadlineList events={overdue} today={data.today} />
            </section>
          )}
          {[...groups].map(([name, list]) => (
            <section key={name} className="deadline-group">
              <h2>{name} <span className="muted">{list.length}</span></h2>
              <DeadlineList events={list} today={data.today} />
            </section>
          ))}
          {!overdue.length && !upcoming.length && (
            <EmptyState icon={AlarmClock} title="No deadlines in this range">Nothing is overdue either.</EmptyState>
          )}
        </>
      )}
    </div>
  );
}

function DeadlineList({ events, today }: { events: CalendarEvent[]; today: string }) {
  return (
    <ul className="deadline-list">
      {events.map((event) => {
        const diff = daysBetween(today, event.date);
        return (
          <li key={`${event.type}-${event.id}`}>
            <div className={`deadline-date ${diff < 0 ? "is-overdue" : ""}`}>
              <strong>{formatDate(event.date)}</strong>
              <span>{relativeDay(event.date)}</span>
            </div>
            <div className="deadline-body">
              <Link to={eventHref(event)} className="cell-title">
                <span className={`event-dot event-${event.type}`} aria-hidden="true" /> {event.title}
              </Link>
              <span className="cell-sub">
                {label(event.type)}
                {event.projectName && event.type !== "project" && ` · ${event.projectName}`}
                {event.assigneeName && ` · ${event.assigneeName}`}
              </span>
            </div>
            {event.type === "task" || event.type === "invoice" ? <StatusBadge value={event.status} /> : null}
          </li>
        );
      })}
    </ul>
  );
}
