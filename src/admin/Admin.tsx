import { useEffect, useState, type FormEvent } from "react";
import { LogOut } from "lucide-react";

type Session = {
  username: string;
  expiresAt: number;
  mustChangePassword: boolean;
};
type State =
  | { status: "checking" }
  | { status: "signed-out" }
  | { status: "signed-in"; session: Session };

const MIN_PASSWORD_LENGTH = 10;

async function post(path: string, body?: unknown): Promise<Response> {
  return fetch(path, {
    method: "POST",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
}

async function fetchSession(): Promise<Session | null> {
  const res = await fetch("/api/admin/me", { credentials: "same-origin" });
  return res.ok ? res.json() : null;
}

async function errorMessage(res: Response, fallback: string) {
  const body = await res.json().catch(() => ({}));
  return typeof body.error === "string" ? body.error : fallback;
}

export default function Admin() {
  const [state, setState] = useState<State>({ status: "checking" });

  function applySession(session: Session | null) {
    setState(
      session ? { status: "signed-in", session } : { status: "signed-out" },
    );
  }

  useEffect(() => {
    fetchSession()
      .then(applySession)
      .catch(() => applySession(null));
  }, []);

  if (state.status === "checking") {
    return <main className="admin admin-center" aria-busy="true" />;
  }
  if (state.status === "signed-out") {
    return <Login onSignedIn={applySession} />;
  }
  if (state.session.mustChangePassword) {
    return (
      <main className="admin admin-center">
        <div className="admin-card">
          <Mark />
          <h1>Set your password</h1>
          <p className="admin-lede">
            Signed in as <strong>{state.session.username}</strong>. Replace the
            starting password before continuing.
          </p>
          <PasswordForm
            submitLabel="Set password"
            onChanged={() => fetchSession().then(applySession)}
          />
          <LogoutButton onSignedOut={() => applySession(null)} />
        </div>
      </main>
    );
  }
  return (
    <Dashboard
      session={state.session}
      onSignedOut={() => applySession(null)}
    />
  );
}

function Mark() {
  return (
    <svg className="admin-mark" viewBox="0 0 1560 1600" aria-hidden="true">
      <path d="M0 0H456V456L908 980V984H456L444 975 0 462ZM0 1460L456 980V1600H0ZM1104 0H1560V621H1104ZM648 615H1104L1560 1140V1600H1104V1144Z" />
    </svg>
  );
}

function Login({
  onSignedIn,
}: {
  onSignedIn: (session: Session | null) => void;
}) {
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSubmitting(true);
    setError("");
    try {
      const res = await post("/api/admin/login", {
        username: form.get("username"),
        password: form.get("password"),
      });
      if (!res.ok) {
        setError(await errorMessage(res, "Sign in failed"));
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
    <main className="admin admin-center">
      <form className="admin-card" onSubmit={submit}>
        <Mark />
        <h1>Studio admin</h1>
        <label>
          Username
          <input
            name="username"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            required
            autoFocus
          />
        </label>
        <label>
          Password
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </label>
        {error && (
          <p className="admin-error" role="alert">
            {error}
          </p>
        )}
        <button className="admin-button" disabled={submitting}>
          {submitting ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </main>
  );
}

function PasswordForm({
  submitLabel,
  onChanged,
}: {
  submitLabel: string;
  onChanged: () => void;
}) {
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const newPassword = String(form.get("newPassword") ?? "");
    if (newPassword !== form.get("confirmPassword")) {
      setError("New passwords do not match");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await post("/api/admin/password", {
        currentPassword: form.get("currentPassword"),
        newPassword,
      });
      if (!res.ok) {
        setError(await errorMessage(res, "Could not change password"));
        return;
      }
      formElement.reset();
      onChanged();
    } catch {
      setError("Could not reach the server");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="admin-form" onSubmit={submit}>
      <label>
        Current password
        <input
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
        />
      </label>
      <label>
        New password
        <input
          name="newPassword"
          type="password"
          autoComplete="new-password"
          minLength={MIN_PASSWORD_LENGTH}
          required
        />
        <span className="admin-hint">
          At least {MIN_PASSWORD_LENGTH} characters.
        </span>
      </label>
      <label>
        Confirm new password
        <input
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          minLength={MIN_PASSWORD_LENGTH}
          required
        />
      </label>
      {error && (
        <p className="admin-error" role="alert">
          {error}
        </p>
      )}
      <button className="admin-button" disabled={submitting}>
        {submitting ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}

function LogoutButton({ onSignedOut }: { onSignedOut: () => void }) {
  const [leaving, setLeaving] = useState(false);

  async function logout() {
    setLeaving(true);
    try {
      await post("/api/admin/logout");
    } finally {
      onSignedOut();
    }
  }

  return (
    <button
      type="button"
      className="admin-button admin-button-quiet"
      onClick={logout}
      disabled={leaving}
    >
      <LogOut size={16} aria-hidden="true" />
      Log out
    </button>
  );
}

function Dashboard({
  session,
  onSignedOut,
}: {
  session: Session;
  onSignedOut: () => void;
}) {
  const [view, setView] = useState<"overview" | "settings">("overview");
  const [saved, setSaved] = useState(false);

  return (
    <div className="admin">
      <header className="admin-bar">
        <a className="admin-brand" href="/">
          <Mark />
          ZXENO admin
        </a>
        <div className="admin-user">
          <span>{session.username}</span>
          <LogoutButton onSignedOut={onSignedOut} />
        </div>
      </header>
      <nav className="admin-tabs" aria-label="Admin sections">
        {(["overview", "settings"] as const).map((name) => (
          <button
            key={name}
            type="button"
            aria-current={view === name ? "page" : undefined}
            onClick={() => {
              setView(name);
              setSaved(false);
            }}
          >
            {name === "overview" ? "Overview" : "Settings"}
          </button>
        ))}
      </nav>
      <main className="admin-main">
        {view === "overview" ? (
          <>
            <h1>Welcome back, {session.username}.</h1>
            <p>
              Session expires{" "}
              {new Date(session.expiresAt).toLocaleString(undefined, {
                dateStyle: "medium",
                timeStyle: "short",
              })}
              .
            </p>
          </>
        ) : (
          <section className="admin-settings">
            <h1>Settings</h1>
            <h2>Change password</h2>
            <p>Changing it signs out your other devices.</p>
            {saved && (
              <p className="admin-success" role="status">
                Password changed.
              </p>
            )}
            <PasswordForm
              submitLabel="Change password"
              onChanged={() => setSaved(true)}
            />
          </section>
        )}
      </main>
    </div>
  );
}
