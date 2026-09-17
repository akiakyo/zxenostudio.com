/* Declarative forms: each section lists its fields once and FormModal renders,
   collects and submits them. Empty inputs are sent as "", which the API stores
   as blank text or no value. */
import { useEffect, useId, useState, type FormEvent } from "react";
import { useWorkspace } from "../lib/workspace";
import { Button, Modal } from "./ui";

export type FieldDef = {
  name: string;
  label: string;
  type:
    | "text"
    | "textarea"
    | "date"
    | "number"
    | "money"
    | "email"
    | "tel"
    | "url"
    | "select"
    | "checkbox"
    | "range"
    | "member"
    | "members"
    | "project"
    | "client";
  required?: boolean;
  options?: { value: string; label: string }[];
  placeholder?: string;
  hint?: string;
  wide?: boolean;
  rows?: number;
  /* no "None" choice for selects that must have a value */
  noEmpty?: boolean;
};

export type FormValues = Record<string, any>;

function initialValues(fields: FieldDef[], initial: FormValues): FormValues {
  const values: FormValues = {};
  for (const field of fields) {
    const value = initial[field.name];
    if (field.type === "checkbox") values[field.name] = !!value;
    else if (field.type === "members") values[field.name] = value ?? [];
    else if (field.type === "range") values[field.name] = value ?? 0;
    else if (field.type === "select" && field.noEmpty) {
      values[field.name] = value ?? field.options?.[0]?.value ?? "";
    } else values[field.name] = value ?? "";
  }
  return values;
}

export function FormModal({
  open,
  title,
  fields,
  initial = {},
  submitLabel = "Save",
  onClose,
  onSubmit,
  size = "md",
}: {
  open: boolean;
  title: string;
  fields: FieldDef[];
  initial?: FormValues;
  submitLabel?: string;
  onClose: () => void;
  onSubmit: (values: FormValues) => Promise<unknown>;
  size?: "sm" | "md" | "lg";
}) {
  const formId = useId();
  const [values, setValues] = useState<FormValues>(() =>
    initialValues(fields, initial),
  );
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setValues(initialValues(fields, initial));
      setError("");
    }
    // reset only when the dialog opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await onSubmit(values);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      title={title}
      onClose={onClose}
      size={size}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" form={formId} disabled={saving}>
            {saving ? "Saving…" : submitLabel}
          </Button>
        </>
      }
    >
      <form id={formId} className="form-grid" onSubmit={submit} noValidate={false}>
        {fields.map((field) => (
          <FieldInput
            key={field.name}
            field={field}
            value={values[field.name]}
            onChange={(value) =>
              setValues((current) => ({ ...current, [field.name]: value }))
            }
          />
        ))}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
      </form>
    </Modal>
  );
}

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: FieldDef;
  value: any;
  onChange: (value: any) => void;
}) {
  const { team, projects, clients } = useWorkspace();
  const id = useId();
  const wide =
    field.wide || field.type === "textarea" || field.type === "members";
  const common = {
    id,
    required: field.required,
    placeholder: field.placeholder,
  };

  let control;
  switch (field.type) {
    case "textarea":
      control = (
        <textarea
          {...common}
          rows={field.rows ?? 4}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      );
      break;
    case "checkbox":
      return (
        <label className={`field field-check ${wide ? "field-wide" : ""}`}>
          <input
            type="checkbox"
            checked={value}
            onChange={(e) => onChange(e.target.checked)}
          />
          <span>
            {field.label}
            {field.hint && <small>{field.hint}</small>}
          </span>
        </label>
      );
    case "range":
      control = (
        <div className="range-row">
          <input
            {...common}
            type="range"
            min={0}
            max={100}
            step={5}
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
          />
          <output htmlFor={id}>{value}%</output>
        </div>
      );
      break;
    case "select":
    case "member":
    case "project":
    case "client": {
      const choices =
        field.type === "member"
          ? team.map((m) => ({ value: m.username, label: m.name || m.username }))
          : field.type === "project"
            ? projects.map((p) => ({ value: p.id, label: p.name }))
            : field.type === "client"
              ? clients.map((c) => ({
                  value: c.id,
                  label: c.company ? `${c.name} · ${c.company}` : c.name,
                }))
              : (field.options ?? []);
      /* keep a current value selectable even if it is no longer listed
         (an archived project, say) */
      const missing =
        value && !choices.some((c) => c.value === value)
          ? [{ value, label: "Current selection" }]
          : [];
      control = (
        <select
          {...common}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          {!field.noEmpty && (
            <option value="">
              {field.type === "member" ? "Unassigned" : "None"}
            </option>
          )}
          {[...missing, ...choices].map((choice) => (
            <option key={choice.value} value={choice.value}>
              {choice.label}
            </option>
          ))}
        </select>
      );
      break;
    }
    case "members":
      return (
        <fieldset className="field field-wide">
          <legend>{field.label}</legend>
          <div className="member-picks">
            {team.map((member) => {
              const checked = (value as string[]).includes(member.username);
              return (
                <label key={member.username} className={checked ? "is-on" : ""}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) =>
                      onChange(
                        e.target.checked
                          ? [...value, member.username]
                          : (value as string[]).filter(
                              (u) => u !== member.username,
                            ),
                      )
                    }
                  />
                  {member.name || member.username}
                </label>
              );
            })}
          </div>
        </fieldset>
      );
    default:
      control = (
        <input
          {...common}
          type={
            field.type === "money"
              ? "number"
              : field.type === "tel"
                ? "tel"
                : field.type
          }
          step={field.type === "money" ? "0.01" : undefined}
          min={field.type === "money" || field.type === "number" ? 0 : undefined}
          inputMode={field.type === "money" ? "decimal" : undefined}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      );
  }

  return (
    <div className={`field ${wide ? "field-wide" : ""}`}>
      <label htmlFor={id}>
        {field.label}
        {field.required && <span aria-hidden="true"> *</span>}
      </label>
      {control}
      {field.hint && <small>{field.hint}</small>}
    </div>
  );
}
