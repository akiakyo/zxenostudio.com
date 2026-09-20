/* Dates in the workspace are plain YYYY-MM-DD strings in Manila time. */
export function todayIso(offsetDays = 0): string {
  const date = new Date(Date.now() + offsetDays * 86_400_000);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function parseIso(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function toIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function addDays(iso: string, days: number): string {
  const date = parseIso(iso);
  date.setDate(date.getDate() + days);
  return toIso(date);
}

export function daysBetween(fromIso: string, toIsoDate: string): number {
  return Math.round(
    (parseIso(toIsoDate).getTime() - parseIso(fromIso).getTime()) / 86_400_000,
  );
}

/* Monday of the week containing the date. */
export function weekStart(iso: string): string {
  const date = parseIso(iso);
  const shift = (date.getDay() + 6) % 7;
  return addDays(iso, -shift);
}

export function formatDate(
  iso: string | null | undefined,
  options: { weekday?: boolean; year?: boolean } = {},
): string {
  if (!iso) return "—";
  const date = parseIso(iso);
  const sameYear = iso.slice(0, 4) === todayIso().slice(0, 4);
  return date.toLocaleDateString("en-PH", {
    weekday: options.weekday ? "short" : undefined,
    month: "short",
    day: "numeric",
    year: options.year || !sameYear ? "numeric" : undefined,
  });
}

/* "Today", "Tomorrow", "in 3 days", "2 days ago" */
export function relativeDay(iso: string | null | undefined): string {
  if (!iso) return "No date";
  const diff = daysBetween(todayIso(), iso);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  if (diff > 1 && diff < 7) return `In ${diff} days`;
  if (diff < -1 && diff > -30) return `${-diff} days ago`;
  return formatDate(iso);
}

export function timeAgo(timestamp: string): string {
  const seconds = (Date.now() - new Date(timestamp).getTime()) / 1000;
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86_400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604_800) return `${Math.floor(seconds / 86_400)}d ago`;
  return new Date(timestamp).toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(timestamp: string): string {
  return new Date(timestamp).toLocaleString("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

const peso = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 2,
});

export function money(amount: number | null | undefined): string {
  return amount === null || amount === undefined ? "—" : peso.format(amount);
}

export function initials(name: string, fallback = "?"): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return fallback;
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : ""))
    .toUpperCase();
}

export const LABELS: Record<string, string> = {
  studio:'In studio',remote:'Remote',off:'Off',
  pending:'Pending', revision:'Needs revision', declined:'Declined', cancelled:'Cancelled',
  event:'Event', meeting:'Meeting', shoot:'Shoot', internal:'Internal', deadline:'Deadline',
  lead:'Lead', discovery:'Discovery', proposal:'Proposal', negotiation:'Negotiation', won:'Won', lost:'Lost',
  onboarding:'Onboarding', paused:'Paused', in_house:'In-house',
  planning: "Planning",
  active: "Active",
  on_hold: "On hold",
  review: "In review",
  completed: "Completed",
  todo: "To do",
  in_progress: "In progress",
  done: "Done",
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
  draft: "Draft",
  sent: "Sent",
  paid: "Paid",
  void: "Void",
  open: "Open",
  resolved: "Resolved",
  in_review: "In review",
  approved: "Approved",
  image: "Image",
  video: "Video",
  document: "Document",
  "3d": "3D",
  audio: "Audio",
  design: "Design",
  other: "Other",
  executive: "Executive",
  member: "Member",
  project: "Project due",
  milestone: "Milestone",
  task: "Task",
  invoice: "Invoice",
};

export const label = (value: string) => LABELS[value] ?? value;

export const WORK_STATUS: Record<string, string> = {
  studio: "In studio",
  remote: "Remote",
  shoot: "On shoot",
  off: "Off",
};
export const workStatus = (value: string) => WORK_STATUS[value] ?? label(value);
/* matches the presence dot colours in admin.css */
export const WORK_TONES: Record<string, "green" | "blue" | "amber" | "neutral"> = {
  studio: "green",
  remote: "blue",
  shoot: "amber",
  off: "neutral",
};

export function options(values: readonly string[]) {
  return values.map((value) => ({ value, label: label(value) }));
}
