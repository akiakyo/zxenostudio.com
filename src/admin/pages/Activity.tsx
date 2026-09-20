import { useEffect, useState } from "react";
import { Activity as ActivityIcon, Pencil, Plus, Send, Trash2 } from "lucide-react";
import { api, del, query, useApi } from "../lib/api";
import { formatDate, formatDateTime, timeAgo } from "../lib/format";
import { Link, setSearchParam, useLocation } from "../lib/router";
import type { ActivityItem, StatusUpdate } from "../lib/types";
import { useWorkspace } from "../lib/workspace";
import { useStatusUpdateEditor } from "../ui/editors";
import {
  Avatar,
  Button,
  EmptyState,
  ErrorNote,
  FilterBar,
  Loading,
  Menu,
  MultilineText,
  PageHeader,
  SelectFilter,
  Tabs,
  useAction,
  useUi,
} from "../ui/ui";

const ENTITY_LINKS: Record<string, (id: string) => string> = {
  approval:id=>`/approvals?id=${id}`,
  event:id=>`/calendar?view=agenda&id=${id}`,
  document:id=>`/handbook?id=${id}`,
  expense:()=>'/finance',deal:()=>'/clients',capacity:()=>'/workload',
  project: (id) => `/projects/${id}`,
  task: () => "/tasks/overview",
  milestone: () => "/calendar",
  client: () => "/clients",
  invoice: (id) => `/invoices?id=${id}`,
  asset: () => "/assets",
  announcement: () => "/announcements",
  "meeting note": (id) => `/meeting-notes?id=${id}`,
  "weekly update": () => "/activity?tab=updates",
  feedback: (id) => `/feedback?id=${id}`,
  comment: () => "/feedback",
  "creative brief": (id) => `/briefs?id=${id}`,
  member: () => "/roles",
};

export function ActivityLine({ item }: { item: ActivityItem }) {
  const href = item.action === "deleted" ? null : ENTITY_LINKS[item.entityType]?.(item.entityId);
  return (
    <li className="activity-item">
      <Avatar name={item.actorName} size={28} />
      <div>
        <p>
          <strong>{item.actorName}</strong> {item.action} {item.entityType}{" "}
          {href ? <Link to={href}>{item.summary}</Link> : <em>{item.summary}</em>}
        </p>
        <time dateTime={item.createdAt} title={formatDateTime(item.createdAt)}>
          {timeAgo(item.createdAt)}
        </time>
      </div>
    </li>
  );
}

export function ActivityPage() {
  const { search } = useLocation();
  const tab = search.get("tab") === "updates" ? "updates" : "all";

  return (
    <div className="page page-narrow">
      <PageHeader title="Activity feed" description="Everything that changed across the studio, newest first." />
      <Tabs
        label="Activity"
        value={tab}
        onChange={(value) => setSearchParam("tab", value === "all" ? null : value)}
        tabs={[
          { value: "all", label: "All activity" },
          { value: "updates", label: "Weekly updates" },
        ]}
      />
      {tab === "all" ? <Feed /> : <WeeklyUpdates />}
    </div>
  );
}

function Feed() {
  const { team } = useWorkspace();
  const [actor, setActor] = useState("");
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [done, setDone] = useState(false);

  async function load(before?: string) {
    setLoading(true);
    try {
      const page = await api<ActivityItem[]>(`activity${query({ limit: 40, before, actor })}`);
      setItems((current) => (before ? [...current, ...page] : page));
      setDone(page.length < 40);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load activity");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actor]);

  const groups = new Map<string, ActivityItem[]>();
  for (const item of items) {
    const day = new Date(item.createdAt).toLocaleDateString("en-PH", { weekday: "long", month: "long", day: "numeric" });
    groups.set(day, [...(groups.get(day) ?? []), item]);
  }

  return (
    <>
      <FilterBar>
        <SelectFilter
          label="Person"
          allLabel="Everyone"
          value={actor}
          onChange={setActor}
          options={team.map((m) => ({ value: m.username, label: m.name || m.username }))}
        />
      </FilterBar>
      {error && <ErrorNote message={error} onRetry={() => load()} />}
      {!loading && !items.length && !error && (
        <EmptyState icon={ActivityIcon} title="No activity yet">Changes to projects, tasks and everything else appear here.</EmptyState>
      )}
      {[...groups].map(([day, list]) => (
        <section key={day} className="activity-day">
          <h2>{day}</h2>
          <ul className="activity-list">
            {list.map((item) => (
              <ActivityLine key={item.id} item={item} />
            ))}
          </ul>
        </section>
      ))}
      {loading && <Loading />}
      {!loading && !done && items.length > 0 && (
        <div className="load-more">
          <Button onClick={() => load(items[items.length - 1].id)}>Load older activity</Button>
        </div>
      )}
    </>
  );
}

function WeeklyUpdates() {
  const { team, session, isExecutive } = useWorkspace();
  const [author, setAuthor] = useState("");
  const { data, error, loading, reload } = useApi<StatusUpdate[]>(`status-updates${query({ author })}`);
  const editor = useStatusUpdateEditor(() => reload());
  const run = useAction();
  const { confirm } = useUi();

  async function remove(u: StatusUpdate) {
    if (
      (await confirm({ title: "Delete this weekly update?", confirmLabel: "Delete", danger: true })) &&
      (await run(() => del(`status-updates?id=${u.id}`), "Update deleted"))
    ) {
      reload();
    }
  }

  return (
    <>
      <FilterBar>
        <SelectFilter
          label="Author"
          allLabel="Everyone"
          value={author}
          onChange={setAuthor}
          options={team.map((m) => ({ value: m.username, label: m.name || m.username }))}
        />
        <Button variant="primary" icon={Plus} onClick={() => editor.openNew()}>
          Weekly status update
        </Button>
      </FilterBar>
      {error && <ErrorNote message={error} onRetry={reload} />}
      {loading && !data && <Loading />}
      {data && !data.length && (
        <EmptyState icon={Send} title="No weekly updates yet">Share what you finished this week and what's next.</EmptyState>
      )}
      <div className="stack">
        {data?.map((u) => {
          const mine = u.createdBy === session.username;
          return (
            <article key={u.id} className="card">
              <div className="card-head">
                <div className="author">
                  <Avatar name={u.createdByName} size={36} />
                  <div>
                    <strong>{u.createdByName}</strong>
                    <span>
                      {u.createdByTitle} · Week of {formatDate(u.weekOf)}
                      {u.projectId && (
                        <>
                          {" · "}
                          <Link to={`/projects/${u.projectId}`}>{u.projectName}</Link>
                        </>
                      )}
                    </span>
                  </div>
                </div>
                {(mine || isExecutive) && (
                  <Menu
                    items={[
                      { label: "Edit", icon: Pencil, onSelect: () => editor.openEdit(u) },
                      { label: "Delete", icon: Trash2, danger: true, onSelect: () => remove(u) },
                    ]}
                  />
                )}
              </div>
              <div className="update-sections">
                <section>
                  <h3>Done this week</h3>
                  <MultilineText text={u.done} />
                </section>
                {u.next && (
                  <section>
                    <h3>Next week</h3>
                    <MultilineText text={u.next} />
                  </section>
                )}
                {u.blockers && (
                  <section className="is-blocker">
                    <h3>Blockers</h3>
                    <MultilineText text={u.blockers} />
                  </section>
                )}
              </div>
            </article>
          );
        })}
      </div>
      {editor.element}
    </>
  );
}
