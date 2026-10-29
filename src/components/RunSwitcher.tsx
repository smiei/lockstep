"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createRun } from "@/lib/actions";
import { pickActiveRun } from "@/lib/runKey";
import { formatActionError } from "@/lib/actionErrors";
import { useDropdown } from "@/lib/useDropdown";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { translations } from "@/lib/i18n/dictionary";
import { localizeName } from "@/lib/i18n/localize";
import { parseRunSettings } from "@/lib/runSettings";
import { runPlayers } from "@/lib/players";
import { RunMode } from "@/generated/prisma/enums";
import type { GameSummary, RunSummary } from "@/lib/types";
import { NewRunDialog } from "@/components/NewRunDialog";
import { useToast } from "@/components/ui/ToastProvider";
import { ChevronDownIcon, PlusIcon } from "@/components/ActionIcons";

// A listed run, plus its settings when the layout has them (it passes the
// full Run rows) - that is where the player names live.
type SwitcherRun = RunSummary & { settingsJson?: string };

// The run box: the open run's name with its game and players under it, and a
// list of every run to switch to - plus a compact "+" (new run). It used to
// be a native <select>, which cut the name off in the rail and could say
// nothing about the game or who plays. Rename/delete live in the header menu
// (HeaderMenu) to keep this bar narrow on phones.
export function RunSwitcher({ runs, games }: { runs: SwitcherRun[]; games: GameSummary[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);
  const { open, setOpen, toggle, containerRef, triggerProps } = useDropdown();
  const { lang } = useLanguage();
  const toast = useToast();
  const t = translations[lang].runSwitcher;
  const tPlayer = translations[lang].player;

  const activeRun = pickActiveRun(runs, searchParams.get("run"));
  const defaultGameId = games[0]?.id;

  function gameName(run: SwitcherRun): string {
    const game = games.find((g) => g.id === run.gameId);
    return game ? localizeName(game.names, lang) : run.gameId;
  }

  // Who plays, the way the run's own pages name them (PlayerNamesProvider):
  // the custom name, else the localized "Spieler n".
  function playerNames(run: SwitcherRun): string {
    if (run.mode === RunMode.CLASSIC) return t.modeClassic;
    const names = run.settingsJson ? parseRunSettings(run.settingsJson).playerNames : null;
    return runPlayers(run.mode, run.playerCount)
      .map((player) => names?.[player]?.trim() || tPlayer[player])
      .join(" · ");
  }

  // The mode in words, then who plays: "SoulLink · Red · Leaf" or "Solo".
  function modeLine(run: SwitcherRun): string {
    return run.mode === RunMode.CLASSIC ? t.modeClassic : `${t.modeSoullink} · ${playerNames(run)}`;
  }

  const openNewRun = () => setDialogOpen(true);

  function handlePick(value: string) {
    setOpen(false);
    if (value !== activeRun?.accessKey) router.push(`${pathname}?run=${value}`);
  }

  function handleCreate(name: string, mode: RunMode, gameId: string, playerCount: number) {
    startTransition(async () => {
      // Inherit ruleset + rule toggles from the run that's on screen right
      // now, then land on the Rules tab so they can be reviewed first.
      const result = await createRun(name, mode, activeRun?.accessKey ?? null, gameId, lang, playerCount);
      if (result.success) {
        setDialogOpen(false);
        router.push(`/rules?run=${result.runKey}`);
      } else {
        toast.error(formatActionError(result.error, lang));
      }
    });
  }

  return (
    // From lg the box takes the rail's full width - game and players on
    // lines of their own, nothing cut off beside a "+" - and "new run"
    // becomes a labelled row under it. On a phone the box shares its row with
    // the square "+".
    <div
      ref={containerRef}
      className="relative flex w-full flex-wrap items-center gap-1.5 sm:w-auto lg:w-full"
    >
      <button
        type="button"
        disabled={pending || runs.length === 0}
        onClick={toggle}
        {...triggerProps}
        aria-label={activeRun ? `${t.switchLabel}: ${activeRun.name}` : t.switchLabel}
        title={t.switchLabel}
        className="flex min-h-10 min-w-0 flex-1 items-center gap-2 rounded-md border border-line-strong bg-panel px-3 py-1.5 text-left text-ink transition-colors hover:bg-hover disabled:cursor-not-allowed disabled:opacity-50 sm:w-64 sm:flex-none lg:w-full lg:flex-none"
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold">{activeRun?.name ?? "—"}</span>
          {activeRun && (
            <>
              <span className="block truncate text-xs text-ink-muted">
                {gameName(activeRun)}
                <span className="lg:hidden"> · {modeLine(activeRun)}</span>
              </span>
              <span className="hidden truncate text-xs text-ink-muted lg:block">
                {modeLine(activeRun)}
              </span>
            </>
          )}
        </span>
        <ChevronDownIcon className="h-4 w-4 shrink-0 text-ink-muted" />
      </button>
      {/* Two triggers for the one dialog below - exactly one is visible. */}
      <Button
        size="sm"
        iconOnly
        loading={pending}
        icon={<PlusIcon className="h-5 w-5" />}
        onClick={openNewRun}
        aria-label={t.newRunTitle}
        title={t.newRunTitle}
        className="lg:hidden"
      />
      {/* A wrapper carries the visibility: `cn` is a plain join, so a
          `hidden` on the Button itself would fight its built-in inline-flex. */}
      <div className="hidden w-full lg:block">
        <Button
          size="sm"
          variant="ghost"
          loading={pending}
          icon={<PlusIcon className="h-4 w-4" />}
          onClick={openNewRun}
          className="w-full"
        >
          {t.newRunTitle}
        </Button>
      </div>
      {open && (
        // `unshell`: a page surface that opens out of the green field.
        <ul className="unshell absolute left-0 top-full z-50 mt-1 max-h-80 w-full min-w-56 overflow-y-auto rounded-lg border border-line bg-panel py-1 shadow-lg">
          {runs.map((run) => {
            const active = run.accessKey === activeRun?.accessKey;
            return (
              <li key={run.id}>
                <button
                  type="button"
                  onClick={() => handlePick(run.accessKey)}
                  aria-current={active ? "true" : undefined}
                  className={`flex min-h-10 w-full flex-col items-start px-3 py-1.5 text-left hover:bg-hover ${
                    active ? "bg-hover" : ""
                  }`}
                >
                  <span className={`text-sm text-ink ${active ? "font-semibold" : ""}`}>{run.name}</span>
                  <span className="text-xs text-ink-muted">
                    {run.gameId === defaultGameId ? "" : `${gameName(run)} · `}
                    {modeLine(run)}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <NewRunDialog
        lang={lang}
        open={dialogOpen}
        pending={pending}
        games={games}
        initialGameId={activeRun?.gameId ?? defaultGameId ?? ""}
        onClose={() => setDialogOpen(false)}
        onCreate={handleCreate}
      />
    </div>
  );
}
