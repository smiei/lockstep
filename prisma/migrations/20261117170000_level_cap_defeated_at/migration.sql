-- 7.0 statistics: when a fight was ticked off and the team that won it.
ALTER TABLE "LevelCapProgress" ADD COLUMN "defeatedAt" DATETIME;
ALTER TABLE "LevelCapProgress" ADD COLUMN "teamJson" TEXT;
-- Fights won before this: the last change is the best guess for when.
UPDATE "LevelCapProgress" SET "defeatedAt" = "updatedAt" WHERE "defeated" = 1;
