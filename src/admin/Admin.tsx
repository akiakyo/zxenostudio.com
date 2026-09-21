import { useCallback, useEffect, useState, type FormEvent } from "react";
import { LogOut } from "lucide-react";
import { logout, UNAUTHORIZED_EVENT } from "./lib/api";
import type { Session } from "./lib/types";
import { WorkspaceProvider } from "./lib/workspace";
import { Mark, Shell } from "./Shell";
import { ParticleField } from "./ui/particles";
import { PasswordForm } from "./ui/password";
import { UiProvider } from "./ui/ui";

type State =
  | { status: "checking" }
  | { status: "signed-out" }
  | { status: "signed-in"; session: Session };

async function fetchSession(): Promise<Session | null> {
  const res = await fetch("/api/admin/me", { credentials: "same-origin" });
  return res.ok ? res.json() : null;
}

export default function Admin() {
  const [state, setState] = useState<State>({ status: "checking" });

  const applySession = useCallback((session: Session | null) => {
    setState(
      session ? { status: "signed-in", session } : { status: "signed-out" },
    );
  }, []);

  const recheck = useCallback(() => {
    fetchSession()
      .then(applySession)
      .catch(() => applySession(null));
  }, [applySession]);

  useEffect(() => {
    recheck();
    /* any request that finds the session gone sends the person back to sign in */
    window.addEventListener(UNAUTHORIZED_EVENT, recheck);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, recheck);
  }, [recheck]);

  const signOut = useCallback(() => applySession(null), [applySession]);

  if (state.status === "checking") {
    return <main className="auth" aria-busy="true" />;
  }
  if (state.status === "signed-out") {
    return <Login onSignedIn={applySession} />;
  }
  if (state.session.mustChangePassword) {
    return (
      <main className="auth">
        <ParticleField />
        <div className="auth-card">
          <AuthBrand />
          <h1>Set your password</h1>
          <p className="auth-lede">
            Signed in as <strong>{state.session.username}</strong>. Replace the
            starting password before continuing.
          </p>
          <PasswordForm submitLabel="Set password" onChanged={recheck} />
          <button
            type="button"
            className="btn btn-secondary btn-md auth-logout"
            onClick={async () => {
              await logout();
              signOut();
            }}
          >
            <LogOut size={16} aria-hidden />
            Log out
          </button>
        </div>
      </main>
    );
  }
  return (
    <UiProvider>
      <WorkspaceProvider
        session={state.session}
        onSessionChange={applySession}
        onSignOut={signOut}
      >
        <Shell />
      </WorkspaceProvider>
    </UiProvider>
  );
}

function Login({ onSignedIn }: { onSignedIn: (session: Session | null) => void }) {
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          username: form.get("username"),
          password: form.get("password"),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(typeof body.error === "string" ? body.error : "Sign in failed");
        return;
      }
      const session = await fetchSession();
      if (!session) {
        setError("Signed in, but the session could not be read");
        return;
      }
      onSignedIn(session);
    } catch {
      setError("Could not reach the server");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth">
      <ParticleField />
      <form className="auth-card" onSubmit={submit}>
        <AuthBrand />
        <h1 className="sr-only">Sign in to ZXENO HQ</h1>
        <div className="field">
          <label htmlFor="username">Username</label>
          <input id="username" name="username" autoComplete="username" autoCapitalize="none" spellCheck={false} required autoFocus />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input id="password" name="password" type="password" autoComplete="current-password" required />
        </div>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button className="btn btn-primary btn-md auth-submit" disabled={submitting}>
          {submitting ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </main>
  );
}

function AuthBrand() {
  return (
    <div className="auth-brand">
      <Mark />
      <span>
        ZXENO <em>HQ</em>
      </span>
    </div>
  );
}
