import { useEffect, useRef, useState } from "react";
import { X, Copy } from "lucide-react";
import { InquiryForm } from "./InquiryForm";

/* Every mailto link on the site opens this instead of the visitor's mail app:
   a short inquiry form that goes straight to the studio's workspace, with the
   address to copy for anyone who would rather write their own email. */
export function EmailModal() {
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const [recipient, setRecipient] = useState("zxenostudio@gmail.com");
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);
  /* a fresh form each time the popup opens */
  const [opened, setOpened] = useState(0);
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
      setMessage(url.searchParams.get("body") || "");
      setCopied(false);
      setOpened((n) => n + 1);
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
      <InquiryForm key={opened} compact message={message} />
      <div className="email-recipient">
        <span>
          Or email us: <a href={`mailto:${recipient}`}>{recipient}</a>
        </span>
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
    </dialog>
  );
}
