import { useState, type FormEvent } from "react";
import { ListChecks, Plus, X } from "lucide-react";
import { del, patch, post, useApi } from "../lib/api";
import SpringCheck from "./micro/SpringCheck";
import { Button, IconButton, Progress, useAction } from "./ui";

type Item = { id: string; taskId: string; title: string; done: boolean; position: number };

/* The checklist inside a task's dialog. On a saved task every tick, add and
   remove goes straight to the server; on a task still being created the
   items wait in `draft` and are saved with it. */
export function TaskChecklist({
  taskId,
  draft,
  onDraftChange,
  onChanged,
}: {
  taskId?: string;
  draft: string[];
  onDraftChange: (draft: string[]) => void;
  onChanged: () => void;
}) {
  const { data, setData, error, reload } = useApi<Item[]>(
    taskId ? `task-checklist?taskId=${taskId}` : null,
  );
  const run = useAction();
  const [text, setText] = useState("");
  const [adding, setAdding] = useState(false);

  const items: { key: string; title: string; done: boolean; item?: Item }[] = taskId
    ? (data ?? []).map((item) => ({ key: item.id, title: item.title, done: item.done, item }))
    : draft.map((title, i) => ({ key: `draft-${i}`, title, done: false }));
  const done = items.filter((i) => i.done).length;

  async function add(event: FormEvent) {
    event.preventDefault();
    const title = text.trim();
    if (!title) return;
    if (!taskId) {
      onDraftChange([...draft, title]);
      setText("");
      return;
    }
    setAdding(true);
    const item = await run(() => post<Item>("task-checklist", { taskId, title }));
    setAdding(false);
    if (item) {
      setData([...(data ?? []), item]);
      setText("");
      onChanged();
    }
  }

  async function toggle(item: Item) {
    /* tick it straight away; put it back if the server says no */
    setData((data ?? []).map((i) => (i.id === item.id ? { ...i, done: !i.done } : i)));
    const saved = await run(() => patch<Item>(`task-checklist?id=${item.id}`, { done: !item.done }));
    if (!saved) reload();
    else onChanged();
  }

  async function remove(key: string, item?: Item) {
    if (!item) {
      onDraftChange(draft.filter((_, i) => `draft-${i}` !== key));
      return;
    }
    setData((data ?? []).filter((i) => i.id !== item.id));
    if (await run(() => del(`task-checklist?id=${item.id}`))) onChanged();
    else reload();
  }

  return (
    <section className="checklist" aria-label="Checklist">
      <div className="checklist-head">
        <h3>
          <ListChecks size={16} aria-hidden /> Checklist
        </h3>
        {items.length > 0 && (
          <span className="muted">
            {done} of {items.length} done
          </span>
        )}
      </div>
      {items.length > 0 && <Progress value={(done / items.length) * 100} />}
      {error && <p className="form-error">{error}</p>}
      {items.length > 0 && (
        <ul className="checklist-items">
          {items.map(({ key, title, done: checked, item }) => (
            <li key={key}>
              <SpringCheck
                label={title}
                checked={checked}
                disabled={!item}
                onChange={() => item && toggle(item)}
                boxSize={20}
                boxRadius={6}
                fontSize={14}
              />
              <IconButton icon={X} label={`Remove "${title}"`} onClick={() => remove(key, item)} />
            </li>
          ))}
        </ul>
      )}
      {!taskId && draft.length > 0 && (
        <p className="hint">These are saved with the task.</p>
      )}
      <form className="checklist-add" onSubmit={add}>
        <label className="sr-only" htmlFor={`checklist-${taskId ?? "new"}`}>
          Add a checklist item
        </label>
        <input
          id={`checklist-${taskId ?? "new"}`}
          value={text}
          maxLength={200}
          placeholder="Add an item, then press Enter"
          onChange={(e) => setText(e.target.value)}
        />
        <Button type="submit" size="sm" icon={Plus} disabled={adding || !text.trim()}>
          Add
        </Button>
      </form>
    </section>
  );
}

/* "2/5" beside a task in lists and on the board. */
export function ChecklistCount({ done, total }: { done?: number; total?: number }) {
  if (!total) return null;
  return (
    <span className={`checklist-count ${done === total ? "is-complete" : ""}`} title={`${done} of ${total} checklist items done`}>
      <ListChecks size={12} aria-hidden />
      {done}/{total}
      <span className="sr-only"> checklist items done</span>
    </span>
  );
}
