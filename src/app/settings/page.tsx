import type { Metadata } from "next";
import { getLang } from "@/lib/i18n/getLang";
import { translations } from "@/lib/i18n/dictionary";
import { listRunsForHeader } from "@/lib/runs";
import { SettingsView } from "@/components/SettingsView";

// The Settings page - what the gear's dropdown menu and its dialogs used to
// hold: the open run (rename, link, backup, delete), this device's
// appearance, language and tabs, backups, installing the app, and the
// version. Not run-scoped: `?run=` only says which run "this run" is, the
// way the header reads it.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return { title: translations[await getLang()].settings.title };
}

export default async function SettingsPage() {
  const runs = await listRunsForHeader();
  return <SettingsView runs={runs.map((run) => ({ id: run.id, accessKey: run.accessKey, name: run.name }))} />;
}
