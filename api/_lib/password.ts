/* scrypt password hashing, stored as scrypt$<salt base64url>$<key base64url>.
   No local imports, so scripts/seed-admins.ts can load this file directly. */
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const key = scryptSync(password, salt, 64);
  return `scrypt$${salt.toString("base64url")}$${key.toString("base64url")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, salt, key] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !key) return false;
  const expected = Buffer.from(key, "base64url");
  const actual = scryptSync(password, Buffer.from(salt, "base64url"), 64);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export const MIN_PASSWORD_LENGTH = 10;
export const MAX_PASSWORD_LENGTH = 256;

/* The starting password every account is seeded with. Accounts are made to
   replace it on first sign-in, and it can never be chosen again. */
export function defaultPassword(username: string): string {
  return `${username}123`;
}
