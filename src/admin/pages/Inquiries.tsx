import { useEffect, useState } from "react";
import {
  Archive,
  ArchiveRestore,
  ArrowRight,
  Building2,
  Inbox,
  Mail,
  Pencil,
  Trash2,
  UserPlus,
} from "lucide-react";
import { del, patch, post, query, useApi } from "../lib/api";
import { formatDateTime, timeAgo } from "../lib/format";
import { Link, useLocation } from "../lib/router";
import { useWorkspace } from "../lib/workspace";
import { FormModal } from "../ui/form";
import {
  Button,
  EmptyState,
  ErrorNote,
  FilterBar,
  FuseAction,
  Loading,
  Menu,
  MultilineText,
  PageHeader,
  Panel,
  SearchInput,
  StatusBadge,
  Tabs,
  useAction,
  useDebounced,
  useUi,
} from "../ui/ui";

export type Inquiry = {
  id: string;
  name: string;
  email: string;
  company: string;
  service: string;
  message: string;
  timeline: string;
  budget: string;
  preferredTime: string;
  status: "new" | "contacted" | "converted" | "archived";
  owner: string | null;
  ownerName: string | null;
  notes: string;
  clientId: string | null;
  clientName: string | null;
  createdAt: string;
};

type View = "open" | "converted" | "archived" | "all";

/* Project requests from the booking form on the public site. New ones show
   first; "Add as client" creates the client and a lead in the pipeline. */
export function InquiriesPage() {
  const { isExecutive, reloadLookups } = useWorkspace();
  const { search } = useLocation();
  const [view, setView] = useState<View>("open");
  const [text, setText] = useState("");
  const q = useDebounced(text.trim());
  const { data, error, loading, reload } = useApi<Inquiry[]>(
    `inquiries${query({ status: view === "all" ? null : view, q })}`,
  );
  const counts = useApi<Inquiry[]>("inquiries");
  const run = useAction();
  const { confirm } = useUi();
  const [editing, setEditing] = useState<Inquiry | null>(null);
  const selected = search.get("id");

  /* the link in the alert email lands on its inquiry */
  useEffect(() => {
    if (!selected || !data) return;
    document.getElementById(`inquiry-${selected}`)?.scrollIntoView({ block: "center" });
  }, [selected, data]);

  function refresh() {
    reload();
    counts.reload();
  }

  async function update(inquiry: Inquiry, values: Partial<Inquiry>, message?: string) {
    if (await run(() => patch<Inquiry>(`inquiries?id=${inquiry.id}`, values), message)) refresh();
  }

  async function convert(inquiry: Inquiry) {
    if (await run(() => post<Inquiry>("inquiry-convert", { id: inquiry.id }), "Added as a client, with a lead in the pipeline")) {
      reloadLookups();
      refresh();
    }
  }

  async function remove(inquiry: Inquiry) {
    if (
      (await confirm({
        title: "Delete this inquiry?",
        body: `${inquiry.name}'s message is removed for good. Archive it instead to keep a record.`,
        confirmLabel: "Delete",
        danger: true,
      })) &&
      (await run(() => del(`inquiries?id=${inquiry.id}`), "Inquiry deleted"))
    ) {
      refresh();
    }
  }

  const all = counts.data ?? [];
  const tally = (match: (i: Inquiry) => boolean) => all.filter(match).length;

  return (
    <div className="page">
      <PageHeader
        title="Inquiries"
        description="Project requests sent from the booking form on zxenostudio.com. Executives with an email address on file are emailed each new one."
      />
      <Tabs
        label="Inquiry status"
        value={view}
        onChange={setView}
        tabs={[
          { value: "open", label: "Open", count: tally((i) => i.status === "new" || i.status === "contacted") },
          { value: "converted", label: "Clients", count: tally((i) => i.status === "converted") },
          { value: "archived", label: "Archived", count: tally((i) => i.status === "archived") },
          { value: "all", label: "All", count: all.length },
        ]}
      />
      <FilterBar>
        <SearchInput value={text} onChange={setText} placeholder="Search inquiries" />
      </FilterBar>
      {error && <ErrorNote message={error} onRetry={reload} />}
      {loading && !data && <Loading />}
      {data && !data.length && (
        <EmptyState icon={Inbox} title={q ? "No inquiries match" : view === "open" ? "No open inquiries" : "Nothing here yet"}>
          {view === "open" && !q && "New requests from the website's booking form appear here."}
        </EmptyState>
      )}
      <div className="inquiry-list">
        {data?.map((inquiry) => (
          <article
            key={inquiry.id}
            id={`inquiry-${inquiry.id}`}
            className={`inquiry-card ${inquiry.status === "new" ? "is-new" : ""} ${selected === inquiry.id ? "is-selected" : ""}`}
          >
            <header className="inquiry-head">
              <div>
                <h2>
                  {inquiry.name}
                  {inquiry.company && <span className="muted"> · {inquiry.company}</span>}
                </h2>
                <a className="inquiry-email" href={`mailto:${inquiry.email}`}>{inquiry.email}</a>
              </div>
              <div className="inquiry-status">
                <StatusBadge value={inquiry.status} />
                <span className="cell-sub" title={formatDateTime(inquiry.createdAt)}>{timeAgo(inquiry.createdAt)}</span>
              </div>
            </header>
            {(inquiry.service || inquiry.budget || inquiry.timeline || inquiry.preferredTime) && (
              <dl className="inquiry-facts">
                {inquiry.service && <div><dt>Service</dt><dd>{inquiry.service}</dd></div>}
                {inquiry.budget && <div><dt>Budget</dt><dd>{inquiry.budget}</dd></div>}
                {inquiry.timeline && <div><dt>Timeline</dt><dd>{inquiry.timeline}</dd></div>}
                {inquiry.preferredTime && <div><dt>Call time</dt><dd>{inquiry.preferredTime}</dd></div>}
              </dl>
            )}
            <div className="inquiry-message"><MultilineText text={inquiry.message} /></div>
            {(inquiry.notes || inquiry.ownerName || inquiry.clientId) && (
              <p className="inquiry-notes">
                {inquiry.ownerName && <span>Handled by <strong>{inquiry.ownerName}</strong>. </span>}
                {inquiry.clientId && (
                  <span>
                    Client: <Link to={`/clients?id=${inquiry.clientId}`}>{inquiry.clientName ?? "Open client"}</Link>.{" "}
                  </span>
                )}
                {inquiry.notes}
              </p>
            )}
            <footer className="inquiry-actions">
              <a
                className="btn btn-secondary btn-sm"
                href={`mailto:${inquiry.email}?subject=${encodeURIComponent(`Re: your ${inquiry.service || "project"} inquiry with ZXENO Studio`)}`}
                onClick={() => {
                  if (inquiry.status === "new") void update(inquiry, { status: "contacted" });
                }}
              >
                <Mail size={14} aria-hidden /> Reply by email
              </a>
              {!inquiry.clientId && inquiry.status !== "archived" && (
                <Button size="sm" variant="primary" icon={UserPlus} onClick={() => convert(inquiry)}>
                  Add as client
                </Button>
              )}
              {inquiry.clientId && (
                <Link className="btn btn-secondary btn-sm" to={`/clients?id=${inquiry.clientId}`}>
                  <Building2 size={14} aria-hidden /> View client
                </Link>
              )}
              <span className="spacer" />
              {inquiry.status === "archived" ? (
                <Button size="sm" icon={ArchiveRestore} onClick={() => update(inquiry, { status: "contacted" }, "Inquiry restored")}>
                  Restore
                </Button>
              ) : (
                <FuseAction
                  key={`archive-${inquiry.id}`}
                  size="sm"
                  tone="neutral"
                  icon={Archive}
                  label="Archive"
                  doneLabel="Archived"
                  onCommit={() => update(inquiry, { status: "archived" }, "Inquiry archived")}
                />
              )}
              <Menu
                label={`More actions for ${inquiry.name}`}
                items={[
                  { label: "Edit notes and owner", icon: Pencil, onSelect: () => setEditing(inquiry) },
                  inquiry.status === "contacted" && {
                    label: "Mark as new",
                    icon: Inbox,
                    onSelect: () => update(inquiry, { status: "new" }),
                  },
                  isExecutive && { label: "Delete", icon: Trash2, danger: true, onSelect: () => remove(inquiry) },
                ]}
              />
            </footer>
          </article>
        ))}
      </div>

      <FormModal
        open={!!editing}
        title={`Inquiry · ${editing?.name ?? ""}`}
        size="sm"
        initial={editing ? { owner: editing.owner ?? "", notes: editing.notes } : {}}
        fields={[
          { name: "owner", label: "Handled by", type: "member", wide: true },
          { name: "notes", label: "Notes", type: "textarea", rows: 5, placeholder: "What was agreed, next steps" },
        ]}
        onClose={() => setEditing(null)}
        onSubmit={async (values) => {
          await patch(`inquiries?id=${editing!.id}`, { owner: values.owner || null, notes: values.notes });
          refresh();
        }}
      />
    </div>
  );
}

/* Dashboard panel: new requests from the website, shown only while there are some. */
export function NewInquiriesPanel() {
  const { data } = useApi<Inquiry[]>("inquiries?status=new");
  if (!data?.length) return null;
  return (
    <Panel title={`New inquiries (${data.length})`} className="inquiry-panel">
      <ul className="simple-list">
        {data.slice(0, 5).map((inquiry) => (
          <li key={inquiry.id}>
            <Link to={`/inquiries?id=${inquiry.id}`} className="simple-item">
              <span className="simple-title">
                {inquiry.name}
                {inquiry.company && ` · ${inquiry.company}`}
              </span>
              <span className="simple-meta">
                {inquiry.service || "Project inquiry"} · {timeAgo(inquiry.createdAt)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <Link to="/inquiries" className="panel-more">
        All inquiries<ArrowRight aria-hidden="true" />
      </Link>
    </Panel>
  );
}
