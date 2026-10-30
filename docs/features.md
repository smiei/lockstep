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
  - A coloured rail on every route shows its outcome: open, waiting for a player, formed, or lost.
- **Species Clause:** conflicts show a warning and never block a save.
- **Buttons on each entry:**
  - the bin clears a mistaken entry;
  - the *i* opens the Pokémon's detail card;
  - the sparkle marks a catch as shiny when the Shiny Clause is on. A shiny is exempt from the Species Clause and does not lock its family for others.
- **Custom routes** add places a game pack does not list.

## Team

The active six-slot team plus every link as a card.

- **Mark as dead:**
  - In SoulLink you pick which player lost their Pokémon, with undo, and can record a cause of death for the Memorial.
  - The catch-time status stays untouched.
- **Evolve and devolve**, with the evolution method. The evolve button glows when a level evolution is reachable within the level cap you have earned.
- **Sorting and filtering:**
  - an "evolvable only" filter;
  - sorting by encounter order, by current base-stat total (BST), or by the BST once fully evolved;
  - dead links always sink to the end.
- **Filling the team:** new links and solo catches join a free team slot automatically while the team is not full.
- **Broken pairs** (one player caught, the other fled or killed) never appear here, because that link never formed. The surviving catch stays on the Encounter tab.
- **Free team mode** turns the tab into a plain team builder for runs that are not a Nuzlocke at all.

## Battle & Catch

Enter a Pokémon once per card, then switch between **Wild** and **Trainer**. A **+** adds another independent card.

**Wild** is a catch-chance calculator.
- **Inputs:** ball, HP, level and status condition.
- **Formula:** the run's own generation (Gen 1, Gen 2, Gen 3/4, Gen 5, or Infinite Fusion's own code).
- **Ball list:** depends on the version group. HeartGold/SoulSilver bring back the Gen 2 Apricorn balls.
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

1. **Progress bars** for routes and the journey.
2. **Stat tiles:**
   - deaths and catches;
   - current and next level cap;
   - team BST, and bank BST (everything caught and alive but off the team), each now and once fully evolved.
3. **Team coverage:**
   - defensive weaknesses;
   - offensive gaps: types nobody on the team hits super-effectively, judged against the last level cap you reached.
4. **Badges** earned so far.
5. **Memorial:** every fallen Pokémon by nickname, with who lost it, the cause, and the journey milestone the run had reached.

## Rules

Per-run rule toggles. They are informational: they drive warnings and visibility, and never block a save. Available rules:
- **Species Clause.** In SoulLink it can apply per player, optionally with "caught links lock for everyone".
- **Shiny Clause** and **nicknames.**
- **Randomizer evolution options** (PokeRandoZX's "impossible evolutions changed" and "evolutions made easier").
- **Static encounters** and their clause exemption.

On top of the toggles:
- **Blind flight** hides everything the app works out for you: type matchups, move lists and descriptions. **Permanent blind flight** (nested under it) locks it on for runs played without any help: the header button can no longer switch it off for a quick peek, only the rule itself can.
- **Player names** replace "Player 1 / Player 2" everywhere.
- **House rules** are a Markdown section, edited in the browser.
- **Rule presets** carry a rule set from one playthrough to the next.

## Runs, games and players

- **Runs and players:** any number of runs, each a SoulLink for 2, 3 or 4 players or a solo run, chosen at creation.
- **Game packs:** each run plays one game pack: Red/Blue/Yellow, Gold/Silver/Crystal, FireRed/LeafGreen, Emerald, Platinum, HeartGold, SoulSilver, Black, White, and the fan game Pokémon Infinite Fusion (Classic and Remix).
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

## Languages

The interface, Pokémon, routes, trainers and badges are available in German, English, French, Spanish and Italian. The picker is in the gear menu.
