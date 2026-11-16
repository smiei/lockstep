import { getEvolutions, getMoveTypeHistory, type GameInfo, type Pokemon } from "@/lib/data";
import {
  getDataGenerationForGame,
  getEffectivenessForGame,
  getFusionSpriteConfigForGame,
  getMovesForGame,
  getMovesetForGame,
  getPokemonFormsForGame,
  getPokemonListForGame,
} from "@/lib/gameData";
import { evolutionOptions } from "@/lib/runSettings";
import type { ResolvedRun } from "@/lib/runs";
import type { Lang } from "@/lib/i18n/dictionary";
import type { EffectivenessTable } from "@/lib/effectiveness";
import type { Moveset, MovesTable } from "@/lib/learnset";
import { BlindflugProvider } from "@/components/BlindflugProvider";
import { SpriteSetProvider } from "@/components/SpriteSetProvider";
import { CanonicalRun } from "@/components/CanonicalRun";
import { PlayerNamesProvider } from "@/components/PlayerNamesProvider";
import { PokemonDetailProvider } from "@/components/PokemonDetailProvider";

// What every run-scoped page with Pokémon on it wraps its view in: the run's
// Blindflug rule, sprite set, player names, the address-bar/version report
// (CanonicalRun) and the Pokédex card any sprite can open. A server component,
// so the game data is read here once instead of being spelled out per page.
//
// The optional props are for a page that has already read that data for its
// own view - passing it on saves building the same table twice.
export function RunProviders({
  run,
  game,
  lang,
  pokemonList,
  forms,
  moveData,
  effectiveness,
  children,
}: {
  run: ResolvedRun;
  game: GameInfo;
  lang: Lang;
  pokemonList?: Pokemon[];
  forms?: Pokemon[];
  moveData?: { movesets: Moveset; moves: MovesTable };
  effectiveness?: EffectivenessTable;
  children: React.ReactNode;
}) {
  const { settings } = run;
  return (
    <BlindflugProvider on={settings.blindflug} hideTypes={settings.blindflugTypes}>
      <SpriteSetProvider spriteSet={game.spriteSet} fusion={getFusionSpriteConfigForGame(game)}>
        <CanonicalRun runKey={run.runKey} version={run.version} solo={run.players.length < 2} />
        <PlayerNamesProvider names={settings.playerNames} lang={lang}>
          <PokemonDetailProvider
            pokemonList={pokemonList ?? getPokemonListForGame(game)}
            forms={forms ?? getPokemonFormsForGame(game)}
            evolutions={getEvolutions(evolutionOptions(run.gameId, settings))}
            moveData={moveData ?? { movesets: getMovesetForGame(game), moves: getMovesForGame(game, lang) }}
            moveTypeHistory={getMoveTypeHistory()}
            effectiveness={effectiveness ?? getEffectivenessForGame(game)}
            generation={getDataGenerationForGame(game)}
            dexLimit={game.dexLimit}
            lang={lang}
          >
            {children}
          </PokemonDetailProvider>
        </PlayerNamesProvider>
      </SpriteSetProvider>
    </BlindflugProvider>
  );
}
