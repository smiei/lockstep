// Sets a new password for an account when nobody can log in any more (the
// admin forgot theirs - there is no e-mail to send a reset to). Run it where
// the database is, with the app's own DATABASE_URL:
//
//   docker exec -it <container> node scripts/reset-password.mjs <name> <new password>
//   node scripts/reset-password.mjs <name> <new password>          (non-Docker install)
//
// The account's devices are logged out. Uses `prisma db execute` like the
// other start-up scripts, because the generated client is TypeScript.
import { randomBytes, scryptSync } from "node:crypto";
import { spawnSync } from "node:child_process";
import { unlinkSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const [name, password] = process.argv.slice(2);
if (!name || !password || password.length < 8 || password.length > 200) {
  console.error("Usage: node scripts/reset-password.mjs <name> <new password>   (8 to 200 characters)");
  process.exit(1);
}

// The same format src/lib/passwords.ts reads: scrypt$N$r$p$salt$hash.
const N = 16384;
const R = 8;
const P = 1;
const salt = randomBytes(16);
const hash = scryptSync(password.normalize("NFKC"), salt, 32, { N, r: R, p: P });
const stored = ["scrypt", N, R, P, salt.toString("base64url"), hash.toString("base64url")].join("$");

// What a login compares (userNameKey in src/lib/accountRules.ts).
const nameKey = name.normalize("NFC").replace(/\s+/g, " ").trim().toLowerCase();
const quote = (text) => `'${text.replace(/'/g, "''")}'`;
const sql = [
  `UPDATE "User" SET "passwordHash" = ${quote(stored)} WHERE "nameKey" = ${quote(nameKey)};`,
  `DELETE FROM "Session" WHERE "userId" IN (SELECT "id" FROM "User" WHERE "nameKey" = ${quote(nameKey)});`,
].join("\n");

const file = path.join(os.tmpdir(), `lockstep-password-${process.pid}.sql`);
writeFileSync(file, sql, { encoding: "utf-8", mode: 0o600 });
let result;
try {
  result = spawnSync(
    process.execPath,
    [path.join(root, "node_modules", "prisma", "build", "index.js"), "db", "execute", "--file", file],
    { cwd: root, stdio: "inherit" },
  );
} finally {
  // It holds the password's hash: gone again either way.
  try {
    unlinkSync(file);
  } catch {
    // already gone
  }
}
if (result.status !== 0) process.exit(result.status ?? 1);
console.log(`If an account named "${name}" exists, its password is set and its devices are logged out.`);
