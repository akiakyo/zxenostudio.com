import {
  Fragment,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentType,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import {
  ChevronsDown,
  CircleCheck,
  Eye,
  Flame,
  Heart,
  Laugh,
  MessageCircle,
  PartyPopper,
  Rocket,
  SendHorizontal,
  SmilePlus,
  ThumbsUp,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { api, del, post, query } from "../lib/api";
import { todayIso } from "../lib/format";
import type { ChatMember, ChatMessage, ChatPage } from "../lib/types";
import { useWorkspace } from "../lib/workspace";
import { Avatar, Badge, ErrorNote, IconButton, Loading, useAction, useUi } from "../ui/ui";

type Icon = ComponentType<{ size?: number; "aria-hidden"?: boolean; className?: string }>;

/* Must match REACTIONS in api/_lib/chat.ts. */
const REACTIONS: { key: string; label: string; icon: Icon }[] = [
  { key: "thumbs-up", label: "Thumbs up", icon: ThumbsUp },
  { key: "heart", label: "Heart", icon: Heart },
  { key: "flame", label: "Fire", icon: Flame },
  { key: "laugh", label: "Laugh", icon: Laugh },
  { key: "party-popper", label: "Celebrate", icon: PartyPopper },
  { key: "eye", label: "Looking", icon: Eye },
  { key: "rocket", label: "Ship it", icon: Rocket },
  { key: "circle-check", label: "Done", icon: CircleCheck },
];
const REACTION = Object.fromEntries(REACTIONS.map((r) => [r.key, r]));

const POLL_MS = 3000;
/* re-read a few seconds behind the last poll, so a message committed just as
   a poll ran is never missed; merging by id makes the overlap harmless */
const OVERLAP_MS = 5000;
const GROUP_MS = 5 * 60 * 1000;

function merge(current: ChatMessage[], incoming: ChatMessage[]) {
  const byId = new Map(current.map((m) => [m.id, m]));
  for (const message of incoming) {
    if (message.deletedAt) byId.delete(message.id);
    else byId.set(message.id, message);
  }
  return [...byId.values()].sort((a, b) => Number(a.id) - Number(b.id));
}

/* the studio day a message was sent on, in Manila time like the rest of the workspace */
function localDay(timestamp: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(timestamp));
}

function dayLabel(day: string) {
  if (day === todayIso()) return "Today";
  if (day === todayIso(-1)) return "Yesterday";
  return new Date(`${day}T00:00:00`).toLocaleDateString("en-PH", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function clock(timestamp: string) {
  return new Date(timestamp).toLocaleTimeString("en-PH", {
    hour: "numeric",
    minute: "2-digit",
  });
}

/* plain text with web links made clickable */
function MessageBody({ text }: { text: string }) {
  const parts = text.split(/(https?:\/\/[^\s<]+)/g);
  return (
    <p className="chat-text">
      {parts.map((part, i) =>
        i % 2 ? (
          <a key={i} href={part} target="_blank" rel="noopener noreferrer">
            {part}
          </a>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </p>
  );
}

export function ChatPage() {
  const { session, isExecutive, memberName } = useWorkspace();
  const run = useAction();
  const { confirm } = useUi();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [members, setMembers] = useState<ChatMember[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState("");
  const [showMembers, setShowMembers] = useState(false);
  const [unseen, setUnseen] = useState(0);
  const [picker, setPicker] = useState<{ id: string; top: number; left: number } | null>(null);

  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const lastNow = useRef<string | null>(null);
  const atBottom = useRef(true);
  const scrollMode = useRef<"bottom" | { keepFrom: number } | null>("bottom");

  const nearBottom = () => {
    const el = listRef.current;
    return !el || el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };

  const apply = useCallback((page: ChatPage) => {
    lastNow.current = page.now;
    setMembers(page.members);
    if (!page.messages.length) return;
    setMessages((current) => {
      const next = merge(current, page.messages);
      const added = next.filter((m) => !current.some((c) => c.id === m.id));
      if (added.length) {
        if (atBottom.current || added.every((m) => m.author === session.username)) {
          scrollMode.current = "bottom";
        } else {
          setUnseen((n) => n + added.length);
        }
      }
      return next;
    });
  }, [session.username]);

  /* first page, then poll for changes while the tab is visible */
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let stopped = false;

    async function first() {
      try {
        const page = await api<ChatPage>("chat");
        if (stopped) return;
        setHasMore(page.hasMore);
        scrollMode.current = "bottom";
        apply(page);
        setError("");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not load the chat");
      } finally {
        setLoading(false);
        schedule();
      }
    }

    async function poll() {
      if (stopped || document.hidden || !lastNow.current) return schedule();
      try {
        const since = new Date(new Date(lastNow.current).getTime() - OVERLAP_MS).toISOString();
        const page = await api<ChatPage>(`chat${query({ since })}`);
        if (!stopped) {
          apply(page);
          setError("");
        }
      } catch (e) {
        if (!stopped) setError(e instanceof Error ? e.message : "Connection lost, retrying…");
      }
      schedule();
    }

    function schedule() {
      if (stopped) return;
      clearTimeout(timer);
      timer = setTimeout(poll, POLL_MS);
    }

    const wake = () => {
      if (!document.hidden) {
        clearTimeout(timer);
        poll();
      }
    };

    first();
    document.addEventListener("visibilitychange", wake);
    return () => {
      stopped = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", wake);
    };
  }, [apply]);

  /* stick to the bottom for new messages; keep place when loading older ones */
  useLayoutEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const mode = scrollMode.current;
    if (mode === "bottom") {
      el.scrollTop = el.scrollHeight;
      atBottom.current = true;
      setUnseen(0);
    } else if (mode) {
      el.scrollTop = el.scrollHeight - mode.keepFrom;
    }
    scrollMode.current = null;
  }, [messages]);

  async function loadOlder() {
    const el = listRef.current;
    const first = messages[0];
    if (!first || !el) return;
    const page = await run(() => api<ChatPage>(`chat${query({ before: first.id })}`));
    if (!page) return;
    scrollMode.current = { keepFrom: el.scrollHeight - el.scrollTop };
    setHasMore(page.hasMore);
    setMessages((current) => merge(current, page.messages));
  }

  async function send(event?: FormEvent) {
    event?.preventDefault();
    const body = draft.trim();
    if (!body) return;
    /* clear the box straight away so the next message can be typed while this
       one sends; put the text back only if sending fails and nothing new was typed */
    setDraft("");
    if (inputRef.current) inputRef.current.style.height = "auto";
    const message = await run(() => post<ChatMessage>("chat", { body }));
    if (!message) setDraft((current) => current || body);
    if (message) {
      scrollMode.current = "bottom";
      setMessages((current) => merge(current, [message]));
      inputRef.current?.focus();
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      send();
    }
  }

  async function react(message: ChatMessage, reaction: string) {
    setPicker(null);
    /* show it straight away, then settle on what the server says */
    setMessages((current) =>
      current.map((m) => {
        if (m.id !== message.id) return m;
        const existing = m.reactions.find((r) => r.reaction === reaction);
        const mine = existing?.users.includes(session.username);
        const reactions = existing
          ? m.reactions
              .map((r) =>
                r.reaction === reaction
                  ? { ...r, users: mine ? r.users.filter((u) => u !== session.username) : [...r.users, session.username] }
                  : r,
              )
              .filter((r) => r.users.length)
          : [...m.reactions, { reaction, users: [session.username] }];
        return { ...m, reactions };
      }),
    );
    const updated = await run(() => post<ChatMessage>("chat-reactions", { messageId: message.id, reaction }));
    if (updated) setMessages((current) => merge(current, [updated]));
  }

  async function remove(message: ChatMessage) {
    const ok = await confirm({
      title: "Delete this message?",
      body: message.author === session.username ? "It will be removed for everyone." : `This removes ${message.authorName}'s message for everyone.`,
      confirmLabel: "Delete",
      danger: true,
    });
    if (ok && (await run(() => del(`chat?id=${message.id}`), "Message deleted"))) {
      setMessages((current) => current.filter((m) => m.id !== message.id));
    }
  }

  function openPicker(message: ChatMessage, button: HTMLElement) {
    if (picker?.id === message.id) return setPicker(null);
    const rect = button.getBoundingClientRect();
    const width = 8 * 38 + 12;
    setPicker({
      id: message.id,
      top: rect.top - 52 < 60 ? rect.bottom + 6 : rect.top - 52,
      left: Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8)),
    });
  }

  useEffect(() => {
    if (!picker) return;
    const close = (event: Event) => {
      if (!(event.target as HTMLElement).closest?.(".reaction-picker, .chat-react-btn")) setPicker(null);
    };
    const escape = (event: globalThis.KeyboardEvent) => event.key === "Escape" && setPicker(null);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", escape);
    listRef.current?.addEventListener("scroll", () => setPicker(null), { once: true });
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", escape);
    };
  }, [picker]);

  const online = members.filter((m) => m.online);
  const pickerMessage = picker && messages.find((m) => m.id === picker.id);

  return (
    <div className={`chat ${showMembers ? "with-members" : ""}`}>
      <header className="chat-head">
        <div className="chat-title">
          <h1>Studio chat</h1>
          <span>
            {members.length} members · <span className="online-count">{online.length} online</span>
          </span>
        </div>
        <div className="chat-head-tools">
          <div className="avatar-stack" aria-hidden="true">
            {online.slice(0, 3).map((m) => (
              <Avatar key={m.username} name={m.name || m.username} size={28} />
            ))}
            {online.length > 3 && <span className="avatar-more">+{online.length - 3}</span>}
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            aria-expanded={showMembers}
            aria-controls="chat-members"
            onClick={() => setShowMembers(!showMembers)}
          >
            <Users size={15} aria-hidden /> Members
          </button>
        </div>
      </header>

      <div className="chat-body">
        <div className="chat-main">
          <div
            className="chat-log"
            ref={listRef}
            role="log"
            aria-live="polite"
            aria-label="Messages"
            onScroll={() => {
              atBottom.current = nearBottom();
              if (atBottom.current && unseen) setUnseen(0);
            }}
          >
            {loading && <Loading label="Loading messages" />}
            {error && <ErrorNote message={error} />}
            {!loading && hasMore && (
              <div className="chat-older">
                <button type="button" className="btn btn-secondary btn-sm" onClick={loadOlder}>
                  Load earlier messages
                </button>
              </div>
            )}
            {!loading && !messages.length && !error && (
              <div className="chat-empty">
                <span className="empty-icon"><MessageCircle size={22} aria-hidden /></span>
                <strong>Say hello to the studio</strong>
                <p>Everyone on the team, members and executives, can read and reply here.</p>
              </div>
            )}
            {messages.map((message, index) => {
              const previous = messages[index - 1];
              const day = localDay(message.createdAt);
              const newDay = !previous || localDay(previous.createdAt) !== day;
              const grouped =
                !newDay &&
                previous.author === message.author &&
                new Date(message.createdAt).getTime() - new Date(previous.createdAt).getTime() < GROUP_MS;
              const canDelete = message.author === session.username || isExecutive;
              return (
                <Fragment key={message.id}>
                  {newDay && (
                    <div className="chat-day" role="separator">
                      <span>{dayLabel(day)}</span>
                    </div>
                  )}
                  <article className={`chat-message ${grouped ? "is-grouped" : ""} ${picker?.id === message.id ? "is-active" : ""}`}>
                    <div className="chat-gutter">
                      {grouped ? (
                        <time className="chat-hover-time" dateTime={message.createdAt}>
                          {clock(message.createdAt)}
                        </time>
                      ) : (
                        <Avatar name={message.authorName || message.author} size={36} />
                      )}
                    </div>
                    <div className="chat-content">
                      {!grouped && (
                        <header className="chat-meta">
                          <strong>{message.authorName || message.author}</strong>
                          <span className="chat-role">{message.authorTitle}</span>
                          {message.authorAccess === "executive" && <Badge tone="green">Executive</Badge>}
                          <time dateTime={message.createdAt} title={new Date(message.createdAt).toLocaleString("en-PH")}>
                            {clock(message.createdAt)}
                          </time>
                        </header>
                      )}
                      <MessageBody text={message.body} />
                      {message.reactions.length > 0 && (
                        <div className="chat-reactions">
                          {message.reactions.map((r) => {
                            const def = REACTION[r.reaction];
                            if (!def) return null;
                            const mine = r.users.includes(session.username);
                            const names = r.users.map((u) => (u === session.username ? "You" : memberName(u))).join(", ");
                            return (
                              <button
                                key={r.reaction}
                                type="button"
                                className={`reaction ${mine ? "is-mine" : ""}`}
                                aria-pressed={mine}
                                aria-label={`${def.label}, ${r.users.length}: ${names}`}
                                title={`${names} reacted with ${def.label.toLowerCase()}`}
                                onClick={() => react(message, r.reaction)}
                              >
                                <def.icon size={15} aria-hidden />
                                <span>{r.users.length}</span>
                              </button>
                            );
                          })}
                          <button
                            type="button"
                            className="reaction reaction-add chat-react-btn"
                            aria-label="Add reaction"
                            onClick={(e) => openPicker(message, e.currentTarget)}
                          >
                            <SmilePlus size={15} aria-hidden />
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="chat-actions">
                      <IconButton
                        icon={SmilePlus}
                        label="Add reaction"
                        className="chat-react-btn"
                        onClick={(e) => openPicker(message, e.currentTarget)}
                      />
                      {canDelete && (
                        <IconButton icon={Trash2} label="Delete message" onClick={() => remove(message)} />
                      )}
                    </div>
                  </article>
                </Fragment>
              );
            })}
          </div>

          {unseen > 0 && (
            <button
              type="button"
              className="chat-jump"
              onClick={() => {
                const el = listRef.current;
                if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
                setUnseen(0);
              }}
            >
              <ChevronsDown size={15} aria-hidden /> {unseen} new message{unseen === 1 ? "" : "s"}
            </button>
          )}

          <form className="chat-composer" onSubmit={send}>
            <label htmlFor="chat-input" className="sr-only">Message the studio</label>
            <textarea
              id="chat-input"
              ref={inputRef}
              rows={1}
              value={draft}
              maxLength={4000}
              placeholder="Message the studio"
              onChange={(e) => {
                setDraft(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
              }}
              onKeyDown={onKeyDown}
            />
            <button type="submit" className="chat-send" aria-label="Send message" disabled={!draft.trim()}>
              <SendHorizontal size={18} aria-hidden />
            </button>
          </form>
        </div>

        {showMembers && (
          <aside id="chat-members" className="chat-members" aria-label="Members">
            <div className="chat-members-head">
              <h2>Members</h2>
              <IconButton icon={X} label="Close members" onClick={() => setShowMembers(false)} />
            </div>
            {(["Online", "Offline"] as const).map((group) => {
              const list = members.filter((m) => m.online === (group === "Online"));
              if (!list.length) return null;
              return (
                <section key={group}>
                  <h3>{group} — {list.length}</h3>
                  <ul>
                    {list.map((m) => (
                      <li key={m.username} className={m.online ? "is-online" : ""}>
                        <span className="presence">
                          <Avatar name={m.name || m.username} size={32} />
                          <i aria-label={m.online ? "Online" : "Offline"} />
                        </span>
                        <div>
                          <strong>
                            {m.name || m.username}
                            {m.username === session.username && <span className="muted"> (you)</span>}
                          </strong>
                          <span>{m.title}</span>
                        </div>
                        {m.access === "executive" && <Badge tone="green">Exec</Badge>}
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </aside>
        )}
      </div>

      {picker && pickerMessage && (
        <div
          className="reaction-picker"
          role="menu"
          aria-label="Choose a reaction"
          style={{ top: picker.top, left: picker.left }}
        >
          {REACTIONS.map((r) => {
            const mine = pickerMessage.reactions.some((x) => x.reaction === r.key && x.users.includes(session.username));
            return (
              <button
                key={r.key}
                type="button"
                role="menuitem"
                className={mine ? "is-mine" : ""}
                aria-label={r.label}
                title={r.label}
                onClick={() => react(pickerMessage, r.key)}
              >
                <r.icon size={18} aria-hidden />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
