import { describe, expect, it } from "vitest";
import { Player } from "@/generated/prisma/enums";
import { catchRate, computeRunStats, parseTeamSnapshot, segmentAt, type StatsCap } from "@/lib/runStats";

const { PLAYER1: P1, PLAYER2: P2 } = Player;
// Journey order: Brock (1), Misty (2), Surge (3). Brock won at t=100, Misty at t=200.
const CAPS: StatsCap[] = [
  { id: 1, defeatedAt: 100 },
  { id: 2, defeatedAt: 200 },
  { id: 3, defeatedAt: null },
];

describe("segmentAt", () => {
  it("is the first fight won after the moment", () => {
    expect(segmentAt(50, CAPS)).toBe(1);
    expect(segmentAt(150, CAPS)).toBe(2);
  });

  it("is the next open fight after the last win", () => {
    expect(segmentAt(250, CAPS)).toBe(3);
  });

  it("follows the order fights were won in, not the list order", () => {
    // Misty before Brock: something at t=50 belongs to Misty.
    expect(segmentAt(50, [{ id: 1, defeatedAt: 100 }, { id: 2, defeatedAt: 60 }])).toBe(2);
  });

  it("is the end once every fight is won", () => {
    expect(segmentAt(300, [{ id: 1, defeatedAt: 100 }])).toBe("end");
  });
});

describe("computeRunStats", () => {
  const stats = computeRunStats({
    caps: CAPS,
    players: [P1, P2],
    encounters: [
      { player: P1, at: 10, caught: true },
      { player: P2, at: 10, caught: false },
      { player: P1, at: 150, caught: true },
      { player: P2, at: 250, caught: true },
    ],
    deaths: [
      { player: P1, capId: 2, recorded: true, at: 160 },
      // Before death points were tracked: placed by time.
      { player: P2, capId: null, recorded: false, at: 20 },
      // Nobody knows when.
      { player: null, capId: null, recorded: false, at: null },
      // Recorded after the last fight was won.
      { player: null, capId: null, recorded: true, at: 900 },
    ],
  });
  const seg = (key: number | "end") => stats.segments.find((s) => s.key === key)!;

  it("counts catches and misses per segment and player", () => {
    expect(seg(1).perPlayer).toEqual([
      { player: P1, counts: { caught: 1, missed: 0, deaths: 0 } },
      { player: P2, counts: { caught: 0, missed: 1, deaths: 1 } },
    ]);
    expect(seg(2).perPlayer[0].counts).toEqual({ caught: 1, missed: 0, deaths: 1 });
    expect(seg(3).perPlayer[1].counts.caught).toBe(1);
  });

  it("keeps deaths without a player or a place apart", () => {
    expect(seg("end").unattributedDeaths).toBe(1);
    expect(stats.unplacedDeaths).toBe(1);
  });

  it("sums totals per player", () => {
    expect(stats.totals).toEqual([
      { player: P1, counts: { caught: 2, missed: 0, deaths: 1 } },
      { player: P2, counts: { caught: 1, missed: 1, deaths: 1 } },
    ]);
  });
});

describe("catchRate", () => {
  it("is a rounded percentage, null without encounters", () => {
    expect(catchRate({ caught: 2, missed: 1, deaths: 0 })).toBe(67);
    expect(catchRate({ caught: 0, missed: 0, deaths: 3 })).toBeNull();
  });
});

describe("parseTeamSnapshot", () => {
  it("reads members and drops malformed ones", () => {
    const json = JSON.stringify([
      { player: "PLAYER1", routeId: 3, pokemonId: 4, bodyPokemonId: null, nickname: "Ember" },
      { player: "PLAYER2", routeId: "x", pokemonId: 7 },
    ]);
    expect(parseTeamSnapshot(json)).toEqual([
      { player: P1, routeId: 3, pokemonId: 4, bodyPokemonId: null, nickname: "Ember" },
    ]);
  });

  it("is null for nothing or broken JSON", () => {
    expect(parseTeamSnapshot(null)).toBeNull();
    expect(parseTeamSnapshot("{")).toBeNull();
  });
});
