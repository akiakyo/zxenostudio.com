import { useEffect, useState, type FormEvent } from "react";
import { Lock, Monitor, Moon, Sun } from "lucide-react";
import { patch, useApi } from "../lib/api";
import type { Member } from "../lib/types";
import { chime, setSoundOn, soundOn } from "../lib/sound";
import { useWorkspace } from "../lib/workspace";
import BellToggle from "../ui/micro/BellToggle";
import RubberSegment from "../ui/micro/RubberSegment";
import { PasswordForm } from "../ui/password";
import {
  Avatar,
  Button,
  ErrorNote,
  Loading,
  PageHeader,
  Panel,
  StatusBadge,
  useUi,
} from "../ui/ui";

type Theme = "light" | "dark" | "system";
const THEME_KEY = "zxeno-theme";

function readTheme(): Theme {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    return saved === "light" || saved === "dark" ? saved : "system";
  } catch {
    return "system";
  }
}

/* Same storage key as the public site, so the choice follows people there. */
function applyTheme(theme: Theme) {
  try {
    if (theme === "system") localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, theme);
  } catch {}
  const dark =
    theme === "dark" ||
    (theme === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
}

export function SettingsPage() {
  const { session, updateSession, reloadLookups } = useWorkspace();
  const { toast } = useUi();
  const { data, error, loading, reload } = useApi<Member>("profile");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [bio, setBio] = useState("");
  const [department,setDepartment]=useState(''),[workStatus,setWorkStatus]=useState('studio');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [theme, setTheme] = useState<Theme>(readTheme);
  const [sound, setSound] = useState<boolean>(soundOn);

  useEffect(() => {
    if (data) {
      setName(data.name);
      setPhone(data.phone);
      setEmail(data.email ?? "");
      setBio(data.bio);
      setDepartment(data.department);setWorkStatus(data.workStatus);
    }
  }, [data]);

  async function save(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setFormError("");
    try {
      const updated = await patch<Member>("profile", { name, phone, email, bio, department, workStatus });
      updateSession({ name: updated.name });
      reloadLookups();
      toast("Profile saved");
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page page-narrow">
      <PageHeader title="Settings" description="Your profile, password and appearance." />
      {error && <ErrorNote message={error} onRetry={reload} />}
      {loading && !data && <Loading variant="form" />}
      {data && (
        <Panel title="Profile">
          <div className="profile-head">
            <Avatar name={name || data.username} size={56} />
            <div>
              <strong>{name || data.username}</strong>
              <span>{data.title}</span>
            </div>
          </div>
          <form className="stack-form" onSubmit={save}>
            <div className="field">
              <label htmlFor="profile-name">Name</label>
              <input id="profile-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} required autoComplete="name" />
            </div>
            <div className="field"><label htmlFor="profile-department">Department</label><input id="profile-department" value={department} onChange={e=>setDepartment(e.target.value)} maxLength={80}/></div>
            <div className="field"><label htmlFor="profile-status">Work status</label><select id="profile-status" value={workStatus} onChange={e=>setWorkStatus(e.target.value)}><option value="studio">In studio</option><option value="remote">Remote</option><option value="shoot">On shoot</option><option value="off">Off</option></select></div>
            <div className="field">
              <label htmlFor="profile-phone">Phone</label>
              <input id="profile-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={40} autoComplete="tel" placeholder="+63 917 000 0000" />
            </div>
            <div className="field">
              <label htmlFor="profile-email">Email</label>
              <input id="profile-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={200} autoComplete="email" placeholder="name@example.com" />
              <small>Where studio announcements are emailed. Executives can see it.</small>
            </div>
            <div className="field">
              <label htmlFor="profile-bio">Bio</label>
              <textarea id="profile-bio" rows={4} value={bio} onChange={(e) => setBio(e.target.value)} maxLength={1000} placeholder="What you do at the studio" />
              <small>{bio.length}/1000</small>
            </div>
            <div className="readonly-grid">
              <div className="field">
                <span className="field-label">Username</span>
                <div className="readonly"><Lock size={13} aria-hidden /> {data.username}</div>
              </div>
              <div className="field">
                <span className="field-label">Role</span>
                <div className="readonly"><Lock size={13} aria-hidden /> {data.title} <StatusBadge value={data.access} /></div>
              </div>
            </div>
            <p className="hint">Usernames can't be changed. Only executives can change roles, on the Roles & permissions page.</p>
            {formError && <p className="form-error" role="alert">{formError}</p>}
            <div>
              <Button type="submit" variant="primary" disabled={saving}>{saving ? "Saving…" : "Save profile"}</Button>
            </div>
          </form>
        </Panel>
      )}

      <Panel title="Password">
        <p className="hint">Changing your password signs you out on your other devices.</p>
        <PasswordForm submitLabel="Change password" onChanged={() => toast("Password changed")} />
      </Panel>

      <Panel title="Appearance">
        <RubberSegment
          aria-label="Theme"
          value={theme}
          onChange={(value) => {
            setTheme(value as Theme);
            applyTheme(value as Theme);
          }}
          items={[
            { value: "light", label: "Light", icon: <Sun size={15} aria-hidden /> },
            { value: "dark", label: "Dark", icon: <Moon size={15} aria-hidden /> },
            { value: "system", label: "System", icon: <Monitor size={15} aria-hidden /> },
          ]}
        />
      </Panel>

      <Panel title="Sound">
        <p className="hint">
          A short tone for new chat messages and new notifications. This is remembered on this
          device only.
        </p>
        <BellToggle
          label="Notification sounds"
          offLabel="Sounds off"
          onLabel="Sounds on"
          pressed={sound}
          onChange={(value) => {
            setSound(value);
            setSoundOn(value);
            /* play the tone when switching on, so it is obvious it works */
            if (value) chime.notification();
          }}
        />
      </Panel>
      <p className="hint session-hint">Signed in as @{session.username}. Sessions last 8 hours.</p>
    </div>
  );
}
