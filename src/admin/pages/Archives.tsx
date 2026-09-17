import { useState } from "react";
import { Archive, ArchiveRestore, Trash2 } from "lucide-react";
import { query, useApi } from "../lib/api";
import { formatDate, timeAgo } from "../lib/format";
import { Link } from "../lib/router";
import type { Project } from "../lib/types";
import {
  Button,
  EmptyState,
  ErrorNote,
  FilterBar,
  Loading,
  PageHeader,
  SearchInput,
  StatusBadge,
  useDebounced,
} from "../ui/ui";
import { useProjectActions } from "./projectActions";

export function ArchivesPage() {
  const [text, setText] = useState("");
  const q = useDebounced(text);
  const { data, error, loading, reload } = useApi<Project[]>(`projects${query({ archived: 1, q })}`);
  const actions = useProjectActions(() => reload());

  return (
    <div className="page">
      <PageHeader
        title="Project archives"
        description="Finished or shelved projects. They stay out of the calendar and deadlines until restored."
      />
      <FilterBar>
        <SearchInput value={text} onChange={setText} placeholder="Search archived projects" />
      </FilterBar>
      {error && <ErrorNote message={error} onRetry={reload} />}
      {loading && !data && <Loading />}
      {data && !data.length && (
        <EmptyState icon={Archive} title={q ? "No archived projects match" : "Nothing archived yet"}>
          Archive a project from its page or the projects list.
        </EmptyState>
      )}
      {data && data.length > 0 && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Project</th>
                <th scope="col">Final status</th>
                <th scope="col">Was due</th>
                <th scope="col">Archived</th>
                <th scope="col"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {data.map((project) => (
                <tr key={project.id}>
                  <td>
                    <Link to={`/projects/${project.id}`} className="cell-title">{project.name}</Link>
                    <span className="cell-sub">{project.clientName ?? "No client"} · {project.progress}%</span>
                  </td>
                  <td><StatusBadge value={project.status} /></td>
                  <td>{formatDate(project.dueDate)}</td>
                  <td>{project.archivedAt ? timeAgo(project.archivedAt) : "—"}</td>
                  <td className="cell-actions">
                    <div className="row-buttons">
                      <Button size="sm" icon={ArchiveRestore} onClick={() => actions.setArchived(project, false)}>
                        Restore
                      </Button>
                      {actions.canDelete && (
                        <Button size="sm" variant="danger" icon={Trash2} onClick={() => actions.remove(project)}>
                          Delete
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {actions.elements}
    </div>
  );
}
