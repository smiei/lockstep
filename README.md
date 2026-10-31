<p align="center">
  <img src="https://github.com/user-attachments/assets/22c168c6-64f1-4d59-9598-12db63b1e570" alt="Lockstep, the SoulLink Nuzlocke tracker: Gen 1-5, Infinite Fusion, 2-4 players or solo, 5 languages, free and self-hosted" width="100%">
</p>

<h1 align="center">Lockstep</h1>

<p align="center"><strong>SoulLink &amp; Nuzlocke tracker</strong></p>

<p align="center">
  A Nuzlocke tracker built around SoulLink: 2–4 players, linked deaths, the rules of your generation.<br>
  Free, self-hosted, and live on every device at the table.
</p>

<p align="center">
  <a href="https://github.com/smiei/lockstep/releases"><img alt="Release" src="https://img.shields.io/github/v/release/smiei/lockstep?label=release"></a>
  <a href="https://github.com/smiei/lockstep/pkgs/container/lockstep"><img alt="Image: ghcr.io/smiei/lockstep" src="https://img.shields.io/badge/image-ghcr.io%2Fsmiei%2Flockstep-2496ED?logo=docker&logoColor=white"></a>
  <a href="LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/license-MIT-blue"></a>
</p>

https://github.com/user-attachments/assets/04eee5f1-df8e-44cb-9464-106f85dc3f99

<details>
<summary>New to the format?</summary>

A **Nuzlocke** lets you catch only the first Pokémon in each area, and a fainted Pokémon is dead. In a **SoulLink**, several players run at the same time and each area's catches are linked: one dies, its partners die too.

</details>

## What sets it apart

You know the rules. This is what the tracker handles so you don't have to.

### SoulLink, the way you actually play it
- **2–4 players or solo**, each with their own catches per route. Every device at the table sees each change live.
- **A link forms only once every player has caught on that route.** If one player's encounter fled or was knocked out, the pair never formed: the survivor stays in the box and never shows up as a link.
- **Marking a link dead takes all of its Pokémon**, and records who lost theirs and how ("lost by Red · Lt. Surge's Raichu"). The run's **Memorial** keeps the list.
- **Your team is linked too.** A team slot holds the whole link, and new catches fill free slots on their own.

### Clauses that know the difference
- **Species Clause** in three variants:
  - across all players;
  - per player;
  - per player, but with a formed link locking its families for everyone.
- Evolution families, statics and fusions are handled.
- **Shiny Clause**: a shiny never locks its family.
- The clauses only warn, they never block. Your group's house rules win.
- **Rule presets** carry a ruleset, including your written rules, from one run to the next.

### Accurate to the generation you're playing
- **The type chart, base stats, catch rates and move names your game actually had:** Gen 1's single Special, no Fairy type before Gen 6, pre-buff stats, old move names.
- **Catch rates** use that generation's formula and ball list, Apricorn Balls included.
- **Evolution overrides** for randomizers and ROM hacks: impossible, easier or time-based evolutions.

### Planning the next fight
- **Level caps** for every gym leader, rival and Elite Four member, with the next cap always in view.
- **Battle scout:** the opponent's moves by level and its matchup against each player's team.
- **Team coverage** (weaknesses and offensive gaps), judged at your last level cap rather than at level 100.
- **Base-stat totals** now and fully evolved, with a note when an evolution is possible within the cap.

### And also
- **[Pokémon Infinite Fusion](https://github.com/infinitefusion/infinitefusion-e18)** (Classic and Remix): fusions are one battle unit, and a fused catch locks both families.
- **Custom routes** for areas a game pack doesn't list.
- **Free-team mode** for runs that aren't Nuzlockes.
- **Blind flight**, which hides every calculated hint, optionally locked on for the whole run.
- **An installable phone app** in 5 languages: English, German, French, Spanish and Italian. German and English are reviewed by hand. French, Spanish and Italian are machine-translated, apart from the Pokémon names, which are official in every language.
- **Backups** of one run or all of them.
- No account, no cloud: it runs on your PC or home server.

## Screenshots

<table>
  <tr>
    <td><img src="https://github.com/user-attachments/assets/c779d1b7-d5df-4415-b17f-39353f910860" alt="Team tab: the six team slots as specimen trays, each linked pair with its label, types, base stats and evolutions"></td>
    <td><img src="https://github.com/user-attachments/assets/4ac44ff5-1e5f-462f-aace-d3643884258d" alt="Encounter tab: one catch per route and player"></td>
  </tr>
  <tr>
    <td><img src="https://github.com/user-attachments/assets/853ded65-2508-472a-8b70-019227f7cb28" alt="Battle & Catch: the opponent's attack types and how your team matches up"></td>
    <td><img src="https://github.com/user-attachments/assets/167c8e9d-dde3-46a2-b731-e40b9679caf1" alt="Overview: the next level cap, progress, badges and per-player figures"></td>
  </tr>
</table>

<p align="center">
  <img src="https://github.com/user-attachments/assets/a8a442e4-01e1-4c69-a9eb-3ee3002cabf1" alt="Memorial: who was lost, by whom, how and when" width="70%">
</p>

<p align="center">
  <img src="https://github.com/user-attachments/assets/c29125ff-d726-4b78-8968-1a81e59c259b" alt="The tracker on a phone: Encounter, Team and Overview" width="85%">
</p>

## Quick start

Pick whatever fits you best. All three give you the same app at `http://localhost:3000`, or at your server's address.

### Docker (home servers, NAS, Unraid)

```yaml
services:
  lockstep:
    image: ghcr.io/smiei/lockstep:latest
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=file:/app/db/nuzlocke.db
      # - DEFAULT_SHELL_COLOR=blue                  # optional: green (default), red, blue or yellow
      # - DEFAULT_LANGUAGE=en                       # optional: de, en, fr, es or it
    volumes:
      - db:/app/db
      - sprites:/app/public/pokemon-sprites
      - trainers:/app/public/trainers
    restart: unless-stopped

volumes:
  db:
  sprites:
  trainers:
```

Save that as `compose.yaml` and run `docker compose up -d`. The first start downloads the Pokémon sprites and trainer pictures, which takes a few minutes.

### Pinokio (one click, Windows / macOS / Linux)

1. Install [Pinokio](https://pinokio.co/).
2. On the **Explore** page, paste `https://github.com/smiei/lockstep-pinokio` into the **GitHub or Hugging Face URL** field and click **Go**.
3. Click **Install**, then **Start**.

### Without Docker (Node.js 20.9+)

```bash
git clone https://github.com/smiei/lockstep.git
cd lockstep
npm install
npm run setup
npm start
```

**→ [Self-hosting guide](docs/self-hosting.md):** volumes, updating, backups, HTTPS for installing the app on a phone, trainer pictures, and a custom app icon.

## Supported games

| Generation | Games | Route data |
| --- | --- | --- |
| 1 | Red / Blue / Yellow | unverified |
| 2 | Gold / Silver / Crystal | unverified |
| 3 | FireRed / LeafGreen, Emerald | checked |
| 4 | Platinum, HeartGold, SoulSilver | checked |
| 5 | Black, White | unverified |
| Fan game | Pokémon Infinite Fusion (Classic and Remix), with fusions and the game's own data | unverified |
| ROM hacks | Radical Red, Unbound, Run & Bun, Renegade Platinum, Sacred Gold, Storm Silver, Blaze Black, Volt White, Blaze Black 2 / Volt White 2 Redux, Emerald Kaizo, Inclement Emerald, Rising Ruby, Sinking Sapphire, Blazing Emerald, Glazed, New Generations, with each hack's own stats, types and moves, Pokémon up to Gen 9 and regional forms | unverified |

"Route data" is the list and order of routes plus the place names. **Checked** packs were compared against the game. **Unverified** ones may contain mistakes, and the app says so when you pick one. Corrections are welcome as an issue.

**Playing a ROM hack or another game?** A pack is just the route list and the boss level caps, with no encounter tables. You can import your own in the app or contribute it for everyone; see [game packs](docs/game-packs.md).


## Documentation

- [Features in detail](docs/features.md) — every tab and rule explained
- [Self-hosting](docs/self-hosting.md) — Docker, Pinokio, Node.js, updates, backups, HTTPS
- [Development](docs/development.md) — local setup, scripts, data, migrations, releasing
- [Game packs](docs/game-packs.md) — add a game or ROM hack, in the app or as a contribution ([CONTRIBUTING](CONTRIBUTING.md))

## Version history

Docker tags follow `MAJOR.MINOR`: `latest` is always the newest release, and every version stays available under its own tag for rollbacks.

| Version | What it is |
| --- | --- |
| `1.0` | Pre-PWA state (was `latest` until then). |
| `1.1` | Adds the installable PWA (was `pwa`). |
| `2.0` | Full UI overhaul: design tokens, shared component primitives, loading/error boundaries, toasts, pinned tab strip, keyboard-navigable dropdowns, one modal implementation, 40/44px touch targets. |
| `3.0` | Pokémon Infinite Fusion (Classic and Remix: fusions, catches that already are fusions, the game's own species/move/capture data), SoulLink for 3 or 4 players, and per-player Species Clause variants. Backup format v4. |
| `3.1` | Runs are addressed by an unguessable access key instead of their numeric id (old `?run=<number>` links still open and are rewritten). Accessibility pass from a UI audit: readable type chips, text greys and focus ring, labelled Encounter and Battle & Catch fields, keyboard access to the Pokédex, a title per tab, drawn icons instead of emoji. Runs without Docker via `npm run setup` and with a one-click Pinokio launcher. Now MIT-licensed. |
| `4.0` | Redesign as a natural-history collection (the app is now called **Lockstep** in its interface): sage ground, specimen trays and labels, a green side rail on desktop, a new logo and fonts. The Team tab becomes a drawer of six trays plus a Box and Memorial column; Overview opens with one run sheet; the Pokédex card is a field-guide entry. Per-device shell colour (green, Poké Ball red, blue, yellow). Docker image for amd64 and arm64, also on GHCR. |
| `4.1` | The logo is back in the shell's bottle green (4.0 shipped it on a red tile); the app icon, splash screen and status bar follow. |
| `4.2` | The run list opens right under the run box and reads clearly in dark mode (ruled rows, the open run marked). New rule: permanent blind flight, which locks blind flight on so the header button cannot lift it. Clearer Docker volume guide and a by-game reference for trainer pictures. |
| `4.3` | Server defaults for the colour (`DEFAULT_SHELL_COLOR`, icons included) and the browser language (`DEFAULT_LANGUAGE`); the installed app follows the phone's language. The side-rail logo takes the shell colour, the run list reaches past the rail, the dark-mode button can return to following the device, and "Lock blind flight" got its name. |

## Acknowledgements

This project stands on the work of others. Thank you!

- **[PokéAPI](https://pokeapi.co/)** — Pokémon, move, evolution and catch-rate data, and the [sprite collection](https://github.com/PokeAPI/sprites) the app downloads at runtime.
- **[infinite-fusion-nuzlocke](https://github.com/fbosch/infinite-fusion-nuzlocke)** by Frederik Bosch — the Infinite Fusion locations, encounters and species list, and the fusion typing rules.
- **[Pokémon Infinite Fusion](https://github.com/infinitefusion/infinitefusion-e18)** — the game's own stats, moves, trainer levels and capture code. Fusion sprites come from its sprite community.
- **[Pokémon League Badges](https://github.com/SteGriff/pokemon-badges)** by Stephen Griffiths — the badge icons (CC BY 3.0, cropped from the sheet).
- **[PokéWiki](https://www.pokewiki.de/)**, **[Bulbapedia](https://bulbapedia.bulbagarden.net/)**, **[pokemon-infinite-fusion.com](https://pokemon-infinite-fusion.com/)** and the **[Infinite Fusion wiki](https://infinitefusion.fandom.com/)** — reference for historical values, mechanics and level caps.
- **[nuzlocke.app](https://github.com/domtronn/nuzlocke.app)** (fork [Bassel-T/nuzlocke.app](https://github.com/Bassel-T/nuzlocke.app)) — the ROM-hack route lists, boss teams and the hacks' stat, type and move changes (BSD 3-Clause).
- **[Pokémon Showdown](https://pokemonshowdown.com/)** — the boss trainer pictures, downloaded on first start.
- Built with [Next.js](https://nextjs.org/), [React](https://react.dev/), [Prisma](https://www.prisma.io/), [Tailwind CSS](https://tailwindcss.com/) and the [Familjen Grotesk](https://fonts.google.com/specimen/Familjen+Grotesk) and [Red Hat Mono](https://fonts.google.com/specimen/Red+Hat+Mono) fonts.

Licenses and attributions in full: [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

## License

The source code is released under the [MIT License](LICENSE). Data and artwork from third parties keep their own terms; see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

> **Disclaimer:** This is an unofficial, non-commercial fan project. It is not affiliated with, endorsed by, or connected to Nintendo, Game Freak, Creatures Inc. or The Pokémon Company. Pokémon names, game data and artwork are the property of their respective owners.
>
> This repository and the published Docker image deliberately contain **no** copyrighted artwork:
> - Pokémon sprites are downloaded from PokéAPI when the app is set up.
> - Infinite Fusion's ball icons come from the game's public repository at container start.
> - Fusion sprites are loaded by the browser straight from the Infinite Fusion community's sprite server and never stored.
> - Trainer pictures are downloaded from Pokémon Showdown when the app is set up, unless you bring your own.
