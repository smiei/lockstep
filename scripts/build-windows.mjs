// Builds the Windows app: a tray program (windows/Lockstep.cs) that runs the
// unchanged web app with a bundled Node.js, the way Jellyfin's Windows server
// does. Output in dist/:
//   windows/Lockstep/                 the app folder (Lockstep.exe, node\, app\)
//   Lockstep-<version>-windows-x64.zip
//   Lockstep-Setup-<version>.exe      when Inno Setup is installed (ISCC)
//
// The app folder holds what the Docker image's runner stage holds - and like
// the image, no Pokémon artwork: sprites, badges and trainer pictures are
// downloaded on the user's machine at first start (scripts/prepare-runtime.mjs).
//
// Runs on Windows only (csc.exe from .NET Framework compiles the tray program,
// and Prisma generates the Windows query engine). Used locally and by
// .github/workflows/windows.yml.
// Run: npm run build:windows   (APP_VERSION=5.0 overrides the version)
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { cp, mkdir, readFile, rm, writeFile, copyFile, readdir, realpath } from "node:fs/promises";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import ts from "typescript";

// Bundled Node.js: an LTS line with security support. Bump both together
// (hash from https://nodejs.org/dist/v<version>/SHASUMS256.txt).
const NODE_VERSION = "24.22.2";
const NODE_SHA256 = "ca1bff5d8ead13c9f2ea404a176db46bd430704d5b5113734049fa365e7799e2";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");
const stage = path.join(dist, "windows", "Lockstep");
const appDir = path.join(stage, "app");

if (process.platform !== "win32") {
  console.error("build-windows: run this on Windows.");
  process.exit(1);
}

// Windows' own bsdtar: a Git Bash PATH would find GNU tar, which reads "C:" as a host.
const tar = path.join(process.env.WINDIR || "C:\\Windows", "System32", "tar.exe");

const pkg = JSON.parse(await readFile(path.join(root, "package.json"), "utf-8"));
const version = (process.env.APP_VERSION || pkg.version.split(".").slice(0, 2).join(".")).replace(/^v/, "");
if (!/^\d+\.\d+$/.test(version)) {
  console.error(`build-windows: version must be MAJOR.MINOR, got "${version}".`);
  process.exit(1);
}

function run(command, args, options = {}) {
  console.log(`\n> ${command} ${args.join(" ")}`);
  const result = spawnSync(command, args, { stdio: "inherit", shell: command === "npm", ...options });
  if (result.status !== 0) {
    console.error(`build-windows: "${command} ${args.join(" ")}" failed.`);
    process.exit(1);
  }
}
const prisma = (args, env) =>
  run(process.execPath, [path.join("node_modules", "prisma", "build", "index.js"), ...args], { cwd: root, env: { ...process.env, ...env } });

// 1. Prisma client (Windows engine) and the production build, against a
//    throwaway database: the build needs DATABASE_URL and the real schema, as
//    in the Dockerfile's builder stage.
const buildDb = path.join(os.tmpdir(), `lockstep-build-${process.pid}.db`);
const buildEnv = { DATABASE_URL: `file:${buildDb.replace(/\\/g, "/")}` };
prisma(["generate"], buildEnv);
prisma(["migrate", "deploy"], buildEnv);
run("npm", ["run", "build"], { cwd: root, env: { ...process.env, ...buildEnv, NEXT_PUBLIC_APP_VERSION: version } });
await rm(buildDb, { force: true });

// 2. The app folder: the Docker runner's file list, minus every downloaded image.
// Retries: a virus scanner or indexer briefly holds files of the last build.
await rm(path.join(dist, "windows"), { recursive: true, force: true, maxRetries: 10, retryDelay: 500 });
await mkdir(appDir, { recursive: true });
const DOWNLOADED = ["pokemon-sprites", "ball-sprites", "badges"].map((d) => path.join(root, "public", d));
const skip = (src) =>
  DOWNLOADED.some((d) => src === d || src.startsWith(d + path.sep)) ||
  (src.startsWith(path.join(root, "public", "trainers")) && src.endsWith(".png")) ||
  src.startsWith(path.join(root, ".next", "cache")) ||
  src.startsWith(path.join(root, ".next", "node_modules")) ||
  /\.db(-journal)?$/.test(src);
for (const entry of ["package.json", "package-lock.json", ".next", "data", "scripts", "public", "prisma", "src/generated", "prisma.config.ts"]) {
  await cp(path.join(root, entry), path.join(appDir, entry), { recursive: true, filter: (src) => !skip(src) });
}
// next.config as plain JavaScript: a .ts config makes `next start` compile it
// with SWC, which the pruning below removes - Next would then download its
// compiler (~130 MB) on the user's first start.
const nextConfig = ts.transpileModule(await readFile(path.join(root, "next.config.ts"), "utf-8"), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
await writeFile(path.join(appDir, "next.config.mjs"), nextConfig, "utf-8");

// Turbopack reaches server packages it keeps external through links with
// hashed names in .next/node_modules (@libsql/client-<hash> -> the package).
// On Windows they are junctions with ABSOLUTE paths into this build folder, so
// they cannot ship. They become real copies of the (pruned) packages below -
// about 16 MB, and nothing has to be linked on the user's machine.
const links = [];
const linkRoot = path.join(root, ".next", "node_modules");
if (existsSync(linkRoot)) {
  for (const scope of await readdir(linkRoot)) {
    const scopeDir = path.join(linkRoot, scope);
    const names = scope.startsWith("@") ? (await readdir(scopeDir)).map((n) => path.join(scope, n)) : [scope];
    for (const name of names) {
      const target = path.relative(root, await realpath(path.join(linkRoot, name)));
      if (!target.startsWith("node_modules" + path.sep)) throw new Error(`Unexpected link target for ${name}: ${target}`);
      links.push({ link: path.join(".next", "node_modules", name).replace(/\\/g, "/"), target: target.replace(/\\/g, "/") });
    }
  }
}
run("npm", ["ci", "--omit=dev", "--no-audit", "--no-fund"], { cwd: appDir });

// Prune what `next start` and the Prisma CLI never load - roughly a third of
// the download: source maps, Next's SWC compiler (only `next build` uses it),
// Next's bundled docs, and Prisma's WASM engines for other databases.
const OTHER_DBS = /^query_(compiler|engine)_bg\.(cockroachdb|mysql|postgresql|sqlserver)\./;
async function prune(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await prune(full);
    else if (entry.name.endsWith(".map") || OTHER_DBS.test(entry.name)) await rm(full);
  }
}
const modules = path.join(appDir, "node_modules");
await prune(modules);
for (const dir of await readdir(path.join(modules, "@next"))) {
  if (dir.startsWith("swc-")) await rm(path.join(modules, "@next", dir), { recursive: true });
}
for (const { link, target } of links) {
  await cp(path.join(appDir, target), path.join(appDir, link), { recursive: true });
}
console.log(`Copied ${links.length} externalised packages into .next/node_modules.`);
await rm(path.join(modules, "next", "dist", "docs"), { recursive: true, force: true });
for (const file of ["LICENSE", "THIRD_PARTY_NOTICES.md"]) await copyFile(path.join(root, file), path.join(stage, file));
await copyFile(path.join(root, "LICENSE"), path.join(stage, "LICENSE.txt"));

// 3. Node.js, checked against the pinned hash.
const nodeName = `node-v${NODE_VERSION}-win-x64`;
const cacheDir = path.join(dist, "cache");
const nodeZip = path.join(cacheDir, `${nodeName}.zip`);
await mkdir(cacheDir, { recursive: true });
if (!existsSync(nodeZip)) {
  console.log(`\nDownloading Node.js ${NODE_VERSION}...`);
  const response = await fetch(`https://nodejs.org/dist/v${NODE_VERSION}/${nodeName}.zip`);
  if (!response.ok) throw new Error(`Node.js download failed: HTTP ${response.status}`);
  await writeFile(nodeZip, Buffer.from(await response.arrayBuffer()));
}
const hash = createHash("sha256").update(await readFile(nodeZip)).digest("hex");
if (hash !== NODE_SHA256) {
  await rm(nodeZip, { force: true });
  throw new Error(`Node.js zip hash mismatch (${hash}); deleted it, run again.`);
}
const extract = path.join(cacheDir, nodeName);
if (!existsSync(extract)) run(tar, ["-xf", nodeZip, "-C", cacheDir]);
await mkdir(path.join(stage, "node"), { recursive: true });
for (const file of ["node.exe", "LICENSE"]) await copyFile(path.join(extract, file), path.join(stage, "node", file));

// 4. The icon (the project's own logo) and the tray program.
const SIZES = [16, 24, 32, 48, 64, 128, 256];
const svg = await readFile(path.join(root, "branding", "icon.svg"));
const pngs = await Promise.all(SIZES.map((size) => sharp(svg, { density: 384 }).resize(size, size).png().toBuffer()));
const header = Buffer.alloc(6 + 16 * pngs.length);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(pngs.length, 4);
let offset = header.length;
pngs.forEach((png, i) => {
  const at = 6 + 16 * i;
  header.writeUInt8(SIZES[i] % 256, at);
  header.writeUInt8(SIZES[i] % 256, at + 1);
  header.writeUInt16LE(1, at + 4);
  header.writeUInt16LE(32, at + 6);
  header.writeUInt32LE(png.length, at + 8);
  header.writeUInt32LE(offset, at + 12);
  offset += png.length;
});
const ico = path.join(stage, "Lockstep.ico");
await writeFile(ico, Buffer.concat([header, ...pngs]));

const source = (await readFile(path.join(root, "windows", "Lockstep.cs"), "utf-8"))
  .replace('public const string Version = "0.0.0.0";', `public const string Version = "${version}.0.0";`);
const sourceFile = path.join(dist, "windows", "Lockstep.cs");
await writeFile(sourceFile, source, "utf-8");
const csc = path.join(process.env.WINDIR || "C:\\Windows", "Microsoft.NET", "Framework64", "v4.0.30319", "csc.exe");
run(csc, [
  "/nologo", "/target:winexe", "/platform:x64", "/optimize+", "/codepage:65001",
  `/win32icon:${ico}`, `/out:${path.join(stage, "Lockstep.exe")}`,
  "/r:System.Windows.Forms.dll", "/r:System.Drawing.dll", sourceFile,
]);

// 5. Zip, and the installer when Inno Setup is there.
const zip = path.join(dist, `Lockstep-${version}-windows-x64.zip`);
await rm(zip, { force: true });
run(tar, ["-a", "-c", "-f", zip, "-C", path.join(dist, "windows"), "Lockstep"]);

const iscc = [process.env.ISCC, "C:\\Program Files (x86)\\Inno Setup 6\\ISCC.exe", "C:\\Program Files\\Inno Setup 6\\ISCC.exe"].find((p) => p && existsSync(p));
if (iscc) {
  run(iscc, [`/DAppVersion=${version}`, `/DSourceDir=${stage}`, `/DOutputDir=${dist}`, path.join(root, "windows", "lockstep.iss")]);
} else {
  console.log("\nInno Setup (ISCC.exe) not found: skipped the installer. The zip is complete.");
}

const files = (await readdir(dist)).filter((f) => f.startsWith("Lockstep-"));
console.log(`\nDone - Lockstep ${version} for Windows:\n${files.map((f) => `  dist/${f}`).join("\n")}`);
