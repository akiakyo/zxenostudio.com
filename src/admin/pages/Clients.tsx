import { useState } from "react";
import { Building2, Mail, Pencil, Phone, Plus, Trash2 } from "lucide-react";
import { del, query, useApi } from "../lib/api";
import type { Client } from "../lib/types";
import { useWorkspace } from "../lib/workspace";
import { useClientEditor } from "../ui/editors";
import {
  Button,
  EmptyState,
  ErrorNote,
  FilterBar,
  Loading,
  Menu,
  PageHeader,
  SearchInput,
  useAction,
  useDebounced,
  useUi,
} from "../ui/ui";

export function ClientsPage() {
  const { isExecutive, reloadLookups } = useWorkspace();
  const [text, setText] = useState("");
  const q = useDebounced(text);
  const { data, error, loading, reload } = useApi<Client[]>(`clients${query({ q })}`);
  const editor = useClientEditor(() => reload());
  const run = useAction();
  const { confirm } = useUi();

  async function remove(client: Client) {
    if (
      (await confirm({
        title: `Delete ${client.name}?`,
        body: client.projectCount
          ? `${client.projectCount} project${client.projectCount === 1 ? "" : "s"} will be kept but no longer linked to this client.`
          : "This cannot be undone.",
        confirmLabel: "Delete client",
        danger: true,
      })) &&
      (await run(() => del(`clients?id=${client.id}`), "Client deleted"))
    ) {
      reload();
      reloadLookups();
    }
  }

  return (
    <div className="page">
      <PageHeader
        title="Clients"
        description="Everyone the studio works for, with how to reach them."
        actions={<Button variant="primary" icon={Plus} onClick={() => editor.openNew()}>Add client</Button>}
      />
      <FilterBar>
        <SearchInput value={text} onChange={setText} placeholder="Search name, company or email" />
      </FilterBar>
      {error && <ErrorNote message={error} onRetry={reload} />}
      {loading && !data && <Loading />}
      {data && !data.length && (
        <EmptyState
          icon={Building2}
          title={q ? "No clients match" : "No clients yet"}
          action={!q && <Button variant="primary" icon={Plus} onClick={() => editor.openNew()}>Add client</Button>}
        />
      )}
      {data && data.length > 0 && (
        <div className="table-wrap">
          <table className="table clients-table">
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Company</th>
                <th scope="col">Email</th>
                <th scope="col">Phone number</th>
                <th scope="col">Notes</th>
                <th scope="col">Projects</th>
                <th scope="col"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {data.map((client) => (
                <tr key={client.id}>
                  <td>
                    <button type="button" className="cell-title text-btn" onClick={() => editor.openEdit(client)}>
                      {client.name}
                    </button>
                  </td>
                  <td>{client.company || <span className="muted">—</span>}</td>
                  <td>
                    {client.email ? (
                      <a href={`mailto:${client.email}`} className="contact-link"><Mail size={13} aria-hidden /> {client.email}</a>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                  <td>
                    {client.phone ? (
                      <a href={`tel:${client.phone.replace(/[^\d+]/g, "")}`} className="contact-link"><Phone size={13} aria-hidden /> {client.phone}</a>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                  <td className="cell-notes"><span className="clamp-2">{client.notes || <span className="muted">—</span>}</span></td>
                  <td className="num">{client.projectCount}</td>
                  <td className="cell-actions">
                    <Menu
                      items={[
                        { label: "Edit", icon: Pencil, onSelect: () => editor.openEdit(client) },
                        isExecutive && { label: "Delete", icon: Trash2, danger: true, onSelect: () => remove(client) },
                      ]}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {editor.element}
    </div>
  );
}
