import { useEffect, useState } from "react";
import { Building2, Pencil, Plus, Trash2, Eye } from "lucide-react";
import { del, query, useApi } from "../lib/api";
import type { Client } from "../lib/types";
import { useWorkspace } from "../lib/workspace";
import { useClientEditor } from "../ui/editors";
import { Pipeline } from './hq/Pipeline';
import { ClientDetail } from './hq/ClientDetail';
import { useLocation } from '../lib/router';
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
  Tabs,
  ClientMark,
  StatusBadge,
} from "../ui/ui";

function ClientCards({
  clients,
  onOpen,
  onEdit,
  onRemove,
  isExecutive,
}: {
  clients: Client[];
  onOpen: (id: string) => void;
  onEdit: (client: Client) => void;
  onRemove: (client: Client) => void;
  isExecutive: boolean;
}) {
  return (
    <ul className="client-grid">
      {clients.map((client) => (
        <li key={client.id} className="client-card">
          <button type="button" className="client-card-open" onClick={() => onOpen(client.id)}>
            <ClientMark name={client.name} palette={client.palette} size={40} />
            <span className="client-card-name">
              <strong>{client.name}</strong>
              <small>{client.industry || client.company || "No industry set"}</small>
            </span>
          </button>
          <div className="client-card-foot">
            <StatusBadge value={client.status} />
            <span className="muted">
              {client.activeProjectCount} active
              <span className="sr-only"> {client.activeProjectCount === 1 ? "project" : "projects"}</span>
            </span>
            <Menu
              items={[
                { label: "Client details", icon: Eye, onSelect: () => onOpen(client.id) },
                { label: "Edit", icon: Pencil, onSelect: () => onEdit(client) },
                isExecutive && { label: "Delete", icon: Trash2, danger: true, onSelect: () => onRemove(client) },
              ]}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function ClientsPage() {
  const {search}=useLocation();const [selected,setSelected]=useState<string|null>(search.get('id'));
  const selectedId=search.get('id');useEffect(()=>setSelected(selectedId),[selectedId]);
  const { isExecutive, reloadLookups } = useWorkspace();
  const [text, setText] = useState("");
  const [tab,setTab]=useState('clients');
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
        description={
          data
            ? `${data.length} ${data.length === 1 ? "client" : "clients"}, ${data.filter((c) => c.status === "active" || c.status === "in_house").length} active.`
            : "Everyone the studio works for, with how to reach them."
        }
        actions={<Button variant="primary" icon={Plus} onClick={() => editor.openNew()}>Add client</Button>}
      />
      <Tabs label="Clients view" value={tab} onChange={setTab} tabs={[{value:'clients',label:'Clients'},{value:'pipeline',label:'Pipeline'}]} />
      {tab==='pipeline'?<Pipeline/>:<><FilterBar>
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
        <>
          <ClientCards
            clients={data.filter((c) => c.status === "active" || c.status === "in_house")}
            onOpen={setSelected}
            onEdit={editor.openEdit}
            onRemove={remove}
            isExecutive={isExecutive}
          />
          {data.some((c) => c.status !== "active" && c.status !== "in_house") && (
            <>
              <h2 className="section-heading">Onboarding and paused</h2>
              <ClientCards
                clients={data.filter((c) => c.status !== "active" && c.status !== "in_house")}
                onOpen={setSelected}
                onEdit={editor.openEdit}
                onRemove={remove}
                isExecutive={isExecutive}
              />
            </>
          )}
        </>
      )}
      </>}{editor.element}{data?.find(c=>c.id===selected)&&<ClientDetail client={data.find(c=>c.id===selected)!} onClose={()=>setSelected(null)}/>}
    </div>
  );
}
