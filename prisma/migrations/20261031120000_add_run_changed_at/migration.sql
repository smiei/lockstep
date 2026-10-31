-- Run.changedAt: when the run's data last changed (markRunChanged). Existing
-- runs start from their latest encounter, link or level-cap change, else from
-- their creation. Always stored as epoch milliseconds, like Prisma writes it:
-- a row whose default came from SQLite holds text ("2026-10-31 10:27:26"),
-- and text sorts above every number, which would pin that run to the top.

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Run" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "accessKey" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0,
    "name" TEXT NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'SOULLINK',
    "playerCount" INTEGER NOT NULL DEFAULT 2,
    "gameId" TEXT NOT NULL DEFAULT 'firered',
    "rulesMarkdown" TEXT NOT NULL DEFAULT '',
    "settingsJson" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Run" ("accessKey", "createdAt", "changedAt", "gameId", "id", "mode", "name", "playerCount", "rulesMarkdown", "settingsJson", "version")
SELECT "accessKey", "createdAt",
    MAX(
        (CASE WHEN typeof("Run"."createdAt") = 'text' THEN CAST(strftime('%s', "Run"."createdAt") AS INTEGER) * 1000 ELSE "Run"."createdAt" END),
        COALESCE((SELECT MAX((CASE WHEN typeof("updatedAt") = 'text' THEN CAST(strftime('%s', "updatedAt") AS INTEGER) * 1000 ELSE "updatedAt" END)) FROM "Encounter" WHERE "Encounter"."runId" = "Run"."id"), 0),
        COALESCE((SELECT MAX((CASE WHEN typeof("updatedAt") = 'text' THEN CAST(strftime('%s', "updatedAt") AS INTEGER) * 1000 ELSE "updatedAt" END)) FROM "SoulLink" WHERE "SoulLink"."runId" = "Run"."id"), 0),
        COALESCE((SELECT MAX((CASE WHEN typeof("updatedAt") = 'text' THEN CAST(strftime('%s', "updatedAt") AS INTEGER) * 1000 ELSE "updatedAt" END)) FROM "LevelCapProgress" WHERE "LevelCapProgress"."runId" = "Run"."id"), 0)
    ),
    "gameId", "id", "mode", "name", "playerCount", "rulesMarkdown", "settingsJson", "version"
FROM "Run";
DROP TABLE "Run";
ALTER TABLE "new_Run" RENAME TO "Run";
CREATE UNIQUE INDEX "Run_accessKey_key" ON "Run"("accessKey");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- A fresh install no longer starts with a run: the start page asks what to
-- play. The "Run 1" that 20260706120000_add_runs_and_level_caps seeds is
-- removed again - but only while nobody has touched it (never changed, no
-- encounter, link, level cap, custom route or route log).
DELETE FROM "Run"
WHERE "name" = 'Run 1'
  AND "version" = 0
  AND NOT EXISTS (SELECT 1 FROM "Encounter" WHERE "Encounter"."runId" = "Run"."id")
  AND NOT EXISTS (SELECT 1 FROM "SoulLink" WHERE "SoulLink"."runId" = "Run"."id")
  AND NOT EXISTS (SELECT 1 FROM "LevelCapProgress" WHERE "LevelCapProgress"."runId" = "Run"."id")
  AND NOT EXISTS (SELECT 1 FROM "CustomRoute" WHERE "CustomRoute"."runId" = "Run"."id")
  AND NOT EXISTS (SELECT 1 FROM "RouteEntry" WHERE "RouteEntry"."runId" = "Run"."id");
