// Downloads boss-trainer pictures from Pokémon Showdown into public/trainers/,
// the same way download-sprites.mjs fetches the Pokémon sprites from PokéAPI:
// once, at container start / `npm run setup`, onto the user's own machine -
// never into the repo or the Docker image (the artwork belongs to Nintendo /
// Game Freak / The Pokémon Company; Showdown only hosts it).
//
// Which file belongs to which trainer comes from data/trainer-sprite-sources.json
// (`<trainerSet>/<slug>` -> Showdown name), the map the public instance already
// hotlinks with. Files land exactly where TrainerSprite looks first:
// public/trainers/<trainerSet>/<slug>.png.
//
// The user's own pictures always win:
// - an existing file at that path is never touched;
// - neither is a trainer whose flat fallback public/trainers/<slug>.png exists -
//   a downloaded game-specific file would otherwise shadow it.
//
// Off with TRAINER_SPRITES=off. A read-only trainers mount (the user supplies
// everything) only produces one warning. Failures never stop the start.
import { mkdir, readFile, writeFile, access } from "node:fs/promises";
import { constants, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, "..");
const outDir = path.join(rootDir, "public", "trainers");
const mapFile = path.join(rootDir, "data", "trainer-sprite-sources.json");
const CONCURRENCY = 6;

async function main() {
  if ((process.env.TRAINER_SPRITES || "").trim().toLowerCase() === "off") {
    console.log("trainers: TRAINER_SPRITES=off - skipped");
    return;
  }
  const { source, map } = JSON.parse(await readFile(mapFile, "utf-8"));

  const todo = Object.entries(map).filter(([key]) => {
    const slug = key.split("/").pop();
    return !existsSync(path.join(outDir, `${key}.png`)) && !existsSync(path.join(outDir, `${slug}.png`));
  });
  if (todo.length === 0) {
    console.log("trainers: all present");
    return;
  }

  try {
    await mkdir(outDir, { recursive: true });
    await access(outDir, constants.W_OK);
  } catch {
    console.log("trainers: " + outDir + " is not writable (read-only mount?) - skipped");
    return;
  }

  let done = 0;
  let failed = 0;
  const queue = [...todo];
  async function worker() {
    for (let next = queue.shift(); next; next = queue.shift()) {
      const [key, name] = next;
      const url = `${source}/${name}.png`;
      try {
        const res = await fetch(url, { headers: { "User-Agent": "lockstep-tracker (self-hosted, one-time download)" } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const file = path.join(outDir, `${key}.png`);
        await mkdir(path.dirname(file), { recursive: true });
        await writeFile(file, Buffer.from(await res.arrayBuffer()));
        done++;
      } catch (err) {
        failed++;
        console.log(`trainers: ${key} <- ${url} failed (${err.message})`);
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  console.log(`trainers: ${done} downloaded` + (failed ? `, ${failed} failed` : ""));
  if (failed) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
