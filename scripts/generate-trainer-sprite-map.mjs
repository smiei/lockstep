// Maps each of this app's trainers to a trainer sprite on Pokémon Showdown.
// scripts/download-trainers.mjs fetches them into public/trainers on every
// install; a public instance links them instead (src/lib/sprites.ts
// getTrainerSpriteUrl). Writes data/trainer-sprite-sources.json. Afterwards
// run `npm run generate:trainer-readme`, which marks trainers without one.
//
// A private instance shows the user's own trainer files (public/trainers, see
// TrainerSprite); a public one has none of those and would show a letter badge
// for every boss. Showdown hosts trainer sprites at
//   https://play.pokemonshowdown.com/sprites/trainers/<name>.png
// named after the English trainer, often with a generation suffix
// (`lorelei-gen1`, `lorelei-gen3`). The app requests them straight from the
// visitor's browser and only after they agreed to third-party images, exactly
// like the Pokémon sprites - nothing is stored or proxied here.
//
// The map key is `<trainerSet>/<slug>`, the same pair TrainerSprite already
// builds its local file paths from (trainerSet = game.json `trainerSet`, or the
// game id; slug = slugify(levelcaps `sprite` ?? German name) - the function is
// duplicated below and pinned against src/lib/slug.ts by trainerSprites.test.ts).
//
// Every candidate is checked with a HEAD request, and only what exists lands in
// `map`; the rest is listed under `unmapped` and simply keeps the letter badge.
// Run manually: node scripts/generate-trainer-sprite-map.mjs   (needs network)
import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "..", "data");
const OUT = path.join(dataDir, "trainer-sprite-sources.json");
const SOURCE = "https://play.pokemonshowdown.com/sprites/trainers";

const slugify = (name) =>
  name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

// Showdown's own naming: lower case, letters and digits only.
const showdownBase = (name) =>
  name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "");

// Trainers whose Showdown name cannot be derived from their English name: duos
// (Showdown has one sprite per person), the rivals (named by the player, or by
// which starter/gender they are) and a few classes. Checked like every other
// candidate - a stale entry just falls out of the map.
const ALIAS_BY_ENGLISH_NAME = {
  "maxie & tabitha": "maxie-gen3",
  "executive ariana & grunt": "ariana",
  "executive ariana": "ariana",
  "executive archer": "archer",
  "executive petrel": "petrel",
  "executive proton": "proton",
  "cilan, chili & cress": "cilan",
  "mars & jupiter": "mars",
  "tate & liza": "tateandliza-gen3",
  "kimono girls": "kimonogirl",
  "elder li": "li",
};
// Per game set. FireRed/LeafGreen's and Red/Blue's rival is Blue whatever the
// player calls him, and the level-cap data files him under `champ`; the Johto
// games' is Silver, Platinum's is Barry.
// Emerald's rival is Brendan or May depending on the PLAYER's gender, which the
// app does not know - so it is left out on purpose (letter badge) rather than
// shown as the wrong person.
const ALIAS_BY_SET_AND_SLUG = {
  "firered/champ": "blue-gen3",
  "infinite-fusion/champ": "blue-gen3",
  "gold-silver/rivale": "silver-gen2",
  "heartgold-soulsilver/rivale": "silver",
  "platinum/rivale": "barry",
  "red-blue/rivale": "blue-gen1",
  "red-blue/champ": "blue-gen1",
};
const SKIP_ON_PURPOSE = {
  "emerald/rivale": "Brendan or May depending on the player's gender - unknown to the app",
};

const GENERATIONS = [1, 2, 3, 4, 5, 6, 7, 8];

async function exists(name) {
  const url = `${SOURCE}/${name}.png`;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return (await fetch(url, { method: "HEAD" })).status === 200;
    } catch {
      await new Promise((r) => setTimeout(r, 400));
    }
  }
  return false;
}

async function main() {
  // (set/slug) -> what we know about that trainer
  const wanted = new Map();
  const gameDirs = await readdir(path.join(dataDir, "games"), { withFileTypes: true });
  for (const dir of gameDirs) {
    if (!dir.isDirectory()) continue;
    let game, caps;
    try {
      game = JSON.parse(await readFile(path.join(dataDir, "games", dir.name, "game.json"), "utf-8"));
      caps = JSON.parse(await readFile(path.join(dataDir, "games", dir.name, "levelcaps.json"), "utf-8"));
    } catch {
      continue;
    }
    const set = game.trainerSet ?? dir.name;
    for (const cap of caps) {
      const slug = slugify(cap.sprite ?? cap.names.de);
      const key = `${set}/${slug}`;
      if (!wanted.has(key)) wanted.set(key, { set, slug, en: cap.names.en, generation: game.generation });
    }
  }

  const map = {};
  const unmapped = {};
  const queue = [...wanted.entries()];
  const worker = async () => {
    while (queue.length > 0) {
      const [key, t] = queue.shift();
      if (SKIP_ON_PURPOSE[key]) {
        unmapped[key] = SKIP_ON_PURPOSE[key];
        continue;
      }
      const base = showdownBase(t.en);
      const candidates = [
        ALIAS_BY_SET_AND_SLUG[key],
        `${base}-gen${t.generation}`,
        base,
        ...GENERATIONS.map((g) => `${base}-gen${g}`),
        `${base}-lgpe`,
        ALIAS_BY_ENGLISH_NAME[t.en.toLowerCase()],
      ].filter((name, i, all) => name && all.indexOf(name) === i);
      let found = null;
      for (const name of candidates) {
        if (await exists(name)) {
          found = name;
          break;
        }
      }
      if (found) map[key] = found;
      else unmapped[key] = `no Showdown sprite found for "${t.en}"`;
    }
  };
  await Promise.all([worker(), worker(), worker(), worker()]);

  const sorted = (o) => Object.fromEntries(Object.entries(o).sort(([a], [b]) => a.localeCompare(b)));
  await writeFile(
    OUT,
    JSON.stringify(
      {
        "//": "Generated by scripts/generate-trainer-sprite-map.mjs - do not edit by hand. Used by scripts/download-trainers.mjs (every install) and, on a public instance, src/lib/sprites.ts.",
        source: SOURCE,
        generatedAt: new Date().toISOString(),
        map: sorted(map),
        unmapped: sorted(unmapped),
      },
      null,
      2,
    ) + "\n",
  );
  console.log(`${Object.keys(map).length} of ${wanted.size} trainers mapped, ${Object.keys(unmapped).length} without a sprite`);
  for (const [key, why] of Object.entries(sorted(unmapped))) console.log(`  ${key}: ${why}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
