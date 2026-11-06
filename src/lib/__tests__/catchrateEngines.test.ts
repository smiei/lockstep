import { describe, it, expect } from "vitest";
import fs from "node:fs";
import {
  CFRU_ENGINE,
  EXPANSION_ENGINE,
  computeCatchChance,
  getBallIdsForGeneration,
  ballHasCondition,
  type CatchInput,
} from "@/lib/catchrate";

// A full-HP, level 50 target with catch rate 45 and your Pokémon at level 50.
const base: CatchInput = {
  baseRate: 45,
  hpPercent: 100,
  level: 50,
  ownLevel: 50,
  ball: "poke",
  status: "none",
  types: ["normal"],
  turn: 1,
};

describe("ROM hack engines: which games use them", () => {
  const engine = (id: string) =>
    (JSON.parse(fs.readFileSync(`data/games/${id}/game.json`, "utf-8")) as { catchEngine?: string }).catchEngine;
  it("Radical Red and Unbound run on CFRU, Run & Bun on pokeemerald-expansion", () => {
    expect(engine("radical-red")).toBe(CFRU_ENGINE);
    expect(engine("unbound")).toBe(CFRU_ENGINE);
    expect(engine("run-and-bun")).toBe(EXPANSION_ENGINE);
    expect(engine("emerald")).toBeUndefined();
  });

  it("offers every real ball up to Gen 8 there, and leaves Gen 3's own list alone", () => {
    for (const key of [CFRU_ENGINE, EXPANSION_ENGINE]) {
      const balls = getBallIdsForGeneration(3, key);
      expect(balls).toHaveLength(27);
      expect(balls).toEqual(expect.arrayContaining(["quick", "dusk", "heal", "dream", "beast", "level", "park", "cherish"]));
    }
    expect(getBallIdsForGeneration(3, "modern")).not.toContain("quick");
  });
});

describe("CFRU capture code", () => {
  const cfru = (patch: Partial<CatchInput>) => computeCatchChance(3, { ...base, ...patch }, CFRU_ENGINE);

  it("follows the integer formula: odds 15 -> b 32767 -> about one in sixteen", () => {
    // 45 * 10/10 = 45, full HP keeps a third: 15; sqrt(sqrt(1118481)) = 32 in
    // integers; 1048560 / 32 = 32767, four checks.
    expect(cfru({}).chance).toBeCloseTo(Math.pow(32767 / 65536, 4), 10);
  });

  it("uses the engine's ball values", () => {
    expect(cfru({ ball: "quick" }).ballText).toBe("×5");
    expect(cfru({ ball: "quick", turn: 2 }).ballText).toBe("×1");
    expect(cfru({ ball: "dusk" }).ballText).toBe("×3");
    expect(cfru({ ball: "lure" }).ballText).toBe("×4");
    expect(cfru({ ball: "sport" }).ballText).toBe("×1.5");
    expect(cfru({ ball: "timer", turn: 4 }).ballText).toBe("×1.9");
    expect(cfru({ ball: "nest", level: 30 }).ballText).toBe("×1.1");
    expect(cfru({ ball: "dream", status: "sleep" }).ballText).toBe("×4");
    expect(cfru({ ball: "park" }).guaranteed).toBe(true);
  });

  it("raises the chance below level 21 and counts sleep x2.5", () => {
    expect(cfru({ level: 10, ownLevel: 10 }).levelText).toBe("×2");
    expect(cfru({ status: "sleep" }).statusText).toBe("×2.5");
  });

  it("cuts it to a tenth against a higher-level target until the League is beaten", () => {
    expect(cfru({ ownLevel: 40 }).penaltyText).toBe("×0.1");
    expect(cfru({ ownLevel: 40 }).chance).toBeLessThan(cfru({}).chance);
    expect(cfru({ ownLevel: 40, gameCleared: true }).penaltyText).toBeUndefined();
  });

  it("gives Ultra Beasts x5 only for the Beast Ball", () => {
    expect(cfru({ ball: "beast", ultraBeast: true }).ballText).toBe("×5");
    expect(cfru({ ball: "ultra", ultraBeast: true }).ballText).toBe("×0.1");
  });

  it("makes a critical capture likelier with more species caught", () => {
    expect(cfru({ dexOwned: 601 }).chance).toBeGreaterThan(cfru({ dexOwned: 0 }).chance);
  });
});

describe("pokeemerald-expansion (2023) capture code", () => {
  const exp = (patch: Partial<CatchInput>) => computeCatchChance(3, { ...base, ...patch }, EXPANSION_ENGINE);

  it("keeps Gen 3's status bonus and adds no level terms", () => {
    expect(exp({ status: "sleep" }).statusText).toBe("×2");
    expect(exp({ level: 5, ownLevel: 1 }).levelText).toBeUndefined();
    expect(exp({ level: 60, ownLevel: 5 }).penaltyText).toBeUndefined();
    expect(exp({}).chance).toBeCloseTo(Math.pow(32767 / 65536, 4), 10);
  });

  it("uses its Gen 8 ball values", () => {
    expect(exp({ ball: "lure" }).ballText).toBe("×5");
    expect(exp({ ball: "dusk" }).ballText).toBe("×3");
    expect(exp({ ball: "sport" }).ballText).toBe("×1");
    expect(exp({ ball: "park" }).guaranteed).toBe(false);
    expect(exp({ ball: "nest", level: 30 }).ballText).toBe("×1");
    // More than twice the level for x4, not twice exactly.
    expect(exp({ ball: "level", level: 25, ownLevel: 50 }).ballText).toBe("×2");
    expect(exp({ ball: "level", level: 24, ownLevel: 50 }).ballText).toBe("×4");
  });

  it("asks for the same situations as the other engines", () => {
    expect(ballHasCondition("dusk", EXPANSION_ENGINE)).toBe(true);
    expect(ballHasCondition("park", CFRU_ENGINE)).toBe(false);
    expect(ballHasCondition("fast", EXPANSION_ENGINE)).toBe(false);
  });
});
