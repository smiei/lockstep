import { getGameOrDefault, getLevelCaps } from "@/lib/data";
import { prisma } from "@/lib/prisma";
import { resolveRunId } from "@/lib/runs";
import { getLang } from "@/lib/i18n/getLang";
import { tabMetadata } from "@/lib/pageMetadata";
import { translations } from "@/lib/i18n/dictionary";
import { computeLevelCapProgress, eliteFourIndex } from "@/lib/progress";
import { levelCapsInRun } from "@/lib/regions";
import { applyCapRule } from "@/lib/levelCapRule";
import { LevelCapsView } from "@/components/LevelCapsView";
import { CanonicalRun } from "@/components/CanonicalRun";
import { RunLanding } from "@/components/RunLanding";
import { ProgressBar } from "@/components/ProgressBar";
import { PageHeader } from "@/components/ui/Page";

export const dynamic = "force-dynamic";

export const generateMetadata = tabMetadata("levelcaps");

export default async function LevelCapsPage({
  searchParams,
}: {
  searchParams: Promise<{ run?: string }>;
}) {
  const { run } = await searchParams;
  const resolvedRun = await resolveRunId(run);
  if (!resolvedRun) return <RunLanding />;
  const { runId, runKey, version, gameId } = resolvedRun;

  const lang = await getLang();
  const t = translations[lang].levelcaps;
  const game = getGameOrDefault(gameId);
  const trainerSet = game.trainerSet ?? game.id;
  const levelCaps = getLevelCaps(gameId);
  const won = await prisma.levelCapProgress.findMany({
    where: { runId, defeated: true },
    select: { levelCapId: true, defeatedAt: true },
  });
  // When each fight was won, for "last beaten" - formatted here so the server
  // and the browser render the same day. Rows ticked before 6.0 have no date.
  const wonOn = new Map(
    won.map((row) => [
      row.levelCapId,
      row.defeatedAt ? row.defeatedAt.toLocaleDateString(lang, { day: "numeric", month: "short" }) : null,
    ]),
  );

  // A fight the run's cap rule skips stays on the Journey, its level in brackets.
  const items = applyCapRule(
    levelCaps.map((cap) => ({ ...cap, defeated: wonOn.has(cap.id), wonOn: wonOn.get(cap.id) ?? null })),
    resolvedRun.settings,
  );
  // A Kanto the run leaves out does not count towards the journey.
  const progress = computeLevelCapProgress(levelCapsInRun(items, resolvedRun.settings));
  const markerAt = eliteFourIndex(items);

  return (
    <div>
      <CanonicalRun runKey={runKey} version={version} solo={resolvedRun.players.length < 2} />
      <PageHeader title={t.heading}>
        <ProgressBar
          done={progress.done}
          total={progress.total}
          percent={progress.percent}
          title={t.progressTitle(progress.done, progress.total, progress.percent)}
          markerAt={markerAt ?? undefined}
          markerTitle={t.eliteFourMarker}
        />
      </PageHeader>
      <LevelCapsView
        runKey={runKey}
        lang={lang}
        levelCaps={items}
        trainerSet={trainerSet}
        includeKanto={resolvedRun.settings.includeKanto}
        teamOffset={resolvedRun.settings.capTeamOffset}
      />
    </div>
  );
}
