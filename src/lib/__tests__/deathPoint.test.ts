import { describe, expect, it } from "vitest";
import { effectiveDeathCapId, nextOpenCapId } from "@/lib/deathPoint";

// Journey order is the array order, not the id order.
const ORDER = [10, 3, 7, 1];

describe("nextOpenCapId", () => {
  it("is the first fight in journey order not yet defeated", () => {
    expect(nextOpenCapId(ORDER, new Set())).toBe(10);
    expect(nextOpenCapId(ORDER, new Set([10]))).toBe(3);
    // A fight skipped earlier is still the next open one.
    expect(nextOpenCapId(ORDER, new Set([10, 7]))).toBe(3);
  });

  it("is null once every fight is won", () => {
    expect(nextOpenCapId(ORDER, new Set(ORDER))).toBeNull();
  });
});

describe("effectiveDeathCapId", () => {
  it("returns a new-style point as stored", () => {
    expect(effectiveDeathCapId({ deathLevelCapId: 7, deathCapIsNext: true }, ORDER)).toBe(7);
    expect(effectiveDeathCapId({ deathLevelCapId: null, deathCapIsNext: true }, ORDER)).toBeNull();
  });

  it("moves an old-style point (last fight won) one fight forward", () => {
    expect(effectiveDeathCapId({ deathLevelCapId: 10, deathCapIsNext: false }, ORDER)).toBe(3);
    expect(effectiveDeathCapId({ deathLevelCapId: 7, deathCapIsNext: false }, ORDER)).toBe(1);
  });

  it("reads an old-style null (nothing won yet) as the first fight", () => {
    expect(effectiveDeathCapId({ deathLevelCapId: null, deathCapIsNext: false }, ORDER)).toBe(10);
  });

  it("has no next fight after the last one or for a fight outside the run", () => {
    expect(effectiveDeathCapId({ deathLevelCapId: 1, deathCapIsNext: false }, ORDER)).toBeNull();
    expect(effectiveDeathCapId({ deathLevelCapId: 99, deathCapIsNext: false }, ORDER)).toBeNull();
  });
});
