// The startup steps of the Windows app (windows/Lockstep.cs), run before
// `next start` every time it starts. The same list as docker-entrypoint.sh and
// scripts/setup.mjs - a change to one belongs in all three:
//
// 1. sprites, badges and trainer pictures (only what's missing; a failure only
//    warns). They must be on disk BEFORE `next start`: Next serves only the
//    public/ files that exist when the server starts.
// 2. prisma migrate deploy - the one step that may fail the start.
// 3. the Encounter.familyId re-sync (warns only).
//
// Everything runs with this very node through the tools' JS entry points,
// because the Windows app ships node.exe without npm/npx.
// Run manually: node scripts/prepare-runtime.mjs
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function run(label, args, required = false) {
  console.log(`\n== ${label}`);
  const result = spawnSync(process.execPath, args, { cwd: rootDir, stdio: "inherit" });
  if (result.status === 0) return;
  if (required) {
    console.error(`ERROR: ${label} failed (exit ${result.status ?? result.error?.message}).`);
    process.exit(1);
  }
  console.warn(`WARNING: ${label} failed; the app still starts and retries at the next start.`);
}

run("Pokémon sprites", ["scripts/download-sprites.mjs"]);
run("Badge icons", ["scripts/download-badges.mjs"]);
run("Trainer pictures", ["scripts/download-trainers.mjs"]);
run("Database migrations", [path.join("node_modules", "prisma", "build", "index.js"), "migrate", "deploy"], true);
run("familyId re-sync", ["scripts/backfill-encounter-families.mjs"]);
console.log("\n== Ready");
