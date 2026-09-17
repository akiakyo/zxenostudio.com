import { Archive, ArchiveRestore, Pencil, Receipt, Trash2 } from "lucide-react";
import { del, patch } from "../lib/api";
import { navigate } from "../lib/router";
import type { Project } from "../lib/types";
import { useWorkspace } from "../lib/workspace";
import { useInvoiceEditor, useProjectEditor } from "../ui/editors";
import { useAction, useUi } from "../ui/ui";

/* Edit, New invoice, Archive / Restore and Delete for a project, shared by the
   project list, the project page and the archives. */
export function useProjectActions(
  onChanged: (project: Project | null) => void,
  onInvoiceCreated?: () => void,
) {
  const { isExecutive, reloadLookups } = useWorkspace();
  const run = useAction();
  const { confirm } = useUi();
  /* a new project opens its own page; an edit updates wherever it was made */
  const editor = useProjectEditor((row, created) =>
    created ? navigate(`/projects/${row.id}`) : onChanged(row),
  );
  const invoiceEditor = useInvoiceEditor(() => onInvoiceCreated?.());

  async function setArchived(project: Project, archived: boolean) {
    const updated = await run(
      () => patch<Project>(`projects?id=${project.id}`, { archived }),
      archived ? "Project archived" : "Project restored",
    );
    if (updated) {
      reloadLookups();
      onChanged(updated);
    }
  }

  async function remove(project: Project) {
    const ok = await confirm({
      title: `Delete ${project.name}?`,
      body: "Its milestones and tasks are deleted too. Invoices, assets and notes stay, unlinked from the project. This cannot be undone.",
      confirmLabel: "Delete project",
      danger: true,
    });
    if (ok && (await run(() => del(`projects?id=${project.id}`), "Project deleted"))) {
      reloadLookups();
      onChanged(null);
    }
  }

  function items(project: Project) {
    return [
      { label: "Edit", icon: Pencil, onSelect: () => editor.openEdit(project) },
      {
        label: "New invoice",
        icon: Receipt,
        onSelect: () =>
          invoiceEditor.openNew({ projectId: project.id, clientId: project.clientId ?? "", status: "draft" }),
      },
      project.archived
        ? { label: "Restore", icon: ArchiveRestore, onSelect: () => setArchived(project, false) }
        : { label: "Archive", icon: Archive, onSelect: () => setArchived(project, true) },
      isExecutive && { label: "Delete", icon: Trash2, danger: true, onSelect: () => remove(project) },
    ];
  }

  return {
    items,
    edit: editor.openEdit,
    newProject: editor.openNew,
    newInvoice: (project: Project) =>
      invoiceEditor.openNew({ projectId: project.id, clientId: project.clientId ?? "", status: "draft" }),
    setArchived,
    remove,
    canDelete: isExecutive,
    elements: (
      <>
        {editor.element}
        {invoiceEditor.element}
      </>
    ),
  };
}
