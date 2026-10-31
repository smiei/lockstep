"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createRun } from "@/lib/actions";
import { formatActionError } from "@/lib/actionErrors";
import { IS_PUBLIC_INSTANCE } from "@/lib/instance";
import { translations, type Lang } from "@/lib/i18n/dictionary";
import { localizeName } from "@/lib/i18n/localize";
import { RunMode } from "@/generated/prisma/enums";
import { ALL_PLAYERS } from "@/lib/players";
import type { GameSummary, RunHomeCard } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/Page";
import { LabelRow, SpecimenLabel } from "@/components/ui/SpecimenLabel";
import { useToast } from "@/components/ui/ToastProvider";
import { NewRunDialog } from "@/components/NewRunDialog";
import { PlusIcon } from "@/components/ActionIcons";
import { PokemonSprite } from "@/components/PokemonSprite";
import { ProgressBar } from "@/components/ProgressBar";
import { SpriteSetProvider } from "@/components/SpriteSetProvider";
import { useBackupImport } from "@/components/useBackupImport";

const TEAM_SLOTS = 6;

// "vor 3 Stunden" / "2 hours ago", in the page's language.
function relativeTime(iso: string, lang: Lang): string {
  const seconds = (new Date(iso).getTime() - Date.now()) / 1000;
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 31536000],
    ["month", 2592000],
    ["week", 604800],
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
  ];
  const format = new Intl.RelativeTimeFormat(lang, { numeric: "auto" });
  for (const [unit, size] of units) {
    if (Math.abs(seconds) >= size) return format.format(Math.round(seconds / size), unit);
  }
  return format.format(0, "minute");
}

// The start page (src/app/page.tsx) - and what every run-scoped page shows
// when there is no run to open (RunLanding). Every run as a tray of the
// collection, played-last first; with none yet, a welcome that walks a new
// install into its first run or a backup.
export function RunHomeView({
  lang,
  games,
  cards,
}: {
  lang: Lang;
  games: GameSummary[];
  cards: RunHomeCard[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);
  const t = translations[lang];
  const backupImport = useBackupImport({
    lang,
    existingNames: cards.map((card) => card.name),
    openPath: "/overview",
  });

  function handleCreate(name: string, mode: RunMode, gameId: string, playerCount: number) {
    startTransition(async () => {
      const result = await createRun(name, mode, null, gameId, lang, playerCount);
      if (result.success) {
        setDialogOpen(false);
        router.push(`/rules?run=${result.runKey}`);
      } else {
        toast.error(formatActionError(result.error, lang));
      }
    });
  }

  const actions = (
    <div className="flex flex-wrap gap-2">
      <Button variant="secondary" loading={backupImport.pending} onClick={backupImport.pick}>
        {t.home.importBackup}
      </Button>
      <Button variant="primary" icon={<PlusIcon className="h-4 w-4" />} loading={pending} onClick={() => setDialogOpen(true)}>
        {t.home.newRun}
      </Button>
    </div>
  );

  return (
    <div>
      {cards.length > 0 ? (
        <>
          <PageHeader title={t.home.title} description={`${t.home.description} ${t.home.count(cards.length)}.`}>
            {actions}
          </PageHeader>
          <ul className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
            {cards.map((card) => (
              <li key={card.accessKey}>
                <RunCard card={card} lang={lang} games={games} />
              </li>
            ))}
          </ul>
        </>
      ) : (
        <Welcome lang={lang} actions={actions} />
      )}
      {backupImport.elements}
      <NewRunDialog
        lang={lang}
        open={dialogOpen}
        pending={pending}
        games={games}
        initialGameId={games[0]?.id ?? ""}
        onClose={() => setDialogOpen(false)}
        onCreate={handleCreate}
      />
    </div>
  );
}

function Welcome({ lang, actions }: { lang: Lang; actions: React.ReactNode }) {
  const t = translations[lang];
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={t.home.welcomeTitle} description={t.home.welcomeText} />
      <ol className="specimen-label mb-6 space-y-1 px-3 py-2 font-mono text-sm text-ink">
        {t.home.steps.map((step, i) => (
          <li key={step} className="flex gap-3">
            <span className="font-semibold">{String(i + 1).padStart(2, "0")}</span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
      {actions}
      <p className="mt-4 text-sm text-ink-muted">{t.home.welcomeImport}</p>
      {IS_PUBLIC_INSTANCE && (
        <>
          <p className="mt-4 text-sm text-ink-muted">{t.landing.hint}</p>
          <p className="mt-2 text-xs text-ink-subtle">{t.landing.linkNote}</p>
        </>
      )}
    </div>
  );
}

function RunCard({ card, lang, games }: { card: RunHomeCard; lang: Lang; games: GameSummary[] }) {
  const t = translations[lang];
  const game = games.find((g) => g.id === card.gameId);
  const gameName = game ? localizeName(game.names, lang) : card.gameId;
  const who =
    card.mode === RunMode.CLASSIC
      ? t.runSwitcher.modeClassic
      : [t.runSwitcher.modeSoullink, ...card.players.map((name, i) => name.trim() || t.player[ALL_PLAYERS[i]])].join(" · ");
  const percent = card.routesTotal > 0 ? Math.round((card.routesDone / card.routesTotal) * 100) : 0;

  return (
    <Link
      href={`/overview?run=${card.accessKey}`}
      aria-label={t.home.open(card.name)}
      className="group flex h-full flex-col rounded-md border border-line bg-panel p-4 transition-colors hover:border-line-strong"
    >
      <div className="flex items-baseline justify-between gap-3 font-mono text-xs text-ink-subtle">
        <span className="min-w-0 truncate">{gameName}</span>
        <span className="shrink-0" suppressHydrationWarning>
          {t.home.changed(relativeTime(card.changedAt, lang))}
        </span>
      </div>
      <h2 className="mt-1 truncate text-xl font-bold tracking-tight text-ink group-hover:underline">{card.name}</h2>
      <p className="truncate text-sm text-ink-muted">{who}</p>

      {/* The team in its drawer: six slots, the empty ones as outlines. */}
      <SpriteSetProvider spriteSet={card.spriteSet}>
        <div className="mt-3 grid grid-cols-6 gap-1 rounded-md bg-sunken p-1.5">
          {Array.from({ length: TEAM_SLOTS }, (_, i) => {
            const member = card.team[i];
            return (
              <div key={i} className="flex aspect-square items-center justify-center rounded-sm">
                {member ? (
                  <PokemonSprite pokemonId={member.pokemonId} bodyId={member.bodyId} name="" size="md" />
                ) : (
                  <span className="h-6 w-6 rounded-sm border border-dashed border-line-strong" />
                )}
              </div>
            );
          })}
        </div>
      </SpriteSetProvider>
      {card.team.length === 0 && <p className="mt-1 text-xs text-ink-subtle">{t.home.noTeam}</p>}

      <SpecimenLabel className="mt-3 font-mono">
        <LabelRow strong left={`${t.home.routes} ${card.routesDone}/${card.routesTotal}`} right={`${t.home.badges} ${card.badges}/${card.badgesTotal}`} />
        <LabelRow
          left={card.nextCap ? `${t.home.nextCap}: ${localizeName(card.nextCap.names, lang)}` : t.home.allCapsDone}
          right={card.nextCap ? `Lv. ${card.nextCap.level}` : undefined}
        />
        <LabelRow left={<span className={card.deaths > 0 ? "text-danger" : undefined}>{t.home.deaths(card.deaths)}</span>} />
      </SpecimenLabel>
      <div className="mt-auto pt-3">
        <ProgressBar done={card.routesDone} total={card.routesTotal} percent={percent} title={`${t.home.routes} ${card.routesDone}/${card.routesTotal}`} />
      </div>
    </Link>
  );
}
