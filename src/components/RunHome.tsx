import { getGameSummaries } from "@/lib/data";
import { getLang } from "@/lib/i18n/getLang";
import { listRunHomeCards } from "@/lib/runHome";
import { RunHomeView } from "@/components/RunHomeView";

// The start page's content, server side: the start page itself renders it,
// and so does every run-scoped page that has no run to open (RunLanding).
export async function RunHome() {
  const [lang, cards] = await Promise.all([getLang(), listRunHomeCards()]);
  return <RunHomeView lang={lang} games={getGameSummaries()} cards={cards} />;
}
