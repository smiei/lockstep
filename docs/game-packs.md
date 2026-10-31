# Game packs

Each game the tracker supports is a **game pack**: a small set of JSON files in `data/games/<id>/`.

A pack holds **no encounter tables and no trainer teams**. You enter catches yourself, so the app only needs:
- the routes in the order you visit them;
- the boss fights with their level caps;
- a few settings for the game.

The Pokémon themselves (names in every language, types, stats, moves) come from the shared data and need nothing per game.

There are two ways to add a game:

- **Import it in the app.** New Run → *Import your own game*. It works on your own server only and needs no pull request. See [Importing a pack in the app](#importing-a-pack-in-the-app).
- **Contribute it to the repository.** Then everyone gets it. See [Contributing a pack](#contributing-a-pack).

## Files

| File | Required | What it holds |
| --- | --- | --- |
| `game.json` | yes | Name, generation, Pokédex range, sprites, move data |
| `routes.json` | yes | Every place you can get an encounter, in play order |
| `levelcaps.json` | yes | Every boss fight, in play order, with its level cap |
| `evolution-overrides.json` | no | Evolutions a ROM hack or randomizer changes |

### game.json

```json
{
  "id": "radical-red",
  "sort": 20,
  "kind": "romhack",
  "dataStatus": "unverified",
  "generation": 3,
  "dataGeneration": 9,
  "dexLimit": 386,
  "spriteSet": "emerald",
  "versionGroup": "emerald",
  "names": { "de": "Radical Red", "en": "Radical Red" }
}
```

| Field | Meaning |
| --- | --- |
| `id` | Folder name: lowercase letters, digits and dashes. An imported pack's id starts with `custom-`; that prefix is reserved for imports. |
| `sort` | Position in the game list. |
| `kind` | `official`, `romhack` or `fangame`. The game list is grouped by it. |
| `dataStatus` | `verified` once someone has checked routes, order and names against the game, otherwise `unverified`. The app shows a "Data unverified" note for unverified packs. **New packs start as `unverified`.** |
| `generation` | The game **engine**: the catch formula and the Poké Balls (1–9). |
| `dataGeneration` | Optional. The **data era**: the type chart, stats and move names. Set it when a hack runs modern data on an old engine, e.g. `generation: 3` and `dataGeneration: 9` for Fairy types on a FireRed base. Missing = same as `generation`. |
| `dexLimit` | The highest national-dex number you can catch. Pick lists stop there. |
| `spriteSet` | Which sprites the app downloads: `red-blue`, `crystal`, `emerald`, `firered-leafgreen`, `platinum`, `heartgold-soulsilver`, `black-white`, or `modern` (current sprites for every Pokémon). Pokémon and forms the chosen set does not have, such as a Gen 8 Pokémon in a Gen 3 hack, come from `modern`. |
| `versionGroup` | Which move and TM data the app uses: `red-blue`, `crystal`, `emerald`, `firered-leafgreen`, `platinum`, `heartgold-soulsilver`, `black-white`, or `modern` (each Pokémon's moves from the newest game that has them, for hacks on current data). |
| `regionalForms` | Optional. `true` when Alolan, Galarian, Hisuian or Paldean forms are caught on routes: they are then listed beside the species when you enter a catch. Without it they can still be switched into on the Team tab, as long as `dataGeneration` is new enough. |
| `trainerSet` | Optional. The folder under `public/trainers/` for trainer pictures (default: the id). |
| `names` | The game's name. `de` and `en` are required; `fr`, `es` and `it` are optional and fall back to English. |

### routes.json

```json
[
  { "id": 1, "names": { "de": "Starter", "en": "Starter" }, "type": "static" },
  { "id": 2, "names": { "de": "Route 1", "en": "Route 1" }, "type": "route" },
  { "id": 3, "names": { "de": "Azuria-Höhle", "en": "Cerulean Cave" }, "type": "route", "postgame": true }
]
```

- `type: "route"` is a wild encounter. `"static"` is a gift, fossil, purchase or legendary; statics are exempt from the Species Clause.
- `postgame: true` hides the place behind the Encounter tab's post-game toggle.
- **The order of the list is the play order** and may be changed at any time.
- **Ids are permanent.** Saved runs point at them. Never renumber or reuse an id; a new route gets the next free one, wherever it sits in the list.

### levelcaps.json

```json
[
  {
    "id": 1,
    "names": { "de": "Rocko", "en": "Brock" },
    "location": { "de": "Marmoria City", "en": "Pewter City" },
    "badge": { "de": "Felsorden", "en": "Boulder Badge" },
    "max_level": 14
  },
  {
    "id": 9,
    "names": { "de": "Lorelei", "en": "Lorelei" },
    "location": { "de": "Top Vier", "en": "Elite Four" },
    "badge": null,
    "max_level": 54
  }
]
```

- **Order:** one entry per boss fight, in play order.
- **`max_level`:** the level cap, which is the highest level on the boss's team. It is `null` for a fight without a cap, such as a rival battle in some rulesets.
- **`badge`:** the gym badge, or `null`.
- **Elite Four and Champion:** they use `"location": { "en": "Elite Four", ... }` and follow each other without gaps. The progress bar marks that block.
- **`sprite`:** optional. The German file name of the trainer picture when it differs from the German name.

### evolution-overrides.json

Evolutions a hack or randomizer changes, e.g. trade evolutions turned into level-ups:

```json
[
  { "from": 64, "to": 65, "comment": "Kadabra -> Alakazam", "category": "impossible", "method": { "kind": "level", "level": 37 } }
]
```

- **`category`:** one of `impossible` (trade evolutions replaced), `easier` (lowered levels) or `timeBased` (day/night conditions dropped). Each has a switch in the Rules tab.
- **`method.kind`:** `level` (`level`), `item` (`item`), `levelHeld` (`item`), `levelWith` (`name`), `levelMove` (`move`), `levelParty` (`species`), `levelLocation` (`location`), `happiness`, `trade`, `shed`, `beauty` or `other`. The field in brackets is required for that kind.

### ROM hacks: their own stats, types and moves

The built-in ROM-hack packs carry two more files:
- `data/shared/<id>-species.json`, referenced from `game.json` as `"speciesData"`, holds the Pokémon whose stats or types the hack changes;
- `move-overrides.json` holds the moves whose power, type or category it changes.

They are generated from nuzlocke.app's data by `node scripts/import-nuzlocke-app.mjs`, and changed evolutions and catch rates are not part of that source. Forms only a hack has (Radical Red's Sevii forms, Blazing Emerald's Hoenn forms) are not in the app's data and cannot be picked. Packs you import or contribute cannot carry species data yet; open an issue if your hack needs it.

## Writing a pack as a text list

You don't have to write JSON by hand. A plain text list works too; see [`docs/examples/game-pack-example.txt`](examples/game-pack-example.txt):

```text
[game]
id = example-hack
name = Example Hack
kind = romhack
generation = 3
dataGeneration = 9
dexLimit = 386
spriteSet = emerald
versionGroup = emerald
sort = 50

[routes]
# English ; German ; flags (static, postgame)
Starter ; Starter ; static
Route 1
Viridian Forest ; Vertania-Wald

[levelcaps]
# Boss (en ; de) | Place (en ; de) | Badge (en ; de) | Level cap
Brock ; Rocko | Pewter City ; Marmoria City | Boulder Badge ; Felsorden | 14
Lorelei | Elite Four ; Top Vier | | 54
```

The German name may be left out, and then the English one is used.

```bash
npm run pack -- from-text my-game.txt --out my-game.json   # text list -> pack file
npm run pack -- unbundle my-game.json                      # pack file -> data/games/<id>/
npm run pack -- bundle data/games/firered --out fr.json    # pack folder -> pack file (e.g. as a template)
npm run validate:packs                                     # check every pack
```

## Importing a pack in the app

1. Build a pack file: from a text list with `npm run pack -- from-text`, or by hand in the format above.
2. Give it an id starting with `custom-`, e.g. `"custom-radical-red"`.
3. In the app go to **New Run → Import your own game** and pick the file.
   - The app checks the file first and lists anything wrong.
   - Once accepted, the game appears in the list under *Your own games*.

**Where it is saved:**
- **On the server:** in a `custom-games` folder next to the database, so it survives updates. With Docker that is inside the `/app/db` volume.
- **In backups:** a run's backup carries its custom game along, and importing that backup on another server installs the game there too.
- **Public instance:** importing is not available there.

## Contributing a pack

1. Write the pack as a text list or as JSON and turn it into `data/games/<id>/` with `npm run pack -- unbundle`. Use an id without `custom-`.
2. Run `npm run validate:packs`. The same check runs automatically on every pull request.
3. Open a pull request and name your sources. The template has a checklist.

Not ready to write a pack? Open an issue with the *Add a game or ROM hack* template.

**Data from other projects:**
- Route lists and level caps are facts about a game, but a project's files can still carry a license.
- Copy from another tracker only if its license allows it (MIT, BSD and similar), and name the project in your pull request so it can be credited in `THIRD_PARTY_NOTICES.md`.
- Without a license, use such a source only to check your own list.
