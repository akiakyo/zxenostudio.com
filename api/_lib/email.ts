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

/* A plain, letter-like message: mail from a colleague rather than a campaign.
   Colours come from src/tokens.css, written out because mail clients ignore
   custom properties. */
const INK = "#0f1e09";
const TEXT = "#2b3226";
const MUTED = "#6b6f63";
const LINK = "#2f5e19";
const LINE = "#e6e4dc";
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
  const firstName = recipientName?.trim().split(/\s+/)[0];
  const greeting = firstName ? `Hi ${firstName},` : "Hi team,";
  const body = a.body.trim();
  /* skip the greeting if the message already opens with one */
  const opensWithGreeting = /^(hi|hello|hey|good (morning|afternoon|evening)|dear)\b/i.test(body);
  const signature = a.author
    ? `${a.author}${a.author_title ? `\n${a.author_title}` : ""}\nZXENO Studio`
    : "ZXENO Studio";
  const paragraph = (p: string, style = "") =>
    `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${TEXT};${style}">${escape(p).replace(/\n/g, "<br>")}</p>`;
  const paragraphs = [
    ...(opensWithGreeting ? [] : [greeting]),
    ...body.split(/\n{2,}/),
  ]
    .map((p) => paragraph(p))
    .join("");

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escape(a.title)}</title></head>
<body style="margin:0;padding:0;background:#ffffff">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff">
<tr><td style="padding:28px 20px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;font-family:${FONT}">
    <tr><td style="padding:0 0 22px"><img src="cid:zxeno-logo" width="110" alt="ZXENO Studio" style="display:block;border:0;width:110px;height:auto;color:${INK};font:700 16px ${FONT}"></td></tr>
    <tr><td>
      <h1 style="margin:0 0 6px;font-size:20px;line-height:1.35;font-weight:700;color:${INK}">${escape(a.title)}</h1>
      <p style="margin:0 0 22px;font-size:13px;color:${MUTED}">${escape(date)}</p>
      ${paragraphs}
      ${paragraph(signature, `margin-top:24px`)}
      <p style="margin:0;padding-top:16px;border-top:1px solid ${LINE};font-size:13px;line-height:1.6;color:${MUTED}">Also posted on <a href="${ADMIN_URL}" style="color:${LINK}">Studio HQ</a>. Reply to this email to answer ${escape(a.author ? a.author.split(/\s+/)[0] : "the studio")} directly.</p>
    </td></tr>
  </table>
</td></tr></table>
</body></html>`;

  const text = `${a.title}
${date}

${opensWithGreeting ? "" : `${greeting}\n\n`}${body}

${signature}

Also posted on Studio HQ: ${ADMIN_URL}`;

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
