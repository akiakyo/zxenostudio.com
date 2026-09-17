import { useState } from "react";
import { Check, Minus, Pencil } from "lucide-react";
import { patch, useApi } from "../lib/api";
import type { Access, Member } from "../lib/types";
import { useWorkspace } from "../lib/workspace";
import { FormModal } from "../ui/form";
import {
  Avatar,
  Button,
  ErrorNote,
  Loading,
  PageHeader,
  Panel,
  StatusBadge,
  useUi,
} from "../ui/ui";

/* Mirrors the checks in api/_lib/resources.ts and api/_lib/views.ts. */
const PERMISSIONS: { area: string; member: string | boolean; executive: string | boolean }[] = [
  { area: "View the dashboard, calendar, deadlines and activity", member: true, executive: true },
  { area: "Create and edit projects, milestones and tasks", member: true, executive: true },
  { area: "Archive and restore projects", member: true, executive: true },
  { area: "Delete projects", member: false, executive: true },
  { area: "Delete tasks", member: "Ones they created or are assigned", executive: true },
  { area: "Private tasks", member: "Their own only", executive: "Their own only" },
  { area: "Add and edit clients", member: true, executive: true },
  { area: "Delete clients", member: false, executive: true },
  { area: "Create and edit invoices", member: true, executive: true },
  { area: "Delete invoices", member: false, executive: true },
  { area: "Briefs, feedback, meeting notes, assets", member: "Create all; delete their own", executive: "Create and delete all" },
  { area: "Weekly status updates", member: "Post; edit their own", executive: "Post; edit and delete all" },
  { area: "Post announcements", member: false, executive: true },
  { area: "Executive overview", member: false, executive: true },
  { area: "Change their own name, phone and bio", member: true, executive: true },
  { area: "Change member roles and access", member: false, executive: true },
];

function Cell({ value }: { value: string | boolean }) {
  if (value === true) return <Check size={16} aria-label="Yes" className="perm-yes" />;
  if (value === false) return <Minus size={16} aria-label="No" className="perm-no" />;
  return <span className="perm-note">{value}</span>;
}

export function RolesPage() {
  const { isExecutive, session, reloadLookups, updateSession } = useWorkspace();
  const { toast } = useUi();
  const { data, error, loading, reload } = useApi<Member[]>("team");
  const [editing, setEditing] = useState<Member | null>(null);

  return (
    <div className="page">
      <PageHeader
        title="Roles & permissions"
        description={
          isExecutive
            ? "Set each member's role and access level. Everyone else can see this page but not change it."
            : "Each member's role and what they can do. Only executives can change roles."
        }
      />
      {error && <ErrorNote message={error} onRetry={reload} />}
      {loading && !data && <Loading />}
      {data && (
        <Panel title="Members">
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Member</th>
                  <th scope="col">Username</th>
                  <th scope="col">Role</th>
                  <th scope="col">Access</th>
                  {isExecutive && <th scope="col"><span className="sr-only">Actions</span></th>}
                </tr>
              </thead>
              <tbody>
                {data.map((m) => (
                  <tr key={m.username}>
                    <td>
                      <div className="author">
                        <Avatar name={m.name || m.username} size={30} />
                        <strong>{m.name || m.username}</strong>
                      </div>
                    </td>
                    <td className="muted">@{m.username}</td>
                    <td>{m.title}</td>
                    <td><StatusBadge value={m.access} /></td>
                    {isExecutive && (
                      <td className="cell-actions">
                        <Button size="sm" icon={Pencil} onClick={() => setEditing(m)}>Change role</Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      <Panel title="What each access level can do">
        <div className="table-wrap">
          <table className="table perm-table">
            <thead>
              <tr>
                <th scope="col">Permission</th>
                <th scope="col">Member</th>
                <th scope="col">Executive</th>
              </tr>
            </thead>
            <tbody>
              {PERMISSIONS.map((p) => (
                <tr key={p.area}>
                  <td>{p.area}</td>
                  <td><Cell value={p.member} /></td>
                  <td><Cell value={p.executive} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <FormModal
        open={!!editing}
        title={`Change role · ${editing?.name || editing?.username || ""}`}
        size="sm"
        submitLabel="Save role"
        initial={editing ? { title: editing.title, access: editing.access } : {}}
        fields={[
          { name: "title", label: "Role", type: "text", required: true, wide: true, placeholder: "e.g. Motion Designer" },
          {
            name: "access",
            label: "Access",
            type: "select",
            noEmpty: true,
            wide: true,
            options: [
              { value: "member", label: "Member" },
              { value: "executive", label: "Executive" },
            ],
            hint: "Executives can change roles, post announcements, delete projects, clients and invoices, and see the executive overview.",
          },
        ]}
        onClose={() => setEditing(null)}
        onSubmit={async (values) => {
          const updated = await patch<Member>(`team?username=${editing!.username}`, values);
          toast("Role updated");
          reload();
          reloadLookups();
          if (updated.username === session.username) {
            updateSession({ title: updated.title, access: updated.access as Access });
          }
        }}
      />
    </div>
  );
}
