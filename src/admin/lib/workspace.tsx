/* Who is signed in, plus the lists nearly every form picks from (team,
   projects, clients), loaded once and refreshed after changes. */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api } from "./api";
import type { Client, Member, Project, Session } from "./types";

type Workspace = {
  session: Session;
  isExecutive: boolean;
  team: Member[];
  projects: Project[];
  clients: Client[];
  memberName: (username: string | null | undefined) => string;
  reloadLookups: () => Promise<void>;
  updateSession: (patch: Partial<Session>) => void;
  signOut: () => void;
};

const WorkspaceContext = createContext<Workspace | null>(null);

export function WorkspaceProvider({
  session,
  onSessionChange,
  onSignOut,
  children,
}: {
  session: Session;
  onSessionChange: (session: Session) => void;
  onSignOut: () => void;
  children: ReactNode;
}) {
  const [team, setTeam] = useState<Member[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);

  const reloadLookups = useCallback(async () => {
    const [nextTeam, nextProjects, nextClients] = await Promise.all([
      api<Member[]>("team"),
      api<Project[]>("projects?archived=0"),
      api<Client[]>("clients"),
    ]).catch(() => [null, null, null] as const);
    if (nextTeam) setTeam(nextTeam);
    if (nextProjects) setProjects(nextProjects);
    if (nextClients) setClients(nextClients);
  }, []);

  useEffect(() => {
    reloadLookups();
  }, [reloadLookups]);

  const value = useMemo<Workspace>(
    () => ({
      session,
      isExecutive: session.access === "executive",
      team,
      projects,
      clients,
      memberName: (username) =>
        (username && team.find((m) => m.username === username)?.name) ||
        username ||
        "Unassigned",
      reloadLookups,
      updateSession: (patch) => onSessionChange({ ...session, ...patch }),
      signOut: onSignOut,
    }),
    [session, team, projects, clients, reloadLookups, onSessionChange, onSignOut],
  );

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace(): Workspace {
  const value = useContext(WorkspaceContext);
  if (!value) throw new Error("useWorkspace outside WorkspaceProvider");
  return value;
}
