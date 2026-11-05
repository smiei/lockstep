import { describe, it, expect } from "vitest";
import {
  ballHasCondition,
  computeCatchChance,
  getBallIdsForGeneration,
  INFINITE_FUSION_VERSION_GROUP as IF,
  levelBallMultiplier,
  type CatchInput,
} from "@/lib/catchrate";

const base: CatchInput = {
  baseRate: 45,
  hpPercent: 50,
  level: 20,
  ball: "poke",
  status: "none",
  types: ["normal"],
  turn: 1,
};

describe("levelBallMultiplier", () => {
  it("steps ×1 / ×2 / ×4 / ×8 by your level against the wild one's", () => {
    expect(levelBallMultiplier(20, 20)).toBe(1);
    expect(levelBallMultiplier(21, 20)).toBe(2);
    expect(levelBallMultiplier(39, 20)).toBe(2);
    expect(levelBallMultiplier(40, 20)).toBe(4);
    expect(levelBallMultiplier(79, 20)).toBe(4);
    expect(levelBallMultiplier(80, 20)).toBe(8);
  });

  it("gives nothing without an own level", () => {
    expect(levelBallMultiplier(undefined, 5)).toBe(1);
  });

  it("no longer hides behind a condition checkbox", () => {
    expect(ballHasCondition("level")).toBe(false);
    expect(ballHasCondition("level", IF)).toBe(false);
  });
});

describe("Level Ball in the catch formulas", () => {
  it("HeartGold/SoulSilver: uses the level ratio instead of ×1", () => {
    const result = computeCatchChance(4, { ...base, ball: "level", ownLevel: 80 });
    expect(result.ballText).toBe("×8");
    expect(result.chance).toBeGreaterThan(computeCatchChance(4, base).chance);
  });

  it("Infinite Fusion: uses the level ratio", () => {
    expect(computeCatchChance(5, { ...base, ball: "level", ownLevel: 40 }, IF).ballText).toBe("×4");
    expect(computeCatchChance(5, { ...base, ball: "level", ownLevel: 20 }, IF).ballText).toBe("×1");
  });

  it("Gold/Silver/Crystal: ignores HP and status (cartridge bug)", () => {
    const full = computeCatchChance(2, { ...base, ball: "level", ownLevel: 45, hpPercent: 100 });
    const low = computeCatchChance(2, { ...base, ball: "level", ownLevel: 45, hpPercent: 1, status: "sleep" });
    expect(full.chance).toBe(low.chance);
    // floor(45 * 4) = 180 -> 180 / 256
    expect(full.chance).toBeCloseTo(180 / 256, 10);
  });
});

describe("HeartGold/SoulSilver Apricorn balls", () => {
  it("apply the bonus their notes promise when the condition is ticked", () => {
    expect(computeCatchChance(4, { ...base, ball: "lure" }).ballText).toBe("×3");
    expect(computeCatchChance(4, { ...base, ball: "moon" }).ballText).toBe("×4");
    expect(computeCatchChance(4, { ...base, ball: "love" }).ballText).toBe("×8");
  });

  it("work the Fast Ball out instead of asking: base Speed in Gen 4, three species in Gen 2", () => {
    expect(computeCatchChance(4, { ...base, ball: "fast", baseSpeed: 100 }).ballText).toBe("×4");
    expect(computeCatchChance(4, { ...base, ball: "fast", baseSpeed: 99 }).ballText).toBe("×1");
    // Gold/Silver/Crystal's bug: only Magnemite, Grimer and Tangela.
    for (const speciesId of [81, 88, 114]) {
      expect(computeCatchChance(2, { ...base, ball: "fast", speciesId }).ballText).toBe("×4");
    }
    expect(computeCatchChance(2, { ...base, ball: "fast", speciesId: 101, baseSpeed: 140 }).ballText).toBe("×1");
  });

  it("include the Cherish Ball, which catches like a Poké Ball", () => {
    expect(getBallIdsForGeneration(4, "heartgold-soulsilver")).toContain("cherish");
    expect(computeCatchChance(4, { ...base, ball: "cherish" }).ballText).toBe("×1");
  });

  it("drop back to ×1 when the condition is unticked", () => {
    expect(computeCatchChance(4, { ...base, ball: "love", conditionMet: false }).ballText).toBe("×1");
  });
});
