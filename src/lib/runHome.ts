import { prisma } from "@/lib/prisma";
import { getGameById } from "@/lib/data";
import { comparePlayers, runPlayers } from "@/lib/players";
import { computeRouteProgress } from "@/lib/progress";
import { getRoutesForRun } from "@/lib/runRoutes";
import { listCapSummaries, listRunsForHeader } from "@/lib/runs";
import { parseRunSettings } from "@/lib/runSettings";
import type { RunHomeCard } from "@/lib/types";

// The start page's run list (src/app/page.tsx): every run the header would
// list, played-last first, each with what its card shows. A handful of
// queries for all runs together; only the route list (custom routes spliced
// in) is per run.
export async function listRunHomeCards(): Promise<RunHomeCard[]> {
  const runs = await listRunsForHeader();
  if (runs.length === 0) return [];
  const runIds = runs.map((run) => run.id);
  const [caps, encounters, links] = await Promise.all([
    listCapSummaries(runs),
    prisma.encounter.findMany({
      where: { runId: { in: runIds } },
      select: {
        id: true,
        runId: true,
        routeId: true,
        player: true,
        currentPokemonId: true,
        fusedIntoId: true,
        soulLinkId: true,
      },
    }),
    prisma.soulLink.findMany({
      where: { runId: { in: runIds } },
      select: { id: true, runId: true, status: true, teamPosition: true },
    }),
  ]);

  const cards = await Promise.all(
    runs.map(async (run): Promise<RunHomeCard> => {
      const settings = parseRunSettings(run.settingsJson);
      const players = runPlayers(run.mode, run.playerCount);
      const own = encounters.filter((e) => e.runId === run.id);
      const routes = await getRoutesForRun(run.id, run.gameId);
      const progress = computeRouteProgress(routes, own, players, settings.statics);
      const runLinks = links.filter((link) => link.runId === run.id);

      // The team: the first player's Pokémon of each slot, in slot order - a
      // fusion as its head with the body it carries.
      const team = runLinks
        .filter((link) => link.teamPosition !== null && link.status === "ALIVE")
        .sort((a, b) => a.teamPosition! - b.teamPosition!)
        .flatMap((link) => {
          const heads = own
            .filter((e) => e.soulLinkId === link.id && e.fusedIntoId === null)
            .sort((a, b) => comparePlayers(a.player, b.player));
          const head = heads[0];
          if (!head) return [];
          const body = own.find((e) => e.fusedIntoId === head.id);
          return [{ pokemonId: head.currentPokemonId, bodyId: body?.currentPokemonId ?? null }];
        });

      const cap = caps.find((c) => c.accessKey === run.accessKey);
      const game = getGameById(run.gameId);
      return {
        accessKey: run.accessKey,
        name: run.name,
        gameId: run.gameId,
        spriteSet: game?.spriteSet ?? "emerald",
        mode: run.mode,
        players: players.map((player) => settings.playerNames[player] ?? ""),
        changedAt: run.changedAt.toISOString(),
        routesDone: progress.done,
        routesTotal: progress.total,
        badges: cap?.badges ?? 0,
        badgesTotal: cap?.badgesTotal ?? 0,
        nextCap: cap?.next ?? null,
        deaths: runLinks.filter((link) => link.status === "DEAD").length,
        team,
      };
    }),
  );
  return cards.sort((a, b) => b.changedAt.localeCompare(a.changedAt));
}
