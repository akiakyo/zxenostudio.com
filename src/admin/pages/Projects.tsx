import { useState } from "react";
import { CalendarDays, FolderKanban, Plus } from "lucide-react";
import { query, useApi } from "../lib/api";
import { formatDate, options, relativeDay } from "../lib/format";
import { Link, navigate, setSearchParam, useLocation } from "../lib/router";
import type { Project } from "../lib/types";
import { CalendarView } from "../ui/calendar";
import {
  Button,
  EmptyState,
  ErrorNote,
  FilterBar,
  Loading,
  Menu,
  PageHeader,
  Progress,
  SearchInput,
  SelectFilter,
  StatusBadge,
  Tabs,
  useDebounced,
} from "../ui/ui";
import { useProjectActions } from "./projectActions";
import { ProjectBoard, ProjectTimeline } from './hq/ProjectViews';

export function ProjectsPage() {
  const { search } = useLocation();
  const view = ['calendar','board','timeline'].includes(search.get('view')||'')?search.get('view')!:'list';
  const [status, setStatus] = useState("");
  const [text, setText] = useState("");
  const q = useDebounced(text);
  const { data, error, loading, reload } = useApi<Project[]>(
    `projects${query({ archived: 0, status, q })}`,
  );
  const actions = useProjectActions(() => reload());

  return (
    <div className="page">
      <PageHeader
        title="Projects"
        description="Track progress and due dates for every active project."
        actions={
          <Button variant="primary" icon={Plus} onClick={() => actions.newProject({ status: "planning" })}>
            New project
          </Button>
        }
      />
      <div className="toolbar">
        <Tabs
          label="View"
          value={view}
          onChange={(value) => setSearchParam("view", value === "list" ? null : value)}
          tabs={[
            { value: "list", label: "List" },
            { value: 'board', label: 'Board' },
            { value: 'timeline', label: 'Timeline' },
            { value: "calendar", label: "Due date calendar" },
          ]}
        />
        {view !== "calendar" && (
          <FilterBar>
            <SearchInput value={text} onChange={setText} placeholder="Search projects or clients" />
            <SelectFilter
              label="Status"
              allLabel="All statuses"
              value={status}
              onChange={setStatus}
              options={options(["planning", "active", "on_hold", "review", "completed"])}
            />
          </FilterBar>
        )}
      </div>

      {view === "calendar" ? (
        <CalendarView types={["project", "milestone"]} />
      ) : (
        <>
          {error && <ErrorNote message={error} onRetry={reload} />}
          {loading && !data && <Loading />}
          {data && !data.length && (
            <EmptyState
              icon={FolderKanban}
              title={q || status ? "No projects match" : "No projects yet"}
              action={
                !q && !status && (
                  <Button variant="primary" icon={Plus} onClick={() => actions.newProject({ status: "planning" })}>
                    New project
                  </Button>
                )
              }
            />
          )}
          {data && data.length > 0 && (view==='board'?<ProjectBoard projects={data} reload={reload}/>:view==='timeline'?<ProjectTimeline projects={data}/>: (
            <div className="table-wrap">
              <table className="table projects-table">
                <thead>
                  <tr>
                    <th scope="col">Project</th>
                    <th scope="col">Status</th>
                    <th scope="col">Progress</th>
                    <th scope="col">Due</th>
                    <th scope="col">Tasks</th>
                    <th scope="col">Next milestone</th>
                    <th scope="col"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((project) => (
                    <tr key={project.id} className="is-clickable" onClick={() => navigate(`/projects/${project.id}`)}>
                      <td>
                        <Link to={`/projects/${project.id}`} className="cell-title" onClick={(e) => e.stopPropagation()}>
                          {project.name}
                        </Link>
                        <span className="cell-sub">{project.clientName ?? "No client"}</span>
                      </td>
                      <td><StatusBadge value={project.status} /></td>
                      <td className="cell-progress">
                        <Progress value={project.progress} />
                        <span>{project.progress}%</span>
                      </td>
                      <td>
                        {project.dueDate ? (
                          <span className={project.overdue ? "is-overdue" : ""} title={formatDate(project.dueDate, { year: true })}>
                            {relativeDay(project.dueDate)}
                          </span>
                        ) : (
                          <span className="muted">—</span>
                        )}
                      </td>
                      <td>{project.doneTaskCount}/{project.taskCount}</td>
                      <td>{project.nextMilestone ? formatDate(project.nextMilestone) : <span className="muted">—</span>}</td>
                      <td className="cell-actions" onClick={(e) => e.stopPropagation()}>
                        <div className="row-buttons">
                          <Button size="sm" icon={CalendarDays} onClick={() => navigate(`/projects/${project.id}?tab=schedule`)}>
                            Schedule
                          </Button>
                          <Menu items={actions.items(project)} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </>
      )}
      {actions.elements}
    </div>
  );
}
