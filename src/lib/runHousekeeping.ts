import { prisma } from "@/lib/prisma";
import { NEW_RUN_LIMIT, newRunsExceedLimit } from "@/lib/runThrottle";

// Keeping a public instance from filling up with runs nobody plays.

// Whether creating another run right now would exceed src/lib/runThrottle.ts's
// limit. Reads the newest NEW_RUN_LIMIT rows by id - a primary-key walk of
// twenty rows however many runs exist, since this runs on every creation.
// Ordered by id, not createdAt: the two agree because a public instance stamps
// an imported run with the import time (see applyBackup), and id needs no index.
export async function tooManyNewRuns(now: number = Date.now()): Promise<boolean> {
  const newest = await prisma.run.findMany({
    orderBy: { id: "desc" },
    take: NEW_RUN_LIMIT,
    select: { createdAt: true },
  });
  return newRunsExceedLimit(
    newest.map((run) => run.createdAt),
    now,
  );
}

// A run that was created and then never used: never given a catch, a level-cap
// tick or a custom route, and never changed since creation. Rename, rule or
// settings edits all bump Run.version, so anything somebody configured but left
// empty stays - deleting that would be a surprise, while an untouched run costs
// a few rows. 30 days because a run is often set up before the game is started.
export const ABANDONED_AFTER_DAYS = 30;

export async function deleteAbandonedRuns(now: number = Date.now()): Promise<number> {
  const cutoff = new Date(now - ABANDONED_AFTER_DAYS * 24 * 60 * 60 * 1000);
  const { count } = await prisma.run.deleteMany({
    where: {
      createdAt: { lt: cutoff },
      // createRun's own markRunChanged is the one bump an untouched run has.
      version: { lte: 1 },
      encounters: { none: {} },
      soulLinks: { none: {} },
      levelCapProgress: { none: {} },
      customRoutes: { none: {} },
      routeEntries: { none: {} },
    },
  });
  return count;
}
