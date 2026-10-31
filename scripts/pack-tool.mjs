// Tools for game packs - see docs/game-packs.md.
//
//   npm run pack -- from-text <list.txt> [--out <pack.json>]
//       A plain text list (one route / boss per line) -> a pack file.
//   npm run pack -- bundle <data/games/<id>> [--out <pack.json>]
//       A pack folder -> one pack file (the format the app imports).
//   npm run pack -- unbundle <pack.json> [--to data/games]
//       A pack file -> data/games/<id>/ (game.json, routes.json, levelcaps.json,
//       evolution-overrides.json), ready for a pull request.
//
// The output is not validated here (this script cannot load the TypeScript
// validator); run `npm run validate:packs` after unbundling, or import the
// file in the app, which checks it before saving.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const FORMAT = "lockstep-game-pack";
const [command, input, ...rest] = process.argv.slice(2);
const option = (name) => {
  const i = rest.indexOf(name);
  return i >= 0 ? rest[i + 1] : undefined;
};

function fail(message) {
  console.error("pack: " + message);
  process.exit(1);
}

// "English ; Deutsch" -> { en, de }; a missing German name reuses English.
function names(field) {
  const [en, de] = field.split(";").map((part) => part.trim());
  if (!en) return null;
  return { de: de || en, en };
}

const NUMBER_KEYS = new Set(["sort", "generation", "dataGeneration", "dexLimit"]);

function fromText(text) {
  const game = { names: {} };
  const routes = [];
  const levelcaps = [];
  let section = null;
  text.split(/\r?\n/).forEach((raw, index) => {
    const line = raw.replace(/\s+#.*$/, "").replace(/^#.*$/, "").trim();
    const where = `line ${index + 1}`;
    if (!line) return;
    const header = line.match(/^\[(\w+)\]$/);
    if (header) {
      section = header[1].toLowerCase();
      return;
    }
    if (section === "game") {
      const [key, ...value] = line.split("=");
      const k = key.trim();
      const v = value.join("=").trim();
      if (k === "name") for (const lang of ["de", "en"]) game.names[lang] = v;
      else if (k.startsWith("name.")) game.names[k.slice(5)] = v;
      else game[k] = NUMBER_KEYS.has(k) ? Number(v) : v;
    } else if (section === "routes") {
      const [label, de, flags = ""] = line.split(";").map((part) => part.trim());
      const route = { id: routes.length + 1, names: { de: de || label, en: label }, type: /static/.test(flags) ? "static" : "route" };
      if (/postgame/.test(flags)) route.postgame = true;
      routes.push(route);
    } else if (section === "levelcaps") {
      const [boss, place, badge = "", level = ""] = line.split("|").map((part) => part.trim());
      const bossNames = names(boss);
      const placeNames = names(place ?? "");
      if (!bossNames || !placeNames) fail(`${where}: a boss needs "Name | Place" at least`);
      levelcaps.push({
        id: levelcaps.length + 1,
        names: bossNames,
        location: placeNames,
        badge: names(badge),
        max_level: level ? Number(level) : null,
      });
    } else {
      fail(`${where}: text before the first [game], [routes] or [levelcaps] section`);
    }
  });
  game.dataStatus ??= "unverified";
  return { format: FORMAT, version: 1, game, routes, levelcaps };
}

async function readJson(file) {
  return JSON.parse(await readFile(file, "utf-8"));
}

async function bundle(dir) {
  const overrides = path.join(dir, "evolution-overrides.json");
  const pack = {
    format: FORMAT,
    version: 1,
    game: await readJson(path.join(dir, "game.json")),
    routes: await readJson(path.join(dir, "routes.json")),
    levelcaps: await readJson(path.join(dir, "levelcaps.json")),
  };
  if (existsSync(overrides)) pack.evolutionOverrides = await readJson(overrides);
  return pack;
}

async function unbundle(pack, to) {
  if (pack.format !== FORMAT) fail(`not a pack file (format must be "${FORMAT}")`);
  const id = pack.game?.id;
  if (!id) fail("the pack has no game.id");
  if (id.startsWith("custom-")) fail(`"${id}": drop the "custom-" prefix for a repository pack (set game.id first)`);
  const dir = path.join(to, id);
  await mkdir(dir, { recursive: true });
  const json = (value) => JSON.stringify(value, null, 2) + "\n";
  await writeFile(path.join(dir, "game.json"), json(pack.game));
  await writeFile(path.join(dir, "routes.json"), json(pack.routes));
  await writeFile(path.join(dir, "levelcaps.json"), json(pack.levelcaps));
  if (pack.evolutionOverrides?.length) await writeFile(path.join(dir, "evolution-overrides.json"), json(pack.evolutionOverrides));
  return dir;
}

async function write(value, out) {
  const text = JSON.stringify(value, null, 2) + "\n";
  if (out) {
    await writeFile(out, text);
    console.log("pack: wrote " + out);
  } else {
    process.stdout.write(text);
  }
}

if (!input) fail("usage: npm run pack -- from-text <list.txt> | bundle <folder> | unbundle <pack.json> [--to data/games]");
if (command === "from-text") await write(fromText(await readFile(input, "utf-8")), option("--out"));
else if (command === "bundle") await write(await bundle(input), option("--out"));
else if (command === "unbundle") console.log("pack: wrote " + (await unbundle(await readJson(input), option("--to") ?? path.join("data", "games"))));
else fail(`unknown command "${command}"`);
