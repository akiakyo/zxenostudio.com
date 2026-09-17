// Applies db/schema.sql and creates the studio's admin accounts in Neon.
// Each starts with the password <username>123 and must replace it on first
// sign-in. Existing accounts are left alone, so this is safe to re-run after
// adding a name. To put one account back to its starting password:
//   npm run seed-admins -- --reset aquio.zxeno
// Reads DATABASE_URL from .env.local (`vercel env pull .env.local` fetches it).
import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";
import { defaultPassword, hashPassword } from "../api/_lib/password.ts";

const USERNAMES = [
  "cai.zxeno",
  "dominic.zxeno",
  "aquio.zxeno",
  "eince.zxeno",
  "haq.zxeno",
  "jeff.zxeno",
  "johnkenneth.zxeno",
  "karl.zxeno",
  "kierre.zxeno",
  "victor.zxeno",
  "neo.zxeno",
];

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set. Run: vercel env pull .env.local");
  process.exit(1);
}
const sql = neon(url);

const resetIndex = process.argv.indexOf("--reset");
const reset = resetIndex === -1 ? null : process.argv[resetIndex + 1];
if (resetIndex !== -1 && !USERNAMES.includes(reset ?? "")) {
  console.error(`--reset needs one of: ${USERNAMES.join(", ")}`);
  process.exit(1);
}

const schema = readFileSync(new URL("../db/schema.sql", import.meta.url), "utf8");
for (const statement of schema
  .replace(/--.*$/gm, "")
  .split(";")
  .map((s) => s.trim())
  .filter(Boolean)) {
  await sql.query(statement);
}

for (const username of reset ? [reset] : USERNAMES) {
  const hash = hashPassword(defaultPassword(username));
  const now = Date.now();
  if (reset) {
    await sql`
      UPDATE admin_users
      SET password_hash = ${hash}, must_change_password = true,
          password_changed_at = ${now}
      WHERE username = ${username}`;
    await sql`DELETE FROM admin_login_failures WHERE key = ${`user:${username}`}`;
    console.log(`reset    ${username}`);
  } else {
    const rows = await sql`
      INSERT INTO admin_users (username, password_hash, must_change_password, password_changed_at)
      VALUES (${username}, ${hash}, true, ${now})
      ON CONFLICT (username) DO NOTHING
      RETURNING username`;
    console.log(`${rows.length ? "created" : "exists "}  ${username}`);
  }
}
