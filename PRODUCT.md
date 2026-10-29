# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Pokémon players running a Nuzlocke challenge, either solo (Classic) or as a SoulLink with 2-4 friends playing the same game at the same time. The maintainer runs it for their own group on a home server; since 3.1 strangers install it themselves (Docker, Pinokio, `npm run setup`), and a public hosted instance is planned.

Usage is split roughly evenly between a phone next to the console (log a catch or a death mid-session, often one-handed) and a PC/laptop as a second screen beside the game or emulator, frequently during a voice call. In a SoulLink the same run is open on several devices at once and syncs live.

## Product Purpose

It does the bookkeeping a Nuzlocke demands so the players can keep playing: who caught what on which route, which SoulLink pairs formed, who is on the team, who died, how and at which level cap, and what the next cap is. Success is that nobody has to keep a spreadsheet or argue about what happened three routes ago.

## Positioning

Built around the SoulLink itself, not a solo tracker with a second column: linked catches, linked deaths and one shared team per player, for up to four players, live on every device at the table. It is generation-aware (type charts, catch formulas, base stats, move names and types as they were on each cartridge, Gen 1-5) and includes Infinite Fusion with fusion-aware SoulLink rules. Free, self-hosted, MIT-licensed, non-commercial.

## Operating Context

- A run is played over many sessions; the tracker is opened at the start and kept open beside the game.
- Most edits happen in short bursts between battles: pick a species, set caught/fled/killed, give a nickname, mark a pair dead, evolve, swap the team.
- Players read it during battles too: matchups and weaknesses, catch chances, the next gym leader's level cap.
- Several players edit the same run at the same time from different devices.

## Capabilities and Constraints

- Tabs: Overview (progress, dashboard, team coverage, badges, memorial), Encounter (route log per player), Team (linked pairs, team slots, evolve/fuse/death), Kampf & Fang (catch-rate calculator and battle scout), Reise (level caps / journey), Pokédex, TMs, Regeln (per-run rules and presets).
- Every existing feature, state and piece of logic is preserved through any visual change.
- Dense information is the point: the UI must show at least as much at a glance as it does today.
- Five UI languages (de as source of truth, en, fr, es, it); German labels run long.
- Light and dark themes, a user-adjustable UI scale, installable PWA.
- No copyrighted artwork in the repository or the Docker image: Pokémon, ball and badge sprites are downloaded at container start; trainer art is user-provided. The logo must not use Pokémon or Poké Ball imagery.
- Accessibility rules from the 2026-10-20 audit (WCAG 2.2 AA) stay binding.

## Brand Commitments

- Current name: "SoulLink Nuzlocke Tracker" (GitHub repo `smiei/nuzlocke_tracker`, Docker image `gloryy/nuzlocke-tracker`). A new product name is allowed; renaming the repo or image is a separate, later decision.
- The current logo and branding are explicitly rejected and must be replaced.
- Strictly non-commercial fan project.

## Evidence on Hand

- Real run content: game packs and routes in `data/games/*`, Pokémon data in `data/pokemon.json`, German UI copy in `src/lib/i18n/dictionary.ts`.
- Screenshots of the current UI in `release-assets/` (gitignored), used only as evidence of what exists.
- No user testimonials, usage numbers or press. Do not invent any.

## Product Principles

1. The run's state is visible at a glance; nothing important hides behind a click.
2. Logging must never interrupt playing: the common edits are one or two taps.
3. A SoulLink is one shared story: linked Pokémon live, die and are shown together.
4. Faithful to the game being played, never approximately right.
5. Free and self-hostable for anyone, with nothing to unlock.

## Accessibility & Inclusion

WCAG 2.2 AA: text greys at 4.5:1, focus ring at 3:1, every control programmatically named, dimmed states never fade text, looping motion stops by itself and honours reduced motion, touch targets 40-44px.
