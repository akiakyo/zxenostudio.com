import { useEffect, useState, type ComponentType } from "react";
import {
  Activity,
  AlarmClock,
  Archive,
  Building2,
  CalendarDays,
  Columns3,
  Crown,
  FileText,
  FolderKanban,
  Images,
  LayoutDashboard,
  ListChecks,
  Lock,
  LogOut,
  Megaphone,
  Menu as MenuIcon,
  MessagesSquare,
  NotebookPen,
  Receipt,
  Settings,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import { logout } from "./lib/api";
import { Link, useLocation } from "./lib/router";
import { useWorkspace } from "./lib/workspace";
import { Avatar } from "./ui/ui";
import { ActivityPage } from "./pages/Activity";
import { AnnouncementsPage } from "./pages/Announcements";
import { ArchivesPage } from "./pages/Archives";
import { AssetsPage } from "./pages/Assets";
import { BriefsPage } from "./pages/Briefs";
import { CalendarPage } from "./pages/Calendar";
import { ClientsPage } from "./pages/Clients";
import { DashboardPage } from "./pages/Dashboard";
import { DeadlinesPage } from "./pages/Deadlines";
import { ExecutivesPage } from "./pages/Executives";
import { FeedbackPage } from "./pages/Feedback";
import { InvoicesPage } from "./pages/Invoices";
import { MeetingNotesPage } from "./pages/MeetingNotes";
import { MyTasksPage } from "./pages/MyTasks";
import { PrivateTasksPage } from "./pages/PrivateTasks";
import { ProjectDetailPage } from "./pages/ProjectDetail";
import { ProjectsPage } from "./pages/Projects";
import { RolesPage } from "./pages/Roles";
import { SettingsPage } from "./pages/Settings";
import { TaskBoardPage } from "./pages/TaskBoard";
import { TeamPage } from "./pages/Team";

type NavItem = {
  path: string;
  label: string;
  icon: ComponentType<{ size?: number; "aria-hidden"?: boolean }>;
  page: ComponentType;
  executiveOnly?: boolean;
};

/* The sidebar, top to bottom: what's happening, the work itself, the creative
   process around it, the business side, then the people. */
export const NAV: { group: string; items: NavItem[] }[] = [
  {
    group: "Overview",
    items: [
      { path: "/", label: "Dashboard", icon: LayoutDashboard, page: DashboardPage },
      { path: "/announcements", label: "Announcements", icon: Megaphone, page: AnnouncementsPage },
      { path: "/activity", label: "Activity feed", icon: Activity, page: ActivityPage },
    ],
  },
  {
    group: "Projects",
    items: [
      { path: "/projects", label: "Projects", icon: FolderKanban, page: ProjectsPage },
      { path: "/calendar", label: "Calendar", icon: CalendarDays, page: CalendarPage },
      { path: "/deadlines", label: "Deadlines", icon: AlarmClock, page: DeadlinesPage },
      { path: "/archives", label: "Project archives", icon: Archive, page: ArchivesPage },
    ],
  },
  {
    group: "Tasks",
    items: [
      { path: "/tasks/mine", label: "My tasks", icon: ListChecks, page: MyTasksPage },
      { path: "/tasks/overview", label: "Task overview", icon: Columns3, page: TaskBoardPage },
      { path: "/tasks/private", label: "Private tasks", icon: Lock, page: PrivateTasksPage },
    ],
  },
  {
    group: "Creative",
    items: [
      { path: "/briefs", label: "Creative briefs", icon: FileText, page: BriefsPage },
      { path: "/feedback", label: "Feedback loop", icon: MessagesSquare, page: FeedbackPage },
      { path: "/meeting-notes", label: "Meeting notes", icon: NotebookPen, page: MeetingNotesPage },
      { path: "/assets", label: "Asset library", icon: Images, page: AssetsPage },
    ],
  },
  {
    group: "Business",
    items: [
      { path: "/clients", label: "Clients", icon: Building2, page: ClientsPage },
      { path: "/invoices", label: "Invoices", icon: Receipt, page: InvoicesPage },
    ],
  },
  {
    group: "Team",
    items: [
      { path: "/team", label: "Team directory", icon: Users, page: TeamPage },
      { path: "/executives", label: "Executives", icon: Crown, page: ExecutivesPage, executiveOnly: true },
      { path: "/roles", label: "Roles & permissions", icon: ShieldCheck, page: RolesPage },
    ],
  },
];

const SETTINGS: NavItem = {
  path: "/settings",
  label: "Settings",
  icon: Settings,
  page: SettingsPage,
};

function resolve(path: string): { page: ComponentType; label: string } | null {
  if (path.startsWith("/projects/")) {
    return { page: ProjectDetailPage, label: "Project" };
  }
  for (const item of [...NAV.flatMap((g) => g.items), SETTINGS]) {
    if (item.path === path) return item;
  }
  return null;
}

function isActive(itemPath: string, path: string) {
  if (itemPath === "/") return path === "/";
  return path === itemPath || path.startsWith(`${itemPath}/`);
}

export function Shell() {
  const { session, isExecutive, signOut } = useWorkspace();
  const { path } = useLocation();
  const [drawer, setDrawer] = useState(false);
  const route = resolve(path);

  useEffect(() => {
    setDrawer(false);
    window.scrollTo(0, 0);
    document.title = `${route?.label ?? "Not found"} — ZXENO admin`;
  }, [path, route?.label]);

  const Page = route?.page;

  return (
    <div className={`shell ${drawer ? "drawer-open" : ""}`}>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="topbar">
        <button
          type="button"
          className="icon-btn"
          aria-label={drawer ? "Close menu" : "Open menu"}
          aria-expanded={drawer}
          aria-controls="sidebar"
          onClick={() => setDrawer(!drawer)}
        >
          {drawer ? <X size={18} aria-hidden /> : <MenuIcon size={18} aria-hidden />}
        </button>
        <Link to="/" className="brand">
          <Mark />
          ZXENO admin
        </Link>
        <Link to="/settings" className="topbar-avatar" aria-label="Settings">
          <Avatar name={session.name || session.username} size={30} />
        </Link>
      </header>

      <aside id="sidebar" className="sidebar" aria-label="Workspace">
        <Link to="/" className="brand sidebar-brand">
          <Mark />
          ZXENO admin
        </Link>
        <nav className="nav">
          {NAV.map((group) => {
            const items = group.items.filter((i) => !i.executiveOnly || isExecutive);
            return (
              <div className="nav-group" key={group.group}>
                <div className="nav-heading">{group.group}</div>
                {items.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className="nav-link"
                    aria-current={isActive(item.path, path) ? "page" : undefined}
                  >
                    <item.icon size={17} aria-hidden />
                    {item.label}
                  </Link>
                ))}
              </div>
            );
          })}
        </nav>
        <div className="sidebar-foot">
          <Link
            to="/settings"
            className="nav-link"
            aria-current={path === "/settings" ? "page" : undefined}
          >
            <Settings size={17} aria-hidden />
            Settings
          </Link>
          <div className="me">
            <Avatar name={session.name || session.username} size={34} />
            <div className="me-text">
              <strong>{session.name || session.username}</strong>
              <span>{session.title}</span>
            </div>
            <button
              type="button"
              className="icon-btn"
              aria-label="Log out"
              title="Log out"
              onClick={async () => {
                await logout();
                signOut();
              }}
            >
              <LogOut size={16} aria-hidden />
            </button>
          </div>
        </div>
      </aside>
      <button
        type="button"
        className="scrim"
        aria-label="Close menu"
        tabIndex={-1}
        onClick={() => setDrawer(false)}
      />

      <main id="main" className="content">
        {Page ? (
          <Page key={path} />
        ) : (
          <div className="not-found">
            <h1>Page not found</h1>
            <p>
              <Link to="/">Back to the dashboard</Link>
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

export function Mark() {
  return (
    <svg className="mark" viewBox="0 0 1560 1600" aria-hidden="true">
      <path d="M0 0H456V456L908 980V984H456L444 975 0 462ZM0 1460L456 980V1600H0ZM1104 0H1560V621H1104ZM648 615H1104L1560 1140V1600H1104V1144Z" />
    </svg>
  );
}
