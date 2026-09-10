import { useEffect, useRef, useState } from "react";
import { X, Copy, ArrowUpRight } from "lucide-react";
export function EmailModal() {
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const [recipient, setRecipient] = useState("zxenostudio@gmail.com");
  const [subject, setSubject] = useState("New project enquiry");
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    const open = (event: MouseEvent) => {
      const link = (event.target as HTMLElement)?.closest<HTMLAnchorElement>(
        'a[href^="mailto:"]',
      );
      if (
        !link ||
        link.closest(".email-dialog") ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      event.preventDefault();
      const url = new URL(link.href);
      setRecipient(decodeURIComponent(url.pathname));
      setSubject(url.searchParams.get("subject") || "New project enquiry");
      setMessage(url.searchParams.get("body") || "");
      setCopied(false);
      trigger.current = link;
      dialog.current?.showModal();
    };
    document.addEventListener("click", open);
    return () => document.removeEventListener("click", open);
  }, []);
  return (
    <dialog
      ref={dialog}
      className="email-dialog"
      aria-labelledby="email-title"
      onClose={() => trigger.current?.focus()}
      onClick={(e) => {
        if (e.target === e.currentTarget) dialog.current?.close();
      }}
    >
      <div className="email-top">
        <span className="eyebrow">A conversation starts here</span>
        <button
          aria-label="Close email modal"
          onClick={() => dialog.current?.close()}
        >
          <X />
        </button>
      </div>
      <h2 id="email-title">Let's make it happen.</h2>
      <div className="email-recipient">
        <span>{recipient}</span>
        <button
          aria-label="Copy email address"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(recipient);
              setCopied(true);
            } catch {
              setCopied(false);
            }
          }}
        >
          <Copy size={18} />
        </button>
      </div>
      <span className="email-copy-status" role="status">
        {copied ? "Email copied." : ""}
      </span>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          window.location.href = `mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
        }}
      >
        <label>
          Subject
          <input
            required
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
        </label>
        <label>
          Your message
          <textarea
            required
            rows={5}
            placeholder="Tell us about your project…"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </label>
        <button className="booking-button" type="submit">
          Open email app <ArrowUpRight size={20} />
        </button>
        <p className="email-note">
          Your draft opens in your email app for you to send.
        </p>
      </form>
    </dialog>
  );
}
