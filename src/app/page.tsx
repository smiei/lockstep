import type { Metadata } from "next";
import { getLang } from "@/lib/i18n/getLang";
import { translations } from "@/lib/i18n/dictionary";
import { RunHome } from "@/components/RunHome";

// The start page: every run of this install (a public instance: the ones this
// browser visited) as a card, played-last first; on a fresh install the
// welcome. Reads the database, so it is dynamic - it used to be a static
// redirect to /tracker, which now opens the run played last.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return { title: translations[await getLang()].home.title };
}

export default function Home() {
  return <RunHome />;
}
