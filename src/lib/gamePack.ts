// Game packs as data a contributor (or a user, see importGamePack) can hand in:
// the one validator both CI (`npm run validate:packs`) and the in-app import
// run, plus the single-file "bundle" format the import takes. Client-safe and
// pure - no fs, no Prisma - so the New-Run dialog can check a file before it
// is uploaded. docs/game-packs.md is the human-readable version of these rules.
import { LANGS } from "@/lib/i18n/dictionary";

// Sprite sets scripts/download-sprites.mjs knows how to fetch (its
// SPRITE_SETS keys - gamePacks.test.ts keeps the two in step).
export const SPRITE_SET_IDS = [
  "red-blue",
  "crystal",
  "emerald",
  "firered-leafgreen",
  "platinum",
  "heartgold-soulsilver",
  "black-white",
  "modern",
] as const;

export const PACK_KINDS = ["official", "romhack", "fangame"] as const;
export type PackKind = (typeof PACK_KINDS)[number];

const ROUTE_TYPES = ["route", "static"];
const OVERRIDE_CATEGORIES = ["impossible", "easier", "timeBased"];
// Evolution-override method kinds and the fields each one needs.
const METHOD_FIELDS: Record<string, Record<string, "number" | "string">> = {
  level: { level: "number" },
  item: { item: "string" },
  happiness: {},
  levelHeld: { item: "string" },
  levelWith: { name: "string" },
  levelMove: { move: "string" },
  levelParty: { species: "string" },
  levelLocation: { location: "string" },
  shed: {},
  trade: {},
  beauty: {},
  other: {},
};

// game.json keys a contributed pack may use. The Infinite Fusion packs carry
// a few more (species, speciesData, fusion, ...), which need code of their own
// and so are not open to contributions; they are accepted with a warning.
const GAME_KEYS = new Set([
  "id",
  "sort",
  "kind",
  // Retired in 5.3 (the "data unverified" note); still accepted so packs
  // made before validate.
  "dataStatus",
  "generation",
  "dataGeneration",
  "dexLimit",
  "spriteSet",
  "versionGroup",
  "trainerSet",
  "names",
  // Where a generated pack came from (scripts/import-nuzlocke-app.mjs).
  "source",
  // Regional forms are catchable (GameInfo.regionalForms).
  "regionalForms",
]);
const BUILT_IN_ONLY_GAME_KEYS = new Set(["species", "nameLang", "speciesData", "fusion", "sourceVersion", "sourceDate"]);

// Where a custom (imported) pack's id must start, so it can never collide
// with a built-in pack, now or after a later release adds one.
export const CUSTOM_PACK_PREFIX = "custom-";

export function isCustomPackId(id: string): boolean {
  return id.startsWith(CUSTOM_PACK_PREFIX);
}

export const BUNDLE_FORMAT = "lockstep-game-pack";

export type GamePackBundle = {
  format: typeof BUNDLE_FORMAT;
  version: 1;
  game: Record<string, unknown>;
  routes: Record<string, unknown>[];
  levelcaps: Record<string, unknown>[];
  evolutionOverrides?: Record<string, unknown>[];
};

export type PackFile = "bundle" | "game" | "routes" | "levelcaps" | "evolution-overrides";

export type PackIssue = {
  level: "error" | "warning";
  file: PackFile;
  // Where in the file: "routes[3].names.de", "levelcaps", "".
  at: string;
  message: string;
};

export type PackContext = {
  // Highest national-dex id in data/pokemon.json (formes excluded).
  maxDexId: number;
  // Version groups with movesets/learnsets/TM data (data/movesets/<vg>.json).
  versionGroups: readonly string[];
  // When validating an import: ids already taken by built-in packs.
  builtInIds?: readonly string[];
  // The pack is a user import, not a repository pack: its id must carry
  // CUSTOM_PACK_PREFIX.
  custom?: boolean;
};

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const isInt = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v);
const isNonEmpty = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;

class Collector {
  issues: PackIssue[] = [];
  error(file: PackFile, at: string, message: string) {
    this.issues.push({ level: "error", file, at, message });
  }
  warn(file: PackFile, at: string, message: string) {
    this.issues.push({ level: "warning", file, at, message });
  }
}

// de and en are required (the maintainer's two reviewed languages); fr/es/it
// are optional and fall back to English in the app.
function checkNames(c: Collector, file: PackFile, at: string, value: unknown) {
  if (!isObj(value)) {
    c.error(file, at, "must be an object of names per language, e.g. { \"de\": \"…\", \"en\": \"…\" }");
    return;
  }
  for (const lang of ["de", "en"]) {
    if (!isNonEmpty(value[lang])) c.error(file, `${at}.${lang}`, "is required");
  }
  for (const [lang, name] of Object.entries(value)) {
    if (!(LANGS as readonly string[]).includes(lang)) c.warn(file, `${at}.${lang}`, `unknown language (use ${LANGS.join(", ")})`);
    else if (typeof name !== "string") c.error(file, `${at}.${lang}`, "must be text");
  }
}

function checkUniqueIds(c: Collector, file: PackFile, list: Record<string, unknown>[]) {
  const seen = new Set<number>();
  list.forEach((entry, i) => {
    const id = entry.id;
    if (!isInt(id) || id < 1) {
      c.error(file, `${file}[${i}].id`, "must be a whole number from 1 up");
      return;
    }
    if (seen.has(id)) c.error(file, `${file}[${i}].id`, `id ${id} is used twice - ids must be unique and never reused`);
    seen.add(id);
  });
}

function checkGame(c: Collector, game: unknown, ctx: PackContext) {
  if (!isObj(game)) {
    c.error("game", "", "must be an object");
    return;
  }
  for (const key of Object.keys(game)) {
    if (BUILT_IN_ONLY_GAME_KEYS.has(key)) c.warn("game", key, "is only supported for the built-in Infinite Fusion packs");
    else if (!GAME_KEYS.has(key)) c.warn("game", key, "is not a known field and will be ignored");
  }
  const id = game.id;
  if (typeof id !== "string" || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id)) {
    c.error("game", "id", "must be lowercase letters, digits and dashes, e.g. \"radical-red\"");
  } else {
    if (ctx.custom && !id.startsWith(CUSTOM_PACK_PREFIX)) {
      c.error("game", "id", `must start with "${CUSTOM_PACK_PREFIX}" for an imported game, e.g. "${CUSTOM_PACK_PREFIX}${id}"`);
    }
    if (!ctx.custom && id.startsWith(CUSTOM_PACK_PREFIX)) {
      c.error("game", "id", `"${CUSTOM_PACK_PREFIX}" is reserved for games imported in the app`);
    }
    if (ctx.builtInIds?.includes(id)) c.error("game", "id", `"${id}" is a built-in game`);
  }
  if (!isInt(game.sort)) c.error("game", "sort", "must be a whole number (position in the game list)");
  if (game.kind !== undefined && !(PACK_KINDS as readonly unknown[]).includes(game.kind)) {
    c.error("game", "kind", `must be one of ${PACK_KINDS.join(", ")}`);
  }
  for (const key of ["generation", "dataGeneration"] as const) {
    const value = game[key];
    if (value === undefined && key === "dataGeneration") continue;
    if (!isInt(value) || value < 1 || value > 9) c.error("game", key, "must be a generation from 1 to 9");
  }
  if (isInt(game.generation) && isInt(game.dataGeneration) && game.dataGeneration < game.generation) {
    c.warn("game", "dataGeneration", "is older than generation - usually it is the same or newer (a modern hack on an old engine)");
  }
  if (!isInt(game.dexLimit) || game.dexLimit < 1 || game.dexLimit > ctx.maxDexId) {
    c.error("game", "dexLimit", `must be a national-dex number from 1 to ${ctx.maxDexId}`);
  }
  if (!(SPRITE_SET_IDS as readonly unknown[]).includes(game.spriteSet)) {
    c.error("game", "spriteSet", `must be one of ${SPRITE_SET_IDS.join(", ")}`);
  }
  if (!ctx.versionGroups.includes(game.versionGroup as string)) {
    c.error("game", "versionGroup", `must be one of ${ctx.versionGroups.join(", ")} (move and TM data exist for these)`);
  }
  if (game.regionalForms !== undefined && typeof game.regionalForms !== "boolean") {
    c.error("game", "regionalForms", "must be true or false");
  }
  if (game.trainerSet !== undefined && (typeof game.trainerSet !== "string" || !/^[a-z0-9-]+$/.test(game.trainerSet))) {
    c.error("game", "trainerSet", "must be lowercase letters, digits and dashes");
  }
  checkNames(c, "game", "names", game.names);
}

function checkRoutes(c: Collector, routes: unknown) {
  if (!Array.isArray(routes) || routes.length === 0) {
    c.error("routes", "", "must be a non-empty list of routes");
    return;
  }
  const list = routes.filter(isObj);
  if (list.length !== routes.length) c.error("routes", "", "every entry must be an object");
  checkUniqueIds(c, "routes", list);
  list.forEach((route, i) => {
    checkNames(c, "routes", `routes[${i}].names`, route.names);
    if (!ROUTE_TYPES.includes(route.type as string)) c.error("routes", `routes[${i}].type`, "must be \"route\" or \"static\"");
    if (route.postgame !== undefined && typeof route.postgame !== "boolean") {
      c.error("routes", `routes[${i}].postgame`, "must be true or false");
    }
  });
}

function checkLevelCaps(c: Collector, caps: unknown) {
  if (!Array.isArray(caps) || caps.length === 0) {
    c.error("levelcaps", "", "must be a non-empty list of boss fights");
    return;
  }
  const list = caps.filter(isObj);
  if (list.length !== caps.length) c.error("levelcaps", "", "every entry must be an object");
  checkUniqueIds(c, "levelcaps", list);
  let last = 0;
  list.forEach((cap, i) => {
    const at = `levelcaps[${i}]`;
    checkNames(c, "levelcaps", `${at}.names`, cap.names);
    checkNames(c, "levelcaps", `${at}.location`, cap.location);
    if (cap.badge !== null && cap.badge !== undefined) checkNames(c, "levelcaps", `${at}.badge`, cap.badge);
    const level = cap.max_level;
    if (level !== null && (!isInt(level) || level < 1 || level > 100)) {
      c.error("levelcaps", `${at}.max_level`, "must be a level from 1 to 100, or null for a fight without a cap");
    } else if (isInt(level)) {
      if (level < last) c.warn("levelcaps", `${at}.max_level`, `${level} is lower than an earlier cap (${last}) - is the order right?`);
      last = Math.max(last, level);
    }
    if (cap.sprite !== undefined && typeof cap.sprite !== "string") c.error("levelcaps", `${at}.sprite`, "must be text");
  });
  // The Journey/Overview progress bars mark where the Elite Four starts by
  // location.en === "Elite Four" (eliteFourIndex) - one contiguous block.
  const e4 = list
    .map((cap, i) => (isObj(cap.location) && cap.location.en === "Elite Four" ? i : -1))
    .filter((i) => i >= 0);
  if (e4.length > 0 && e4[e4.length - 1] - e4[0] !== e4.length - 1) {
    c.error("levelcaps", "", "the Elite Four entries (location.en \"Elite Four\") must follow each other without gaps");
  }
  if (e4.length === 0) c.warn("levelcaps", "", "no Elite Four block (location.en \"Elite Four\") - the progress bar shows no Elite Four marker");
}

function checkOverrides(c: Collector, overrides: unknown, ctx: PackContext) {
  if (overrides === undefined) return;
  if (!Array.isArray(overrides)) {
    c.error("evolution-overrides", "", "must be a list");
    return;
  }
  overrides.forEach((entry, i) => {
    const at = `evolutionOverrides[${i}]`;
    if (!isObj(entry)) {
      c.error("evolution-overrides", at, "must be an object");
      return;
    }
    for (const key of ["from", "to"]) {
      const id = entry[key];
      if (!isInt(id) || id < 1 || (id > ctx.maxDexId && id < 10001)) {
        c.error("evolution-overrides", `${at}.${key}`, "must be a national-dex number (or a forme id from 10001)");
      }
    }
    if (entry.category !== undefined && !OVERRIDE_CATEGORIES.includes(entry.category as string)) {
      c.error("evolution-overrides", `${at}.category`, `must be one of ${OVERRIDE_CATEGORIES.join(", ")}`);
    }
    const method = entry.method;
    if (!isObj(method) || typeof method.kind !== "string" || !(method.kind in METHOD_FIELDS)) {
      c.error("evolution-overrides", `${at}.method.kind`, `must be one of ${Object.keys(METHOD_FIELDS).join(", ")}`);
      return;
    }
    for (const [field, type] of Object.entries(METHOD_FIELDS[method.kind])) {
      if (typeof method[field] !== type) c.error("evolution-overrides", `${at}.method.${field}`, `is required (${type}) for kind "${method.kind}"`);
    }
  });
}

// The pack's four parts, as they sit in data/games/<id>/ or in a bundle.
export type PackParts = {
  game: unknown;
  routes: unknown;
  levelcaps: unknown;
  evolutionOverrides?: unknown;
};

export function validatePackParts(parts: PackParts, ctx: PackContext): PackIssue[] {
  const c = new Collector();
  checkGame(c, parts.game, ctx);
  checkRoutes(c, parts.routes);
  checkLevelCaps(c, parts.levelcaps);
  checkOverrides(c, parts.evolutionOverrides, ctx);
  return c.issues;
}

// A bundle (one JSON file holding the whole pack) - what the in-app import
// and `npm run pack:from-text` produce and take.
export function validateBundle(bundle: unknown, ctx: PackContext): PackIssue[] {
  if (!isObj(bundle) || bundle.format !== BUNDLE_FORMAT) {
    return [{ level: "error", file: "bundle", at: "format", message: `not a game pack file (expected "format": "${BUNDLE_FORMAT}")` }];
  }
  if (bundle.version !== 1) {
    return [{ level: "error", file: "bundle", at: "version", message: "unsupported version (this app reads version 1)" }];
  }
  return validatePackParts(
    { game: bundle.game, routes: bundle.routes, levelcaps: bundle.levelcaps, evolutionOverrides: bundle.evolutionOverrides },
    ctx,
  );
}

export function hasErrors(issues: PackIssue[]): boolean {
  return issues.some((issue) => issue.level === "error");
}

export function formatIssue(issue: PackIssue): string {
  const where = issue.at ? `${issue.file}: ${issue.at}` : issue.file;
  return `${issue.level === "error" ? "✗" : "!"} ${where} - ${issue.message}`;
}
