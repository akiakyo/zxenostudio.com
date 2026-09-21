export type Access = "executive" | "member";

export type Session = {
  username: string;
  expiresAt: number;
  mustChangePassword: boolean;
  name: string;
  title: string;
  access: Access;
};

/* how the workspace sees someone right now, worked out from their heartbeat */
export type Presence = "active" | "idle" | "offline";

export type Member = {
  department: string;
  workStatus: string;
  presence: Presence;
  username: string;
  name: string;
  title: string;
  access: Access;
  phone: string;
  /* only on your own profile */
  email?: string;
  bio: string;
  openTasks: number;
};

type Authored = {
  createdBy: string;
  createdByName: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Client = Authored & {
  activeProjectCount: number;
  status: string;
  owner: string | null;
  agreement: string;
  industry: string;
  palette: string;
  id: string;
  name: string;
  email: string;
  company: string;
  phone: string;
  notes: string;
  projectCount: number;
};

export type ProjectStatus =
  | "planning"
  | "active"
  | "on_hold"
  | "review"
  | "completed";

export type ProjectKind = "video" | "poster" | "web" | "doc" | "social" | "photo" | "other";

export type Project = Authored & {
  code: string;
  kind: ProjectKind;
  lead: string | null;
  team: string[];
  budget: number | null;
  spent: number;
  id: string;
  name: string;
  clientId: string | null;
  clientName: string | null;
  description: string;
  status: ProjectStatus;
  progress: number;
  startDate: string | null;
  dueDate: string | null;
  archived: boolean;
  archivedAt: string | null;
  taskCount: number;
  doneTaskCount: number;
  nextMilestone: string | null;
  overdue: boolean;
};

export type Milestone = Authored & {
  id: string;
  projectId: string;
  projectName: string;
  title: string;
  dueDate: string;
  done: boolean;
};

export type TaskStatus = "todo" | "in_progress" | "done";
export type Priority = "low" | "medium" | "high" | "urgent";

export type Task = Authored & {
  id: string;
  title: string;
  description: string;
  projectId: string | null;
  projectName: string | null;
  status: TaskStatus;
  priority: Priority;
  assignee: string | null;
  assigneeName: string | null;
  dueDate: string | null;
  isPrivate: boolean;
  completedAt: string | null;
  overdue: boolean;
};

export type InvoiceStatus = "draft" | "sent" | "paid" | "void";

export type Invoice = Authored & {
  id: string;
  number: string;
  title: string;
  projectId: string | null;
  projectName: string | null;
  clientId: string | null;
  clientName: string | null;
  clientCompany: string | null;
  amount: number;
  issueDate: string;
  dueDate: string | null;
  status: InvoiceStatus;
  paidDate: string | null;
  notes: string;
  overdue: boolean;
};

export type AssetKind =
  | "image"
  | "video"
  | "document"
  | "3d"
  | "audio"
  | "design"
  | "other";

export type Asset = Authored & {
  folder: string;
  sizeLabel: string;
  id: string;
  name: string;
  url: string;
  kind: AssetKind;
  projectId: string | null;
  projectName: string | null;
  description: string;
  tags: string;
};

export type Announcement = Authored & {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  createdByTitle: string | null;
  emailedAt: string | null;
  emailedCount: number;
};

/* A row of the announcement email list. */
export type EmailContact = {
  username: string;
  name: string;
  title: string;
  email: string;
};

export type MeetingNote = Authored & {
  id: string;
  title: string;
  meetingDate: string;
  projectId: string | null;
  projectName: string | null;
  attendees: string[];
  body: string;
};

export type StatusUpdate = Authored & {
  id: string;
  weekOf: string;
  projectId: string | null;
  projectName: string | null;
  done: string;
  next: string;
  blockers: string;
  createdByTitle: string | null;
};

export type FeedbackStatus = "open" | "in_progress" | "resolved";

export type Feedback = Authored & {
  id: string;
  title: string;
  projectId: string | null;
  projectName: string | null;
  assetId: string | null;
  assetName: string | null;
  assetUrl: string | null;
  body: string;
  status: FeedbackStatus;
  commentCount: number;
};

export type FeedbackComment = Authored & {
  id: string;
  feedbackId: string;
  body: string;
  createdByTitle: string | null;
};

export type Brief = Authored & {
  id: string;
  title: string;
  projectId: string | null;
  projectName: string | null;
  clientId: string | null;
  clientName: string | null;
  objective: string;
  audience: string;
  deliverables: string;
  keyMessage: string;
  tone: string;
  referenceNotes: string;
  budget: number | null;
  dueDate: string | null;
  status: "draft" | "in_review" | "approved";
};

export type ActivityItem = {
  id: string;
  actor: string;
  actorName: string;
  action: string;
  entityType: string;
  entityId: string;
  summary: string;
  createdAt: string;
};

export type EventType = "project" | "milestone" | "task" | "invoice" | "event";

export type CalendarEvent = {
  type: EventType;
  id: string;
  projectId: string | null;
  projectName: string | null;
  title: string;
  date: string;
  status: string;
  done: boolean;
  assignee: string | null;
  assigneeName: string | null;
  isPrivate: boolean;
};

export type ChatReaction = { reaction: string; users: string[] };

export type ChatMessage = {
  channel: string;
  recipient: string | null;
  projectId: string | null;
  pinned: boolean;
  id: string;
  author: string;
  authorName: string;
  authorTitle: string;
  authorAccess: Access;
  body: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  reactions: ChatReaction[];
};

export type ChatMember = {
  username: string;
  name: string;
  title: string;
  access: Access;
  online: boolean;
  presence: Presence;
};

export type ChatRoomProject = { id: string; name: string; code: string };

export type ChatPage = {
  project: ChatRoomProject | null;
  now: string;
  messages: ChatMessage[];
  hasMore: boolean;
  members: ChatMember[];
};
