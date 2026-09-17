import { useState } from "react";
import { Check, Pencil, Plus, Receipt, Send, Trash2 } from "lucide-react";
import { del, patch, query, useApi } from "../lib/api";
import { formatDate, money, todayIso } from "../lib/format";
import { Link, setSearchParam, useLocation } from "../lib/router";
import type { Invoice } from "../lib/types";
import { useWorkspace } from "../lib/workspace";
import { useInvoiceEditor } from "../ui/editors";
import {
  Badge,
  Button,
  EmptyState,
  ErrorNote,
  FilterBar,
  Loading,
  Menu,
  Modal,
  MultilineText,
  PageHeader,
  SearchInput,
  SelectFilter,
  StatusBadge,
  useAction,
  useDebounced,
  useUi,
} from "../ui/ui";

export function InvoicesPage() {
  const { isExecutive, projects } = useWorkspace();
  const { search } = useLocation();
  const [status, setStatus] = useState("");
  const [projectId, setProjectId] = useState("");
  const [text, setText] = useState("");
  const q = useDebounced(text);
  const { data, error, loading, reload } = useApi<Invoice[]>(`invoices${query({ status, projectId, q })}`);
  const all = useApi<Invoice[]>("invoices");
  const editor = useInvoiceEditor(() => {
    reload();
    all.reload();
  });
  const run = useAction();
  const { confirm } = useUi();
  const open = data?.find((i) => i.id === search.get("id")) ?? all.data?.find((i) => i.id === search.get("id"));

  const month = todayIso().slice(0, 7);
  const invoices = all.data ?? [];
  const summary = {
    outstanding: invoices.filter((i) => i.status === "sent").reduce((s, i) => s + i.amount, 0),
    overdue: invoices.filter((i) => i.overdue).reduce((s, i) => s + i.amount, 0),
    overdueCount: invoices.filter((i) => i.overdue).length,
    paidMonth: invoices.filter((i) => i.status === "paid" && i.paidDate?.startsWith(month)).reduce((s, i) => s + i.amount, 0),
    drafts: invoices.filter((i) => i.status === "draft").length,
  };

  async function setInvoiceStatus(invoice: Invoice, next: "sent" | "paid") {
    if (await run(() => patch(`invoices?id=${invoice.id}`, { status: next }), next === "paid" ? "Marked paid" : "Marked sent")) {
      reload();
      all.reload();
    }
  }

  async function remove(invoice: Invoice) {
    if (
      (await confirm({ title: `Delete invoice ${invoice.number}?`, body: "Consider marking it void instead to keep the record.", confirmLabel: "Delete", danger: true })) &&
      (await run(() => del(`invoices?id=${invoice.id}`), "Invoice deleted"))
    ) {
      setSearchParam("id", null);
      reload();
      all.reload();
    }
  }

  function actions(invoice: Invoice) {
    return [
      { label: "Edit", icon: Pencil, onSelect: () => editor.openEdit(invoice) },
      invoice.status === "draft" && { label: "Mark sent", icon: Send, onSelect: () => setInvoiceStatus(invoice, "sent") },
      (invoice.status === "sent" || invoice.status === "draft") && { label: "Mark paid", icon: Check, onSelect: () => setInvoiceStatus(invoice, "paid") },
      isExecutive && { label: "Delete", icon: Trash2, danger: true, onSelect: () => remove(invoice) },
    ];
  }

  return (
    <div className="page">
      <PageHeader
        title="Invoices"
        description="Billing for every project, in Philippine pesos."
        actions={<Button variant="primary" icon={Plus} onClick={() => editor.openNew({ status: "draft" })}>New invoice</Button>}
      />
      <section className="stats stats-4" aria-label="Invoice summary">
        <div className="stat"><span>Outstanding</span><strong>{money(summary.outstanding)}</strong></div>
        <div className={`stat ${summary.overdueCount ? "is-alert" : ""}`}><span>Overdue ({summary.overdueCount})</span><strong>{money(summary.overdue)}</strong></div>
        <div className="stat"><span>Paid this month</span><strong>{money(summary.paidMonth)}</strong></div>
        <div className="stat"><span>Drafts</span><strong>{summary.drafts}</strong></div>
      </section>
      <FilterBar>
        <SearchInput value={text} onChange={setText} placeholder="Search number, description or client" />
        <SelectFilter
          label="Status"
          allLabel="All statuses"
          value={status}
          onChange={setStatus}
          options={[
            { value: "draft", label: "Draft" },
            { value: "sent", label: "Sent" },
            { value: "overdue", label: "Overdue" },
            { value: "paid", label: "Paid" },
            { value: "void", label: "Void" },
          ]}
        />
        <SelectFilter label="Project" allLabel="All projects" value={projectId} onChange={setProjectId} options={projects.map((p) => ({ value: p.id, label: p.name }))} />
      </FilterBar>
      {error && <ErrorNote message={error} onRetry={reload} />}
      {loading && !data && <Loading />}
      {data && !data.length && (
        <EmptyState icon={Receipt} title={q || status || projectId ? "No invoices match" : "No invoices yet"} />
      )}
      {data && data.length > 0 && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Invoice</th>
                <th scope="col">Client</th>
                <th scope="col">Project</th>
                <th scope="col" className="num">Amount</th>
                <th scope="col">Issued</th>
                <th scope="col">Due</th>
                <th scope="col">Status</th>
                <th scope="col"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {data.map((invoice) => (
                <tr key={invoice.id}>
                  <td>
                    <button type="button" className="cell-title text-btn" onClick={() => setSearchParam("id", invoice.id)}>
                      {invoice.number}
                    </button>
                    <span className="cell-sub">{invoice.title}</span>
                  </td>
                  <td>{invoice.clientName ?? <span className="muted">—</span>}</td>
                  <td>{invoice.projectId ? <Link to={`/projects/${invoice.projectId}?tab=invoices`}>{invoice.projectName}</Link> : <span className="muted">—</span>}</td>
                  <td className="num">{money(invoice.amount)}</td>
                  <td>{formatDate(invoice.issueDate)}</td>
                  <td className={invoice.overdue ? "is-overdue" : ""}>{formatDate(invoice.dueDate)}</td>
                  <td>{invoice.overdue ? <Badge tone="red">Overdue</Badge> : <StatusBadge value={invoice.status} />}</td>
                  <td className="cell-actions"><Menu items={actions(invoice)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Modal
        open={!!open}
        title={open ? `Invoice ${open.number}` : ""}
        onClose={() => setSearchParam("id", null)}
        footer={
          open && (
            <>
              {open.status === "draft" && <Button icon={Send} onClick={() => setInvoiceStatus(open, "sent")}>Mark sent</Button>}
              {(open.status === "sent" || open.status === "draft") && <Button icon={Check} onClick={() => setInvoiceStatus(open, "paid")}>Mark paid</Button>}
              <Button variant="primary" icon={Pencil} onClick={() => editor.openEdit(open)}>Edit</Button>
            </>
          )
        }
      >
        {open && (
          <div className="invoice-view">
            <div className="invoice-amount">
              <span>{open.title}</span>
              <strong>{money(open.amount)}</strong>
              {open.overdue ? <Badge tone="red">Overdue</Badge> : <StatusBadge value={open.status} />}
            </div>
            <dl className="facts">
              <div><dt>Client</dt><dd>{open.clientName ? `${open.clientName}${open.clientCompany ? ` · ${open.clientCompany}` : ""}` : "—"}</dd></div>
              <div><dt>Project</dt><dd>{open.projectId ? <Link to={`/projects/${open.projectId}`}>{open.projectName}</Link> : "—"}</dd></div>
              <div><dt>Issued</dt><dd>{formatDate(open.issueDate, { year: true })}</dd></div>
              <div><dt>Due</dt><dd>{formatDate(open.dueDate, { year: true })}</dd></div>
              <div><dt>Paid</dt><dd>{formatDate(open.paidDate, { year: true })}</dd></div>
              <div><dt>Created by</dt><dd>{open.createdByName}</dd></div>
            </dl>
            {open.notes && <MultilineText text={open.notes} />}
          </div>
        )}
      </Modal>
      {editor.element}
    </div>
  );
}
