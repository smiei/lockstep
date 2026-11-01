// Downloads the game covers into public/covers/<gameId>.webp, the same way
// download-trainers.mjs fetches the trainer pictures: once, at container start
// / `npm run setup` / the Windows app's start, onto the user's own machine -
// never into the repo or the Docker image (box art belongs to Nintendo / Game
// Freak / The Pokémon Company, or to a ROM hack's authors).
//
// Which file belongs to which game comes from data/cover-sources.json
// (game id -> URL): libretro-thumbnails' box art, and for the Switch games the
// infobox image of their English Wikipedia article. Each picture is scaled to
// fit 400x400 and saved as WebP with sharp, so a cover costs tens of
// kilobytes, not the hundreds a PNG of a photo would.
//
// The user's own pictures always win: an existing public/covers/<gameId>.webp
// or .png is never touched (GameCover reads either), which is also how a ROM
// hack without a source gets one.
// Off with COVERS=off. A read-only covers mount only produces one warning.
// Failures never stop the start; GameCover then draws its tile.
import { mkdir, readFile, writeFile, access } from "node:fs/promises";
import { constants, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, "..");
const outDir = path.join(rootDir, "public", "covers");
const mapFile = path.join(rootDir, "data", "cover-sources.json");
// Wikimedia asks for a User-Agent that names the tool and how to reach its author.
const USER_AGENT = "Lockstep cover download (https://github.com/smiei/lockstep; self-hosted, one-time)";
const SIZE = 400;
const CONCURRENCY = 4;

async function main() {
  if ((process.env.COVERS || "").trim().toLowerCase() === "off") {
    console.log("covers: COVERS=off - skipped");
    return;
  }
  const { covers } = JSON.parse(await readFile(mapFile, "utf-8"));
  const todo = Object.entries(covers).filter(
    ([gameId]) => !existsSync(path.join(outDir, `${gameId}.webp`)) && !existsSync(path.join(outDir, `${gameId}.png`)),
  );
  if (todo.length === 0) {
    console.log("covers: all present");
    return;
  }

  try {
    await mkdir(outDir, { recursive: true });
    await access(outDir, constants.W_OK);
  } catch {
    console.log("covers: " + outDir + " is not writable (read-only mount?) - skipped");
    return;
  }

  // Sword and Shield share one banner: fetch each URL once.
  const fetched = new Map();
  const load = (url) => {
    if (!fetched.has(url)) {
      fetched.set(
        url,
        fetch(url, { headers: { "User-Agent": USER_AGENT } }).then(async (res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return Buffer.from(await res.arrayBuffer());
        }),
      );
    }
    return fetched.get(url);
  };

  let done = 0;
  let failed = 0;
  const queue = [...todo];
  async function worker() {
    for (let next = queue.shift(); next; next = queue.shift()) {
      const [gameId, url] = next;
      try {
        const webp = await sharp(await load(url))
          .resize(SIZE, SIZE, { fit: "inside", withoutEnlargement: true })
          .webp({ quality: 82 })
          .toBuffer();
        await writeFile(path.join(outDir, `${gameId}.webp`), webp);
        done++;
      } catch (err) {
        failed++;
        console.log(`covers: ${gameId} <- ${url} failed (${err.message})`);
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  console.log(`covers: ${done} downloaded` + (failed ? `, ${failed} failed` : ""));
  if (failed) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
