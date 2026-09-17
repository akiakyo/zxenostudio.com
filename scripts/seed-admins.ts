// Applies db/schema.sql and creates the studio's admin accounts in Neon.
// Each starts with the password <username>123 and must replace it on first
// sign-in. Existing accounts keep their password; their name, role and access
// are filled in only while the name is still blank, so edits made in the
// workspace are never overwritten. Safe to re-run after adding a member.
// To put one account back to its starting password:
//   npm run seed-admins -- --reset aquio.zxeno
// Reads DATABASE_URL from .env.local (`vercel env pull .env.local` fetches it).
import { neon } from "@neondatabase/serverless";
import { defaultPassword, hashPassword } from "../api/_lib/password.ts";
import { MEMBERS, schemaStatements } from "./members.ts";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set. Run: vercel env pull .env.local");
  process.exit(1);
}
const sql = neon(url);
const usernames = MEMBERS.map((m) => m.username);

const resetIndex = process.argv.indexOf("--reset");
const reset = resetIndex === -1 ? null : process.argv[resetIndex + 1];
if (resetIndex !== -1 && !usernames.includes(reset ?? "")) {
  console.error(`--reset needs one of: ${usernames.join(", ")}`);
  process.exit(1);
}

for (const statement of schemaStatements()) await sql.query(statement);

for (const member of reset
  ? MEMBERS.filter((m) => m.username === reset)
  : MEMBERS) {
  const { username } = member;
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
    continue;
  }
  const rows = await sql`
    INSERT INTO admin_users
      (username, password_hash, must_change_password, password_changed_at, name, title, access)
    VALUES (${username}, ${hash}, true, ${now}, ${member.name}, ${member.title}, ${member.access})
    ON CONFLICT (username) DO NOTHING
    RETURNING username`;
  const filled = await sql`
    UPDATE admin_users SET name = ${member.name}, title = ${member.title}, access = ${member.access}
    WHERE username = ${username} AND name = ''
    RETURNING username`;
  console.log(
    `${rows.length ? "created" : "exists "}  ${username}${!rows.length && filled.length ? "  (profile filled in)" : ""}`,
  );
}
