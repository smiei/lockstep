"use client";

import { useState, useTransition, type ReactNode } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { LabelRow, SpecimenLabel } from "@/components/ui/SpecimenLabel";
import { useDropdown } from "@/lib/useDropdown";
import { useRouter } from "next/navigation";
import type { EncounterView, SoulLinkView } from "@/lib/types";
import { formatCatalogueNumber } from "@/lib/routeNumbers";
import { ChevronDownIcon, PlusIcon } from "@/components/ActionIcons";
import { LinkStatus, Player, RunMode } from "@/generated/prisma/enums";
import { clearTeam, markDead, setTeamSlot } from "@/lib/actions";
import { formatActionError } from "@/lib/actionErrors";
import { useDialog } from "@/components/DialogProvider";
import type { Lang } from "@/lib/i18n/dictionary";
import { translations } from "@/lib/i18n/dictionary";
import { EncounterTile } from "@/components/EncounterTile";
import { PokemonSprite } from "@/components/PokemonSprite";
import { usePlayerLabel } from "@/components/PlayerNamesProvider";
import { useToast } from "@/components/ui/ToastProvider";

const TEAM_SIZE = 6;

function linkLabel(link: SoulLinkView): string {
  // Prefer nicknames (already gated by the run's `nicknames` rule server-side:
  // null when off, so this falls back to the species name automatically).
  const names = link.encounters.map((e) => e.nickname ?? e.pokemonName);
  return names.length ? names.join(" & ") : link.routeName;
}

function LinkSprites({ link }: { link: SoulLinkView }) {
  return (
    <>
      {link.encounters.map((e) => (
        <PokemonSprite
          key={e.id}
          pokemonId={e.pokemonId}
          bodyId={e.body?.pokemonId ?? null}
          name={e.pokemonName}
          size="sm"
        />
      ))}
    </>
  );
}

// Custom dropdown instead of a native <select> so each option can show the
// link's Pokémon sprites - same pattern as the evolve dropdown.
function SlotPicker({
  slotLabel,
  placeholder,
  current,
  options,
  pending,
  onPick,
}: {
  slotLabel: string;
  placeholder: string;
  current: SoulLinkView | null;
  options: SoulLinkView[];
  pending: boolean;
  onPick: (soulLinkId: number | null) => void;
}) {
  const { open, setOpen, toggle, containerRef, triggerProps } = useDropdown();

  function pick(id: number | null) {
    setOpen(false);
    onPick(id);
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        // The tray above already names the pair, so the closed picker shows
        // only its sprites - a name cut to "Ember & …" said nothing. The full
        // name stays in the accessible name and the tooltip.
        aria-label={current ? `${slotLabel}: ${linkLabel(current)}` : slotLabel}
        title={current ? linkLabel(current) : undefined}
        disabled={pending}
        onClick={toggle}
        {...triggerProps}
        className="flex h-10 w-full items-center justify-between gap-2 rounded-md border border-line-strong bg-panel px-3 text-left text-sm text-ink transition-colors hover:bg-hover disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className="flex min-w-0 items-center gap-1.5">
          {current ? (
            <LinkSprites link={current} />
          ) : (
            <span className="text-ink-subtle">{placeholder}</span>
          )}
        </span>
        <ChevronDownIcon className="h-4 w-4 shrink-0 text-ink-subtle" />
      </button>
      {open && (
        <ul className="absolute bottom-full z-10 mb-1 max-h-64 w-full min-w-[200px] overflow-y-auto rounded-lg border border-line bg-panel shadow-lg">
          {current && (
            <li>
              <button
                type="button"
                onClick={() => pick(null)}
                className="flex h-10 w-full items-center px-3 text-left text-sm text-ink-subtle hover:bg-hover"
              >
                {placeholder}
              </button>
            </li>
          )}
          {options.map((l) => (
            <li key={l.id}>
              <button
                type="button"
                onClick={() => pick(l.id)}
                className={`flex h-10 w-full items-center gap-2 px-3 text-left text-sm text-ink hover:bg-hover ${
                  current?.id === l.id ? "bg-hover font-medium" : ""
                }`}
              >
                <LinkSprites link={l} />
                <span className="truncate">{linkLabel(l)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Grid columns for a tray's specimens: one per battle unit, Tailwind needs
// whole class names. Four units (a four-player SoulLink) stand 2x2, a fusion
// group with more simply wraps.
const SPECIMEN_COLS: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-3",
};

// The team as a collection drawer: six trays on the drawer's sunken ground,
// each holding one group's specimens with its catalogue label under them
// (see SpecimenLabel). Everything a team card could do still lives here -
// marking the group dead, picking who sits in the slot - plus the per-Pokémon
// controls the Team tab hands in through `renderControls` (evolve, forme,
// fusion), so a team member never has to be looked up a second time below.
export function TeamBar({
  runKey,
  mode,
  players,
  lang,
  links,
  renderControls,
  actions,
}: {
  runKey: string;
  mode: RunMode;
  players: Player[];
  lang: Lang;
  links: SoulLinkView[];
  renderControls?: (encounter: EncounterView) => ReactNode;
  // Extra header actions - the free-team run's "add Pokémon" button.
  actions?: ReactNode;
}) {
  const router = useRouter();
  const toast = useToast();
  const { confirm } = useDialog();
  const playerLabel = usePlayerLabel();
  const [pending, startTransition] = useTransition();
  const [deadMenuId, setDeadMenuId] = useState<number | null>(null);
  const [deadCause, setDeadCause] = useState("");
  const t = translations[lang];
  const isClassic = mode === RunMode.CLASSIC;
  // Each player once, in the order their specimens stand in the tray.
  const collectors = (link: SoulLinkView) => [
    ...new Set(link.encounters.map((e) => playerLabel(e.player))),
  ];

  // Only living links can be on the team; dead ones are filtered out here too
  // (defence in depth - markDead already clears their teamPosition).
  const aliveLinks = links.filter((l) => l.status !== LinkStatus.DEAD);
  // A card is one fusion group (see links/page.tsx), and a group can hold
  // more than one slot while one player has more separate Pokémon in it than
  // the other (see teamSlotsNeeded). Its card sits in its lowest slot; every
  // further slot points back to it instead of repeating the card.
  const slots = Array.from({ length: TEAM_SIZE }, (_, i) => {
    const link = aliveLinks.find((l) => l.teamPositions.includes(i)) ?? null;
    return { link, primary: link !== null && link.teamPosition === i };
  });
  const teamGroups = slots.flatMap((s) => (s.link && s.primary ? [s.link] : []));
  const teamSumme = teamGroups.reduce((sum, l) => sum + l.encounters.reduce((s, e) => s + e.summe, 0), 0);
  const teamSummeMax = teamGroups.reduce(
    (sum, l) => sum + l.encounters.reduce((s, e) => s + e.summeMax, 0),
    0,
  );

  function handleSelect(position: number, soulLinkId: number | null) {
    startTransition(async () => {
      const result = await setTeamSlot(runKey, position, soulLinkId);
      if (!result.success) toast.error(formatActionError(result.error, lang));
      router.refresh();
    });
  }

  // Emptying the whole team. The confirm() must run OUTSIDE startTransition -
  // awaiting a dialog inside one keeps it pending on its own show/resolve
  // update and deadlocks the page (same reason as EncounterEditor's clear).
  async function handleClearTeam() {
    if (!(await confirm({ message: t.links.clearTeamConfirm, danger: true }))) return;
    startTransition(async () => {
      const result = await clearTeam(runKey);
      if (!result.success) toast.error(formatActionError(result.error, lang));
      router.refresh();
    });
  }

  function handleMarkDead(soulLinkId: number, deathPlayer?: Player) {
    setDeadMenuId(null);
    const cause = deadCause;
    setDeadCause("");
    startTransition(async () => {
      const result = await markDead(runKey, soulLinkId, deathPlayer ?? null, cause);
      if (!result.success) toast.error(formatActionError(result.error, lang));
      router.refresh();
    });
  }

  return (
    <section className="mb-8 min-w-0">
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <h2 className="text-lg font-bold tracking-tight text-ink">{t.links.teamHeading}</h2>
        {teamGroups.length > 0 && (
          <span
            className="font-mono text-sm tabular-nums text-ink-muted"
            title={t.pokedex.columns.summe}
          >
            Σ {teamSumme}
            {teamSummeMax > teamSumme && ` → ${teamSummeMax}`}
          </span>
        )}
        <div className="ml-auto flex flex-wrap gap-2">
          {actions}
          {slots.some((s) => s.link !== null) && (
            <Button size="sm" variant="ghost" loading={pending} onClick={handleClearTeam}>
              {t.links.clearTeam}
            </Button>
          )}
        </div>
      </div>
      {/* The drawer: a sunken ground the six trays sit in. */}
      <div className="grid gap-2 rounded-lg border border-line bg-sunken p-2 sm:grid-cols-2 sm:gap-2.5 sm:p-2.5 xl:grid-cols-3">
        {slots.map(({ link, primary }, i) => {
          return (
            <div
              key={i}
              className={`flex min-w-0 flex-col rounded-sm border p-3 ${
                link && primary
                  ? "border-line bg-panel"
                  : "border-dashed border-line-strong bg-panel/50"
              }`}
            >
              {link && primary ? (
                <>
                  <div className={`grid gap-x-2 gap-y-4 ${SPECIMEN_COLS[link.encounters.length] ?? "grid-cols-2"}`}>
                    {link.encounters.map((e) => (
                      <EncounterTile
                        key={e.id}
                        encounter={e}
                        isDead={false}
                        isClassic={isClassic}
                        showRoute={link.linkIds.length > 1}
                        variant="specimen"
                        lang={lang}
                      >
                        {renderControls?.(e)}
                      </EncounterTile>
                    ))}
                  </div>

                  {/* Pushed to the tray's foot, so the labels of a row of
                      trays line up however tall their specimens are. */}
                  <div className="mt-auto pt-4">
                  <SpecimenLabel>
                    <LabelRow
                      strong
                      left={link.routeNumber !== null ? t.links.labelNumber(formatCatalogueNumber(link.routeNumber)) : link.routeName}
                      right={t.links.labelSlot(i + 1)}
                    />
                    <LabelRow
                      left={link.routeNumber !== null ? link.routeName : ""}
                      right={(() => {
                        const cur = link.encounters.reduce((s, e) => s + e.summe, 0);
                        const max = link.encounters.reduce((s, e) => s + e.summeMax, 0);
                        return max > cur ? `Σ ${cur} → ${max}` : `Σ ${cur}`;
                      })()}
                    />
                    {/* Collectors in the specimens' column order - who
                        caught what is part of the label, the way a
                        collection writes it. */}
                    <LabelRow
                      left={
                        <span title={t.links.collectedBy}>
                          {t.links.labelCollectors(collectors(link).join(" · "))}
                        </span>
                      }
                    />
                  </SpecimenLabel>
                  </div>

                  {/* Mark-dead menu: optional cause + (SoulLink) who lost theirs. */}
                  {deadMenuId === link.id && (
                    <div className="mt-3 rounded-md border border-danger-line bg-danger-bg p-2">
                      <Input
                        size="sm"
                        type="text"
                        value={deadCause}
                        onChange={(e) => setDeadCause(e.target.value)}
                        maxLength={80}
                        placeholder={t.links.deathCausePlaceholder}
                        aria-label={t.links.deathCausePlaceholder}
                        className="mb-2"
                      />
                      {isClassic ? (
                        <Button
                          size="sm"
                          variant="danger"
                          loading={pending}
                          onClick={() => handleMarkDead(link.id)}
                        >
                          {t.links.markDead}
                        </Button>
                      ) : (
                        <>
                          <p className="mb-1.5 text-xs font-medium text-ink-muted">
                            {t.links.whoLost}
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {players.map((p) => (
                              <Button
                                key={p}
                                size="sm"
                                variant="danger"
                                loading={pending}
                                onClick={() => handleMarkDead(link.id, p)}
                              >
                                {playerLabel(p)}
                              </Button>
                            ))}
                            <Button
                              size="sm"
                              loading={pending}
                              onClick={() => handleMarkDead(link.id)}
                            >
                              {t.links.noAttribution}
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </>
              ) : link ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-2 py-6 text-center">
                  <span className="flex items-center gap-1">
                    <LinkSprites link={link} />
                  </span>
                  <span className="text-sm font-medium text-ink">
                    {t.links.slotTakenBy(link.routeName)}
                  </span>
                  <span className="max-w-xs text-xs text-ink-subtle">{t.links.slotTakenHint}</span>
                </div>
              ) : (
                <div className="flex flex-1 flex-col items-center justify-center py-10 text-ink-subtle">
                  <PlusIcon className="h-7 w-7" />
                  <span className="mt-1 text-xs text-ink-subtle">
                    {t.links.teamEmpty}
                  </span>
                </div>
              )}
              {/* The closed picker is sprites only, so it shares the row with
                  the death button; in a very narrow tray the button wraps. */}
              <div className="mt-3 flex flex-wrap gap-2">
                <div className="min-w-28 flex-1">
                  <SlotPicker
                    slotLabel={t.links.teamSlotLabel(i + 1)}
                    placeholder={t.links.teamSelectPlaceholder}
                    current={link}
                    options={aliveLinks}
                    pending={pending}
                    onPick={(id) => handleSelect(i, id)}
                  />
                </div>
                {link && primary && (
                  <Button
                    size="sm"
                    variant="danger"
                    className="grow"
                    disabled={pending}
                    aria-expanded={deadMenuId === link.id}
                    onClick={() => {
                      setDeadCause("");
                      setDeadMenuId(deadMenuId === link.id ? null : link.id);
                    }}
                  >
                    {t.links.markDead}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
