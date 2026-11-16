"use client";

import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RunMode } from "@/generated/prisma/enums";
import { createRun } from "@/lib/actions";
import { formatActionError } from "@/lib/actionErrors";
import { isCustomPackId } from "@/lib/gamePack";
import { translations, type Lang } from "@/lib/i18n/dictionary";
import { localizeName } from "@/lib/i18n/localize";
import { MAX_SOULLINK_PLAYERS, MIN_SOULLINK_PLAYERS } from "@/lib/players";
import type { GameSummary } from "@/lib/types";
import { CustomGameControls } from "@/components/CustomGameControls";
import { EnglishOnlyNote } from "@/components/EnglishOnlyNote";
import { GameCover } from "@/components/GameCover";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { cn } from "@/components/ui/cn";
import { FieldLabel, Input, Select } from "@/components/ui/Input";
import { EmptyState, PageHeader, Section } from "@/components/ui/Page";
import { useToast } from "@/components/ui/ToastProvider";

const PLAYER_COUNTS = Array.from(
  { length: MAX_SOULLINK_PLAYERS - MIN_SOULLINK_PLAYERS + 1 },
  (_, i) => MIN_SOULLINK_PLAYERS + i,
);

// The select's value for "copy from no run" - a run key is never empty.
const DEFAULT_RULES = "";

export function NewRunView({
  lang,
  games,
  runs,
  initialGameId,
  initialSourceKey,
  backHref,
}: {
  lang: Lang;
  games: GameSummary[];
  // The runs whose rules can be copied, played-last first.
  runs: { accessKey: string; name: string }[];
  initialGameId: string;
  initialSourceKey: string;
  backHref: string;
}) {
  const t = translations[lang].runSwitcher;
  const tNew = translations[lang].newRun;
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const ids = useId();

  const [name, setName] = useState("");
  const [mode, setMode] = useState<RunMode>(RunMode.SOULLINK);
  const [playerCount, setPlayerCount] = useState(MIN_SOULLINK_PLAYERS);
  const [gameId, setGameId] = useState(initialGameId);
  const [sourceKey, setSourceKey] = useState(initialSourceKey);
  const [query, setQuery] = useState("");
  const [generation, setGeneration] = useState<number | null>(null);

  const picked = games.find((game) => game.id === gameId);
  const generations = [...new Set(games.flatMap((game) => (game.generation ? [game.generation] : [])))].sort((a, b) => a - b);

  // A game matches when its name - in the page's language or in English, the
  // one most people would type for a ROM hack - contains the search text.
  const needle = query.trim().toLowerCase();
  const shown = games.filter(
    (game) =>
      (generation === null || game.generation === generation) &&
      (!needle ||
        localizeName(game.names, lang).toLowerCase().includes(needle) ||
        game.names.en.toLowerCase().includes(needle)),
  );
  // Official games, ROM hacks, fan games and imported packs, in that order.
  const groups = (
    [
      [t.gameGroupOfficial, shown.filter((g) => !isCustomPackId(g.id) && (g.kind ?? "official") === "official")],
      [t.gameGroupRomhack, shown.filter((g) => !isCustomPackId(g.id) && g.kind === "romhack")],
      [t.gameGroupFangame, shown.filter((g) => !isCustomPackId(g.id) && g.kind === "fangame")],
      [t.gameGroupCustom, shown.filter((g) => isCustomPackId(g.id))],
    ] as [string, GameSummary[]][]
  ).filter(([, list]) => list.length > 0);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || !picked) return;
    startTransition(async () => {
      const result = await createRun(trimmed, mode, sourceKey || null, gameId, lang, playerCount, sourceKey === DEFAULT_RULES);
      if (result.success) {
        // The Rules tab first, so the copied rules can be reviewed.
        router.push(`/rules?run=${result.runKey}`);
      } else {
        toast.error(formatActionError(result.error, lang));
      }
    });
  }

  const createButton = (
    <Button type="submit" variant="primary" loading={pending} disabled={!name.trim() || !picked}>
      {t.create}
    </Button>
  );
  const pickedName = picked ? localizeName(picked.names, lang) : "—";

  return (
    <form onSubmit={handleSubmit}>
      <PageHeader title={t.newRunTitle} description={tNew.description}>
        <ButtonLink href={backHref} variant="ghost">
          {tNew.back}
        </ButtonLink>
      </PageHeader>

      {/* The run's details in one band above the games, a column per field
          from xl, the create button at its end; the games take the whole
          width under it. */}
      <Card className="mb-8">
        <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,0.9fr)_minmax(0,1.2fr)_auto] xl:items-start">
          <div className="flex items-center gap-3 sm:col-span-2 xl:col-span-1">
            <GameCover src={picked?.cover} name={pickedName} size="sm" />
            <div className="min-w-0">
              <span className="block text-xs font-medium text-ink-muted">{t.gameLabel}</span>
              <span className="block break-words text-base font-bold leading-tight text-ink">{pickedName}</span>
              {picked?.generation && (
                <span className="block font-mono text-xs text-ink-muted">{tNew.generation(picked.generation)}</span>
              )}
            </div>
          </div>

          <div>
            <FieldLabel htmlFor={`${ids}-name`}>{t.nameLabel}</FieldLabel>
            <Input
              id={`${ids}-name`}
              type="text"
              value={name}
              disabled={pending}
              onChange={(e) => setName(e.target.value)}
              placeholder={t.namePlaceholder}
            />
          </div>

          {/* Mode is fixed at creation, so it is a two-way choice rather than a
              toggle: both options stay visible and the picked one is filled. */}
          <div>
            <span className="mb-1 block text-xs font-medium text-ink-muted">{t.modeLabel}</span>
            <div className="grid grid-cols-2 gap-2" role="group" aria-label={t.modeLabel}>
              {(
                [
                  [RunMode.SOULLINK, t.modeSoullink],
                  [RunMode.CLASSIC, t.modeClassic],
                ] as const
              ).map(([value, label]) => (
                <Button
                  key={value}
                  variant={mode === value ? "primary" : "secondary"}
                  aria-pressed={mode === value}
                  disabled={pending}
                  onClick={() => setMode(value)}
                  className="px-2"
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>

          {/* Fixed at creation too: a player joining or leaving mid-run would
              leave routes with entries for players the run no longer has.
              A solo run keeps the column, so the band does not jump. */}
          <div>
            <span className="mb-1 block text-xs font-medium text-ink-muted">{t.playersLabel}</span>
            {mode === RunMode.SOULLINK ? (
              <div className="grid grid-cols-3 gap-2" role="group" aria-label={t.playersLabel}>
                {PLAYER_COUNTS.map((count) => (
                  <Button
                    key={count}
                    variant={playerCount === count ? "primary" : "secondary"}
                    aria-pressed={playerCount === count}
                    disabled={pending}
                    onClick={() => setPlayerCount(count)}
                    className="px-2"
                  >
                    {count}
                  </Button>
                ))}
              </div>
            ) : (
              <p className="flex h-11 items-center font-mono text-sm text-ink-muted">1</p>
            )}
          </div>

          {runs.length > 0 && (
            <div>
              <FieldLabel htmlFor={`${ids}-rules`}>{tNew.rulesFrom}</FieldLabel>
              <Select id={`${ids}-rules`} value={sourceKey} disabled={pending} onChange={(e) => setSourceKey(e.target.value)}>
                {runs.map((run) => (
                  <option key={run.accessKey} value={run.accessKey}>
                    {run.name}
                  </option>
                ))}
                <option value={DEFAULT_RULES}>{tNew.rulesDefault}</option>
              </Select>
              <p className="mt-1 text-xs text-ink-subtle">{tNew.rulesHint}</p>
            </div>
          )}

          {/* In line with the fields from xl (the margin is a label's
              height), at the band's end below that. */}
          <div className="flex justify-end sm:col-span-2 xl:col-span-1 xl:col-start-6 xl:mt-5">{createButton}</div>
        </div>
        {picked?.kind === "romhack" && <EnglishOnlyNote lang={lang} className="mt-4" />}
      </Card>

      <div className="min-w-0">
        <div className="mb-4 flex flex-wrap items-end gap-x-4 gap-y-3">
          <div className="w-full sm:w-72">
            <FieldLabel htmlFor={`${ids}-search`}>{tNew.search}</FieldLabel>
            <Input
              id={`${ids}-search`}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              // Enter in the search field must not create the run.
              onKeyDown={(e) => {
                if (e.key === "Enter") e.preventDefault();
              }}
            />
          </div>
          <div>
            <span className="mb-1 block text-xs font-medium text-ink-muted">{tNew.generationFilter}</span>
            <div className="flex flex-wrap gap-1" role="group" aria-label={tNew.generationFilter}>
              <Button
                size="sm"
                variant={generation === null ? "primary" : "secondary"}
                aria-pressed={generation === null}
                onClick={() => setGeneration(null)}
              >
                {tNew.allGenerations}
              </Button>
              {generations.map((gen) => (
                <Button
                  key={gen}
                  size="sm"
                  variant={generation === gen ? "primary" : "secondary"}
                  aria-pressed={generation === gen}
                  aria-label={tNew.generation(gen)}
                  onClick={() => setGeneration(gen)}
                  className="w-10 px-0 font-mono"
                >
                  {gen}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {groups.length === 0 && (
          <EmptyState
            title={tNew.noMatch}
            action={
              <Button
                size="sm"
                onClick={() => {
                  setQuery("");
                  setGeneration(null);
                }}
              >
                {tNew.resetFilter}
              </Button>
            }
          />
        )}
        {groups.map(([label, list]) => (
          <Section key={label} title={label} actions={<span className="font-mono text-xs text-ink-muted">{list.length}</span>}>
            <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-7 2xl:grid-cols-8">
              {list.map((game) => {
                const selected = game.id === gameId;
                const gameName = localizeName(game.names, lang);
                return (
                  <li key={game.id}>
                    <button
                      type="button"
                      aria-pressed={selected}
                      disabled={pending}
                      onClick={() => setGameId(game.id)}
                      className={cn(
                        "flex h-full w-full flex-col gap-1.5 rounded-md border bg-panel p-2 text-left transition-colors hover:bg-hover disabled:cursor-not-allowed",
                        selected ? "border-accent ring-2 ring-accent" : "border-line",
                      )}
                    >
                      <GameCover src={game.cover} name={gameName} size="fill" />
                      <span className="line-clamp-2 break-words text-sm font-semibold leading-tight text-ink">{gameName}</span>
                      {/* The state in words too - the frame alone is colour. */}
                      <span className="mt-auto font-mono text-xs text-ink-muted">
                        {game.generation ? tNew.generation(game.generation) : ""}
                        {selected && ` · ${tNew.selected}`}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </Section>
        ))}

        <CustomGameControls
          lang={lang}
          gameId={gameId}
          disabled={pending}
          onImported={setGameId}
          onRemoved={() => setGameId(games.find((game) => !isCustomPackId(game.id))?.id ?? "")}
        />
      </div>
    </form>
  );
}
