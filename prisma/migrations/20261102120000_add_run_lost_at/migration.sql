-- Run.lostAt: when the run was marked as lost on the start page (null = still played).
ALTER TABLE "Run" ADD COLUMN "lostAt" DATETIME;
