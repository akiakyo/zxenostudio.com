import { useId, useState, type FormEvent } from "react";
import { ArrowUpRight, CircleCheck } from "lucide-react";

/* The project inquiry form, on the booking page and in the email popup. It
   posts to /api/inquiry, which files it in the studio's workspace and emails
   the team; nothing opens the visitor's mail app. */
export function InquiryForm({
  service = "",
  message = "",
  compact = false,
}: {
  service?: string;
  message?: string;
  /* the popup asks only for the essentials */
  compact?: boolean;
}) {
  const id = useId();
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState("");
  const [sentName, setSentName] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const body = Object.fromEntries(
      [...form.entries()].map(([key, value]) => [key, String(value)]),
    );
    setStatus("sending");
    setError("");
    try {
      const res = await fetch("/api/inquiry", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof data.error === "string"
            ? data.error
            : "Something went wrong. Please email zxenostudio@gmail.com instead.",
        );
      }
      setSentName(body.name.trim().split(/\s+/)[0] ?? "");
      setStatus("sent");
    } catch (e) {
      setError(
        e instanceof Error && e.message !== "Failed to fetch"
          ? e.message
          : "We couldn't send that. Check your connection, or email zxenostudio@gmail.com.",
      );
      setStatus("idle");
    }
  }

  if (status === "sent") {
    return (
      <div className="inquiry-sent" role="status">
        <CircleCheck aria-hidden="true" />
        <div>
          <strong>Thanks{sentName ? `, ${sentName}` : ""}. Your inquiry is with the team.</strong>
          <p>We'll reply by email to arrange a call. Times are in Philippine time (GMT+8).</p>
        </div>
      </div>
    );
  }

  const field = (name: string) => `${id}-${name}`;
  return (
    <form className={`inquiry-form ${compact ? "is-compact" : ""}`} onSubmit={submit}>
      <div className="inquiry-form-grid">
        <label htmlFor={field("name")}>
          Your name
          <input id={field("name")} name="name" autoComplete="name" maxLength={120} required />
        </label>
        <label htmlFor={field("email")}>
          Email
          <input id={field("email")} name="email" type="email" autoComplete="email" maxLength={200} required />
        </label>
        {!compact && (
          <>
            <label htmlFor={field("company")}>
              Company or brand <span className="optional">(optional)</span>
              <input id={field("company")} name="company" autoComplete="organization" maxLength={160} />
            </label>
            <label htmlFor={field("service")}>
              Service <span className="optional">(optional)</span>
              <input id={field("service")} name="service" defaultValue={service} maxLength={120} placeholder="e.g. Motion graphics" />
            </label>
          </>
        )}
      </div>
      {compact && service && <input type="hidden" name="service" value={service} />}
      <label htmlFor={field("message")}>
        {compact ? "Your message" : "Project overview"}
        <textarea
          id={field("message")}
          name="message"
          rows={compact ? 5 : 6}
          maxLength={5000}
          required
          defaultValue={message}
          placeholder="What are you making, and who is it for?"
        />
      </label>
      {!compact && (
        <div className="inquiry-form-grid is-three">
          <label htmlFor={field("timeline")}>
            Target timeline <span className="optional">(optional)</span>
            <input id={field("timeline")} name="timeline" maxLength={160} placeholder="e.g. Launch in March" />
          </label>
          <label htmlFor={field("budget")}>
            Budget in PHP <span className="optional">(optional)</span>
            <input id={field("budget")} name="budget" maxLength={160} placeholder="e.g. ₱150,000" />
          </label>
          <label htmlFor={field("preferredTime")}>
            Best time for a call <span className="optional">(optional)</span>
            <input id={field("preferredTime")} name="preferredTime" maxLength={200} placeholder="e.g. Weekday mornings" />
          </label>
        </div>
      )}
      {/* left empty by people; filled in only by bots */}
      <div className="inquiry-trap" aria-hidden="true">
        <label>
          Website
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      {error && (
        <p className="inquiry-error" role="alert">
          {error}
        </p>
      )}
      <button className="booking-button" type="submit" disabled={status === "sending"}>
        {status === "sending" ? "Sending…" : compact ? "Send message" : "Send inquiry"}{" "}
        <ArrowUpRight aria-hidden="true" />
      </button>
    </form>
  );
}
