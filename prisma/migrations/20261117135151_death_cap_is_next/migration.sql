-- 7.0: the death point names the next open fight; older rows keep the old
-- meaning (last fight won) until read through src/lib/deathPoint.ts.
ALTER TABLE "SoulLink" ADD COLUMN "deathCapIsNext" BOOLEAN NOT NULL DEFAULT false;
