# Development

[← Back to the README](../README.md)

## Tech stack

- Next.js 16 (App Router) and TypeScript
- Tailwind CSS v4
- Prisma 6 with SQLite (a hosted libSQL database for the optional public deployment)
- Vitest and ESLint
- Docker for the published image

## Local setup

```bash
npm install
cp .env.example .env
npx prisma migrate dev
npm run download:sprites
npm run download:badges
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000). For checking a production build, `npm run build && npm start` (or `npm run setup && npm start`) is closer to what users run than the dev server.

## npm scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Dev server with hot reload. |
| `npm run build` / `npm start` | Production build / start. |
| `npm run setup` | Everything a non-Docker install needs, in one go: `.env`, `prisma generate`, migrations, sprite and badge download, build. See [self-hosting](self-hosting.md#without-docker). |
| `npm run download:sprites` | Downloads the battle sprites for every sprite set a game pack uses from PokéAPI into `public/pokemon-sprites/<set>/`, skipping files that already exist. The sprites are deliberately not part of this repository (copyrighted artwork). Re-run after adding a game pack with a new sprite set. |
| `npm run download:badges` | Downloads the badge sheet and crops it into one icon per badge in `public/badges/`. Not part of the repository either. |
| `npm run generate:evolutions` | Regenerates `data/evolutions.json`, evolution lines with their methods, from PokéAPI. Only needed when `data/pokemon.json` changes. Randomizer changes live in `data/evolution-overrides.json` and survive regeneration. |
| `npm run download:catchrates` | Regenerates `data/catchrates.json` from PokéAPI. |
| `npm run generate:names` | Regenerates the localized names in `data/pokemon.json` and every pack's `routes.json` / `levelcaps.json` from PokéAPI plus curated tables. German and English values are never overwritten. |
| `npm run generate:learnsets` | Regenerates the move data from PokéAPI: `data/learnsets/<versionGroup>.json`, `data/movesets/<versionGroup>.json`, `data/tm-compat/<versionGroup>.json` and `data/moves.json`. |
| `npm run generate:if-species` / `npm run generate:if-moves` | Regenerate Infinite Fusion's species table and move data from the game's own data files. |
| `npm run generate:trainer-readme` | Rewrites `public/trainers/README.txt`, the list of trainer pictures each game folder expects, marking those without an automatic picture. Run after level caps or the sprite map change. |
| `npm run generate:trainer-sprites` | Regenerates `data/trainer-sprite-sources.json`, the map of boss trainers to Pokémon Showdown pictures that the trainer download (and the public deployment) use. Needs the network, about 2 minutes. |
| `npm run lint` | ESLint. |
| `npm run build:windows` | Windows only: builds the Windows app into `dist/` (tray program, bundled Node.js, the app; a zip, plus the installer when [Inno Setup](https://jrsoftware.org/isinfo.php) is installed). Set `APP_VERSION` to override the version. |
| `npm test` | Unit tests for the pure logic, plus a guard test that checks the UI conventions in the source tree. |

All generated data is committed. The generators only need re-running when the underlying data changes.

## Data

All reference data is read from disk at runtime and never copied into the database. Edits take effect without a rebuild, even inside a running container with `data/` mounted.

**Game-independent data** lives in `data/`:
- `pokemon.json`: national dex 1–1025, plus alternate formes such as Deoxys, Rotom and the Alolan, Galarian, Hisuian and Paldean forms. A forme from Gen 6 on carries `since` (its generation) and only appears in packs of that data generation or newer.
- `fakemon.json`: Pokémon only a ROM hack has, each tied to its pack, ids from 20001 on (permanent).
- `evolutions.json`, the type charts and `catchrates.json`; `form-evolutions.json` adds how regional forms evolve, which PokéAPI's chains leave out.
- The move data: `moves.json`, `learnsets/`, `movesets/`, `tm-compat/`. The version group `modern` is the app's own: per Pokémon the moves of the newest game that has them, for ROM hacks on current data (`node scripts/generate-learnsets.mjs modern` regenerates only that one).
- Four correction tables that restore what a value was in the generation being played: `pokemon-history.json`, `move-type-history.json`, `move-name-history.json`, `catchrate-history.json`.
- `shared/`: the official names the game packs are built from, each with the script that fetches it:
  - places: `place-names.json` (`generate-place-names.mjs`, PokéWiki) and the hand-made `place-name-overrides.json`, applied by `localize-places.mjs`;
  - bosses: `trainer-names.json` (`generate-trainer-names.mjs`, Bulbapedia); badges: `badge-names.json` (`generate-badge-names.mjs`, PokéWiki);
  - a ROM hack's changed stats and types: `<id>-species.json` (`import-nuzlocke-app.mjs`).

**Game packs** live in `data/games/<gameId>/`:
- `game.json`: names, generation, dex limit, sprite set, version group, and `regionalForms` when regional forms are caught on routes;
- `routes.json` and `levelcaps.json`;
- optionally `evolution-overrides.json`.

Each run is bound to one pack. Adding another game of a supported generation means adding a folder; no code changes.

**Route IDs** are referenced by the database and must never be renumbered or reused. The array order is the display order and can be changed freely.

## Database migrations

```bash
npx prisma migrate dev --name <description>
```

This creates and applies a new migration locally. Docker, `npm run setup` and the Pinokio launcher apply pending migrations automatically (`prisma migrate deploy`).

## Releasing

Each release:
1. Bump `version` in `package.json` (`MAJOR.MINOR.0`, also the two root fields in `package-lock.json`).
2. Add a row to the version table in the README.
3. Commit, push, and publish a GitHub release tagged `vMAJOR.MINOR`.

Publishing the release starts [`.github/workflows/docker.yml`](../.github/workflows/docker.yml). It builds the image for `linux/amd64` and `linux/arm64` and pushes it to the GitHub Container Registry as `ghcr.io/smiei/lockstep`, as `MAJOR.MINOR` and `latest`. A release marked as a pre-release gets only its version tag.

From the Actions tab, **Run workflow** builds without publishing. With **push** ticked and a **tag** given, it rebuilds an existing release; `latest` then only moves when **latest** is ticked as well.

The workflow needs no secrets: it pushes with the workflow's own token. A newly created package starts private; set it to public once in its package settings.

The same release also starts [`.github/workflows/windows.yml`](../.github/workflows/windows.yml), which builds the Windows app and attaches `Lockstep-Setup-<version>.exe` and `Lockstep-<version>-windows-x64.zip` to the release. **Run workflow** without **upload** keeps both as a workflow artifact for testing.

### Dependency updates

[Dependabot](../.github/dependabot.yml) opens pull requests every Monday: npm minor and patch updates grouped into one, GitHub Actions grouped, and the Docker base image monthly. Major versions are ignored and planned by hand. Security fixes arrive at once. [CI](../.github/workflows/ci.yml) runs the tests, lint and a production build on every pull request; merge an update once it is green. Major versions usually need code changes and a look by hand.

The build passes the version as `APP_VERSION`, which is what the gear menu shows on a Docker install. A non-Docker install takes it from `package.json`.

A manual build is still possible for one platform:

```bash
docker build --build-arg APP_VERSION=<MAJOR.MINOR> -t ghcr.io/smiei/lockstep:<MAJOR.MINOR> .
```
