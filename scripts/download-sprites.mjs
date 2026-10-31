// One-off script (not run at build/dev time): downloads the Pokémon battle
// sprites for every sprite set referenced by a game pack (game.json
// `spriteSet`) plus the Poké Ball item sprites from the PokeAPI sprite
// mirror, and saves them locally (public/pokemon-sprites/<set>/,
// public/ball-sprites/) so the running app never depends on an external CDN.
// Already-downloaded files are skipped, so re-runs only fetch what's missing.
// Run manually: node scripts/download-sprites.mjs
import { mkdir, writeFile, readFile, readdir, rename } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "..", "data");
const outRoot = path.join(__dirname, "..", "public", "pokemon-sprites");
const ballOutDir = path.join(__dirname, "..", "public", "ball-sprites");

// Sprite set name (game.json `spriteSet`) -> PokeAPI path + highest id the
// set contains.
// Gen 1/2 use the `transparent/` sub-folders: the default gen-i/gen-ii
// sprites carry a solid background, only the transparent variants have an
// alpha channel. Gen 3+ default sprites are already transparent.
const SPRITE_SETS = {
  "red-blue": { path: "versions/generation-i/red-blue/transparent", maxId: 151 },
  crystal: { path: "versions/generation-ii/crystal/transparent", maxId: 251 },
  // formFallbackPath: same-generation set to source a forme sprite from when
  // this one lacks it. In Gen 3 a Deoxys forme depended on the cartridge, so
  // Emerald only ships Speed while FireRed-LeafGreen ships Attack/Defense -
  // and every Gen 3 pack here renders with the Emerald set.
  emerald: {
    path: "versions/generation-iii/emerald",
    maxId: 386,
    formFallbackPath: "versions/generation-iii/firered-leafgreen",
  },
  "firered-leafgreen": { path: "versions/generation-iii/firered-leafgreen", maxId: 386 },
  platinum: { path: "versions/generation-iv/platinum", maxId: 493 },
  "black-white": { path: "versions/generation-v/black-white", maxId: 649 },
  "heartgold-soulsilver": { path: "versions/generation-iv/heartgold-soulsilver", maxId: 493 },
  // PokeAPI's default sprites (sprites/pokemon/<id>.png): every species up to
  // Gen 9 and every forme. A pack can pick it, and every other set borrows
  // from it what it lacks (MODERN below).
  modern: { path: "", maxId: 1025 },
};

// A species past a set's own range, or a forme the set never had (every Gen
// 6+ forme: Alolan Vulpix has no Emerald sprite), comes from the modern set
// instead - saved into the pack's own folder, so the app keeps asking for
// /pokemon-sprites/<set>/<id>.png and needs no fallback of its own. A ROM
// hack on an old engine with newer Pokémon therefore mixes the two styles,
// which beats a placeholder.
const MODERN = SPRITE_SETS.modern;

const spriteUrl = (spritePath, id) =>
  `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${spritePath ? `${spritePath}/` : ""}${id}.png`;

// Local ball id (see src/lib/catchrate.ts) -> PokeAPI item sprite name.
const BALLS = [
  "poke",
  "great",
  "ultra",
  "master",
  "safari",
  "net",
  "nest",
  "dive",
  "repeat",
  "timer",
  "luxury",
  "premier",
  "level",
  "lure",
  "moon",
  "friend",
  "love",
  "fast",
  "park",
  "quick",
  "dusk",
  "heal",
  "dream",
  "heavy",
  "sport",
  "cherish",
];

// Pokémon Infinite Fusion's own balls have no PokeAPI sprite: their icons come
// from the game's own repository (Graphics/Items), downloaded here like every
// other sprite and never committed. Local ball id -> file name in that folder.
const INFINITE_FUSION_BALLS = {
  gender: "GENDERBALL",
  boost: "TRADEBALL",
  ability: "ABILITYBALL",
  virus: "VIRUSBALL",
  glitter: "SHINYBALL",
  perfect: "PERFECTBALL",
  toxic: "TOXICBALL",
  spark: "SPARKBALL",
  scorch: "SCORCHBALL",
  frost: "FROSTBALL",
  pure: "PUREBALL",
  status: "STATUSBALL",
  candy: "CANDYBALL",
  rocket: "ROCKETBALL",
  fusion: "FUSIONBALL",
};

async function download(url, target) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  await writeFile(target, buffer);
}

// Pre-sprite-set layouts kept the emerald sprites flat in
// public/pokemon-sprites/*.png - move them into the emerald/ subfolder once
// instead of re-downloading ~386 files.
async function migrateFlatLayout() {
  if (!existsSync(outRoot)) return;
  const entries = await readdir(outRoot, { withFileTypes: true });
  const flat = entries.filter((e) => e.isFile() && /^\d+\.png$/.test(e.name));
  if (flat.length === 0) return;
  const emeraldDir = path.join(outRoot, "emerald");
  await mkdir(emeraldDir, { recursive: true });
  for (const file of flat) {
    const target = path.join(emeraldDir, file.name);
    if (!existsSync(target)) await rename(path.join(outRoot, file.name), target);
  }
  console.log(`migrated ${flat.length} flat sprites into emerald/`);
}

// Same rule as src/lib/customGames.ts: CUSTOM_GAMES_DIR, else `custom-games`
// beside the SQLite file of DATABASE_URL (relative paths are relative to prisma/).
function customGamesDir() {
  if (process.env.CUSTOM_GAMES_DIR) return path.resolve(process.env.CUSTOM_GAMES_DIR);
  const url = process.env.DATABASE_URL;
  if (process.env.TURSO_DATABASE_URL || !url?.startsWith("file:")) return null;
  const file = url.slice("file:".length).split("?")[0];
  const absolute = path.isAbsolute(file) ? file : path.resolve(process.cwd(), "prisma", file);
  return path.join(path.dirname(absolute), "custom-games");
}

async function main() {
  await migrateFlatLayout();

  // Which sets do the installed game packs need - the built-in ones and the
  // ones imported in the app (custom-games next to the database)? Per set the
  // highest dex number and data generation among its packs: how far it has
  // to borrow from the modern set.
  const sets = new Set();
  const setDex = new Map();
  const setGeneration = new Map();
  for (const root of [path.join(dataDir, "games"), customGamesDir()].filter(Boolean)) {
    let gameDirs = [];
    try {
      gameDirs = await readdir(root, { withFileTypes: true });
    } catch {
      continue; // no custom games yet
    }
    for (const dir of gameDirs) {
      if (!dir.isDirectory()) continue;
      try {
        const game = JSON.parse(await readFile(path.join(root, dir.name, "game.json"), "utf-8"));
        const set = game.spriteSet ?? "emerald";
        sets.add(set);
        setDex.set(set, Math.max(setDex.get(set) ?? 0, game.dexLimit ?? 0));
        setGeneration.set(set, Math.max(setGeneration.get(set) ?? 0, game.dataGeneration ?? game.generation ?? 0));
      } catch {
        // No game.json - skip.
      }
    }
  }

  const allPokemon = JSON.parse(await readFile(path.join(dataDir, "pokemon.json"), "utf-8"));
  // Species only: forme ids start at 10001 and are fetched separately below,
  // so they must not stretch the plain 1..maxId range.
  const maxKnownId = allPokemon
    .filter((p) => p.baseId === undefined)
    .map((p) => p.id)
    .reduce((a, b) => Math.max(a, b), 0);
  const formEntries = allPokemon.filter((p) => p.baseId !== undefined);

  for (const set of sets) {
    const config = SPRITE_SETS[set];
    if (!config) {
      console.warn(`[warn] unknown sprite set "${set}" - skipping`);
      continue;
    }
    const outDir = path.join(outRoot, set);
    await mkdir(outDir, { recursive: true });
    const ids = [];
    const lastId = Math.min(Math.max(config.maxId, setDex.get(set) ?? 0), maxKnownId);
    for (let id = 1; id <= lastId; id++) {
      if (!existsSync(path.join(outDir, `${id}.png`))) ids.push(id);
    }
    if (ids.length === 0) {
      console.log(`${set}: complete`);
      continue;
    }
    const batchSize = 10;
    for (let i = 0; i < ids.length; i += batchSize) {
      const batch = ids.slice(i, i + batchSize);
      await Promise.all(
        batch.map((id) =>
          download(
            spriteUrl(id <= config.maxId ? config.path : MODERN.path, id),
            path.join(outDir, `${id}.png`),
          ),
        ),
      );
      console.log(`${set}: ${Math.min(i + batchSize, ids.length)}/${ids.length}`);
      if (i + batchSize < ids.length) await new Promise((r) => setTimeout(r, 150));
    }
  }

  // Alternate-forme sprites (ids 10001+, see scripts/generate-forms.mjs).
  // Coverage is genuinely patchy per set - in the real games a Deoxys forme
  // depended on the cartridge, so PokeAPI only has Attack/Defense for
  // FireRed-LeafGreen and Speed for Emerald - and later formes (Rotom,
  // Giratina Origin, Shaymin Sky) don't exist before Gen 4 at all. The modern
  // set is the last resort; one missing even there is skipped, and
  // PokemonSprite falls back.
  for (const set of sets) {
    const config = SPRITE_SETS[set];
    if (!config) continue;
    const outDir = path.join(outRoot, set);
    const wanted = formEntries.filter(
      (f) =>
        f.baseId <= Math.max(config.maxId, setDex.get(set) ?? 0) &&
        (f.since ?? 0) <= (setGeneration.get(set) ?? 0) &&
        !existsSync(path.join(outDir, `${f.id}.png`)),
    );
    if (wanted.length === 0) continue;
    let saved = 0;
    for (const form of wanted) {
      // A Gen 6+ forme or one of a species past the set's range can only be
      // in the modern set; the others try the set itself first.
      const own = form.since === undefined && form.baseId <= config.maxId;
      const paths = own
        ? [...new Set([config.path, config.formFallbackPath, MODERN.path].filter((p) => p !== undefined))]
        : [MODERN.path];
      for (const spritePath of paths) {
        try {
          await download(spriteUrl(spritePath, form.id), path.join(outDir, `${form.id}.png`));
          saved++;
          break;
        } catch {
          // Not in this set - try the fallback, else leave it missing.
        }
      }
      await new Promise((r) => setTimeout(r, 80));
    }
    console.log(`${set}: ${saved}/${wanted.length} forme sprites`);
  }

  await mkdir(ballOutDir, { recursive: true });
  const missingBalls = BALLS.filter((b) => !existsSync(path.join(ballOutDir, `${b}.png`)));
  await Promise.all(
    missingBalls.map((ball) =>
      download(
        `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${ball}-ball.png`,
        path.join(ballOutDir, `${ball}.png`),
      ),
    ),
  );
  console.log(`ball sprites: ${missingBalls.length} downloaded, ${BALLS.length} total`);

  // allSettled: a missing icon only costs that one ball its picture (the
  // picker falls back to a blank square), never the rest of the run.
  const missingFusionBalls = Object.entries(INFINITE_FUSION_BALLS).filter(
    ([id]) => !existsSync(path.join(ballOutDir, `${id}.png`)),
  );
  const fusionResults = await Promise.allSettled(
    missingFusionBalls.map(([id, file]) =>
      download(
        `https://raw.githubusercontent.com/infinitefusion/infinitefusion-e18/HEAD/Graphics/Items/${file}.png`,
        path.join(ballOutDir, `${id}.png`),
      ),
    ),
  );
  const failedFusionBalls = fusionResults.filter((r) => r.status === "rejected").length;
  console.log(
    `Infinite Fusion ball sprites: ${missingFusionBalls.length - failedFusionBalls} downloaded, ${failedFusionBalls} failed`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
