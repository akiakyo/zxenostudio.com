/* Short transactional emails from the workspace itself (password reset links,
   new inquiry alerts), in the same plain branded frame as announcements but
   without the inline logo, so each goes out as a single small request. */
import { waitUntil } from "@vercel/functions";
import {
  BRAND,
  escape,
  FONT,
  FROM,
  GROUND,
  INK,
  LINE,
  MUTED,
  resend,
} from "./email.js";

/* the verified address announcements already go out from */
const ADDRESS = FROM.replace(/^.*<|>$/g, "");

export function notice({
  eyebrow,
  title,
  lines,
  button,
  footer,
}: {
  eyebrow: string;
  title: string;
  /* each is a paragraph; [label, value] pairs render as a detail row */
  lines: (string | [string, string])[];
  button?: { label: string; href: string };
  footer: string;
}) {
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only"><title>${escape(title)}</title></head>
<body style="margin:0;padding:0;background:${GROUND}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${GROUND}">
<tr><td align="center" style="padding:32px 16px 40px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
    <tr><td style="background:#ffffff;border:1px solid ${LINE};border-radius:16px;overflow:hidden">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="height:6px;background:${BRAND};font-size:0;line-height:0">&nbsp;</td></tr>
        <tr><td style="padding:30px 34px 8px;font-family:${FONT}">
          <p style="margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:${MUTED}">${escape(eyebrow)}</p>
          <h1 style="margin:0 0 18px;font-size:23px;line-height:1.3;font-weight:800;color:${INK}">${escape(title)}</h1>
          ${lines
            .map((line) =>
              Array.isArray(line)
                ? `<p style="margin:0 0 8px;font-size:15px;line-height:1.55;color:#2b3226"><strong style="color:${INK}">${escape(line[0])}:</strong> ${escape(line[1]).replace(/\n/g, "<br>")}</p>`
                : `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#2b3226">${escape(line).replace(/\n/g, "<br>")}</p>`,
            )
            .join("")}
        </td></tr>
        ${
          button
            ? `<tr><td style="padding:10px 34px 32px;font-family:${FONT}">
          <a href="${escape(button.href)}" style="display:inline-block;background:${BRAND};color:${INK};text-decoration:none;font-size:15px;font-weight:700;padding:13px 22px;border-radius:999px">${escape(button.label)} &rarr;</a>
        </td></tr>`
            : `<tr><td style="padding:0 0 22px"></td></tr>`
        }
      </table>
    </td></tr>
    <tr><td style="padding:20px 4px 0;font-family:${FONT};font-size:12px;line-height:1.6;color:${MUTED}">${escape(footer)}</td></tr>
  </table>
</td></tr></table>
</body></html>`;
  const text = [
    eyebrow.toUpperCase(),
    "",
    title,
    "",
    ...lines.map((line) => (Array.isArray(line) ? `${line[0]}: ${line[1]}` : `${line}\n`)),
    ...(button ? ["", `${button.label}: ${button.href}`] : []),
    "",
    footer,
  ].join("\n");
  return { html, text };
}

export async function sendNotice(
  to: string[],
  subject: string,
  body: { html: string; text: string },
  replyTo?: string,
) {
  for (const address of to) {
    await resend({
      from: `ZXENO Studio HQ <${ADDRESS}>`,
      to: [address],
      subject,
      ...(replyTo && { reply_to: [replyTo] }),
      ...body,
    });
  }
}

/* Sends after the response has gone out: the person filling in a form doesn't
   wait on the mail provider, and a mail failure can't change what they see. */
export function sendLater(work: Promise<unknown>, what: string) {
  waitUntil(work.catch((error) => console.error(`Could not send ${what}`, error)));
}
