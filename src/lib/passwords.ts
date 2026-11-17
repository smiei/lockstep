import { randomBytes, scrypt, timingSafeEqual, createHash } from "node:crypto";

// Password hashing with Node's own scrypt - no dependency, and memory-hard,
// which is what makes a stolen database slow to guess against. Server-only.
//
// Stored as "scrypt$N$r$p$salt$hash" (salt and hash in base64url), so the
// cost can be raised later without invalidating what is already stored.
const N = 16384;
const R = 8;
const P = 1;
const KEY_LENGTH = 32;

function derive(password: string, salt: Buffer, n: number, r: number, p: number, length: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password.normalize("NFKC"), salt, length, { N: n, r, p }, (error, key) =>
      error ? reject(error) : resolve(key),
    );
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await derive(password, salt, N, R, P, KEY_LENGTH);
  return ["scrypt", N, R, P, salt.toString("base64url"), key.toString("base64url")].join("$");
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, n, r, p, salt, hash] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "base64url");
  const cost = [Number(n), Number(r), Number(p)];
  if (cost.some((value) => !Number.isInteger(value) || value <= 0) || expected.length === 0) return false;
  try {
    const key = await derive(password, Buffer.from(salt, "base64url"), cost[0], cost[1], cost[2], expected.length);
    return timingSafeEqual(key, expected);
  } catch {
    return false;
  }
}

// A session cookie's value, and what the database keeps of it.
export function newToken(): string {
  return randomBytes(32).toString("base64url");
}

export function tokenId(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

// Short enough to read out to a friend, long enough not to be guessed:
// 10 characters without the look-alikes (0/O, 1/I/L).
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function newInviteCode(): string {
  const bytes = randomBytes(10);
  return Array.from(bytes, (byte) => CODE_ALPHABET[byte % CODE_ALPHABET.length]).join("");
}

export function sameSecret(a: string, b: string): boolean {
  const left = createHash("sha256").update(a).digest();
  const right = createHash("sha256").update(b).digest();
  return timingSafeEqual(left, right);
}
