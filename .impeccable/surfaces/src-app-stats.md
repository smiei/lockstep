---
version: 1
slug: "src-app-stats"
primary_target: "src/app/stats"
related_targets: ["src/components/StatsView.tsx"]
---

# Statistics page (/stats)

Mode: Operate (read-mostly). Players open it from the Overview after a session or at the end of a run to see how it went, together, often on a call.

Job: the run's verdict and each player's score at a glance, how catches and deaths unfolded along the Journey, who earned what, and every fight with the team that won it and the stretch's figures. Constraints: SoulLink 2-4 players and solo Classic; runs from before 6.0 have fights without teams or dates; five languages; the Naturkunde-Sammlung world (DESIGN.md).

Chosen by the user on 2026-11-18 from three prototypes (match history, victory screen, versus): the victory screen, "like after a League of Legends or Age of Empires match, more graphic, easy to read, bolder".

## Direction contract
THESIS: the statistics page is a game-over screen, not a spreadsheet: a verdict, a scorecard per player, awards and a hall of fame; it refuses the category's tables of counts.
OWN-WORLD: the bottle-green shell field as the verdict banner (inside `.shell`, so every shell colour keeps contrast), white trays on sage for the scorecards, Red Hat Mono figures at display size coloured by meaning (caught green, missed amber, death red, zero quiet), gold award plaques, drawn line icons (plus-in-ring, escaping arrow, headstone, crown, shield).
STORY: the player reads won / lost / on the road and the fights won, then their own big three figures and catch rate, sees the catch curve climb with deaths as red dots, finds their awards, and scrolls the hall of fame fight by fight.
FIRST VIEWPORT: the page title with the Overview link; the full-width verdict banner (outcome word at 6xl with a crown or headstone seal, run and game, the date, fights won x / y at 5xl mono on the right); below it the per-player scorecards side by side (one wide card in solo), each with the three figures, the catch-rate bar and the catch curve.
FORM: victory screen, position 1 on the ordered list of seven; seed:9c8cee3e5b21e42a
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Unresolved
- None. Awards appear only with two or more players; ties are shared.
