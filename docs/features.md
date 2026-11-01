# Features in detail

[← Back to the README](../README.md)

The tracker is organised in tabs. Every tab works on the run currently selected in the header, and every device that has that run open sees changes live.

## Encounter

Catch one Pokémon per route and player.

- **Per entry:** the catch-time status (Caught / Killed / Fled) and an optional nickname, limited to the in-game 10 characters.
- **Route list:**
  - Static locations (gifts, fossils, legendaries) are pre-marked from the game data.
  - Post-game areas are collapsed by default.
  - "Open only" hides finished routes, but keeps the route you just edited visible.
  - Every route is a tray whose frame and badge show its outcome: open (dashed), waiting for a player, caught, or lost.
- **Species Clause:** conflicts show a warning and never block a save.
- **Buttons on each entry:**
  - the bin clears a mistaken entry;
  - the *i* opens the Pokémon's detail card;
  - the sparkle marks a catch as shiny when the Shiny Clause is on. A shiny is exempt from the Species Clause and does not lock its family for others.
- **Custom routes** add places a game pack does not list.

## Team

A drawer of six team slots, plus a column with the **Box** (alive, off the team) and the **Memorial** (dead). Each slot holds a whole link: its Pokémon side by side with their specimen label (route number, collectors, types, base stats).

- **Mark as dead:**
  - In SoulLink you pick which player lost their Pokémon, with undo, and can record a cause of death for the Memorial.
  - The catch-time status stays untouched.
- **Evolve and devolve**, with the evolution method. The evolve button glows when a level evolution is reachable within the level cap you have earned.
- **Sorting and filtering:**
  - for the Box and Memorial column: an "evolvable only" filter and a type filter;
  - sorting by encounter order, by current base-stat total (BST), or by the BST once fully evolved.
- **Filling the team:** new links and solo catches join a free team slot automatically while the team is not full.
- **Broken pairs** (one player caught, the other fled or killed) never appear here, because that link never formed. The surviving catch stays on the Encounter tab.
- **Free team mode** turns the tab into a plain team builder for runs that are not a Nuzlocke at all.

## Battle & Catch

Enter a Pokémon once per card, then switch between **Wild** and **Trainer**. A **+** adds another independent card.

**Wild** is a catch-chance calculator.
- **Inputs:** ball, HP, level and status condition.
- **Formula:** the run's own generation (Gen 1, Gen 2, Gen 3/4, Gen 5 to 9, or Infinite Fusion's own code). From Gen 5 a ball's chance is about (rate ÷ 255)^0.75, kinder than before.
- **Ball list:** depends on the game. HeartGold/SoulSilver bring back the Gen 2 Apricorn balls, Sun/Moon add the Beast Ball, Brilliant Diamond/Shining Pearl keep Diamond/Pearl's list.
- **Ultra Beasts:** the Beast Ball gives ×5 against them, every other ball only ×0.1. The calculator recognizes them by itself.
- **Gen 8 and 9:** a bonus against wild Pokémon below level 20 (Gen 8) or 13 (Gen 9), and a field for your badges, filled in from the run's defeated gym leaders.
  - Sword/Shield and BDSP: without the eighth badge, a wild Pokémon above your own Pokémon's level is caught at only ×0.1. Sword/Shield also refuse the throw altogether above level 20 + 5 per badge.
  - Scarlet/Violet: more than 5 levels above your obedience limit, ×0.8 per badge you would still need.
- **Conditional balls** (Repeat, Dusk, Dive, Fast, Love, Moon, …) have a "condition met?" checkbox, so their bonus only counts when it applies.
- **Recording a catch:** "Pokémon caught?" records the Pokémon as caught on an open route, once per player in SoulLink.

**Trainer** is a battle scout. It shows:
- the opponent's types and its damaging attack types by level;
- the full type matrix, Gen 1 chart included;
- a team-matchup table: how well each of your Pokémon takes that opponent's attacks;
- a ⚠ warning for Self-Destruct and Explosion learners.

## TMs

Pick a move **by name** and see which of your living Pokémon can learn it by TM, HM or move tutor.

- **Why by name:** TM numbers are reshuffled by randomizers.
- **What the data is:** the original game data, not the ROM's actual mapping. A randomizer re-rolls TM compatibility, so this is a clean reference, or a house rule ("TM compatibility follows the original games").
- **Display:** split per player in SoulLink, with TM, HM and tutor labelled.

## Pokédex

A sortable table with rank by base-stat total, a search, and filters for available, locked (Species Clause) and legendary Pokémon.

Each row opens a detail card with:
- types, base stats and rank;
- type weaknesses;
- evolutions with their conditions;
- the full level-up move list with localized move names.

## Journey

Boss battles with their level caps and trainer pictures: gym leaders, the rival, Team Rocket and the Elite Four.

- Click an entry to mark it as defeated.
- Every entry that grants a badge lights it up on the Overview tab.

## Overview

A per-run dashboard. In a SoulLink run every number also breaks down per player. From top to bottom:

1. **Run sheet:**
   - the next level cap, big, with the fight's name and place, the team level and the last cap reached;
   - progress bars for routes and the journey, and the badges earned so far;
   - a table per player: catches, deaths, team BST and bank BST (everything caught and alive but off the team), each now and once fully evolved.
2. **Team coverage:**
   - defensive weaknesses;
   - offensive gaps: types nobody on the team hits super-effectively, judged against the last level cap you reached.
3. **Memorial:** every fallen Pokémon by nickname, with who lost it, the cause, and the journey milestone the run had reached.

## Rules

Per-run rule toggles. They are informational: they drive warnings and visibility, and never block a save. Available rules:
- **Species Clause.** In SoulLink it can apply per player, optionally with "caught links lock for everyone".
- **Shiny Clause** and **nicknames.**
- **Randomizer evolution options** (PokeRandoZX's "impossible evolutions changed" and "evolutions made easier").
- **Static encounters** and their clause exemption.

On top of the toggles:
- **Blind flight** hides everything the app works out for you: type matchups, move lists and descriptions. **Lock blind flight** (nested under it) keeps it on for runs played without any help: the header button can no longer switch it off for a quick peek, only the rule itself can.
- **Player names** replace "Player 1 / Player 2" everywhere.
- **House rules** are a Markdown section, edited in the browser.
- **Rule presets** carry a rule set from one playthrough to the next.

## Runs, games and players

- **Start page:** the house icon next to the logo opens the collection: every run as a card with its game's cover, its team, route progress, badges, next level cap and deaths, played-last first. A fresh install starts there with a short welcome instead of an empty run. A link without a run (and the installed app) opens the run played last.
- **Runs and players:** any number of runs, each a SoulLink for 2, 3 or 4 players or a solo run, chosen at creation.
- **Game covers** show in the game picker, on the start page and on the Overview. They are downloaded on the first start; a ROM hack without a cover shows a drawn tile, or your own picture (see [self-hosting](self-hosting.md#game-covers)).
- **Game packs:** each run plays one game pack: every main-series game from Red/Blue/Yellow to Scarlet/Violet, 16 ROM hacks, and the fan game Pokémon Infinite Fusion (Classic and Remix). The full list is in the [README](../README.md#supported-games).
- **Your own games:** New Run → *Import your own game* adds a ROM hack or any other game from a pack file (route list + boss level caps, see [game packs](game-packs.md)). It is checked before it is saved, appears under *Your own games*, and travels inside the backups of runs that play it.
- **Generation-aware mechanics:** the type chart (Gen 1 quirks included), the catch formula and balls, which Pokémon are obtainable, and era-appropriate sprites.
- **Historical values:** these are something PokéAPI cannot give you, because it only serves today's values. Correction tables roll back:
  - the Gen 6 Fairy re-typings;
  - the base-stat buffs;
  - later catch-rate changes;
  - moves that were renamed or re-typed after the era being played.
- **Gen 1** keeps its single Special stat.

## Pokémon Infinite Fusion

- **Fusing:** two of your catches can be fused into one battle unit: fuse, swap head and body, split. The result has the fused name, types and stats and the community's fusion sprite.
- **Wild fusions:** a catch can already *be* a fusion: "caught as a fusion" on the Encounter tab, or always on with the randomizer rule "Fuse everything".
- **One unit:** fusions die, take team slots and appear in the Memorial as one unit.
- **SoulLink:** a pairing stays tied to the route.
- **Game data:** stats, types, catch rates, move lists, TM compatibility, level caps and the capture formula with the game's 40 balls all come from the game's own data files.

## Installable app (PWA)

- **Install:** add it to the home screen on Android and iOS, or install it on the desktop. It gets its own icon and no browser chrome.
- **Caching:** a service worker caches sprites and badges, but never run data, which is always live.
- **Requirement:** installing needs HTTPS. See [self-hosting](self-hosting.md#https-and-installing-the-app).

## Backup and import

- **Export:** the current run or all runs as a file.
- **Import:** adds the runs it contains without ever overwriting existing ones.

## Appearance

- **Shell colour:** bottle green, Poké Ball red, blue or yellow, chosen per device in the gear menu. The side rail, the buttons and the page's tint follow, and so does the logo in the rail. The server can set the colour every device starts with (`DEFAULT_SHELL_COLOR`, see [self-hosting](self-hosting.md#environment-variables)).
- **Light and dark** follow the device until switched by hand. Switching back to the device's own mode follows the device again.

## Languages

The interface, Pokémon, routes, trainers and badges are available in German, English, French, Spanish and Italian. The picker is in the gear menu, and a fresh install also offers it on the welcome page, each language named in its own words. Until someone picks one, a browser tab uses the server's `DEFAULT_LANGUAGE` (or else the device language), and the installed app uses the phone's language.

German and English are reviewed by hand. French, Spanish and Italian are **machine-translated** in the interface and may contain mistakes there. The app says so once per device and under the language buttons. **Pokémon names are official in every language**, because they come from PokéAPI, and so are the **place names of the official games**, taken from PokéWiki for each game.

**ROM hacks** exist in English only, so the app names their places, trainers and badges in English in every language, exactly as the game shows them, and says so in the New-Run dialog and on the Encounter tab.
