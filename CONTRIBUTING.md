# Contributing

Thanks for helping. The most useful contributions are **game data**: new games and ROM hacks, and corrections to existing ones.

## Games and ROM hacks

A game is a small pack of route and boss lists; there are no encounter tables to type in. Everything is in **[docs/game-packs.md](docs/game-packs.md)**: the format, a text-list shortcut, and how to check your pack with `npm run validate:packs`. Every pull request that touches `data/games/` is checked automatically.

- **Want a game but can't build the pack?** Open an issue with the *Add a game or ROM hack* template and name your sources.
- **Found a wrong route, order, level cap or name?** Use the *Report a data mistake* template.
- **Unverified packs:** Red/Blue/Yellow, Gold/Silver/Crystal, Black/White and Infinite Fusion have not been checked against the game yet. Checking one and fixing what is off is very welcome. Set `"dataStatus": "verified"` in the same pull request.

## Translations

German and English are maintained by hand. French, Spanish and Italian were machine-translated (the interface texts and the place names); the Pokémon names come from PokéAPI and are correct. Corrections go into `src/lib/i18n/dictionary.ts` (interface) or the `names` of `data/games/*/routes.json` and `levelcaps.json` (places and bosses).

## Code

[docs/development.md](docs/development.md) covers the setup, scripts and tests. Before a pull request:

```bash
npm test
npm run lint
npm run build
```

## Licensing

- **Code and data:** everything in this repository is MIT-licensed, and so are your contributions.
- **Data from another project:** keep that project's license and name it in the pull request, so it can be credited in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
- **No Pokémon artwork:** never add sprites or other Pokémon artwork to the repository. The app downloads them when it is set up.
