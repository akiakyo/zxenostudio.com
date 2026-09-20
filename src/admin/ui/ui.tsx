import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ComponentType,
  type ReactNode,
} from "react";
import { Ellipsis, X } from "lucide-react";
import { initials, label } from "../lib/format";

type Icon = ComponentType<{ size?: number; "aria-hidden"?: boolean }>;

export function Button({
  variant = "secondary",
  size = "md",
  icon: IconComponent,
  children,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
  icon?: Icon;
}) {
  return (
    <button
      type="button"
      className={`btn btn-${variant} btn-${size} ${className}`}
      {...props}
    >
      {IconComponent && <IconComponent size={size === "sm" ? 14 : 16} aria-hidden />}
      {children}
    </button>
  );
}

export function IconButton({
  icon: IconComponent,
  label: text,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { icon: Icon; label: string }) {
  return (
    <button
      type="button"
      className={`icon-btn ${className}`}
      aria-label={text}
      title={text}
      {...props}
    >
      <IconComponent size={16} aria-hidden />
    </button>
  );
}

export type Tone = "neutral" | "green" | "blue" | "amber" | "red" | "violet";

const TONES: Record<string, Tone> = {
  pending:'amber', revision:'amber', declined:'red', cancelled:'neutral', won:'green', lost:'red',
  planning: "violet",
  active: "green",
  on_hold: "amber",
  review: "blue",
  completed: "neutral",
  todo: "neutral",
  in_progress: "blue",
  done: "green",
  low: "neutral",
  medium: "blue",
  high: "amber",
  urgent: "red",
  draft: "neutral",
  sent: "blue",
  paid: "green",
  void: "neutral",
  open: "amber",
  resolved: "green",
  in_review: "blue",
  approved: "green",
  executive: "green",
  member: "neutral",
  overdue: "red",
};

export function Badge({
  tone = "neutral",
  children,
}: {
  tone?: Tone;
  children: ReactNode;
}) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

export function StatusBadge({ value }: { value: string }) {
  return <Badge tone={TONES[value] ?? "neutral"}>{label(value)}</Badge>;
}

export function Avatar({
  name,
  size = 32,
  status,
}: {
  name: string | null | undefined;
  size?: number;
  /* work status: draws a presence dot. The dot is decorative, so anywhere it
     appears the status is also written out for screen readers. */
  status?: string | null;
}) {
  const text = initials(name ?? "");
  /* a stable hue per person so the same member always reads the same */
  let hash = 0;
  for (const char of name ?? "") hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  const face = (
    <span
      className="avatar"
      style={{ width: size, height: size, fontSize: size * 0.38, ["--hue" as string]: hash % 360 }}
      aria-hidden="true"
    >
      {text}
    </span>
  );
  if (!status) return face;
  return (
    <span className="avatar-wrap" style={{ width: size, height: size }}>
      {face}
      <span className={`presence-dot is-${status}`} aria-hidden="true" />
    </span>
  );
}

/* A client's mark: their initials on their own brand colour when they have
   one recorded, otherwise the same stable hue trick the avatars use. */
export function ClientMark({
  name,
  palette,
  size = 32,
}: {
  name: string | null | undefined;
  palette?: string | null;
  size?: number;
}) {
  const text = (name ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
  const brand = (palette ?? "")
    .split(",")
    .map((value) => value.trim())
    .find((value) => /^#[0-9a-f]{6}$/i.test(value));
  let hash = 0;
  for (const char of name ?? "") hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  /* readable text on whatever colour the client picked */
  const ink = brand
    ? (parseInt(brand.slice(1, 3), 16) * 299 +
         parseInt(brand.slice(3, 5), 16) * 587 +
         parseInt(brand.slice(5, 7), 16) * 114) /
        1000 >
      140
      ? "#0f1e09"
      : "#ffffff"
    : undefined;
  return (
    <span
      className={`client-mark ${brand ? "has-brand" : ""}`}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.4,
        ...(brand ? { background: brand, color: ink } : { ["--hue" as string]: hash % 360 }),
      }}
      aria-hidden="true"
    >
      {text}
    </span>
  );
}

export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  eyebrow?: ReactNode;
}) {
  return (
    <header className="page-header">
      <div className="page-header-text">
        {eyebrow && <div className="page-eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </header>
  );
}

export function Panel({
  title,
  action,
  children,
  className = "",
}: {
  title?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`panel ${className}`}>
      {(title || action) && (
        <div className="panel-head">
          {title && <h2>{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function EmptyState({
  icon: IconComponent,
  title,
  children,
  action,
}: {
  icon?: Icon;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      {IconComponent && (
        <span className="empty-icon">
          <IconComponent size={22} aria-hidden />
        </span>
      )}
      <strong>{title}</strong>
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}

export function Loading({ label: text = "Loading" }: { label?: string }) {
  return (
    <div className="loading" role="status">
      <span className="spinner" aria-hidden="true" />
      {text}…
    </div>
  );
}

export function ErrorNote({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="error-note" role="alert">
      <span>{message}</span>
      {onRetry && (
        <Button size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

export function Progress({ value }: { value: number }) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div
      className="progress"
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <span style={{ width: `${clamped}%` }} />
    </div>
  );
}

export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
  label: text,
}: {
  tabs: { value: T; label: string; count?: number }[];
  value: T;
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div className="tabs" role="tablist" aria-label={text}>
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          role="tab"
          aria-selected={tab.value === value}
          onClick={() => onChange(tab.value)}
        >
          {tab.label}
          {tab.count !== undefined && <span className="tab-count">{tab.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function Modal({
  open,
  title,
  onClose,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  title: ReactNode;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);
  if (!open) return null;
  return (
    <dialog
      ref={ref}
      className={`modal modal-${size}`}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onMouseDown={(event) => {
        if (event.target === ref.current) onClose();
      }}
    >
      <div className="modal-inner">
        <div className="modal-head">
          <h2 id={titleId}>{title}</h2>
          <IconButton icon={X} label="Close" onClick={onClose} />
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </dialog>
  );
}

/* A "⋯" button that opens a short list of actions. */
export function Menu({
  label: text = "More actions",
  items,
}: {
  label?: string;
  items: ({
    label: string;
    icon?: Icon;
    onSelect: () => void;
    danger?: boolean;
  } | false | null | undefined)[];
}) {
  /* the list is placed against the viewport so tables and cards that scroll
     or clip their contents can't cut it off */
  const [position, setPosition] = useState<{ top?: number; bottom?: number; right: number } | null>(null);
  const open = position !== null;
  const setOpen = (next: boolean) => {
    if (!next || !ref.current) return setPosition(null);
    const rect = ref.current.getBoundingClientRect();
    const right = window.innerWidth - rect.right;
    setPosition(
      rect.bottom + 240 > window.innerHeight
        ? { bottom: window.innerHeight - rect.top + 4, right }
        : { top: rect.bottom + 4, right },
    );
  };
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (event: Event) => {
      if (!ref.current?.contains(event.target as Node)) setPosition(null);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPosition(null);
    };
    const dismiss = () => setPosition(null);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", escape);
    window.addEventListener("scroll", dismiss, true);
    window.addEventListener("resize", dismiss);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", escape);
      window.removeEventListener("scroll", dismiss, true);
      window.removeEventListener("resize", dismiss);
    };
  }, [open]);
  const visible = items.filter(Boolean) as Exclude<(typeof items)[number], false | null | undefined>[];
  if (!visible.length) return null;
  return (
    <div className="menu" ref={ref}>
      <IconButton
        icon={Ellipsis}
        label={text}
        aria-expanded={open}
        onClick={(event) => {
          event.stopPropagation();
          setOpen(!open);
        }}
      />
      {open && (
        <div className="menu-list" role="menu" style={position ?? undefined}>
          {visible.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              className={item.danger ? "is-danger" : ""}
              onClick={(event) => {
                event.stopPropagation();
                setOpen(false);
                item.onSelect();
              }}
            >
              {item.icon && <item.icon size={15} aria-hidden />}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* Toasts and confirmation prompts, available anywhere under UiProvider. */
type ConfirmOptions = {
  title: string;
  body?: ReactNode;
  confirmLabel?: string;
  danger?: boolean;
};
type Ui = {
  toast: (message: string, tone?: "success" | "error") => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
};
const UiContext = createContext<Ui | null>(null);

export function UiProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<
    { id: number; message: string; tone: "success" | "error" }[]
  >([]);
  const [pending, setPending] = useState<
    (ConfirmOptions & { resolve: (ok: boolean) => void }) | null
  >(null);

  const toast = useCallback<Ui["toast"]>((message, tone = "success") => {
    const id = Date.now() + Math.random();
    setToasts((list) => [...list.slice(-2), { id, message, tone }]);
    setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), 4000);
  }, []);

  const confirm = useCallback<Ui["confirm"]>(
    (options) =>
      new Promise<boolean>((resolve) => setPending({ ...options, resolve })),
    [],
  );

  function settle(ok: boolean) {
    pending?.resolve(ok);
    setPending(null);
  }

  return (
    <UiContext.Provider value={{ toast, confirm }}>
      {children}
      <div className="toasts" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.tone}`} role="status">
            {t.message}
          </div>
        ))}
      </div>
      <Modal
        open={!!pending}
        title={pending?.title ?? ""}
        onClose={() => settle(false)}
        size="sm"
        footer={
          <>
            <Button onClick={() => settle(false)}>Cancel</Button>
            <Button
              variant={pending?.danger ? "danger" : "primary"}
              onClick={() => settle(true)}
              autoFocus
            >
              {pending?.confirmLabel ?? "Confirm"}
            </Button>
          </>
        }
      >
        {pending?.body && <p className="confirm-body">{pending.body}</p>}
      </Modal>
    </UiContext.Provider>
  );
}

export function useUi(): Ui {
  const value = useContext(UiContext);
  if (!value) throw new Error("useUi outside UiProvider");
  return value;
}

/* Runs an action, toasting its error so callers need no try/catch. */
export function useAction() {
  const { toast } = useUi();
  return useCallback(
    async <T,>(action: () => Promise<T>, success?: string): Promise<T | undefined> => {
      try {
        const result = await action();
        if (success) toast(success);
        return result;
      } catch (error) {
        toast(error instanceof Error ? error.message : "Something went wrong", "error");
        return undefined;
      }
    },
    [toast],
  );
}

export function FilterBar({ children }: { children: ReactNode }) {
  return <div className="filter-bar">{children}</div>;
}

export function SelectFilter({
  label: text,
  value,
  onChange,
  options,
  allLabel,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  allLabel: string;
}) {
  return (
    <label className="select-filter">
      <span className="sr-only">{text}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">{allLabel}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Search",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="search-input">
      <span className="sr-only">{placeholder}</span>
      <input
        type="search"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

/* Debounces a value, for search boxes that query the API. */
export function useDebounced<T>(value: T, delay = 250): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export function MultilineText({ text }: { text: string }) {
  if (!text) return null;
  return <div className="multiline">{text}</div>;
}
