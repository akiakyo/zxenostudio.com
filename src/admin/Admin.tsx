import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, LogOut, MailCheck } from "lucide-react";
import { logout, UNAUTHORIZED_EVENT } from "./lib/api";
import type { Session } from "./lib/types";
import { WorkspaceProvider } from "./lib/workspace";
import { Mark, Shell } from "./Shell";
import { ParticleField } from "./ui/particles";
import { PasswordForm } from "./ui/password";
import { ShellSkeleton, UiProvider } from "./ui/ui";
import { WarmTooltipGroup } from "./ui/micro/WarmTooltip";

type State =
  | { status: "checking" }
  | { status: "signed-out" }
  | { status: "signed-in"; session: Session };

async function fetchSession(): Promise<Session | null> {
  const res = await fetch("/api/admin/me", { credentials: "same-origin" });
  return res.ok ? res.json() : null;
}

/* Remembered on this device so the loading screen can guess which way the
   session check will go: a workspace outline for someone who was signed in,
   the plain sign-in background for everyone else. A hint only, never trusted. */
const SIGNED_IN_HINT = "zxeno-admin-signed-in";
function readHint(): boolean {
  try {
    return localStorage.getItem(SIGNED_IN_HINT) === "1";
  } catch {
    return false;
  }
}
function writeHint(on: boolean) {
  try {
    if (on) localStorage.setItem(SIGNED_IN_HINT, "1");
    else localStorage.removeItem(SIGNED_IN_HINT);
  } catch {}
}

export default function Admin() {
  const [state, setState] = useState<State>({ status: "checking" });

  const applySession = useCallback((session: Session | null) => {
    writeHint(!!session);
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

  /* the emailed reset link, whether or not someone is signed in here */
  if (location.pathname === "/reset-password") {
    return <ResetPassword onSignedIn={applySession} />;
  }
  if (state.status === "checking") {
    return readHint() ? <ShellSkeleton /> : <main className="auth" aria-busy="true" />;
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
        <WarmTooltipGroup delay={450} warmWindow={350}>
          <Shell />
        </WarmTooltipGroup>
      </WorkspaceProvider>
    </UiProvider>
  );
}

async function resetRequest(body: Record<string, string>) {
  const res = await fetch("/api/admin/password-reset", {
    method: "POST",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Something went wrong");
  return data;
}

function Login({ onSignedIn }: { onSignedIn: (session: Session | null) => void }) {
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [forgot, setForgot] = useState(false);

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

  if (forgot) return <ForgotPassword onBack={() => setForgot(false)} />;
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
        <button type="button" className="text-btn auth-link" onClick={() => setForgot(true)}>
          Forgot password?
        </button>
      </form>
    </main>
  );
}

function ForgotPassword({ onBack }: { onBack: () => void }) {
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSubmitting(true);
    setError("");
    try {
      await resetRequest({ username: String(form.get("username") ?? "") });
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not reach the server");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth">
      <ParticleField />
      <form className="auth-card" onSubmit={submit}>
        <AuthBrand />
        <h1>Forgot password</h1>
        {sent ? (
          <p className="auth-lede auth-sent" role="status">
            <MailCheck size={18} aria-hidden />
            <span>
              If that account has an email address on file, a reset link is on its way. It works
              once, for 30 minutes. No email saved? Ask an executive to reset your password.
            </span>
          </p>
        ) : (
          <>
            <p className="auth-lede">
              Enter your username and we'll email a reset link to the address saved in your profile.
            </p>
            <div className="field">
              <label htmlFor="forgot-username">Username</label>
              <input id="forgot-username" name="username" autoComplete="username" autoCapitalize="none" spellCheck={false} required autoFocus />
            </div>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <button className="btn btn-primary btn-md auth-submit" disabled={submitting}>
              {submitting ? "Sending…" : "Email me a reset link"}
            </button>
          </>
        )}
        <button type="button" className="text-btn auth-link" onClick={onBack}>
          <ArrowLeft size={14} aria-hidden /> Back to sign in
        </button>
      </form>
    </main>
  );
}

/* Opened from the emailed link: /reset-password#<token>. */
function ResetPassword({ onSignedIn }: { onSignedIn: (session: Session | null) => void }) {
  const [token] = useState(() => location.hash.slice(1));
  const [valid, setValid] = useState<boolean | null>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    /* keep the token out of the address bar and history once it is read */
    history.replaceState(null, "", "/reset-password");
    if (!token) {
      setValid(false);
      return;
    }
    resetRequest({ token })
      .then((data) => setValid(!!data.valid))
      .catch(() => setValid(false));
  }, [token]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const newPassword = String(form.get("newPassword") ?? "");
    if (newPassword !== form.get("confirmPassword")) {
      setError("New passwords do not match");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await resetRequest({ token, newPassword });
      history.replaceState(null, "", "/");
      onSignedIn(await fetchSession());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not reach the server");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth">
      <ParticleField />
      <form className="auth-card" onSubmit={submit}>
        <AuthBrand />
        <h1>Choose a new password</h1>
        {valid === null && <p className="auth-lede">Checking your link…</p>}
        {valid === false && (
          <>
            <p className="form-error" role="alert">
              This reset link has expired or was already used. Ask for a new one from the sign-in page.
            </p>
            <a className="btn btn-secondary btn-md auth-submit" href="/">
              Back to sign in
            </a>
          </>
        )}
        {valid && (
          <>
            <p className="auth-lede">This signs you out everywhere else and signs you in here.</p>
            <div className="field">
              <label htmlFor="reset-new">New password</label>
              <input id="reset-new" name="newPassword" type="password" autoComplete="new-password" minLength={10} required autoFocus aria-describedby="reset-hint" />
              <small id="reset-hint">At least 10 characters.</small>
            </div>
            <div className="field">
              <label htmlFor="reset-confirm">Confirm new password</label>
              <input id="reset-confirm" name="confirmPassword" type="password" autoComplete="new-password" minLength={10} required />
            </div>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <button className="btn btn-primary btn-md auth-submit" disabled={submitting}>
              {submitting ? "Saving…" : "Set password and sign in"}
            </button>
          </>
        )}
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
