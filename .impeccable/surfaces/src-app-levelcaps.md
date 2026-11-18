---
version: 1
slug: "src-app-levelcaps"
primary_target: "src/app/levelcaps"
related_targets: ["src/components/LevelCapsView.tsx"]
---

# Journey tab (Reise, /levelcaps)

Mode: Operate. Players check the next fight's level cap before every gym and tick fights off as they beat them, on a phone beside the console or a second screen.

Job: where am I on the run's road, what is the next fight and its cap (and the team level under it), tick it off, undo a mistaken tick. Constraints: every fight stays toggleable; skipped caps (capsGymsOnly) show their level in brackets; Johto/Kanto and an excluded Kanto as post-game; five languages; the established Naturkunde-Sammlung world (DESIGN.md) unchanged.

Chosen by the user on 2026-11-18 from three prototypes (badge case + log, route band, elevation profile): the route band, without any Pokémon list (the user plays randomized and reads Pokémon rows as opponent spoilers).

## Direction contract
THESIS: the Journey is a road, not a table. The run's fights are stations on one horizontal route line with a "you are here" flag; it refuses the category's stacked list of identical trainer rows.
OWN-WORLD: the collection's tray white band on the sage ground, hairline borders, Red Hat Mono for levels; the route line is caught-green solid behind the player and a dashed control-sage line ahead; gyms sit on the line as their own badge (grey until earned), the League as larger round nodes, every other fight (rivals, villains) a smaller stop; beaten stations say so in words (their date).
STORY: the player sees at once how far the run has come, which fight is next and its cap, ticks it off with one button, and can slide back along the band to undo or look ahead.
FIRST VIEWPORT: page title with the progress bar; the full-width band, centred on the next fight; below it the next fight large (128px trainer, name, place and badge, cap figure-large "24 / 22", primary "Mark as beaten"), beside it on desktop the last fight won with its date and the next three fights.
FORM: route band, position 6 on the ordered list of seven; seed:d01cff919fc1c746
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Unresolved
- None. Signature interaction: the band glides to keep the next fight centred after every tick (instant under reduced motion); arrow buttons scroll it on desktop, a phone swipes.
