import type { Metadata } from "next";
import { getGameSummaries } from "@/lib/data";
import { getLang } from "@/lib/i18n/getLang";
import { translations } from "@/lib/i18n/dictionary";
import { listRunsForHeader } from "@/lib/runs";
import { NewRunView } from "@/components/NewRunView";

// The New Run page: the games as a grid of covers, then the run's name, mode
// and players. It replaced a dialog whose game picker was a dropdown of some
// fifty names. Not run-scoped - `?run=` only says which run was on screen (its
// rules are the ones offered to copy, and "Back" returns to it), `?game=`
// preselects a game.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return { title: translations[await getLang()].runSwitcher.newRunTitle };
}

export default async function NewRunPage({
  searchParams,
}: {
  searchParams: Promise<{ run?: string; game?: string }>;
}) {
  const { run, game } = await searchParams;
  const [lang, runs] = await Promise.all([getLang(), listRunsForHeader()]);
  const games = getGameSummaries();
  const from = runs.find((r) => r.accessKey === run);

  return (
    <NewRunView
      lang={lang}
      games={games}
      runs={runs.map((r) => ({ accessKey: r.accessKey, name: r.name }))}
      initialGameId={games.find((g) => g.id === game)?.id ?? from?.gameId ?? games[0]?.id ?? ""}
      // Without a run on screen, the run played last - what createRun fell
      // back to before the page let you choose.
      initialSourceKey={from?.accessKey ?? runs[0]?.accessKey ?? ""}
      backHref={from ? `/overview?run=${from.accessKey}` : "/"}
    />
  );
}
