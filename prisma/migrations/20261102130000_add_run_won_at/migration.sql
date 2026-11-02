-- Run.wonAt: when the run was marked as won on the start page (null = not won).
ALTER TABLE "Run" ADD COLUMN "wonAt" DATETIME;
