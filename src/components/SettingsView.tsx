"use client";

import { useMounted } from "@/lib/useMounted";
import { useId, useState, useTransition, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTheme } from "next-themes";
import { deleteRun, exportAllBackup, exportRunBackup, renameRun } from "@/lib/actions";
import { formatActionError } from "@/lib/actionErrors";
import { IS_PUBLIC_INSTANCE } from "@/lib/instance";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { translations } from "@/lib/i18n/dictionary";
import { REPO_URL, feedbackUrl } from "@/lib/links";
import { pickActiveRun } from "@/lib/runKey";
import { useInstallPrompt } from "@/lib/useInstallPrompt";
import { forgetRun } from "@/lib/visitedRuns";
import { startTour } from "@/lib/tourStore";
import { AppearanceSettings } from "@/components/AppearanceSettings";
import { AccountSettings } from "@/components/AccountSettings";
import type { AccountView } from "@/lib/accountRules";
import { useDialog } from "@/components/DialogProvider";
import { LanguagePicker } from "@/components/LanguagePicker";
import { SpriteConsentSetting } from "@/components/SpriteConsentSetting";
import { TabOrderSettings } from "@/components/TabOrderSettings";
import { useBackupImport } from "@/components/useBackupImport";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FieldLabel, Input } from "@/components/ui/Input";
import { PageHeader, Section } from "@/components/ui/Page";
import { useToast } from "@/components/ui/ToastProvider";

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function base64ToBytes(base64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// One setting: what it is and what it does on the left, its control on the
// right - under the text once the row gets narrow.
function Row({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 p-4">
      <div className="min-w-0 max-w-prose flex-1 basis-56">
        <p className="text-sm font-semibold text-ink">{title}</p>
        {hint && <p className="mt-0.5 text-xs text-ink-muted">{hint}</p>}
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

// Which long-running action is in flight, so the button you pressed can say
// so. Backing up every run zips the whole database; through the tunnel that
// is seconds of nothing otherwise.
type Busy = "backupRun" | "backupAll" | "delete" | "rename" | null;

export function SettingsView({
  account,
  runs,
  fusionGameIds,
}: {
  // The optional accounts: mode, who is logged in, and for the admin the rest.
  account: AccountView;
  runs: { id: number; accessKey: string; name: string; gameId: string }[];
  // The packs with fusions - a run of one offers the fusion tour too.
  fusionGameIds: string[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { lang } = useLanguage();
  const { confirm, alert } = useDialog();
  const toast = useToast();
  const ids = useId();
  const [, startTransition] = useTransition();
  const [busy, setBusy] = useState<Busy>(null);
  const { canPrompt, isStandalone, isIos, mounted, promptInstall } = useInstallPrompt();
  const { theme, setTheme } = useTheme();
  // The stored theme is only known in the browser - see ThemeToggle.
  const themeKnown = useMounted();
  const t = translations[lang];
  const ts = t.settings;
  const backupImport = useBackupImport({ lang, existingNames: runs.map((r) => r.name), openPath: "/overview" });

  const activeRun = pickActiveRun(runs, searchParams.get("run"));
  const fusionRun = activeRun !== undefined && fusionGameIds.includes(activeRun.gameId);

  // The name field follows the open run - synced during render, against the
  // last run and name seen, rather than in an effect.
  const nameKey = `${activeRun?.accessKey}|${activeRun?.name}`;
  const [seenNameKey, setSeenNameKey] = useState(nameKey);
  const [name, setName] = useState(activeRun?.name ?? "");
  if (seenNameKey !== nameKey) {
    setSeenNameKey(nameKey);
    setName(activeRun?.name ?? "");
  }
  const trimmedName = name.trim();

  function handleRename(e: React.FormEvent) {
    e.preventDefault();
    if (!activeRun || !trimmedName || trimmedName === activeRun.name) return;
    setBusy("rename");
    startTransition(async () => {
      const result = await renameRun(activeRun.accessKey, trimmedName);
      setBusy(null);
      if (result.success) {
        toast.success(ts.renamed);
        router.refresh();
      } else {
        toast.error(formatActionError(result.error, lang));
      }
    });
  }

  async function handleCopyLink() {
    if (!activeRun) return;
    const url = `${window.location.origin}/tracker?run=${activeRun.accessKey}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success(t.menu.runLinkCopied);
    } catch {
      void alert({ message: t.menu.runLinkManual(url) });
    }
  }

  function handleBackupRun() {
    if (!activeRun) return;
    setBusy("backupRun");
    startTransition(async () => {
      const result = await exportRunBackup(activeRun.accessKey);
      setBusy(null);
      if (result.success) {
        downloadBlob(result.filename, new Blob([JSON.stringify(result.backup, null, 2)], { type: "application/json" }));
        toast.success(result.filename);
      } else {
        toast.error(formatActionError(result.error, lang));
      }
    });
  }

  function handleBackupAll() {
    setBusy("backupAll");
    startTransition(async () => {
      const result = await exportAllBackup();
      setBusy(null);
      if (result.success) {
        downloadBlob(result.filename, new Blob([base64ToBytes(result.zipBase64)], { type: "application/zip" }));
        toast.success(result.filename);
      } else {
        toast.error(formatActionError(result.error, lang));
      }
    });
  }

  async function handleDelete() {
    if (!activeRun) return;
    // One confirmation, not two. A second dialog added no safety - both
    // auto-focus their primary button, so two Enter presses destroyed a run -
    // while making an ordinary delete feel like a fight.
    const confirmed = await confirm({
      danger: true,
      confirmLabel: t.runSwitcher.deleteButton,
      message: t.runSwitcher.confirmDelete1(activeRun.name),
    });
    if (!confirmed) return;

    setBusy("delete");
    startTransition(async () => {
      const result = await deleteRun(activeRun.accessKey);
      setBusy(null);
      if (result.success) {
        if (IS_PUBLIC_INSTANCE) forgetRun(activeRun.accessKey);
        toast.success(t.runSwitcher.deleteButton);
        // The start page: the run this page was about is gone.
        router.push("/");
      } else {
        toast.error(formatActionError(result.error, lang));
      }
    });
  }

  // Chromium hands us a real prompt; Safari and Firefox never will, so they
  // get written instructions instead of a button that does nothing.
  async function handleInstall() {
    if (canPrompt) {
      await promptInstall();
      return;
    }
    await alert({ title: t.install.iosTitle, message: isIos ? t.install.iosHint : t.install.manualHint });
  }

  const idle = busy === null;
  // Two views: what belongs to the open run and is shared by its players,
  // and what belongs to this device or the whole install. Without a run
  // there is only the second.
  const [picked, setPicked] = useState<"run" | "app">("run");
  const view = activeRun ? picked : "app";
  const version = process.env.NEXT_PUBLIC_APP_VERSION ?? "dev";

  return (
    <div className="max-w-3xl">
      <PageHeader title={ts.title} description={ts.description} />

      {activeRun && (
        <div className="mb-6 grid grid-cols-2 gap-2 sm:max-w-md" role="group" aria-label={ts.title}>
          {(
            [
              ["run", ts.tabRun],
              ["app", ts.tabApp],
            ] as const
          ).map(([value, label]) => (
            <Button key={value} variant={view === value ? "primary" : "secondary"} aria-pressed={view === value} onClick={() => setPicked(value)}>
              {label}
            </Button>
          ))}
        </div>
      )}

      {view === "run" && activeRun && (
        <Section title={ts.runSection(activeRun.name)}>
          <p className="-mt-2 mb-3 text-xs text-ink-muted">{ts.runScope}</p>
          <Card padding="none" className="divide-y divide-line">
            <form onSubmit={handleRename} className="flex flex-wrap items-end gap-2 p-4">
              <div className="min-w-0 flex-1 basis-56">
                <FieldLabel htmlFor={`${ids}-name`}>{t.runSwitcher.nameLabel}</FieldLabel>
                <Input id={`${ids}-name`} type="text" value={name} disabled={!idle} onChange={(e) => setName(e.target.value)} />
              </div>
              <Button type="submit" loading={busy === "rename"} disabled={!idle || !trimmedName || trimmedName === activeRun.name}>
                {t.runSwitcher.save}
              </Button>
            </form>
            <Row title={t.menu.copyRunLink} hint={ts.copyLinkHint}>
              <Button onClick={handleCopyLink}>{ts.copy}</Button>
            </Row>
            <Row title={t.backup.backupRun} hint={ts.backupRunHint}>
              <Button loading={busy === "backupRun"} disabled={!idle} onClick={handleBackupRun}>
                {ts.download}
              </Button>
            </Row>
            <Row title={ts.rulesRow} hint={ts.rulesRowHint}>
              <ButtonLink href={`/rules?run=${activeRun.accessKey}`}>{t.nav.rules}</ButtonLink>
            </Row>
            <Row title={t.runSwitcher.deleteButton} hint={ts.deleteHint}>
              <Button variant="danger" loading={busy === "delete"} disabled={!idle} onClick={handleDelete}>
                {t.runSwitcher.deleteButton}
              </Button>
            </Row>
          </Card>
        </Section>
      )}

      {view === "app" && (
        <>
          {/* Installation-wide, unlike everything below it. */}
          {!IS_PUBLIC_INSTANCE && <AccountSettings account={account} />}
          <p className="mb-6 text-xs text-ink-muted">{ts.appScope}</p>
      <Section title={t.appearance.title}>
        <Card padding="none" className="divide-y divide-line">
          <Row title={ts.themeLabel}>
            <div className="flex gap-1" role="group" aria-label={ts.themeLabel}>
              {(
                [
                  ["light", ts.themeLight],
                  ["dark", ts.themeDark],
                  ["system", ts.themeSystem],
                ] as const
              ).map(([value, label]) => {
                const on = themeKnown && theme === value;
                return (
                  <Button key={value} size="sm" variant={on ? "primary" : "secondary"} aria-pressed={on} onClick={() => setTheme(value)}>
                    {label}
                  </Button>
                );
              })}
            </div>
          </Row>
          <div className="p-4">
            <AppearanceSettings />
          </div>
        </Card>
      </Section>

      <Section title={t.menu.language}>
        <Card>
          <LanguagePicker variant="names" align="start" />
        </Card>
      </Section>

      <Section title={t.tabOrder.title}>
        <Card>
          <TabOrderSettings />
        </Card>
      </Section>

      <Section title={t.backup.menuLabel}>
        <Card padding="none" className="divide-y divide-line">
          {!IS_PUBLIC_INSTANCE && (
            <Row title={t.backup.backupAll} hint={ts.backupAllHint}>
              <Button loading={busy === "backupAll"} disabled={!idle} onClick={handleBackupAll}>
                {ts.download}
              </Button>
            </Row>
          )}
          <Row title={t.backup.importTitle} hint={ts.importHint}>
            <Button loading={backupImport.pending} disabled={!idle} onClick={backupImport.pick}>
              {ts.chooseFile}
            </Button>
          </Row>
        </Card>
        {backupImport.elements}
      </Section>

      {mounted && !isStandalone && (
        <Section title={t.install.menuLabel}>
          <Card padding="none">
            <Row title={t.install.menuLabel} hint={ts.installHint}>
              <Button onClick={handleInstall}>{ts.install}</Button>
            </Row>
          </Card>
        </Section>
      )}

      <Section title={ts.aboutSection}>
        <Card padding="none" className="divide-y divide-line">
          <Row title={t.menu.version}>
            {/* Baked in at build time (Dockerfile ARG APP_VERSION, inlined as
                NEXT_PUBLIC_*), so a running instance can be checked against
                the image tag it is supposed to be. */}
            <span className="font-mono text-sm text-ink">{version}</span>
          </Row>
          {activeRun && (
            <Row title={t.tour.settingsTitle} hint={t.tour.settingsHint}>
              <Button onClick={() => startTour("main")}>{t.tour.start}</Button>
              {fusionRun && <Button onClick={() => startTour("fusion")}>{t.tour.startFusion}</Button>}
            </Row>
          )}
          <Row title={ts.feedbackTitle} hint={ts.feedbackHint}>
            <ButtonLink href={feedbackUrl("bug", version)} target="_blank" rel="noreferrer">
              {ts.reportBug}
            </ButtonLink>
            <ButtonLink href={feedbackUrl("feature", version)} target="_blank" rel="noreferrer">
              {ts.requestFeature}
            </ButtonLink>
          </Row>
          <Row title={ts.source} hint={ts.sourceHint}>
            <a href={REPO_URL} target="_blank" rel="noreferrer" className="text-sm font-semibold text-ink underline underline-offset-2">
              GitHub
            </a>
          </Row>
          {IS_PUBLIC_INSTANCE && (
            <Row title={ts.imagesLabel}>
              <span className="text-sm text-ink-muted">
                <SpriteConsentSetting />
              </span>
            </Row>
          )}
          {/* Infinite Fusion hotlinks community sprites and builds on outside
              data - credited here whatever run is open. */}
          <div className="space-y-1 p-4 text-xs text-ink-muted">
            <p className="text-sm font-semibold text-ink">{t.menu.credits}: Infinite Fusion</p>
            <p>
              {t.menu.creditsSprites}: {t.menu.creditsSpritesSource}
            </p>
            <p>
              {t.menu.creditsData}:{" "}
              <a href="https://github.com/fbosch/infinite-fusion-nuzlocke" target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-ink">
                fbosch/infinite-fusion-nuzlocke
              </a>{" "}
              (MIT),{" "}
              <a href="https://infinitefusion.fandom.com/" target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-ink">
                Infinite Fusion Wiki
              </a>{" "}
              (CC BY-SA)
            </p>
            <p>
              {t.menu.creditsMechanics}:{" "}
              <a href="https://github.com/infinitefusion/infinitefusion-e18" target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-ink">
                infinitefusion-e18
              </a>
            </p>
          </div>
        </Card>
      </Section>
        </>
      )}
    </div>
  );
}
