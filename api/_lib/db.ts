/* The one way the API talks to Postgres. Production uses Neon over HTTP
   (DATABASE_URL from the Vercel Marketplace integration); local tests swap in
   an in-memory database through setDriver. */
import { neon } from "@neondatabase/serverless";

export type Row = Record<string, any>;
type Driver = (text: string, params: unknown[]) => Promise<Row[]>;

let driver: Driver | undefined;

export function setDriver(next: Driver) {
  driver = next;
}

function current(): Driver {
  if (!driver) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("Missing environment variable DATABASE_URL");
    const sql = neon(url);
    driver = (text, params) => sql.query(text, params) as Promise<Row[]>;
  }
  return driver;
}

export function query<T extends Row = Row>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  return current()(text, params) as Promise<T[]>;
}

export async function one<T extends Row = Row>(
  text: string,
  params: unknown[] = [],
): Promise<T | null> {
  return (await query<T>(text, params))[0] ?? null;
}

/* Collects values for a parameterised statement: each add() returns its $n. */
export class Params {
  readonly values: unknown[] = [];
  add(value: unknown): string {
    this.values.push(value);
    return `$${this.values.length}`;
  }
}

/* Today's date in the studio's timezone, as YYYY-MM-DD. */
export function today(offsetDays = 0): string {
  const date = new Date(Date.now() + offsetDays * 86_400_000);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
