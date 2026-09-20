/* Month calendar of milestones, tasks, invoices and project due dates. On wide
   screens it is a grid with event chips; on phones each day shows dots and the
   selected day's events are listed below. */
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { query, useApi } from "../lib/api";
import {
  addDays,
  formatDate,
  label,
  parseIso,
  todayIso,
  toIso,
} from "../lib/format";
import { navigate } from "../lib/router";
import type { CalendarEvent, EventType } from "../lib/types";
import { Button, ErrorNote, IconButton } from "./ui";

const ALL_TYPES: EventType[] = ["milestone", "task", "invoice", "project", "event"];
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function eventHref(event: CalendarEvent): string {
  if (event.type === 'event') return `/calendar?view=agenda&id=${event.id}`;
  if (event.type === "invoice") return `/invoices?id=${event.id}`;
  if (event.type === "task" && event.isPrivate) return "/tasks/private";
  if (event.projectId) {
    const tab = event.type === "task" ? "tasks" : "schedule";
    return `/projects/${event.projectId}?tab=${tab}`;
  }
  return "/tasks/mine";
}

export function EventChip({ event }: { event: CalendarEvent }) {
  return (
    <button
      type="button"
      className={`event-chip event-${event.type} ${event.done ? "is-done" : ""}`}
      title={`${label(event.type)}: ${event.title}${event.projectName && event.type !== "project" ? ` · ${event.projectName}` : ""}`}
      onClick={() => navigate(eventHref(event))}
    >
      <span className="event-dot" aria-hidden="true" />
      <span className="event-text">{event.title}</span>
    </button>
  );
}

export function CalendarView({
  projectId,
  types: initialTypes = ALL_TYPES,
  showLegend = true,
}: {
  projectId?: string;
  types?: EventType[];
  showLegend?: boolean;
}) {
  const today = todayIso();
  const [month, setMonth] = useState(today.slice(0, 7));
  const [selected, setSelected] = useState(today);
  const [types, setTypes] = useState<EventType[]>(initialTypes);

  const days = useMemo(() => {
    const first = parseIso(`${month}-01`);
    const shift = (first.getDay() + 6) % 7;
    const start = addDays(toIso(first), -shift);
    return Array.from({ length: 42 }, (_, i) => addDays(start, i));
  }, [month]);

  const { data, error, reload } = useApi<CalendarEvent[]>(
    `calendar${query({ from: days[0], to: days[41], projectId })}`,
  );

  const byDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const event of data ?? []) {
      if (!types.includes(event.type)) continue;
      const list = map.get(event.date) ?? [];
      list.push(event);
      map.set(event.date, list);
    }
    return map;
  }, [data, types]);

  function shiftMonth(delta: number) {
    const date = parseIso(`${month}-01`);
    date.setMonth(date.getMonth() + delta);
    setMonth(toIso(date).slice(0, 7));
  }

  const monthTitle = parseIso(`${month}-01`).toLocaleDateString("en-PH", {
    month: "long",
    year: "numeric",
  });
  const selectedEvents = byDay.get(selected) ?? [];
  // trim a trailing week that is entirely next month
  const visibleDays = days[35].slice(0, 7) !== month ? days.slice(0, 35) : days;

  return (
    <div className="calendar">
      <div className="calendar-bar">
        <div className="calendar-nav">
          <IconButton icon={ChevronLeft} label="Previous month" onClick={() => shiftMonth(-1)} />
          <h2>{monthTitle}</h2>
          <IconButton icon={ChevronRight} label="Next month" onClick={() => shiftMonth(1)} />
          <Button
            size="sm"
            onClick={() => {
              setMonth(today.slice(0, 7));
              setSelected(today);
            }}
          >
            Today
          </Button>
        </div>
        {showLegend && (
          <div className="calendar-legend" role="group" aria-label="Show on calendar">
            {initialTypes.map((type) => {
              const on = types.includes(type);
              return (
                <button
                  key={type}
                  type="button"
                  className={`legend-toggle event-${type}`}
                  aria-pressed={on}
                  onClick={() =>
                    setTypes(on ? types.filter((t) => t !== type) : [...types, type])
                  }
                >
                  <span className="event-dot" aria-hidden="true" />
                  {label(type)}
                </button>
              );
            })}
          </div>
        )}
      </div>
      {error && <ErrorNote message={error} onRetry={reload} />}
      <div className="calendar-grid" role="grid" aria-label={monthTitle}>
        {WEEKDAYS.map((day) => (
          <div key={day} className="calendar-weekday" role="columnheader">
            {day}
          </div>
        ))}
        {visibleDays.map((day) => {
          const events = byDay.get(day) ?? [];
          const outside = day.slice(0, 7) !== month;
          return (
            <div
              key={day}
              role="gridcell"
              className={[
                "calendar-day",
                outside && "is-outside",
                day === today && "is-today",
                day === selected && "is-selected",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <button
                type="button"
                className="calendar-date"
                onClick={() => setSelected(day)}
                aria-label={`${formatDate(day, { weekday: true, year: true })}, ${events.length} item${events.length === 1 ? "" : "s"}`}
              >
                {Number(day.slice(8))}
              </button>
              <div className="calendar-events">
                {events.slice(0, 3).map((event) => (
                  <EventChip key={`${event.type}-${event.id}`} event={event} />
                ))}
                {events.length > 3 && (
                  <button
                    type="button"
                    className="calendar-more"
                    onClick={() => setSelected(day)}
                  >
                    +{events.length - 3} more
                  </button>
                )}
              </div>
              {events.length > 0 && (
                <div className="calendar-dots" aria-hidden="true">
                  {events.slice(0, 4).map((event) => (
                    <span key={`${event.type}-${event.id}`} className={`event-dot event-${event.type}`} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="calendar-agenda">
        <h3>{formatDate(selected, { weekday: true })}</h3>
        {selectedEvents.length ? (
          <ul>
            {selectedEvents.map((event) => (
              <li key={`${event.type}-${event.id}`}>
                <EventChip event={event} />
                <span className="agenda-meta">
                  {label(event.type)}
                  {event.projectName && event.type !== "project" && ` · ${event.projectName}`}
                  {event.assigneeName && ` · ${event.assigneeName}`}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">Nothing scheduled.</p>
        )}
      </div>
    </div>
  );
}
