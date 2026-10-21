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
| `npm run generate:trainer-sprites` | Regenerates `data/trainer-sprite-sources.json` for the public deployment. |
| `npm run lint` | ESLint. |
| `npm test` | Unit tests for the pure logic, plus a guard test that checks the UI conventions in the source tree. |

All generated data is committed. The generators only need re-running when the underlying data changes.

## Data

All reference data is read from disk at runtime and never copied into the database. Edits take effect without a rebuild, even inside a running container with `data/` mounted.

**Game-independent data** lives in `data/`:
- `pokemon.json`: national dex 1–800, plus alternate formes such as Deoxys and Rotom.
- `evolutions.json`, the type charts and `catchrates.json`.
- The move data: `moves.json`, `learnsets/`, `movesets/`, `tm-compat/`.
- Four correction tables that restore what a value was in the generation being played: `pokemon-history.json`, `move-type-history.json`, `move-name-history.json`, `catchrate-history.json`.

**Game packs** live in `data/games/<gameId>/`:
- `game.json`: names, generation, dex limit, sprite set, version group;
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

Publishing the release starts [`.github/workflows/docker.yml`](../.github/workflows/docker.yml). It builds the image for `linux/amd64` and `linux/arm64` and pushes it to Docker Hub (`gloryy/nuzlocke-tracker`) and the GitHub Container Registry (`ghcr.io/smiei/nuzlocke-tracker`), each as `MAJOR.MINOR` and `latest`. A release marked as a pre-release gets only its version tag.

From the Actions tab, **Run workflow** builds without publishing. With **push** ticked and a **tag** given, it rebuilds an existing release; `latest` then only moves when **latest** is ticked as well.

The workflow needs two repository secrets: `DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN`, a Docker Hub access token with read and write.

The build passes the version as `APP_VERSION`, which is what the gear menu shows on a Docker install. A non-Docker install takes it from `package.json`.

A manual build is still possible for one platform:

```bash
docker build --build-arg APP_VERSION=<MAJOR.MINOR> -t gloryy/nuzlocke-tracker:<MAJOR.MINOR> .
```
