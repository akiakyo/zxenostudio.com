// The studio's admin accounts and the schema loader, shared by
// scripts/seed-admins.ts and local tests.
import { readFileSync, readdirSync } from "node:fs";

export type Member = {
  username: string;
  name: string;
  title: string;
  access: "executive" | "member";
};

// Names and roles as listed on the public site (src/content.tsx).
export const MEMBERS: Member[] = [
  {
    username: "dominic.zxeno",
    name: "Dominic Canatoy",
    title: "Founder / Creative Director",
    access: "executive",
  },
  {
    username: "eince.zxeno",
    name: "Eince Villorente",
    title: "Co-Founder / Art Director",
    access: "executive",
  },
  {
    username: "cai.zxeno",
    name: "Cai Costillas",
    title: "Co-Founder / COO",
    access: "executive",
  },
  {
    username: "victor.zxeno",
    name: "Pascua Victor",
    title: "Full Stack Developer / CMO",
    access: "executive",
  },
  {
    username: "aquio.zxeno",
    name: "Aquio Fulgencio",
    title: "Software Engineer / Full Stack Developer",
    access: "member",
  },
  {
    username: "johnkenneth.zxeno",
    name: "John Kenneth Bergonio",
    title: "Software Engineer / Full Stack Developer",
    access: "member",
  },
  {
    username: "jeff.zxeno",
    name: "Jeff Eugenio",
    title: "3D / Motion Designer",
    access: "member",
  },
  {
    username: "kierre.zxeno",
    name: "Kierre Paolo",
    title: "Motion Designer",
    access: "member",
  },
  {
    username: "haq.zxeno",
    name: "Haq Equia",
    title: "Motion Designer",
    access: "member",
  },
  {
    username: "karl.zxeno",
    name: "Karl Emanuel",
    title: "Video Editor / Motion Designer",
    access: "member",
  },
  {
    username: "neo.zxeno",
    name: "Neo Hapa",
    title: "Colorist / Video Editor",
    access: "member",
  },
];

/* Splits db/schema.sql into statements for drivers that run one at a time. */
export function schemaStatements(): string[] {
  /* the base schema, then every checked-in migration oldest first, so a new
     migration file just needs to be dropped into db/migrations. */
  const dir = new URL("../db/migrations/", import.meta.url);
  const schema = [
    readFileSync(new URL("../db/schema.sql", import.meta.url), "utf8"),
    ...readdirSync(dir)
      .filter((name) => name.endsWith(".sql"))
      .sort()
      .map((name) => readFileSync(new URL(name, dir), "utf8")),
  ].join("\n");
  return schema
    .replace(/--.*$/gm, "")
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
}
