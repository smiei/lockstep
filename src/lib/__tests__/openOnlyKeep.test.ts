import { describe, expect, it } from "vitest";
import { keptRouteIds } from "@/lib/openOnlyKeep";

const at = (minute: number) => new Date(Date.UTC(2026, 10, 18, 12, minute));
const trackable = new Set([1, 2, 3, 4]);

describe("keptRouteIds", () => {
  it("keeps the route of the newest entry by creation, not by last change", () => {
    // Route 1 was caught first and evolved on the Team tab just now - that
    // bumps updatedAt, which this rule no longer reads.
    const encounters = [
      { id: 1, routeId: 1, createdAt: at(1), updatedAt: at(59) },
      { id: 2, routeId: 3, createdAt: at(30), updatedAt: at(30) },
    ];
    expect([...keptRouteIds(encounters, trackable, null)]).toEqual([3]);
  });

  it("also keeps the route edited on the page, while it has an entry", () => {
    const encounters = [
      { id: 1, routeId: 1, createdAt: at(1) },
      { id: 2, routeId: 3, createdAt: at(30) },
    ];
    expect([...keptRouteIds(encounters, trackable, 1)].sort()).toEqual([1, 3]);
  });

  it("forgets a route whose entry was cleared again", () => {
    // Typed into route 4 by mistake and cleared: no row left there, so the
    // newest real catch (route 3) is what stays.
    const encounters = [
      { id: 1, routeId: 1, createdAt: at(1) },
      { id: 2, routeId: 3, createdAt: at(30) },
    ];
    expect([...keptRouteIds(encounters, trackable, 4)]).toEqual([3]);
  });

  it("ignores routes the tab does not list", () => {
    // Route 9: a hidden free-team or fusion-body route.
    const encounters = [
      { id: 1, routeId: 2, createdAt: at(10) },
      { id: 2, routeId: 9, createdAt: at(50) },
    ];
    expect([...keptRouteIds(encounters, trackable, null)]).toEqual([2]);
  });

  it("breaks a tie in the same millisecond by the later row", () => {
    const encounters = [
      { id: 7, routeId: 2, createdAt: at(5) },
      { id: 8, routeId: 4, createdAt: at(5).toISOString() },
    ];
    expect([...keptRouteIds(encounters, trackable, null)]).toEqual([4]);
  });

  it("keeps nothing on an empty run", () => {
    expect(keptRouteIds([], trackable, null).size).toBe(0);
  });
});
