import { describe, it, expect } from "vitest";
import { NEW_RUN_LIMIT, NEW_RUN_WINDOW_MS, newRunsExceedLimit } from "@/lib/runThrottle";

const NOW = 1_000_000_000_000;
// `count` runs, the newest one `ageOfNewest` ms old and each older one a second before it.
const runs = (count: number, ageOfNewest: number) =>
  Array.from({ length: count }, (_, i) => new Date(NOW - ageOfNewest - i * 1000));

describe("newRunsExceedLimit", () => {
  it("lets a quiet site create runs", () => {
    expect(newRunsExceedLimit([], NOW)).toBe(false);
    expect(newRunsExceedLimit(runs(5, 1000), NOW)).toBe(false);
  });

  it("stops at the limit inside the window", () => {
    // 20 runs, the 20th-newest 19 s old.
    expect(newRunsExceedLimit(runs(NEW_RUN_LIMIT, 0), NOW)).toBe(true);
  });

  it("does not count runs older than the window", () => {
    expect(newRunsExceedLimit(runs(NEW_RUN_LIMIT, NEW_RUN_WINDOW_MS), NOW)).toBe(false);
  });

  it("frees up as the window moves on", () => {
    const newest = runs(NEW_RUN_LIMIT, 0);
    expect(newRunsExceedLimit(newest, NOW)).toBe(true);
    expect(newRunsExceedLimit(newest, NOW + NEW_RUN_WINDOW_MS)).toBe(false);
  });
});
