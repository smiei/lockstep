// The build for a public instance (Vercel), in one command - vercel.json's
// buildCommand. `npm run build:public` does the same locally.
//
// The public/private switch is NEXT_PUBLIC_INSTANCE_MODE, and Next inlines it
// at build time. Setting it HERE, rather than asking for it in the Vercel
// project's environment variables, is deliberate: a build that forgot it would
// be a private instance, which lists every run in the database to every
// visitor - the one misconfiguration this deployment cannot afford. This way
// "built with the public command" and "public instance" are the same thing.
//
// Steps, in order:
// 1. prisma generate - the client lives in src/generated (gitignored), and on
//    Vercel nothing else has generated it. prisma.config.ts refuses to load
//    without a DATABASE_URL although generating never connects, so a
//    placeholder stands in when the environment has none.
// 2. Badge icons - a crop of a third-party sheet, so unlike the Pokémon sprites
//    they cannot be hotlinked (see src/lib/sprites.ts). A failed download fails
//    the build: a deployment without badges would stay that way until the next.
// 3. next build, through `npm run build` so the prebuild hook still generates
//    the app icons.
import { spawnSync } from "node:child_process";

const commit = process.env.VERCEL_GIT_COMMIT_SHA;
const env = {
  ...process.env,
  NEXT_PUBLIC_INSTANCE_MODE: "public",
  DATABASE_URL: process.env.DATABASE_URL || "file:./dev.db",
  // What the gear menu's Version line shows; there is no Docker tag to name.
  NEXT_PUBLIC_APP_VERSION: process.env.NEXT_PUBLIC_APP_VERSION || (commit ? `public-${commit.slice(0, 7)}` : "public"),
};

function run(command, args) {
  console.log(`\n> ${command} ${args.join(" ")}`);
  const result = spawnSync(command, args, { stdio: "inherit", env, shell: process.platform === "win32" });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run("npx", ["prisma", "generate"]);
run("node", ["scripts/download-badges.mjs"]);
run("npm", ["run", "build"]);
