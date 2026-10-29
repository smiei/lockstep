---
name: Lockstep
description: A SoulLink and Nuzlocke tracker set as a natural-history collection - every catch a specimen with its label, the run the collection.
colors:
  shell-green: "#0f3d30"
  sage-ground: "#ebefea"
  tray-white: "#ffffff"
  drawer-sage: "#e2e8e2"
  hover-sage: "#e4ebe5"
  hairline-sage: "#c9d6cd"
  control-sage: "#8fa398"
  specimen-ink: "#1a1f1c"
  ink-muted: "#46524b"
  ink-subtle: "#5a665f"
  accent-ink: "#ffffff"
  focus-green: "#13795b"
  label-red: "#b3261e"
  danger-bg: "#fbe9e7"
  danger-line: "#e3b4b0"
  caught-green: "#1e6b42"
  success-bg: "#e3f0e7"
  success-line: "#8fc2a0"
  success-solid: "#2e7d4f"
  missing-amber: "#8a5300"
  warning-bg: "#fbf1dc"
  warning-line: "#e2b766"
  warning-solid: "#c27a0e"
  info-blue: "#1f5c7a"
  info-bg: "#e4eff4"
  info-line: "#9cc3d6"
  blindflug-violet: "#8b5cf6"
  dark-ground: "#0e1512"
  dark-tray: "#16201b"
  dark-drawer: "#111a16"
  dark-hover: "#1e2a24"
  dark-line: "#2a3a32"
  dark-line-strong: "#4e6559"
  dark-ink: "#e8efea"
  dark-ink-muted: "#a9b8af"
  dark-ink-subtle: "#8b9c92"
  dark-accent: "#cfe5d7"
  dark-focus: "#5fd3a5"
  dark-danger: "#f2a099"
  dark-success: "#7fd1a0"
  dark-success-solid: "#3fa06a"
  dark-warning: "#f2c46d"
  dark-warning-solid: "#d99a2b"
  dark-info: "#8cc6e0"
  shell-panel: "#16493a"
  shell-sunken: "#0c3328"
  shell-hover: "#1b5443"
  shell-line: "#2f5e50"
  shell-line-strong: "#4a7a6b"
  shell-ink-muted: "#dcebe1"
  shell-ink-subtle: "#a9c7b6"
  shell-focus: "#9be3c0"
  shell-blindflug: "#c4b5fd"
  eff-good: "#22c55e"
  eff-good-deep: "#15803d"
  eff-bad: "#dc2626"
  eff-bad-mild: "#f97316"
  eff-on-light: "#18181b"
  eff-none: "#18181b"
  eff-none-ink: "#e4e4e7"
typography:
  display:
    fontFamily: "Familjen Grotesk, system-ui, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 700
    lineHeight: 1.11
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Familjen Grotesk, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 700
    lineHeight: 1.56
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Familjen Grotesk, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.25
  body:
    fontFamily: "Familjen Grotesk, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.43
  label:
    fontFamily: "Familjen Grotesk, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.33
  specimen-data:
    fontFamily: "Red Hat Mono, ui-monospace, monospace"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.625
    fontFeature: "\"tnum\""
  figure-large:
    fontFamily: "Red Hat Mono, ui-monospace, monospace"
    fontSize: "1.875rem"
    fontWeight: 600
    lineHeight: 1
    fontFeature: "\"tnum\""
rounded:
  tray: "4px"
  control: "6px"
  overlay: "8px"
spacing:
  hairline: "1px"
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.shell-green}"
    textColor: "{colors.accent-ink}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "0 16px"
    height: "44px"
  button-secondary:
    backgroundColor: "{colors.tray-white}"
    textColor: "{colors.specimen-ink}"
    rounded: "{rounded.control}"
    padding: "0 16px"
    height: "44px"
  button-secondary-hover:
    backgroundColor: "{colors.hover-sage}"
  button-success:
    backgroundColor: "{colors.tray-white}"
    textColor: "{colors.caught-green}"
    rounded: "{rounded.control}"
    height: "44px"
  button-success-hover:
    backgroundColor: "{colors.success-bg}"
  button-danger:
    backgroundColor: "{colors.tray-white}"
    textColor: "{colors.label-red}"
    rounded: "{rounded.control}"
    height: "44px"
  button-danger-hover:
    backgroundColor: "{colors.danger-bg}"
  button-danger-solid:
    backgroundColor: "{colors.label-red}"
    textColor: "{colors.accent-ink}"
    rounded: "{rounded.control}"
    height: "44px"
  button-ghost:
    textColor: "{colors.ink-muted}"
    rounded: "{rounded.control}"
    height: "40px"
  button-ghost-hover:
    backgroundColor: "{colors.hover-sage}"
    textColor: "{colors.specimen-ink}"
  input:
    backgroundColor: "{colors.tray-white}"
    textColor: "{colors.specimen-ink}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "0 12px"
    height: "44px"
  card:
    backgroundColor: "{colors.tray-white}"
    rounded: "{rounded.control}"
    padding: "16px"
  specimen-tray:
    backgroundColor: "{colors.tray-white}"
    rounded: "{rounded.tray}"
    padding: "12px"
  team-drawer:
    backgroundColor: "{colors.drawer-sage}"
    rounded: "{rounded.overlay}"
    padding: "10px"
  specimen-label:
    backgroundColor: "{colors.tray-white}"
    textColor: "{colors.specimen-ink}"
    typography: "{typography.specimen-data}"
    padding: "6px 8px"
  badge-neutral:
    backgroundColor: "{colors.drawer-sage}"
    textColor: "{colors.ink-muted}"
    typography: "{typography.label}"
    rounded: "{rounded.tray}"
    padding: "2px 6px"
  nav-tab-active-rail:
    backgroundColor: "{colors.shell-ink-muted}"
    textColor: "{colors.shell-green}"
    rounded: "{rounded.control}"
    height: "40px"
  modal:
    backgroundColor: "{colors.tray-white}"
    rounded: "{rounded.overlay}"
---

# Design System: Lockstep

## Overview

**Creative North Star: "The Naturkunde-Sammlung"**

Every catch is a specimen and the run is the collection. A bottle-green shell carries the navigation like the painted frame of a museum cabinet; inside it, a cool sage ground holds white specimen trays drawn with hairline sage rules and nearly square corners. Under each specimen sits its collection label: a double-ruled box of small monospaced data - catalogue number, locality (the route), collectors (the players), base-stat total. The world is quiet and archival so that the two things that must shout can: the label red of a death, and the green of a route that is complete.

The interface is dense on purpose. Players read it between battles on a phone beside the console and as a second screen during a call, so the system favours many small, legible facts over large decorative surfaces. Hierarchy comes from the tray, the label and the type weight, not from colour fields or shadows. Both themes and the shell are one palette expressed three ways: daylight sage, a deep green-black night, and the green field that never changes.

The build refuses the category default it was set against: a dark zinc dashboard of identical rounded cards with pastel type pills.

**Key Characteristics:**
- Bottle-green shell (side rail from `lg`, top bar plus sticky tab strip on a phone), identical in both themes.
- White trays on a sage ground, separated by 1px sage hairlines; tray corners 4px, controls 6px.
- The double-ruled specimen label as the signature, set in Red Hat Mono with tabular figures.
- Familjen Grotesk for everything you read and press; Red Hat Mono only for data and figures.
- Flat at rest: depth is the drawer under the trays, shadows exist only on things that float.
- Red means death or danger and nothing else.

## Colors

A cool, low-chroma sage-and-green collection palette with one saturated red reserved for loss; every colour is a CSS custom property declared once per scope in `globals.css` and consumed through Tailwind tokens (`bg-panel`, `text-ink-muted`), never as raw palette classes.

### Primary
- **Bottle Green** (shell-green): the default shell field (side rail, phone top bar, browser chrome, `::selection`) and the light-theme primary button fill (`--accent`). In dark mode the primary button inverts to **Pale Label Green** (dark-accent) with bottle-green text. The shell colour is a per-device choice: Pokéball red `#b8101b`, blue `#1e3a8a` or yellow `#ffcb05` (dark ink) replace the green through one `--shell-*` variable set each (`:root[data-shell=...]` in globals.css), the primary button following along. The logo tile is always Pokéball red `#cc0000`.

### Secondary
- **Caught Green** (caught-green, with success-bg / success-line / success-solid): progress and success - a completed route's tinted label strip, the "Gefangen" outcome, evolve and add-to-team outlines, progress bars and switches (solid step).
- **Missing Amber** (missing-amber, with warning-bg / warning-line / warning-solid): a SoulLink route where a player still owes an entry, and other warnings.
- **Info Blue** (info-blue, with info-bg / info-line): informational toasts and badges only.

### Tertiary
- **Label Red** (label-red, with danger-bg / danger-line): death and danger only - dead pairs, the Memorial, a lost route's label strip, destructive buttons. The same red is the solid fill (`--danger-solid`) in both themes, white on it 6.5:1.
- **Blindflug Violet** (blindflug-violet; shell-blindflug inside the green field): the Blindflug mode's hazard tape, redaction blocks and sweep. A hue nothing else uses, so it never reads as a status.

### Neutral
- **Sage Ground** (sage-ground): the page canvas.
- **Tray White** (tray-white): every raised surface - trays, cards, dropdowns, modals, the label's own field.
- **Drawer Sage** (drawer-sage): the drawer the six team trays sit in, table heads, tracks, an open route's label strip.
- **Hover Sage** (hover-sage): hover wash on neutral controls.
- **Hairline Sage** (hairline-sage): default dividers and tray borders.
- **Control Sage** (control-sage): borders of inputs, selects and secondary buttons (2.7:1 on a tray).
- **Specimen Ink** (specimen-ink), **Ink Muted** (ink-muted, 7.0:1 on the ground), **Ink Subtle** (ink-subtle, 5.2:1 on the ground, 4.8:1 on the drawer): the three text steps.
- **Focus Green** (focus-green; dark-focus, shell-focus): the single focus ring, 3:1 against its surroundings.
- **Dark theme** (`.dark`): dark-ground, dark-tray one step lighter, dark-drawer, dark-hover, dark-line, dark-line-strong, dark-ink / dark-ink-muted / dark-ink-subtle, and pastel text steps for state (dark-success, dark-warning, dark-danger, dark-info) with their own solid steps (dark-success-solid, dark-warning-solid).
- **Shell scope** (`.shell`): the same token names re-pointed at the green field - shell-panel, shell-sunken, shell-hover, shell-line, shell-line-strong, white ink, shell-ink-muted (also the active-tab label fill), shell-ink-subtle. `.unshell` restores the page palette for anything that opens out of the shell (the gear dropdown, run-switcher list, every Modal).

### Data colours
- **Type effectiveness fills** (eff-good, eff-good-deep, eff-bad, eff-bad-mild, eff-none with eff-none-ink; eff-on-light for digits on the two light fills): saturated mid-tones shared by the type matrix, team matchup and weakness table. They are data visualisation, not palette.
- **Canonical type colours** (`TYPE_COLORS` in `pokemonTypes.ts`): game data rendered through `typeChipStyle()`, which picks dark or white ink per type at 4.5:1 (pinned by `typeChipStyle.test.ts`).

### Named Rules
**The Label Red Rule.** Red marks death or danger and nothing else. A route that is lost, a pair that died, a button that deletes. Never use it for emphasis, counts or decoration.

**The Text Token Rule.** `--success`, `--warning`, `--danger` and `--info` are text colours (pastels in dark mode). Fill a bar, switch or cell with the `*-solid` or `--eff-*` steps; a chalky fill means the text token was used.

**The Shell Scope Rule.** Shell components use the ordinary tokens; the `.shell` scope re-points them. Never give a component a shell-specific colour variant, and wrap anything that pops out of the shell in `.unshell`.

**The Never Lighten Rule.** The ink greys and the focus colours are tuned to WCAG 2.2 AA (4.5:1 text, 3:1 focus) on the ground, the tray and the drawer. Do not lighten them.

## Typography

**Body Font:** Familjen Grotesk (with system-ui, sans-serif)
**Label/Mono Font:** Red Hat Mono (with ui-monospace, monospace), always with tabular figures

**Character:** A grotesk with some warmth carries the interface - names, headings, controls; a mono carries the facts a collection label would carry. The pairing reads as a typed catalogue card attached to a friendly tool.

### Hierarchy
- **Display** (700, 1.875rem rising to 2.25rem from `sm`, tight tracking): the page's single `<h1>` in `PageHeader` ("Team", "Encounter"). Nothing else is page-title-sized; an `<h2>` at that size fails `uiConventions.test.ts`.
- **Headline** (700, 1.125rem, tight tracking): section headings (`Section`, the drawer heading, modal titles). The rail wordmark sits between at 1.25-1.5rem.
- **Title** (600, 1rem): a specimen's name under its sprite, the next cap's trainer.
- **Body** (400-600, 0.875rem): controls, list rows, form fields, descriptions (`max-w-prose`).
- **Label** (500-600, 0.75rem): field labels, tab labels on a phone, badges, outcome words.
- **Specimen data** (Red Hat Mono 400, 0.75rem, relaxed leading, tabular): label rows, catalogue numbers, route numbers, BST lines; the first label row is set 600.
- **Figure large** (Red Hat Mono 600, 1.875rem, leading 1): the next level cap's number; at 1.125rem for the compact cap chip.

### Named Rules
**The Mono Means Data Rule.** Red Hat Mono is for numbers and catalogue data - catalogue and route numbers, BST, level caps, label rows. Prose, names and buttons stay in Familjen Grotesk.

**The Token Size Rule.** Sizes come from the Tailwind scale (`text-xs` to `text-4xl`); arbitrary `text-[Npx]` is forbidden by test. The user's UI-scale setting changes the root font size, so everything is sized in `rem`.

## Layout

The shell is one element that changes shape. From `lg` (1024px) it is a sticky, full-height green side rail 232px wide (`w-58`) holding, top to bottom: logo and wordmark, the run box, the vertical tab list, the next-cap card (pushed to the foot with `mt-auto`) and the utility buttons; its parts are placed with `order` so the phone and desktop share one DOM. Below `lg` the same parts form a green top bar followed by a sticky horizontal tab strip (`StickyNav`) on the sage ground. The rail carries `lg:z-30`, because a sticky element is a stacking context and dropdowns opening out of it must cover page content.

Main content is centred up to 96rem with 16px / 24px / 32px side padding (base / `sm` / `lg`) and 24px / 32px vertical padding. Sections stack with 32px between them; heading-to-content is 12px. The Team tab places the drawer and a 24rem side column (Box, Gedenkstätte) side by side only from 105rem; below that the column follows the drawer. Grids step 1 → 2 → 3 columns (`sm`, `xl` for the drawer of six trays as 3×2). Gaps inside the system are small and even: 8-10px between trays, 12px tray padding, 16px card padding.

Density is a requirement, not a mood: at least as much at a glance as before the redesign, German labels running long. Per-player columns in the Encounter tab are separated by 1px sage hairlines (a 1px gap over the line colour), not by space.

## Elevation & Depth

Flat by default, with tonal layering. Depth is the drawer: trays (tray white) sit inside a sunken sage drawer on a sage ground, each step one tone apart, divided by hairline rules. Shadows appear only on elements that genuinely float above the page.

### Shadow Vocabulary
- **Float** (`box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)`): dropdowns, comboboxes, menus, toasts, the consent banner.
- **Dialog** (`box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)`): the Modal panel, over a 50% black backdrop.

### Named Rules
**The Drawer Not Shadow Rule.** Trays, cards and labels never carry a shadow. If something needs to stand out at rest, it gets a tone step or a rule, not elevation.

## Shapes

Nearly square. Specimen trays and badges use 4px corners, controls and cards 6px, floating surfaces (drawer, dropdowns, modals, toasts) 8px; nothing is pill-shaped except switch knobs. Borders are 1px hairlines in hairline sage; controls use the stronger control sage. An empty slot or an "add" affordance is the same tray with a dashed control-sage border on a half-transparent tray.

The signature form is the double rule: a 1px ink border plus a 1px ink outline offset 2px, square-cornered, around the specimen label. A dead specimen's label replaces the double frame with a heavy 4px ink rule on top and a 1px rule below. The logo draws the same frame - a double-ruled label holding two linked dots - on a Pokéball-red tile.

## Components

### Buttons
Quiet, rectangular, tactile enough for a thumb.
- **Shape:** gently squared (6px), `inline-flex`, 8px icon gap, weight 600, body size.
- **Sizes:** `md` 44px (primary and destructive actions), `sm` 40px - the floor for any touch target. Icon-only buttons are square at the same heights and require `aria-label`.
- **Primary:** bottle-green fill with white ink (pale label green with green ink in dark mode); hover lowers opacity to 90%.
- **Secondary (default):** tray white, control-sage border, specimen ink; hover takes the hover-sage wash. Inside the shell the same tokens render green-on-green.
- **Success / Danger:** tray-white outline buttons in caught green or label red, filling with the tinted background on hover.
- **Danger-solid:** the label-red fill, only for the one button that carries out a deletion.
- **Ghost:** muted ink, hover wash and full ink on hover.
- **States:** `loading` swaps the icon for the spinner and sets `aria-busy`; disabled at 50% with a not-allowed cursor; focus is the global 2px focus-green outline, offset 2px.

### Chips
- **Badge:** 4px corners, 1px border, 2px × 6px padding, label size 600; tones neutral (drawer sage), success, warning, danger, info, each as background + line + text step.
- **Type chip:** 4px corners, canonical type fill with computed ink, label size 600.

### Cards / Containers
- **Card:** tray white, 1px hairline-sage border, 6px corners, padding none / 12px / 16px. Used for general content.
- **Specimen tray:** tray white, hairline border, 4px corners, 12px padding; the unit of the Team drawer and the Box. An empty team slot is the dashed variant.
- **Route tray (Encounter tab):** a tray whose header strip is tinted with the route's outcome - drawer sage open, warning-bg missing, success-bg caught, danger-bg lost - carrying the mono catalogue number, the route name and the outcome in words; the players' editors sit below in hairline-divided columns.
- **Empty state:** dashed control-sage border on a half-transparent tray, centred muted text and an optional action.

### Inputs / Fields
- **Style:** tray white, 1px control-sage border, 6px corners, 12px horizontal padding, body size; heights are a prop (`sm` 40px, `md` 44px), never a className override. Placeholder in ink subtle.
- **Select:** the same field with the world's own chevron (`.select-chevron`, a stroke-2 SVG tokenised per palette: page light, page dark, shell).
- **Focus:** the global focus-green ring; `outline-none` is only allowed with a replacement ring (tested).
- **Numbers:** never `type="number"` - `type="text" inputMode="numeric"` plus `useClampedIntInput`.
- **Labels:** `FieldLabel`, label size 500 in ink muted; every control is programmatically named.

### Navigation
- **Rail (lg+):** vertical tabs 40px high, 6px corners, body size; icon and label in a row. The active tab is a pale label (shell-ink-muted) with bottle-green text, weight 600; inactive tabs are muted shell ink with the hover wash.
- **Phone strip:** horizontal, scrollable, icon above a label-size word, 2px bottom border marking the active tab; the strip hides on scroll down past 96px and returns on the first upward scroll (8px jitter threshold).
- **Run box:** a secondary-styled control (min 40px) showing the run name (600) and its game in label size; its list opens `.unshell` with the float shadow.
- **Icons:** drawn line icons only (24 viewBox, no fill, `currentColor`, 1.75 stroke) - `NavIcon` and `ActionIcons`. Never emoji.

### Specimen Label (signature)
A double-ruled box of small mono data with tabular figures, 6px × 8px padding, relaxed leading, on the tray-white field. Rows are left/right pairs (`LabelRow`): the first row - catalogue number and team position - is set 600, the following rows carry locality, collectors and BST ("Σ 505 → 860"). It sits under every pair in the Team drawer and in the Box. The `dead` variant (heavy top rule, no frame) is used for a dead pair and for every Memorial entry. Use it for a catch's catalogue data; it is not a general-purpose container.

### Next-Cap Card
In the rail: a hover-sage block with the next trainer's location (label), name (title, 700) and the cap number as figure-large mono, with a hairline-ruled mono footer line. On a phone it collapses to a 40px chip: label word plus the mono number.

### Specimen tile
`EncounterTile` has three layouts: `specimen` (sprite on top, centred name in title size, mono details under - the Team drawer), `compact` (Box and memorial cards) and `row` (lists). A fusion passes its body through so the fused sprite shows.

### Modal and toasts
One Modal: tray white, 8px corners, dialog shadow, max 85vh, header and footer separated by hairlines, the close button pinned outside the scroll area, always `.unshell`. Toasts are tinted tone boxes (success, danger, info) with the float shadow, success 3s, info 4s, error 7s.

### Motion
- **Evolve sweep:** a single caught-green dot travels the Entwickeln button's border twice over 5s (linear), then fades; hidden under reduced motion.
- **StickyNav slide:** 200ms translate; reduced motion keeps the hide/show but drops the slide.
- **Blindflug:** violet hazard tape at the viewport top, -45° hatched redaction blocks with real height, and a one-time 1600ms ease-in-out sweep down and back that unmounts on `animationend` (shortened to 1ms under reduced motion so the event still fires).
- **Spinner:** the only infinite animation, shown only while an action is pending.

### Named Rules
**The Finite Motion Rule.** Every decorative animation ends by itself and honours `prefers-reduced-motion` (WCAG 2.2.2). Only a pending spinner may loop.

**The Fade The Picture Rule.** A dimmed state (defeated, locked, dead) fades only the sprite or icon, uses ink muted for text and says the state in words. Never put opacity on a block that contains text.

## Do's and Don'ts

### Do:
- **Do** reach for a token (`bg-panel`, `border-line`, `text-ink-muted`) first; a call site that needs its own colours means a primitive is missing a variant.
- **Do** build with the primitives: `Button`, `Card`, `Badge`, `Input`/`Select`/`Textarea`/`FieldLabel`, `Modal`, `Spinner`, `ToastProvider`, `PageHeader`/`Section`/`EmptyState`, `SpecimenLabel`.
- **Do** put a catch's catalogue data in a `SpecimenLabel` (dead variant for the dead and the Memorial), set in Red Hat Mono with tabular figures.
- **Do** separate trays and columns with 1px sage hairlines and tone steps (ground → drawer → tray).
- **Do** keep every touch target at 40px or more (44px for primary and destructive actions).
- **Do** give each state colour one meaning: green caught/progress, amber missing, red death/danger, violet Blindflug.
- **Do** wrap any dropdown or dialog opened from the shell in `.unshell`.
- **Do** name every control (`useId` + `htmlFor` or `aria-label`, with context for repeated fields) and spread `useDropdown().triggerProps` on dropdown triggers.
- **Do** fill bars, switches and cells with `*-solid` or `--eff-*` steps, and type chips with `typeChipStyle()`.

### Don't:
- **Don't** use raw Tailwind palette classes (`bg-zinc-200`, `text-red-500`) or arbitrary `text-[Npx]` - both fail `uiConventions.test.ts`.
- **Don't** add a second modal, a second click-outside handler, an `<input type="number">`, `outline-none` without a ring, or a page-title-sized `<h2>`.
- **Don't** nest two Modals; confirm inline inside a dialog.
- **Don't** use label red for anything that is not death or danger.
- **Don't** put shadows on trays, cards or labels; shadows belong to dropdowns, toasts and the Modal.
- **Don't** round trays beyond 4px or controls beyond 6px, and don't turn cards into pills.
- **Don't** use emoji or glyph characters as icons; draw line SVGs in the `NavIcon` idiom.
- **Don't** put `text-white` on a type colour or a text-state token on a fill.
- **Don't** lighten the ink greys or the focus colours.
- **Don't** add uppercase, letter-spaced kicker lines above headings; a heading stands on its own.
- **Don't** use Pokémon or Poké Ball imagery in the logo or any shipped artwork.
