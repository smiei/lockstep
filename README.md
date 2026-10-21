<p align="center">
  <img src="https://github.com/user-attachments/assets/35f456db-2b84-4893-98c6-a440a09445e6" alt="Your Pokémon faints. Your friend's goes with it." width="100%">
</p>

<h1 align="center">SoulLink Nuzlocke Tracker</h1>

<p align="center">
  Track your Pokémon Nuzlocke runs — solo, or as a SoulLink with up to four friends.<br>
  Free, self-hosted, and live on every device at the table.
</p>

<p align="center">
  <a href="https://github.com/smiei/nuzlocke_tracker/releases"><img alt="Release" src="https://img.shields.io/github/v/release/smiei/nuzlocke_tracker?label=release"></a>
  <a href="https://hub.docker.com/r/gloryy/nuzlocke-tracker"><img alt="Docker pulls" src="https://img.shields.io/docker/pulls/gloryy/nuzlocke-tracker"></a>
  <a href="LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/license-MIT-blue"></a>
</p>

https://github.com/user-attachments/assets/30c82361-862b-41bc-870c-b4f4be246e22

## What is this?

A **Nuzlocke** is a self-imposed Pokémon challenge:
- you may catch only the first Pokémon you meet in each area;
- a Pokémon that faints counts as dead.

In a **SoulLink**, two or more players run the game at the same time, and the catches from each area are linked: when one faints, its partners go with it.

That is a lot of bookkeeping, and it is what this tracker does for you:
- who caught what, and where;
- which pairs formed and who is on the team;
- who died, how, and what the next level cap is.

It runs on your own computer or home server, and everyone opens it in a browser. Phones, laptops and the PC next to the console all see every change live.

## Highlights

- **SoulLink for 2–4 players, or solo.** Linked catches, linked deaths and a shared team, per player.
- **Encounter log** with Species Clause and Shiny Clause warnings, nicknames, and an "open routes only" view.
- **Team builder.** Evolve and devolve with the evolution method shown, base-stat totals now and once fully evolved, and auto-filling team slots.
- **Battle & Catch:**
  - a catch-rate calculator using the formula and ball list of your game's generation;
  - a battle scout with the opponent's moves by level, the type matrix and how your team matches up.
- **Journey** with every gym leader, rival and Elite Four level cap, and the badges you earned.
- **Overview** with team weaknesses, offensive gaps, stats and a **Memorial** for the fallen, with the cause of death.
- **Right for the game you play:**
  - 9 game packs from Red/Blue to Black/White, plus the fan game **Pokémon Infinite Fusion**;
  - the type chart, stats, catch rates and move names as they were in that generation.
- **Blind flight** mode for the hardcore: hides every calculated hint.
- **Installable app** for your phone's home screen, in **5 languages** (English, German, French, Spanish, Italian).
- **Backups** of one run or all runs, importable anywhere.

## Screenshots

<table>
  <tr>
    <td><img src="https://github.com/user-attachments/assets/42b2c23c-30e3-42f1-ad45-871061c0e66a" alt="Team tab: each route's linked pair, with types, base stats and evolutions"></td>
    <td><img src="https://github.com/user-attachments/assets/4cb4028b-d157-489c-ba5d-74d2ae18325e" alt="Encounter tab: one catch per route and player"></td>
  </tr>
  <tr>
    <td><img src="https://github.com/user-attachments/assets/102c23b9-6d99-4461-815a-559bbe2a004e" alt="Battle & Catch: the opponent's attack types and how your team matches up"></td>
    <td><img src="https://github.com/user-attachments/assets/38719580-8110-41a7-b3e1-c5c6a9be7f78" alt="Overview: progress, stats and team coverage"></td>
  </tr>
</table>

<p align="center">
  <img src="https://github.com/user-attachments/assets/2bf676e0-4f29-4d83-9d44-082a405845b0" alt="Memorial: who was lost, by whom, how and when" width="70%">
</p>

<p align="center">
  <img src="https://github.com/user-attachments/assets/8e094809-5384-4259-ba8e-d7a61c4e2a13" alt="The tracker on a phone: Encounter, Team and Overview" width="85%">
</p>

## Quick start

Pick whatever fits you best. All three give you the same app at `http://localhost:3000`, or at your server's address.

### Docker (home servers, NAS, Unraid)

```yaml
services:
  nuzlocke-tracker:
    image: gloryy/nuzlocke-tracker:latest
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=file:/app/db/nuzlocke.db
    volumes:
      - db:/app/db
      - sprites:/app/public/pokemon-sprites
    restart: unless-stopped

volumes:
  db:
  sprites:
```

Save that as `compose.yaml` and run `docker compose up -d`. The first start downloads the Pokémon sprites, which takes a few minutes.

### Pinokio (one click, Windows / macOS / Linux)

1. Install [Pinokio](https://pinokio.co/).
2. Choose **Download from URL** and paste `https://github.com/smiei/nuzlocke-tracker-pinokio`.
3. Click **Install**, then **Start**.

### Without Docker (Node.js 20.9+)

```bash
git clone https://github.com/smiei/nuzlocke_tracker.git
cd nuzlocke_tracker
npm install
npm run setup
npm start
```

**→ [Self-hosting guide](docs/self-hosting.md):** volumes, updating, backups, HTTPS for installing the app on a phone, trainer pictures, and a custom app icon.

## Supported games

| Generation | Games |
| --- | --- |
| 1 | Red / Blue / Yellow |
| 2 | Gold / Silver / Crystal |
| 3 | FireRed / LeafGreen, Emerald |
| 4 | Platinum, HeartGold, SoulSilver |
| 5 | Black, White |
| Fan game | Pokémon Infinite Fusion (Classic and Remix), with fusions and the game's own data |

A game pack is plain data in `data/games/<id>/` (routes, level caps, game settings). Another game of a supported generation can be added without code changes; see [development](docs/development.md#data).

## Documentation

- [Features in detail](docs/features.md) — every tab and rule explained
- [Self-hosting](docs/self-hosting.md) — Docker, Pinokio, Node.js, updates, backups, HTTPS
- [Development](docs/development.md) — local setup, scripts, data, migrations, releasing

## Version history

Docker tags follow `MAJOR.MINOR`: `latest` is always the newest release, and every version stays available under its own tag for rollbacks.

| Version | What it is |
| --- | --- |
| `1.0` | Pre-PWA state (was `latest` until then). |
| `1.1` | Adds the installable PWA (was `pwa`). |
| `2.0` | Full UI overhaul: design tokens, shared component primitives, loading/error boundaries, toasts, pinned tab strip, keyboard-navigable dropdowns, one modal implementation, 40/44px touch targets. |
| `3.0` | Pokémon Infinite Fusion (Classic and Remix: fusions, catches that already are fusions, the game's own species/move/capture data), SoulLink for 3 or 4 players, and per-player Species Clause variants. Backup format v4. |
| `3.1` | Runs are addressed by an unguessable access key instead of their numeric id (old `?run=<number>` links still open and are rewritten). Accessibility pass from a UI audit: readable type chips, text greys and focus ring, labelled Encounter and Battle & Catch fields, keyboard access to the Pokédex, a title per tab, drawn icons instead of emoji. Runs without Docker via `npm run setup` and with a one-click Pinokio launcher. Now MIT-licensed. |

## Acknowledgements

This project stands on the work of others. Thank you!

- **[PokéAPI](https://pokeapi.co/)** — Pokémon, move, evolution and catch-rate data, and the [sprite collection](https://github.com/PokeAPI/sprites) the app downloads at runtime.
- **[infinite-fusion-nuzlocke](https://github.com/fbosch/infinite-fusion-nuzlocke)** by Frederik Bosch — the Infinite Fusion locations, encounters and species list, and the fusion typing rules.
- **[Pokémon Infinite Fusion](https://github.com/infinitefusion/infinitefusion-e18)** — the game's own stats, moves, trainer levels and capture code. Fusion sprites come from its sprite community.
- **[Pokémon League Badges](https://github.com/SteGriff/pokemon-badges)** by Stephen Griffiths — the badge icons (CC BY 3.0, cropped from the sheet).
- **[PokéWiki](https://www.pokewiki.de/)**, **[Bulbapedia](https://bulbapedia.bulbagarden.net/)**, **[pokemon-infinite-fusion.com](https://pokemon-infinite-fusion.com/)** and the **[Infinite Fusion wiki](https://infinitefusion.fandom.com/)** — reference for historical values, mechanics and level caps.
- **[Pokémon Showdown](https://pokemonshowdown.com/)** — trainer sprites for the optional public deployment.
- Built with [Next.js](https://nextjs.org/), [React](https://react.dev/), [Prisma](https://www.prisma.io/), [Tailwind CSS](https://tailwindcss.com/) and the [Geist](https://vercel.com/font) font.

Licenses and attributions in full: [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

## License

The source code is released under the [MIT License](LICENSE). Data and artwork from third parties keep their own terms; see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

> **Disclaimer:** This is an unofficial, non-commercial fan project. It is not affiliated with, endorsed by, or connected to Nintendo, Game Freak, Creatures Inc. or The Pokémon Company. Pokémon names, game data and artwork are the property of their respective owners.
>
> This repository and the published Docker image deliberately contain **no** copyrighted artwork:
> - Pokémon sprites are downloaded from PokéAPI when the app is set up.
> - Infinite Fusion's ball icons come from the game's public repository at container start.
> - Fusion sprites are loaded by the browser straight from the Infinite Fusion community's sprite server and never stored.
> - Trainer pictures are provided by the user.
