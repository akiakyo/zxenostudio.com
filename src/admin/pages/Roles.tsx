import { useState } from "react";
import { Check, KeyRound, Minus, Pencil } from "lucide-react";
import { patch, post, useApi } from "../lib/api";
import type { Access, Member } from "../lib/types";
import { useWorkspace } from "../lib/workspace";
import { FormModal } from "../ui/form";
import HoldButton from "../ui/micro/HoldButton";
import {
  Avatar,
  Button,
  ErrorNote,
  Loading,
  Modal,
  PageHeader,
  Panel,
  StatusBadge,
  useAction,
  useUi,
} from "../ui/ui";

/* Mirrors the checks in api/_lib/resources.ts and api/_lib/views.ts. */
const PERMISSIONS: { area: string; member: string | boolean; executive: string | boolean }[] = [
  {area:'Review approvals',member:'Assigned reviewer only',executive:true},
  {area:'Submit and resubmit approvals',member:'Create; edit their own',executive:true},
  {area:'Manage expenses and capacity plans',member:false,executive:true},
  {area:'View finance, workload and handbook',member:true,executive:true},
  {area:'Edit handbook documents',member:false,executive:true},
  {area:'Leave requests',member:'Create, view and cancel their own pending requests',executive:'Review others; cannot approve their own'},
  {area:'Direct messages',member:'Participants only',executive:'Participants only'},
  {area:'Events and sales pipeline',member:'Create and edit; delete their own',executive:true},
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
  { area: "Email announcements and keep the email list", member: false, executive: true },
  { area: "Executive overview", member: false, executive: true },
  { area: "Change their own name, phone and bio", member: true, executive: true },
  { area: "Change member roles and access", member: false, executive: true },
  { area: "Reset another member's password", member: false, executive: true },
  { area: "Work website inquiries", member: "View, update and add as a client", executive: "Also delete" },
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
  /* the account being reset, and its starting password once that is done */
  const [resetting, setResetting] = useState<Member | null>(null);
  const [startingPassword, setStartingPassword] = useState("");
  const run = useAction();

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
                        <div className="row-buttons">
                          <Button size="sm" icon={Pencil} onClick={() => setEditing(m)}>Change role</Button>
                          {m.username !== session.username && (
                            <Button size="sm" icon={KeyRound} onClick={() => { setStartingPassword(""); setResetting(m); }}>
                              Reset password
                            </Button>
                          )}
                        </div>
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

      <Modal
        open={!!resetting}
        size="sm"
        title={`Reset password · ${resetting?.name || resetting?.username || ""}`}
        onClose={() => setResetting(null)}
        footer={
          startingPassword ? (
            <Button variant="primary" onClick={() => setResetting(null)}>Done</Button>
          ) : (
            <>
              <Button onClick={() => setResetting(null)}>Cancel</Button>
              <HoldButton
                size="sm"
                holdTime={1200}
                resetAfter={0}
                icon={<KeyRound size={14} aria-hidden />}
                doneLabel="Reset"
                onHold={async () => {
                  const result = await run(() =>
                    post<{ startingPassword: string }>("member-password", { username: resetting!.username }),
                  );
                  if (result) setStartingPassword(result.startingPassword);
                }}
              >
                Hold to reset
              </HoldButton>
            </>
          )
        }
      >
        {startingPassword ? (
          <div className="confirm-body">
            <p>
              Done. {resetting?.name || resetting?.username} can now sign in with{" "}
              <code>{startingPassword}</code> and will be asked to choose a new password straight away.
            </p>
            <p className="hint">Pass it on privately, in person or by direct message.</p>
          </div>
        ) : (
          <p className="confirm-body">
            Puts @{resetting?.username} back to their starting password and signs them out everywhere.
            Use this when someone is locked out and has no email on file; anyone with an email can use
            "Forgot password?" on the sign-in page instead.
          </p>
        )}
      </Modal>

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
