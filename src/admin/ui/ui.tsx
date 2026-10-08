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
import { Ellipsis, Trash2, X } from "lucide-react";
import { initials, label } from "../lib/format";
import { sfx } from "../lib/sound";
import FuseButton from "./micro/FuseButton";
import HoldButton from "./micro/HoldButton";
import RubberSegment from "./micro/RubberSegment";
import SwipeToast from "./micro/SwipeToast";
import WarmTooltip from "./micro/WarmTooltip";

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
  /* the label shows as a warm tooltip, so there is no native title to double it */
  return (
    <WarmTooltip content={text} side="bottom" size="sm">
      <button
        type="button"
        className={`icon-btn ${className}`}
        aria-label={text}
        {...props}
      >
        <IconComponent size={16} aria-hidden />
      </button>
    </WarmTooltip>
  );
}

export type Tone = "neutral" | "green" | "blue" | "amber" | "red" | "violet";

const TONES: Record<string, Tone> = {
  new: 'amber', contacted: 'blue', converted: 'green', archived: 'neutral',
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
  /* active, idle or offline: draws a presence dot. The dot is decorative, so
     anywhere it appears the state is also written out for screen readers. */
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

/* A shimmering outline of what is about to appear, shaped like the page that
   uses it, so the layout doesn't jump when the data lands. Screen readers
   hear the label; the shapes are decorative. */
export type SkeletonVariant =
  | "list"
  | "cards"
  | "table"
  | "board"
  | "dashboard"
  | "detail"
  | "form"
  | "chat"
  | "lines";

export function Loading({
  label: text = "Loading",
  variant = "list",
}: {
  label?: string;
  variant?: SkeletonVariant;
}) {
  return (
    <div className={`skeleton skeleton-${variant}`} role="status" aria-live="polite">
      <span className="sr-only">{text}…</span>
      <SkeletonShapes variant={variant} />
    </div>
  );
}

const bar = (width: string, className = "") => (
  <span className={`sk-bar ${className}`} style={{ width }} />
);

function SkeletonShapes({ variant }: { variant: SkeletonVariant }) {
  switch (variant) {
    case "cards":
      return (
        <div className="sk-grid" aria-hidden="true">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div className="sk-card" key={i}>
              <span className="sk-circle sk-lg" />
              {bar("60%", "sk-title")}
              {bar("40%")}
              {bar("80%")}
            </div>
          ))}
        </div>
      );
    case "table":
      return (
        <div className="sk-table" aria-hidden="true">
          <div className="sk-row sk-head">
            {bar("18%")}
            {bar("12%")}
            {bar("14%")}
            {bar("10%")}
          </div>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div className="sk-row" key={i}>
              <span className="sk-cell-main">
                {bar(`${55 + ((i * 13) % 35)}%`, "sk-title")}
                {bar("35%")}
              </span>
              {bar("12%")}
              {bar("14%")}
              {bar("8%")}
            </div>
          ))}
        </div>
      );
    case "board":
      return (
        <div className="sk-board" aria-hidden="true">
          {[3, 2, 1].map((count, c) => (
            <div className="sk-column" key={c}>
              {bar("45%", "sk-title")}
              {Array.from({ length: count }, (_, i) => (
                <div className="sk-card" key={i}>
                  {bar("75%", "sk-title")}
                  {bar("40%")}
                </div>
              ))}
            </div>
          ))}
        </div>
      );
    case "dashboard":
      return (
        <div className="sk-dashboard" aria-hidden="true">
          {bar("120px")}
          {bar("min(340px, 70%)", "sk-heading")}
          <div className="sk-stats">
            {[0, 1, 2, 3].map((i) => (
              <div className="sk-card" key={i}>
                {bar("50%")}
                {bar("30%", "sk-number")}
                {bar("65%")}
              </div>
            ))}
          </div>
          <div className="sk-panels">
            {[0, 1, 2, 3].map((i) => (
              <div className="sk-card sk-panel" key={i}>
                {bar("40%", "sk-title")}
                {[0, 1, 2].map((j) => (
                  <span className="sk-line" key={j}>
                    <span className="sk-circle" />
                    {bar(`${50 + ((i + j) * 11) % 40}%`)}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      );
    case "detail":
      return (
        <div className="sk-detail" aria-hidden="true">
          {bar("90px")}
          {bar("min(420px, 80%)", "sk-heading")}
          {bar("min(260px, 60%)")}
          {bar("100%", "sk-progress")}
          <div className="sk-tabs">
            {bar("70px")}
            {bar("60px")}
            {bar("80px")}
          </div>
          <div className="sk-card sk-panel">
            {[0, 1, 2, 3].map((j) => (
              <span className="sk-line" key={j}>
                <span className="sk-box" />
                {bar(`${45 + j * 12}%`)}
              </span>
            ))}
          </div>
        </div>
      );
    case "form":
      return (
        <div className="sk-card sk-panel sk-form" aria-hidden="true">
          {bar("30%", "sk-title")}
          {[0, 1, 2, 3].map((i) => (
            <span className="sk-field" key={i}>
              {bar("22%")}
              {bar("100%", "sk-input")}
            </span>
          ))}
        </div>
      );
    case "chat":
      return (
        <div className="sk-chat" aria-hidden="true">
          {[0, 1, 2, 3, 4].map((i) => (
            <span className={`sk-message ${i % 3 === 2 ? "is-mine" : ""}`} key={i}>
              <span className="sk-circle" />
              <span className="sk-bubble">
                {bar("30%")}
                {bar(`${45 + ((i * 17) % 45)}%`)}
              </span>
            </span>
          ))}
        </div>
      );
    case "lines":
      return (
        <div className="sk-lines" aria-hidden="true">
          {bar("70%")}
          {bar("90%")}
          {bar("55%")}
        </div>
      );
    default:
      return (
        <div className="sk-list" aria-hidden="true">
          {[0, 1, 2, 3, 4].map((i) => (
            <div className="sk-card sk-item" key={i}>
              <span className="sk-circle" />
              <span className="sk-cell-main">
                {bar(`${40 + ((i * 19) % 40)}%`, "sk-title")}
                {bar(`${25 + ((i * 7) % 30)}%`)}
              </span>
              {bar("64px", "sk-pill")}
            </div>
          ))}
        </div>
      );
  }
}

/* The whole workspace frame, for the moment between opening the app and
   knowing who is signed in. */
export function ShellSkeleton() {
  return (
    <div className="shell skeleton-shell" role="status" aria-live="polite">
      <span className="sr-only">Loading ZXENO HQ…</span>
      <aside className="sidebar sk-sidebar" aria-hidden="true">
        {bar("120px", "sk-title")}
        {[0, 1, 2].map((g) => (
          <div className="sk-nav-group" key={g}>
            {bar("60px")}
            {[0, 1, 2, 3].map((i) => (
              <span className="sk-line" key={i}>
                <span className="sk-box" />
                {bar(`${45 + ((g + i) * 9) % 35}%`)}
              </span>
            ))}
          </div>
        ))}
      </aside>
      <main className="content">
        <div className="page">
          <SkeletonShapes variant="dashboard" />
        </div>
      </main>
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
  /* a sliding segmented control; the bar scrolls sideways on narrow screens */
  return (
    <div className="segment-bar">
      <RubberSegment
        aria-label={text}
        value={value}
        onChange={(next) => onChange(next as T)}
        equalSlots={false}
        items={tabs.map((tab) => ({
          value: tab.value,
          label: (
            <>
              {tab.label}
              {tab.count !== undefined && <span className="tab-count">{tab.count}</span>}
            </>
          ),
        }))}
      />
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
/* An optional button on a toast, e.g. "Undo". */
type ToastAction = { label: string; onAction: () => void };
/* a second line, an icon, and how long it stays (ms) */
type ToastExtra = { description?: string; icon?: ReactNode; duration?: number; silent?: boolean };
type Ui = {
  toast: (message: string, tone?: "success" | "error", action?: ToastAction, extra?: ToastExtra) => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
};
const UiContext = createContext<Ui | null>(null);

export function UiProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<
    { id: number; message: string; tone: "success" | "error"; action?: ToastAction; extra?: ToastExtra }[]
  >([]);
  const [pending, setPending] = useState<
    (ConfirmOptions & { resolve: (ok: boolean) => void }) | null
  >(null);

  /* each toast burns down its own fuse and can be swiped away; it removes
     itself from the list once it has finished leaving */
  const toast = useCallback<Ui["toast"]>((message, tone = "success", action, extra) => {
    const id = Date.now() + Math.random();
    if (!extra?.silent) (tone === "error" ? sfx.error : sfx.success)();
    setToasts((list) => [...list.slice(-2), { id, message, tone, action, extra }]);
  }, []);
  const dismiss = useCallback((id: number) => {
    setToasts((list) => list.filter((t) => t.id !== id));
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
      <div className="toasts">
        {toasts.map((t) => (
          <SwipeToast
            key={t.id}
            inline
            title={t.message}
            description={t.extra?.description}
            icon={t.extra?.icon}
            closeButton={!!t.extra?.description}
            className={`toast-${t.tone}`}
            background={t.tone === "error" ? "var(--red)" : "var(--text)"}
            color={t.tone === "error" ? "var(--card)" : "var(--bg)"}
            fuseColor={t.tone === "error" ? "var(--card)" : "var(--accent)"}
            duration={t.extra?.duration ?? (t.tone === "error" ? 6000 : 4000)}
            width={360}
            actionLabel={t.action?.label}
            onAction={t.action?.onAction}
            onClose={() => dismiss(t.id)}
          />
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
            {pending?.danger ? (
              /* destructive: press and hold, so it can't happen on a stray click */
              <HoldButton
                size="sm"
                holdTime={900}
                resetAfter={0}
                icon={<Trash2 size={14} aria-hidden />}
                doneLabel={pending.confirmLabel ?? "Confirm"}
                onHold={() => settle(true)}
              >
                Hold to {(pending.confirmLabel ?? "confirm").toLowerCase()}
              </HoldButton>
            ) : (
              <Button variant="primary" onClick={() => settle(true)} autoFocus>
                {pending?.confirmLabel ?? "Confirm"}
              </Button>
            )}
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

/* Delete and archive buttons that act after a short undo window: press it and
   a fuse burns around the button while it offers "Undo"; when the fuse runs
   out the action happens. Escape also undoes. Leaving the page while the fuse
   burns lets the action happen rather than dropping it. */
export function FuseAction({
  label,
  doneLabel,
  icon: IconComponent = Trash2,
  tone = "danger",
  size = "md",
  disabled,
  onCommit,
}: {
  label: string;
  doneLabel: string;
  icon?: Icon;
  tone?: "danger" | "neutral";
  size?: "sm" | "md";
  disabled?: boolean;
  onCommit: () => void;
}) {
  return (
    <FuseButton
      label={label}
      doneLabel={doneLabel}
      undoLabel="Undo"
      icon={<IconComponent size={size === "sm" ? 14 : 16} aria-hidden />}
      size={size}
      commitOn="fuseEnd"
      undoWindow={4000}
      color={tone === "danger" ? "var(--red)" : "var(--text)"}
      fuseColor={tone === "danger" ? "var(--red)" : "var(--amber)"}
      background="var(--card)"
      className={`fuse-${tone}`}
      disabled={disabled}
      onCommit={onCommit}
    />
  );
}
