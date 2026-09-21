/* Announcements by email. The team's addresses live on admin_users.email;
   executives keep that list and send a posted announcement to everyone on it
   or to addresses they type. Mail goes out through Resend (RESEND_API_KEY),
   one message per person so nobody sees the other recipients. */
import type { Session } from "./auth.js";
import { camelRow, EMAIL, isUuid, logActivity } from "./crud.js";
import { one, query } from "./db.js";
import { LOGO_PNG_BASE64 } from "./email-logo.js";
import { HttpError, requireExecutive } from "./http.js";
import { USERNAME_PATTERN } from "./users.js";

const FROM =
  process.env.ANNOUNCEMENT_FROM ?? "ZXENO Studio <announcement@zxenostudio.com>";
const SITE_URL = "https://zxenostudio.com";
const ADMIN_URL = "https://admin.zxenostudio.com/announcements";
/* sends go one per request, so keep a single send well inside a function run */
const MAX_RECIPIENTS = 100;

/* Everyone on the team with their address, for the "Email list" dialog. */
export async function list(session: Session) {
  requireExecutive(session);
  const rows = await query(
    `SELECT username, name, title, email FROM admin_users
      ORDER BY access = 'executive' DESC, name`,
  );
  return rows.map(camelRow);
}

/* Saves addresses as { username: email }; an empty string removes one. */
export async function save(session: Session, body: Record<string, any>) {
  requireExecutive(session);
  const emails = body.emails;
  if (!emails || typeof emails !== "object" || Array.isArray(emails)) {
    throw new HttpError(400, "Invalid request");
  }
  const entries = Object.entries(emails);
  for (const [username, raw] of entries) {
    if (!USERNAME_PATTERN.test(username) || typeof raw !== "string") {
      throw new HttpError(400, "Invalid request");
    }
    const email = raw.trim();
    if (email && (!EMAIL.test(email) || email.length > 200)) {
      throw new HttpError(400, `"${email}" is not an email address`);
    }
  }
  for (const [username, raw] of entries) {
    await query(`UPDATE admin_users SET email = $1 WHERE username = $2`, [
      (raw as string).trim(),
      username,
    ]);
  }
  return list(session);
}

/* Emails a posted announcement to the whole list ({ to: "all" }) or to the
   given addresses ({ to: ["a@b.com", …] }). */
export async function send(session: Session, body: Record<string, any>) {
  requireExecutive(session);
  const id = body.id;
  if (typeof id !== "string" || !isUuid(id)) throw new HttpError(400, "Invalid request");
  const announcement = await one(
    `SELECT a.title, a.body, a.created_at, u.name AS author, u.title AS author_title,
            u.email AS author_email
       FROM admin_announcements a
       LEFT JOIN admin_users u ON u.username = a.created_by
      WHERE a.id = $1`,
    [id],
  );
  if (!announcement) throw new HttpError(404, "Not found");

  let recipients: string[];
  if (body.to === "all") {
    const rows = await query(`SELECT email FROM admin_users WHERE email <> ''`);
    recipients = rows.map((r) => r.email);
    if (!recipients.length) {
      throw new HttpError(400, "No one on the team has an email address yet. Add them under Email list.");
    }
  } else if (Array.isArray(body.to)) {
    recipients = body.to.map((v: unknown) => String(v).trim()).filter(Boolean);
    const invalid = recipients.find((e) => !EMAIL.test(e) || e.length > 200);
    if (invalid) throw new HttpError(400, `"${invalid}" is not an email address`);
    if (!recipients.length) throw new HttpError(400, "Add at least one email address");
  } else {
    throw new HttpError(400, "Invalid request");
  }
  /* one message per address, however it was typed */
  const seen = new Set<string>();
  recipients = recipients.filter((e) => {
    const key = e.toLowerCase();
    return !seen.has(key) && seen.add(key);
  });
  if (recipients.length > MAX_RECIPIENTS) {
    throw new HttpError(400, `Send to ${MAX_RECIPIENTS} addresses or fewer at a time`);
  }

  /* Written like a note from the person who posted, not a newsletter: their
     name as the sender, replies to them, and each teammate greeted by name.
     Gmail sorts on these signals, and this keeps it out of Promotions. */
  const people = await query(`SELECT name, email FROM admin_users WHERE email <> ''`);
  const nameOf = new Map(people.map((p) => [String(p.email).toLowerCase(), String(p.name)]));
  const from = announcement.author
    ? `${senderName(announcement.author)} · ZXENO Studio <${FROM.replace(/^.*<|>$/g, "")}>`
    : FROM;
  const replyTo = announcement.author_email ? [announcement.author_email] : undefined;
  let sent = 0;
  try {
    /* one request each, because Resend's batch endpoint can't carry the inline logo */
    for (const to of recipients) {
      const message = render(announcement as Parameters<typeof render>[0], nameOf.get(to.toLowerCase()));
      await resend({ from, to: [to], ...(replyTo && { reply_to: replyTo }), ...message });
      sent++;
    }
  } catch (error) {
    if (sent && error instanceof HttpError) {
      throw new HttpError(
        error.status,
        `${error.message} (sent to ${sent} of ${recipients.length} before it stopped)`,
      );
    }
    throw error;
  } finally {
    /* record what went out even when Resend stops part way */
    if (sent) {
      await query(
        `UPDATE admin_announcements SET emailed_at = now(), emailed_count = $1 WHERE id = $2`,
        [sent, id],
      );
    }
  }
  await logActivity(
    session,
    "emailed",
    "announcement",
    id,
    `${announcement.title} → ${sent} ${sent === 1 ? "person" : "people"}`,
  );
  return { sent };
}

async function resend(message: Record<string, unknown>) {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new HttpError(503, "Email is not set up: RESEND_API_KEY is missing");
  /* Resend allows a few requests a second; wait and retry when it says so */
  for (let attempt = 0; ; attempt++) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify(message),
    });
    if (res.ok) return;
    if (res.status === 429 && attempt < 4) {
      await new Promise((resolve) => setTimeout(resolve, 600 * (attempt + 1)));
      continue;
    }
    const data = await res.json().catch(() => ({}));
    console.error("Resend", res.status, data);
    throw new HttpError(
      502,
      `The email could not be sent: ${typeof data.message === "string" ? data.message : `Resend answered ${res.status}`}`,
    );
  }
}

/* a display name can't carry the characters that delimit an address */
const senderName = (name: string) => name.replace(/[<>"@,;:\\]/g, "").trim().slice(0, 60);

const escape = (text: string) =>
  text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/* Brand colours from src/tokens.css, written out because mail clients ignore
   custom properties. */
const INK = "#0f1e09";
const BRAND = "#55a630";
const BRAND_SOFT = "#e2edd6";
const BRAND_DEEP = "#2f5e19";
const GROUND = "#efeee8";
const MUTED = "#6b6f63";
const LINE = "#e3e1d8";
const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

export function render(
  a: {
    title: string;
    body: string;
    created_at: string | Date;
    author: string | null;
    author_title: string | null;
  },
  recipientName?: string,
) {
  const date = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(a.created_at));
  const byline = a.author
    ? `${a.author}${a.author_title ? ` · ${a.author_title}` : ""}`
    : "ZXENO Studio";
  const body = a.body.trim();
  /* the grey line inboxes show under the subject */
  const preview = body.replace(/\s+/g, " ").slice(0, 140);
  /* greet each teammate by name, unless the message already opens with a greeting */
  const firstName = recipientName?.trim().split(/\s+/)[0];
  const greeting = /^(hi|hello|hey|good (morning|afternoon|evening)|dear)\b/i.test(body)
    ? ""
    : firstName ? `Hi ${firstName},` : "Hi team,";
  const paragraphs = [...(greeting ? [greeting] : []), ...body.split(/\n{2,}/)]
    .map(
      (p) =>
        `<p style="margin:0 0 16px;font-size:16px;line-height:1.65;color:#2b3226">${escape(p).replace(/\n/g, "<br>")}</p>`,
    )
    .join("");

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light only">
<title>${escape(a.title)}</title></head>
<body style="margin:0;padding:0;background:${GROUND};-webkit-text-size-adjust:100%">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${GROUND}">${escape(preview)}&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${GROUND}">
<tr><td align="center" style="padding:32px 16px 40px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:580px">
    <tr><td style="padding:0 4px 20px">
      <a href="${SITE_URL}" style="text-decoration:none"><img src="cid:zxeno-logo" width="150" alt="ZXENO Studio" style="display:block;border:0;width:150px;height:auto;color:${INK};font:700 20px ${FONT}"></a>
    </td></tr>
    <tr><td style="background:#ffffff;border:1px solid ${LINE};border-radius:16px;overflow:hidden">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="height:6px;background:${BRAND};font-size:0;line-height:0">&nbsp;</td></tr>
        <tr><td style="padding:32px 36px 0;font-family:${FONT}">
          <span style="display:inline-block;padding:5px 11px;border-radius:999px;background:${BRAND_SOFT};color:${BRAND_DEEP};font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase">Announcement</span>
          <h1 style="margin:18px 0 10px;font-size:26px;line-height:1.25;font-weight:800;color:${INK};letter-spacing:-.01em">${escape(a.title)}</h1>
          <p style="margin:0;font-size:13px;line-height:1.5;color:${MUTED}">${escape(byline)} &nbsp;·&nbsp; ${escape(date)}</p>
        </td></tr>
        <tr><td style="padding:24px 36px 0"><div style="height:1px;background:${LINE};font-size:0;line-height:0">&nbsp;</div></td></tr>
        <tr><td style="padding:24px 36px 8px;font-family:${FONT}">${paragraphs}</td></tr>
        <tr><td style="padding:0 36px 36px;font-family:${FONT}">
          <a href="${ADMIN_URL}" style="display:inline-block;background:${BRAND};color:${INK};text-decoration:none;font-size:15px;font-weight:700;padding:13px 22px;border-radius:999px">Open in Studio HQ &rarr;</a>
        </td></tr>
      </table>
    </td></tr>
    <tr><td style="padding:24px 4px 0;font-family:${FONT};font-size:12px;line-height:1.6;color:${MUTED}">
      <strong style="color:${INK}">ZXENO Studio</strong> &nbsp;·&nbsp; <a href="${SITE_URL}" style="color:${MUTED}">zxenostudio.com</a><br>
      You're receiving this because you're on the ZXENO Studio team email list.
    </td></tr>
  </table>
</td></tr></table>
</body></html>`;

  const text = `ZXENO STUDIO · ANNOUNCEMENT

${a.title}
${byline} · ${date}

${greeting ? `${greeting}\n\n` : ""}${body}

Open in Studio HQ: ${ADMIN_URL}

ZXENO Studio · ${SITE_URL}
You're receiving this because you're on the ZXENO Studio team email list.`;

  return {
    subject: a.title,
    html,
    text,
    attachments: [
      {
        filename: "zxeno-studio.png",
        content: LOGO_PNG_BASE64,
        content_type: "image/png",
        content_id: "zxeno-logo",
      },
    ],
  };
}
