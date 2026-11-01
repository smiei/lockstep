# Contributing

Thanks for helping. The most useful contributions are **game data**: new games and ROM hacks, and corrections to existing ones.

## Games and ROM hacks

A game is a small pack of route and boss lists; there are no encounter tables to type in. Everything is in **[docs/game-packs.md](docs/game-packs.md)**: the format, a text-list shortcut, and how to check your pack with `npm run validate:packs`. Every pull request that touches `data/games/` is checked automatically.

- **Want a game but can't build the pack?** Open an issue with the *Add a game or ROM hack* template and name your sources.
- **Found a wrong route, order, level cap or name?** Use the *Report a data mistake* template.
- **Route order:** most packs' route order follows a third-party route list. Playing through a game and correcting the order is very welcome.

## Translations

German and English are maintained by hand. French, Spanish and Italian interface texts were machine-translated; corrections go into `src/lib/i18n/dictionary.ts`. Pokémon names come from PokéAPI, and the official games' place names from PokéWiki (`scripts/localize-places.mjs`), so they are the official ones. A wrong place name is best fixed at its source: on PokéWiki, or in `data/shared/place-name-overrides.json` for labels that are not one place. ROM hacks are English only, so their names stay English.

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
