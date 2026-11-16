import { describe, expect, it } from "vitest";
import { failedRouteIdsOf } from "@/lib/fusionGroups";
import { evolutionOptions, DEFAULT_RUN_SETTINGS } from "@/lib/runSettings";

const encounters = [
  { routeId: 1, status: "CAUGHT" },
  { routeId: 1, status: "FLED" },
  { routeId: 2, status: "CAUGHT" },
  { routeId: 3, status: "KILLED" },
];

describe("failedRouteIdsOf", () => {
  it("names the routes where an encounter fled or was killed", () => {
    expect([...failedRouteIdsOf("SOULLINK", encounters)].sort()).toEqual([1, 3]);
  });

  it("is empty in a Classic run, which has no partner", () => {
    expect(failedRouteIdsOf("CLASSIC", encounters).size).toBe(0);
  });
});

describe("evolutionOptions", () => {
  it("maps the three randomizer rules onto the override categories", () => {
    const settings = {
      ...DEFAULT_RUN_SETTINGS,
      evolutionOverridesImpossible: true,
      evolutionOverridesEasier: false,
      evolutionOverridesTimeBased: true,
    };
    expect(evolutionOptions("firered", settings)).toEqual({
      gameId: "firered",
      impossible: true,
      easier: false,
      timeBased: true,
    });
  });
});
