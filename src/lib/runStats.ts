import type { Player } from "@/generated/prisma/enums";

// The statistics page's arithmetic (Overview -> Statistics). Client-safe and
// pure. The run's timeline is its Journey: one segment per fight, "up to
// Brock", "up to Misty" ... plus one after the last fight. An event (a catch,
// a miss, a death) belongs to the segment of the fight that was still ahead
// of the team when it happened.

// One member of the team that won a fight (LevelCapProgress.teamJson). By
// route rather than encounter id, so a backup restores it unchanged.
export type TeamSnapshotMember = {
  player: Player;
  routeId: number;
  pokemonId: number;
  // Infinite Fusion: the fused body.
  bodyPokemonId: number | null;
  nickname: string | null;
};

// Reads a stored snapshot; null for none or for anything malformed.
export function parseTeamSnapshot(json: string | null | undefined): TeamSnapshotMember[] | null {
  if (!json) return null;
  try {
    const value: unknown = JSON.parse(json);
    if (!Array.isArray(value)) return null;
    const members = value.filter(
      (m): m is TeamSnapshotMember =>
        typeof m === "object" &&
        m !== null &&
        typeof m.player === "string" &&
        typeof m.routeId === "number" &&
        typeof m.pokemonId === "number",
    );
    return members.map((m) => ({
      player: m.player,
      routeId: m.routeId,
      pokemonId: m.pokemonId,
      bodyPokemonId: typeof m.bodyPokemonId === "number" ? m.bodyPokemonId : null,
      nickname: typeof m.nickname === "string" ? m.nickname : null,
    }));
  } catch {
    return null;
  }
}

// A fight of the run, in Journey order.
export type StatsCap = { id: number; defeatedAt: number | null };

export type StatsEncounter = {
  player: Player;
  // When the route was played (RouteEntry.seenAt, else Encounter.createdAt).
  at: number;
  caught: boolean;
};

export type StatsDeath = {
  // Who lost theirs (SoulLink.deathPlayer); null = not recorded.
  player: Player | null;
  // The fight it belongs to (src/lib/deathPoint.ts), when recorded.
  capId: number | null;
  recorded: boolean;
  at: number | null;
};

// "end" = after the last fight.
export type SegmentKey = number | "end";

export type PlayerCounts = { caught: number; missed: number; deaths: number };

export type StatsSegment = {
  key: SegmentKey;
  // Per player, in the run's player order.
  perPlayer: { player: Player; counts: PlayerCounts }[];
  // A death in SoulLink with no "who" recorded still counts for the segment.
  unattributedDeaths: number;
};

export type RunStats = {
  segments: StatsSegment[];
  totals: { player: Player; counts: PlayerCounts }[];
  // Deaths that predate death-point tracking and have no time either.
  unplacedDeaths: number;
};

const empty = (): PlayerCounts => ({ caught: 0, missed: 0, deaths: 0 });

// The segment a moment belongs to: the first fight (by when it was won) won
// after it; past the last win, the first fight still open in Journey order;
// with every fight won, "end".
export function segmentAt(at: number, caps: readonly StatsCap[]): SegmentKey {
  const wonAfter = caps
    .filter((cap) => cap.defeatedAt !== null && cap.defeatedAt > at)
    .sort((a, b) => (a.defeatedAt as number) - (b.defeatedAt as number))[0];
  if (wonAfter) return wonAfter.id;
  return caps.find((cap) => cap.defeatedAt === null)?.id ?? "end";
}

export function computeRunStats(input: {
  caps: readonly StatsCap[];
  players: readonly Player[];
  encounters: readonly StatsEncounter[];
  deaths: readonly StatsDeath[];
}): RunStats {
  const { caps, players } = input;
  const keys: SegmentKey[] = [...caps.map((cap) => cap.id), "end"];
  const bySegment = new Map(
    keys.map((key) => [
      key,
      { perPlayer: new Map(players.map((p) => [p, empty()])), unattributedDeaths: 0 },
    ]),
  );
  const totals = new Map(players.map((p) => [p, empty()]));
  const known = new Set(players);

  for (const e of input.encounters) {
    if (!known.has(e.player)) continue;
    const segment = bySegment.get(segmentAt(e.at, caps))!;
    const field = e.caught ? "caught" : "missed";
    segment.perPlayer.get(e.player)![field]++;
    totals.get(e.player)![field]++;
  }

  let unplacedDeaths = 0;
  for (const d of input.deaths) {
    const key: SegmentKey | null = d.recorded
      ? (d.capId ?? "end")
      : d.at !== null
        ? segmentAt(d.at, caps)
        : null;
    const segment = key === null ? undefined : bySegment.get(key);
    if (!segment) {
      unplacedDeaths++;
    } else if (d.player && known.has(d.player)) {
      segment.perPlayer.get(d.player)!.deaths++;
    } else {
      segment.unattributedDeaths++;
    }
    if (d.player && known.has(d.player)) totals.get(d.player)!.deaths++;
  }

  return {
    segments: keys.map((key) => {
      const segment = bySegment.get(key)!;
      return {
        key,
        perPlayer: players.map((player) => ({ player, counts: segment.perPlayer.get(player)! })),
        unattributedDeaths: segment.unattributedDeaths,
      };
    }),
    totals: players.map((player) => ({ player, counts: totals.get(player)! })),
    unplacedDeaths,
  };
}

// Caught out of every encounter that had an outcome, 0-100; null without any.
export function catchRate(counts: PlayerCounts): number | null {
  const total = counts.caught + counts.missed;
  return total === 0 ? null : Math.round((counts.caught / total) * 100);
}
