// Writes public/trainers/README.txt: every trainer picture the game packs
// expect, per trainerSet folder, in journey order - the list users follow when
// they bring their own pictures. Regenerate whenever a pack's levelcaps.json or
// game.json `trainerSet` changes, and after generate-trainer-sprite-map.mjs (the
// list marks trainers without an automatic picture from that map).
//
// Same rules as TrainerSprite and download-trainers.mjs: the folder is game.json
// `trainerSet` (default: the game id), the file is slugify(levelcaps `sprite` ??
// German name). Packs sharing a folder are listed together; their trainers are
// merged in pack order (game.json `sort`).
// Run: npm run generate:trainer-readme   (no network)
import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(root, "public", "trainers", "README.txt");

// Same as src/lib/slug.ts (pinned by trainerSprites.test.ts for the map
// generator's copy).
const slugify = (name) =>
  name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const readJson = async (file) => JSON.parse(await readFile(file, "utf-8"));

const packs = [];
for (const dir of await readdir(path.join(root, "data", "games"))) {
  const gameDir = path.join(root, "data", "games", dir);
  const game = await readJson(path.join(gameDir, "game.json"));
  let caps = [];
  try {
    caps = await readJson(path.join(gameDir, "levelcaps.json"));
  } catch {
    // a pack without bosses
  }
  packs.push({ id: dir, sort: game.sort ?? 999, set: game.trainerSet ?? dir, name: game.names.en, caps });
}
packs.sort((a, b) => a.sort - b.sort || a.id.localeCompare(b.id));

const spriteMap = await readJson(path.join(root, "data", "trainer-sprite-sources.json"));

// trainerSet -> { games: [names], trainers: Map<slug, {de, en}> }, in pack order.
const sets = new Map();
for (const pack of packs) {
  if (!sets.has(pack.set)) sets.set(pack.set, { games: [], trainers: new Map() });
  const set = sets.get(pack.set);
  set.games.push(pack.name);
  for (const cap of pack.caps) {
    const slug = slugify(cap.sprite ?? cap.names.de);
    if (!set.trainers.has(slug)) set.trainers.set(slug, { de: cap.names.de, en: cap.names.en });
  }
}

const allSlugs = new Set([...sets.values()].flatMap((s) => [...s.trainers.keys()]));
let withoutPicture = 0;

const sections = [];
for (const [folder, { games, trainers }] of sets) {
  if (trainers.size === 0) continue;
  const lines = [`  ${games.join(", ")}  ->  ${folder}/   (${trainers.size})`];
  for (const [slug, names] of trainers) {
    const label = names.en && names.en !== names.de ? `${names.de} (${names.en})` : names.de;
    const automatic = `${folder}/${slug}` in spriteMap.map;
    if (!automatic) withoutPicture++;
    lines.push(`    ${(slug + ".png").padEnd(28)}${label}${automatic ? "" : "   *"}`);
  }
  sections.push(lines.join("\n"));
}

const folderList = [...sets.entries()]
  .filter(([, s]) => s.trainers.size > 0)
  .map(([folder, s]) => `  ${(folder + "/").padEnd(24)}${s.games.join(", ")}`)
  .join("\n");

const text = `TRAINER AVATARS  (Reise / Journey page)
=======================================

PNGs shown next to each trainer. A missing file just shows an initial-letter
placeholder - never an error. These are NOT in the repo or the Docker image
(copyrighted art).

AUTOMATIC: on first start (Docker / Pinokio / Windows app / \`npm run setup\`)
the app downloads every mapped trainer from Pokemon Showdown into the
per-game folders below (scripts/download-trainers.mjs, map in
data/trainer-sprite-sources.json). Only missing files are fetched; set
TRAINER_SPRITES=off to skip it. Trainers marked * below have no picture on
Showdown under any name we know, so they show the letter placeholder unless
you add a file yourself.

YOUR OWN PICTURES ALWAYS WIN: a file you put here is never overwritten, and a
trainer that has a file of yours in this ROOT gets nothing downloaded for any
game. With Docker, mount THIS folder as /app/public/trainers. Recommended
size >=80x80px, square (shown as a circle).

LOOKUP ORDER for each trainer:
  1. /trainers/<trainerSet>/<slug>.png    game-specific (checked FIRST)
  2. /trainers/<slug>.png                 shared fallback (this root)
  3. initial-letter placeholder

So: put a file in the flat ROOT to use it for ALL games; put one in a
<trainerSet> subfolder to override it for that game only.

<slug> = German name, lowercased, accents stripped, spaces & "&" -> "-".
  Examples: Rocko->rocko, "Ben & Svenja"->ben-svenja,
  "Vorstand Athena & Rüpel"->vorstand-athena-rupel, "Kimono-Mädels"->kimono-madels.
  The slug always uses the GERMAN name, whatever UI language is set. Packs
  that only have English names (Infinite Fusion, most ROM hacks) therefore get
  English slugs (brock.png ...).

trainerSet SUBFOLDERS (one per base game; ROM hacks share their base game's
folder, so a picture there serves all of them):
${folderList}

NOTE ON THE RIVAL: every game calls its rival "Rivale" -> slug "rivale", but
it is a DIFFERENT character/look per game. Give each its own file in that
game's folder (red-blue/rivale.png, gold-silver/rivale.png, ...).
(FireRed/LeafGreen reuse the champion art for the rival -> firered uses champ.png.)
Recurring gym leaders/Elite Four (Rocko, Misty, ...) are the same person across
games: one file in the root is enough, unless you want generation-accurate art
- then drop a per-game copy in that game folder.

BY FOLDER - the games using it, then every trainer in journey order
(${allSlugs.size} distinct slugs, ${withoutPicture} entries marked * without an automatic picture).
A name listed under several folders can live once in the root instead.

${sections.join("\n\n")}

Generated by scripts/generate-trainer-readme.mjs (npm run generate:trainer-readme).
`;

await writeFile(OUT, text, "utf-8");
console.log(`trainers README: ${sets.size} folders, ${allSlugs.size} distinct slugs, ${withoutPicture} without an automatic picture`);
