// Sets the tracker up to run WITHOUT Docker, in one command: `npm run setup`,
// then `npm start`. It does what the Dockerfile and docker-entrypoint.sh do
// for the container, on Windows, macOS and Linux alike. Safe to re-run: after
// `git pull` + `npm install`, running it again applies new migrations, fetches
// sprites a new game pack needs and rebuilds.
//
// Steps, in order:
// 1. Node version check - Next 16 needs Node 20.9 or newer, and the error it
//    gives on an older one does not say so.
// 2. .env from .env.example when there is none and no DATABASE_URL is set in
//    the environment (a launcher such as Pinokio passes its own, pointing at a
//    database outside the app folder). The default puts the database at
//    prisma/dev.db.
// 3. prisma generate (the client lives in the gitignored src/generated),
//    prisma migrate deploy, then the Encounter.familyId re-sync the container
//    runs on every start.
// 4. Pokémon/ball sprites and badge icons. Not part of the repository
//    (copyrighted artwork), so they are downloaded here, once; files that
//    already exist are skipped. A failed download only warns, exactly like
//    the entrypoint: the app runs, with "?" placeholders until the next setup.
// 5. next build, through `npm run build` so the prebuild hook still generates
//    the app icons, with NEXT_PUBLIC_APP_VERSION taken from package.json so
//    the gear menu shows "3.1" rather than "dev".
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(root);

const [major, minor] = process.versions.node.split(".").map(Number);
if (major < 20 || (major === 20 && minor < 9)) {
  console.error(`Node.js ${process.versions.node} is too old. Install Node.js 20.9 or newer (the current LTS is fine): https://nodejs.org/`);
  process.exit(1);
}

if (!process.env.DATABASE_URL && !existsSync(".env")) {
  copyFileSync(".env.example", ".env");
  console.log("Created .env from .env.example (database: prisma/dev.db).");
}

const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const env = {
  ...process.env,
  NEXT_PUBLIC_APP_VERSION: process.env.NEXT_PUBLIC_APP_VERSION || pkg.version.split(".").slice(0, 2).join("."),
};

function run(command, args, warning) {
  console.log(`\n> ${command} ${args.join(" ")}`);
  const result = spawnSync(command, args, { stdio: "inherit", env, shell: process.platform === "win32" });
  if (result.status === 0) return;
  if (warning) {
    console.warn(`WARNING: ${warning}`);
    return;
  }
  console.error(`\nSetup stopped: "${command} ${args.join(" ")}" failed (exit code ${result.status ?? "unknown"}).`);
  if (command === "npx" && args[1] === "generate" && process.platform === "win32") {
    console.error("On Windows this usually means the app is still running and locks the database engine - stop it and run `npm run setup` again.");
  }
  process.exit(result.status ?? 1);
}

run("npx", ["prisma", "generate"]);
run("npx", ["prisma", "migrate", "deploy"]);
run("node", ["scripts/backfill-encounter-families.mjs"], "familyId re-sync failed; Species Clause warnings may be stale.");
run("node", ["scripts/download-sprites.mjs"], "sprite download failed; missing Pokémon images show a '?' until you run `npm run setup` again.");
run("node", ["scripts/download-badges.mjs"], "badge download failed; badges stay missing until you run `npm run setup` again.");
run("node", ["scripts/download-trainers.mjs"], "some trainer pictures failed to download; they show an initial letter until you run `npm run setup` again.");
run("node", ["scripts/download-covers.mjs"], "some game covers failed to download; they show a drawn tile until you run `npm run setup` again.");
run("npm", ["run", "build"]);

console.log(`
Setup complete (version ${env.NEXT_PUBLIC_APP_VERSION}).
Start the tracker with:  npm start
Then open http://localhost:3000 - other devices on your network can use this computer's address with port 3000.
Use another port with:   npm start -- -p 4000`);
