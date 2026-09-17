/* The create/edit dialog for each kind of record, shared by every page that
   offers "New …" or "Edit" for it (a task can be added from My tasks, the
   board, a project or the dashboard, and should look the same everywhere). */
import { useState } from "react";
import { patch, post } from "../lib/api";
import { options, todayIso, weekStart } from "../lib/format";
import { useWorkspace } from "../lib/workspace";
import { FormModal, type FieldDef, type FormValues } from "./form";
import { useUi } from "./ui";

type Config = {
  resource: string;
  noun: string;
  fields: FieldDef[] | ((editing: boolean) => FieldDef[]);
  size?: "sm" | "md" | "lg";
  /* lookups to refresh after saving (projects and clients feed other forms) */
  refreshLookups?: boolean;
  prepare?: (values: FormValues, editing: boolean) => FormValues;
};

export function useEditor<T extends { id: string }>(
  config: Config,
  onSaved?: (row: T, created: boolean) => void,
) {
  const { toast } = useUi();
  const { reloadLookups } = useWorkspace();
  const [state, setState] = useState<{
    open: boolean;
    row?: T;
    preset?: FormValues;
  }>({ open: false });

  const editing = !!state.row;
  const fields =
    typeof config.fields === "function" ? config.fields(editing) : config.fields;

  const element = (
    <FormModal
      open={state.open}
      title={editing ? `Edit ${config.noun}` : `New ${config.noun}`}
      submitLabel={editing ? "Save changes" : `Create ${config.noun}`}
      fields={fields}
      size={config.size}
      initial={(state.row as FormValues | undefined) ?? state.preset ?? {}}
      onClose={() => setState((s) => ({ ...s, open: false }))}
      onSubmit={async (values) => {
        const body = config.prepare ? config.prepare(values, editing) : values;
        const saved = state.row
          ? await patch<T>(`${config.resource}?id=${state.row.id}`, body)
          : await post<T>(config.resource, body);
        toast(editing ? "Saved" : `${capitalize(config.noun)} created`);
        if (config.refreshLookups) reloadLookups();
        onSaved?.(saved, !editing);
      }}
    />
  );

  return {
    openNew: (preset: FormValues = {}) => setState({ open: true, preset }),
    openEdit: (row: T) => setState({ open: true, row }),
    element,
  };
}

const capitalize = (text: string) => text[0].toUpperCase() + text.slice(1);

export const PROJECT_FIELDS: FieldDef[] = [
  { name: "name", label: "Project name", type: "text", required: true, wide: true },
  { name: "clientId", label: "Client", type: "client" },
  {
    name: "status",
    label: "Status",
    type: "select",
    noEmpty: true,
    options: options(["planning", "active", "on_hold", "review", "completed"]),
  },
  { name: "startDate", label: "Start date", type: "date" },
  { name: "dueDate", label: "Due date", type: "date" },
  { name: "progress", label: "Progress", type: "range", wide: true },
  { name: "description", label: "Description", type: "textarea" },
];

export function useProjectEditor(onSaved?: (row: any, created: boolean) => void) {
  return useEditor(
    { resource: "projects", noun: "project", fields: PROJECT_FIELDS, refreshLookups: true },
    onSaved,
  );
}

export function taskFields(privateTask: boolean): FieldDef[] {
  return [
    { name: "title", label: "Task", type: "text", required: true, wide: true },
    ...(privateTask
      ? []
      : ([
          { name: "assignee", label: "Assignee", type: "member" },
          { name: "projectId", label: "Project", type: "project" },
        ] as FieldDef[])),
    {
      name: "status",
      label: "Status",
      type: "select",
      noEmpty: true,
      options: options(["todo", "in_progress", "done"]),
    },
    {
      name: "priority",
      label: "Priority",
      type: "select",
      noEmpty: true,
      options: options(["low", "medium", "high", "urgent"]),
    },
    { name: "dueDate", label: "Due date", type: "date" },
    { name: "description", label: "Details", type: "textarea", rows: 3 },
  ];
}

export function useTaskEditor(
  privateTask: boolean,
  onSaved?: (row: any, created: boolean) => void,
) {
  return useEditor(
    {
      resource: "tasks",
      noun: privateTask ? "private task" : "task",
      fields: taskFields(privateTask),
      prepare: (values, editing) =>
        privateTask && !editing ? { ...values, isPrivate: true } : values,
    },
    onSaved,
  );
}

export const INVOICE_FIELDS: FieldDef[] = [
  { name: "title", label: "Description", type: "text", required: true, wide: true },
  { name: "amount", label: "Amount (₱)", type: "money", required: true },
  {
    name: "status",
    label: "Status",
    type: "select",
    noEmpty: true,
    options: options(["draft", "sent", "paid", "void"]),
  },
  { name: "projectId", label: "Project", type: "project" },
  {
    name: "clientId",
    label: "Client",
    type: "client",
    hint: "Left empty, the project's client is used.",
  },
  { name: "issueDate", label: "Issue date", type: "date", hint: "Defaults to today." },
  { name: "dueDate", label: "Due date", type: "date" },
  {
    name: "number",
    label: "Invoice number",
    type: "text",
    placeholder: "Automatic, e.g. ZX-2026-001",
  },
  { name: "paidDate", label: "Paid date", type: "date" },
  { name: "notes", label: "Notes", type: "textarea", rows: 3 },
];

export function useInvoiceEditor(onSaved?: (row: any, created: boolean) => void) {
  return useEditor(
    { resource: "invoices", noun: "invoice", fields: INVOICE_FIELDS },
    onSaved,
  );
}

export const CLIENT_FIELDS: FieldDef[] = [
  { name: "name", label: "Client name", type: "text", required: true },
  { name: "company", label: "Company", type: "text" },
  { name: "email", label: "Email", type: "email" },
  { name: "phone", label: "Phone number", type: "tel" },
  { name: "notes", label: "Notes", type: "textarea" },
];

export function useClientEditor(onSaved?: (row: any, created: boolean) => void) {
  return useEditor(
    { resource: "clients", noun: "client", fields: CLIENT_FIELDS, refreshLookups: true },
    onSaved,
  );
}

export const MEETING_NOTE_FIELDS: FieldDef[] = [
  { name: "title", label: "Title", type: "text", required: true, wide: true },
  { name: "meetingDate", label: "Meeting date", type: "date", required: true },
  { name: "projectId", label: "Project", type: "project" },
  { name: "attendees", label: "Attendees", type: "members" },
  {
    name: "body",
    label: "Notes",
    type: "textarea",
    rows: 10,
    placeholder: "Agenda, decisions, action items…",
  },
];

export function useMeetingNoteEditor(onSaved?: (row: any, created: boolean) => void) {
  return useEditor(
    { resource: "meeting-notes", noun: "meeting note", fields: MEETING_NOTE_FIELDS, size: "lg" },
    onSaved,
  );
}

export const STATUS_UPDATE_FIELDS: FieldDef[] = [
  { name: "weekOf", label: "Week of", type: "date", required: true, hint: "The Monday of the week." },
  { name: "projectId", label: "Project", type: "project", hint: "Leave empty for a general update." },
  { name: "done", label: "Done this week", type: "textarea", required: true, rows: 4 },
  { name: "next", label: "Plan for next week", type: "textarea", rows: 3 },
  { name: "blockers", label: "Blockers", type: "textarea", rows: 2 },
];

export function useStatusUpdateEditor(onSaved?: (row: any, created: boolean) => void) {
  const editor = useEditor(
    { resource: "status-updates", noun: "weekly update", fields: STATUS_UPDATE_FIELDS, size: "lg" },
    onSaved,
  );
  return {
    ...editor,
    openNew: (preset: FormValues = {}) =>
      editor.openNew({ weekOf: weekStart(todayIso()), ...preset }),
  };
}

export const ASSET_FIELDS: FieldDef[] = [
  { name: "name", label: "Name", type: "text", required: true, wide: true },
  {
    name: "url",
    label: "Link",
    type: "url",
    required: true,
    wide: true,
    placeholder: "https://drive.google.com/…",
    hint: "Google Drive, Dropbox, Frame.io or any shareable link.",
  },
  {
    name: "kind",
    label: "Type",
    type: "select",
    noEmpty: true,
    options: options(["image", "video", "document", "3d", "audio", "design", "other"]),
  },
  { name: "projectId", label: "Project", type: "project" },
  { name: "tags", label: "Tags", type: "text", wide: true, placeholder: "logo, final, 4k" },
  { name: "description", label: "Description", type: "textarea", rows: 3 },
];

export function useAssetEditor(onSaved?: (row: any, created: boolean) => void) {
  return useEditor({ resource: "assets", noun: "asset", fields: ASSET_FIELDS }, onSaved);
}

export const ANNOUNCEMENT_FIELDS: FieldDef[] = [
  { name: "title", label: "Title", type: "text", required: true, wide: true },
  { name: "body", label: "Message", type: "textarea", required: true, rows: 6 },
  { name: "pinned", label: "Pin to the top", type: "checkbox", wide: true },
];

export const BRIEF_FIELDS: FieldDef[] = [
  { name: "title", label: "Brief title", type: "text", required: true, wide: true },
  { name: "clientId", label: "Client", type: "client" },
  { name: "projectId", label: "Project", type: "project" },
  {
    name: "status",
    label: "Status",
    type: "select",
    noEmpty: true,
    options: options(["draft", "in_review", "approved"]),
  },
  { name: "dueDate", label: "Due date", type: "date" },
  { name: "budget", label: "Budget (₱)", type: "money" },
  { name: "tone", label: "Tone & style", type: "text", placeholder: "Bold, cinematic, playful…" },
  { name: "objective", label: "Objective", type: "textarea", rows: 3, placeholder: "What should this work achieve?" },
  { name: "audience", label: "Target audience", type: "textarea", rows: 2 },
  { name: "keyMessage", label: "Key message", type: "textarea", rows: 2 },
  { name: "deliverables", label: "Deliverables", type: "textarea", rows: 3, placeholder: "One per line: 30s reel, 3 stills…" },
  { name: "referenceNotes", label: "References", type: "textarea", rows: 3, placeholder: "Links and notes on look and feel" },
];

export function feedbackFields(assets: { value: string; label: string }[]): FieldDef[] {
  return [
    { name: "title", label: "Title", type: "text", required: true, wide: true },
    { name: "projectId", label: "Project", type: "project" },
    { name: "assetId", label: "Asset", type: "select", options: assets },
    {
      name: "status",
      label: "Status",
      type: "select",
      noEmpty: true,
      options: options(["open", "in_progress", "resolved"]),
    },
    { name: "body", label: "Feedback", type: "textarea", rows: 5 },
  ];
}
