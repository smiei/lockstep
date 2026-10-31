"use client";

import { useState, useTransition } from "react";
import { Spinner } from "@/components/ui/Spinner";
import { useDropdown } from "@/lib/useDropdown";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { deleteRun, exportAllBackup, exportRunBackup, renameRun } from "@/lib/actions";
import { pickActiveRun } from "@/lib/runKey";
import { IS_PUBLIC_INSTANCE } from "@/lib/instance";
import { forgetRun } from "@/lib/visitedRuns";
import { formatActionError } from "@/lib/actionErrors";
import { useDialog } from "@/components/DialogProvider";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { useInstallPrompt } from "@/lib/useInstallPrompt";
import { LANGS, REVIEWED_LANGS, translations } from "@/lib/i18n/dictionary";
import type { GameSummary, RunSummary } from "@/lib/types";
import { RenameRunDialog } from "@/components/RenameRunDialog";
import { useBackupImport } from "@/components/useBackupImport";
import { TabOrderDialog } from "@/components/TabOrderDialog";
import { AppearanceDialog } from "@/components/AppearanceDialog";
import { useToast } from "@/components/ui/ToastProvider";

function GearIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className}>
      <circle cx="12" cy="12" r="3" />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.4 15a1.7 1.7 0 00.34 1.87l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.7 1.7 0 00-1.87-.34 1.7 1.7 0 00-1 1.56V21a2 2 0 11-4 0v-.09a1.7 1.7 0 00-1-1.56 1.7 1.7 0 00-1.87.34l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.7 1.7 0 00.34-1.87 1.7 1.7 0 00-1.56-1H3a2 2 0 110-4h.09a1.7 1.7 0 001.56-1 1.7 1.7 0 00-.34-1.87l-.06-.06a2 2 0 112.83-2.83l.06.06a1.7 1.7 0 001.87.34h.01a1.7 1.7 0 001-1.56V3a2 2 0 114 0v.09a1.7 1.7 0 001 1.56h.01a1.7 1.7 0 001.87-.34l.06-.06a2 2 0 112.83 2.83l-.06.06a1.7 1.7 0 00-.34 1.87v.01a1.7 1.7 0 001.56 1H21a2 2 0 110 4h-.09a1.7 1.7 0 00-1.56 1z"
      />
    </svg>
  );
}

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

function downloadJson(filename: string, data: unknown) {
  downloadBlob(filename, new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
}

function base64ToBytes(base64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

const itemClass =
  "flex min-h-10 w-full items-center gap-2 px-3 py-2 text-left text-sm text-ink hover:bg-hover disabled:cursor-not-allowed disabled:opacity-50";

// Which long-running menu action is in flight, so the entry you tapped can say
// so. Backing up every run zips the whole database; through the tunnel that is
// seconds of nothing otherwise, and the menu used to close before the action
// even fired, taking the tapped element with it.
type Busy = "backupRun" | "backupAll" | "delete" | null;

function MenuItem({
  onClick,
  busy = false,
  disabled = false,
  danger = false,
  children,
}: {
  onClick: () => void;
  busy?: boolean;
  disabled?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      className={danger ? `${itemClass} text-danger` : itemClass}
    >
      {busy && <Spinner />}
      {children}
    </button>
  );
}

// Gear menu bundling the rarely-needed header actions (backup/import, tab
// order, language, run rename/delete) so the top bar stays compact on phones.
export function HeaderMenu({
  runs,
  games = [],
}: {
  runs: RunSummary[];
  games?: GameSummary[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { lang, setLang } = useLanguage();
  const { confirm, alert } = useDialog();
  const toast = useToast();
  const { open, setOpen, toggle, containerRef, triggerProps } = useDropdown();
  const [renameOpen, setRenameOpen] = useState(false);
  const [tabOrderOpen, setTabOrderOpen] = useState(false);
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<Busy>(null);
  const { canPrompt, isStandalone, isIos, mounted, promptInstall } = useInstallPrompt();
  const t = translations[lang];
  const backupImport = useBackupImport({
    lang,
    existingNames: runs.map((r) => r.name),
    openPath: pathname,
  });

  const activeRun = pickActiveRun(runs, searchParams.get("run"));
  // Infinite Fusion hotlinks community sprites and builds on outside data -
  // credited in the menu while such a run is open.
  const activeGameHasFusion = games.find((g) => g.id === activeRun?.gameId)?.fusion ?? false;

  function handleBackupRun() {
    setOpen(false);
    if (!activeRun) {
      void alert({ message: t.backup.noRun });
      return;
    }
    setBusy("backupRun");
    startTransition(async () => {
      const result = await exportRunBackup(activeRun.accessKey);
      setBusy(null);
      setOpen(false);
      if (result.success) {
        downloadJson(result.filename, result.backup);
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
      setOpen(false);
      if (result.success) {
        downloadBlob(
          result.filename,
          new Blob([base64ToBytes(result.zipBase64)], { type: "application/zip" }),
        );
        toast.success(result.filename);
      } else {
        toast.error(formatActionError(result.error, lang));
      }
    });
  }

  function handleImportClick() {
    setOpen(false);
    backupImport.pick();
  }

  // A public run is reached only through its link, and an installed app has no
  // address bar to copy it from.
  async function handleCopyLink() {
    setOpen(false);
    if (!activeRun) return;
    const url = `${window.location.origin}/tracker?run=${activeRun.accessKey}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success(t.menu.runLinkCopied);
    } catch {
      void alert({ message: t.menu.runLinkManual(url) });
    }
  }

  function handleRename(name: string) {
    if (!activeRun) return;
    startTransition(async () => {
      const result = await renameRun(activeRun.accessKey, name);
      if (result.success) {
        setRenameOpen(false);
        router.refresh();
      } else {
        toast.error(formatActionError(result.error, lang));
      }
    });
  }

  async function handleDelete() {
    setOpen(false);
    if (!activeRun) return;

    // One confirmation, not two. The second dialog added no safety - both
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
        // The bare URL below then opens the next run this browser visited.
        if (IS_PUBLIC_INSTANCE) forgetRun(activeRun.accessKey);
        toast.success(t.runSwitcher.deleteButton);
        router.push(pathname);
      } else {
        toast.error(formatActionError(result.error, lang));
      }
    });
  }

  // Chromium hands us a real prompt; Safari and Firefox never will, so they
  // get written instructions instead of a button that does nothing.
  async function handleInstall() {
    setOpen(false);
    if (canPrompt) {
      await promptInstall();
      return;
    }
    await alert({
      title: t.install.iosTitle,
      message: isIos ? t.install.iosHint : t.install.manualHint,
    });
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        disabled={pending || backupImport.pending}
        onClick={toggle}
        {...triggerProps}
        aria-label={t.menu.label}
        title={t.menu.label}
        className="flex h-10 w-10 items-center justify-center rounded-md border border-line text-ink-muted transition-colors hover:bg-hover hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
      >
        <GearIcon className="h-5 w-5" />
      </button>
      {backupImport.elements}
      {open && (
        // z-50, not the z-20 it used to be: the tab strip below the header is
        // sticky at z-40 now, and this menu opens straight down across it.
        // A dialog opened FROM here is also z-50 but sits later in the DOM, so
        // it still paints on top.
        // From lg up the gear sits at the foot of the side rail, so the menu
        // opens upwards and left-aligned, narrow enough to stay inside the
        // rail's scroll box. `unshell`: the menu is a page surface, not part
        // of the green field (globals.css).
        <div className="unshell absolute right-0 z-50 mt-1 w-60 overflow-hidden rounded-lg border border-line bg-panel py-1 shadow-lg lg:bottom-full lg:left-0 lg:right-auto lg:mb-1 lg:mt-0 lg:w-52">
          {mounted && !isStandalone && (
            <>
              <MenuItem onClick={handleInstall}>{t.install.menuLabel}</MenuItem>
              <div className="my-1 border-t border-line" />
            </>
          )}
          <MenuItem onClick={handleBackupRun} busy={busy === "backupRun"} disabled={busy !== null}>
            {t.backup.backupRun}
          </MenuItem>
          {!IS_PUBLIC_INSTANCE && (
            <MenuItem onClick={handleBackupAll} busy={busy === "backupAll"} disabled={busy !== null}>
              {t.backup.backupAll}
            </MenuItem>
          )}
          <MenuItem onClick={handleImportClick} disabled={busy !== null}>
            {t.backup.import}
          </MenuItem>
          <div className="my-1 border-t border-line" />
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              setTabOrderOpen(true);
            }}
            className={itemClass}
          >
            {t.tabOrder.label} …
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              setAppearanceOpen(true);
            }}
            className={itemClass}
          >
            {t.appearance.label} …
          </button>
          <div className="px-3 py-2">
            <span className="mb-1.5 block text-xs font-medium text-ink-subtle">
              {t.menu.language}
            </span>
            <div className="flex gap-1">
              {LANGS.map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => {
                    setLang(code);
                    setOpen(false);
                  }}
                  className={`h-10 flex-1 rounded-md border text-xs font-semibold uppercase transition-colors ${
                    code === lang
                      ? "border-accent bg-accent text-accent-ink"
                      : "border-line text-ink-muted hover:bg-hover hover:text-ink"
                  }`}
                >
                  {code}
                </button>
              ))}
            </div>
            {!REVIEWED_LANGS.includes(lang) && (
              <p className="mt-1.5 text-xs text-ink-muted">{t.dataNotice.machineTranslated}</p>
            )}
          </div>
          <div className="my-1 border-t border-line" />
          {IS_PUBLIC_INSTANCE && (
            <MenuItem onClick={handleCopyLink} disabled={!activeRun}>
              {t.menu.copyRunLink}
            </MenuItem>
          )}
          <button
            type="button"
            disabled={!activeRun}
            onClick={() => {
              setOpen(false);
              setRenameOpen(true);
            }}
            className={itemClass}
          >
            {t.runSwitcher.rename} …
          </button>
          <button
            type="button"
            disabled={!activeRun}
            onClick={handleDelete}
            className={`${itemClass} text-danger`}
          >
            {t.runSwitcher.deleteButton}
          </button>
          <div className="my-1 border-t border-line" />
          {activeGameHasFusion && (
            <div className="space-y-0.5 px-3 py-1.5 text-xs text-ink-subtle">
              <div className="font-medium text-ink-muted">{t.menu.credits}</div>
              <p>
                {t.menu.creditsSprites}: {t.menu.creditsSpritesSource}
              </p>
              <p>
                {t.menu.creditsData}:{" "}
                <a
                  href="https://github.com/fbosch/infinite-fusion-nuzlocke"
                  target="_blank"
                  rel="noreferrer"
                  className="underline underline-offset-2 hover:text-ink"
                >
                  fbosch/infinite-fusion-nuzlocke
                </a>{" "}
                (MIT),{" "}
                <a
                  href="https://infinitefusion.fandom.com/"
                  target="_blank"
                  rel="noreferrer"
                  className="underline underline-offset-2 hover:text-ink"
                >
                  Infinite Fusion Wiki
                </a>{" "}
                (CC BY-SA)
              </p>
              <p>
                {t.menu.creditsMechanics}:{" "}
                <a
                  href="https://github.com/infinitefusion/infinitefusion-e18"
                  target="_blank"
                  rel="noreferrer"
                  className="underline underline-offset-2 hover:text-ink"
                >
                  infinitefusion-e18
                </a>
              </p>
            </div>
          )}
          {/* Baked in at image build time (Dockerfile ARG APP_VERSION,
              inlined into the client bundle since it's NEXT_PUBLIC_*) - not
              runtime-readable, so this is only ever what the image itself
              shipped with. Exists so a running instance (this Pixel, that
              Unraid box) can be checked against the Docker Hub tag it's
              supposed to be, instead of guessed at. */}
          <div className="px-3 py-1.5 text-xs text-ink-subtle">
            {t.menu.version} {process.env.NEXT_PUBLIC_APP_VERSION ?? "dev"}
          </div>
        </div>
      )}
      <RenameRunDialog
        lang={lang}
        open={renameOpen}
        pending={pending}
        currentName={activeRun?.name ?? ""}
        onClose={() => setRenameOpen(false)}
        onRename={handleRename}
      />
      <TabOrderDialog open={tabOrderOpen} onClose={() => setTabOrderOpen(false)} />
      <AppearanceDialog open={appearanceOpen} onClose={() => setAppearanceOpen(false)} />
    </div>
  );
}
