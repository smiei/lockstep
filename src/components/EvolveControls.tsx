"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { useDropdown } from "@/lib/useDropdown";
import { useRouter } from "next/navigation";
import { evolveEncounter, revertEvolution } from "@/lib/actions";
import { formatActionError } from "@/lib/actionErrors";
import type { Lang } from "@/lib/i18n/dictionary";
import { translations } from "@/lib/i18n/dictionary";
import { PokemonSprite } from "@/components/PokemonSprite";
import { UndoIcon } from "@/components/ActionIcons";

// `compact`: the Team drawer's specimens stand two to a tray and the Box rows
// carry their buttons beside the text, so the buttons keep the 40px touch
// height but drop to small text and tight padding.
export function EvolveButton({
  runKey,
  lang,
  encounterId,
  targets,
  compact = false,
}: {
  runKey: string;
  lang: Lang;
  encounterId: number;
  targets: { id: number; name: string; method: string | null; available: boolean }[];
  compact?: boolean;
}) {
  const router = useRouter();
  const { open, setOpen, toggle, containerRef, triggerProps } = useDropdown();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const t = translations[lang].links;

  if (targets.length === 0) return null;

  function handlePick(targetId: number) {
    setError(null);
    startTransition(async () => {
      const result = await evolveEncounter(runKey, encounterId, targetId);
      if (result.success) {
        setOpen(false);
        router.refresh();
      } else {
        setError(formatActionError(result.error, lang));
      }
    });
  }

  // A level evolution is reachable within the current level cap: give the
  // button a subtle emerald accent plus a light dot travelling around its
  // border (spinning conic gradient behind a padded, masked button).
  //
  // Two laps (5s) and then it rests: motion that runs longer than five seconds
  // next to other content needs a way to stop it (WCAG 2.2.2), and it used to
  // loop forever on every evolvable card. The green variant keeps saying
  // "evolvable" after that. Reduced motion skips the dot entirely.
  const anyAvailable = targets.some((target) => target.available);

  return (
    <div ref={containerRef} className="relative">
      <span className="relative inline-flex overflow-hidden rounded p-px">
        {anyAvailable && (
          <span
            aria-hidden
            // evolve-sweep (globals.css), not Tailwind's spin: it fades the
            // ring out on its last turn, so the dot does not stay parked as
            // a sliver on the button's edge once the two laps are done.
            className="evolve-sweep absolute inset-[-1000%] bg-[conic-gradient(from_0deg,transparent_0deg,transparent_310deg,var(--success)_355deg,transparent_360deg)] motion-reduce:hidden"
          />
        )}
        {/* bg-panel is load-bearing: the spinning conic-gradient ring sits
            behind this button and has to be covered. */}
        <Button
          variant={anyAvailable ? "success" : "secondary"}
          size="sm"
          loading={pending}
          onClick={toggle}
          {...triggerProps}
          className={compact ? "relative bg-panel px-2.5 text-xs" : "relative bg-panel"}
        >
          {t.evolve}
        </Button>
      </span>
      {open && (
        <ul className="absolute z-10 mt-1 min-w-[180px] overflow-hidden rounded-lg border border-line bg-panel shadow-lg">
          {targets.map((target) => (
            <li key={target.id}>
              <button
                type="button"
                onClick={() => handlePick(target.id)}
                className="flex h-10 w-full items-center gap-2 px-3 text-left text-sm text-ink hover:bg-hover"
              >
                <PokemonSprite pokemonId={target.id} name={target.name} size="sm" />
                <span className="flex min-w-0 flex-col">
                  <span>{target.name}</span>
                  {target.method && (
                    <span
                      className={`text-xs ${
                        target.available
                          ? "font-medium text-success"
                          : "text-ink-subtle"
                      }`}
                    >
                      {target.method}
                    </span>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
}

// `compact` draws it as a square icon button (name in aria-label and title):
// reverting is a correction, rarer than evolving, and "Zurückentwickeln"
// does not fit beside "Entwickeln" under a specimen.
export function RevertButton({
  runKey,
  lang,
  encounterId,
  compact = false,
}: {
  runKey: string;
  lang: Lang;
  encounterId: number;
  compact?: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const t = translations[lang].links;

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const result = await revertEvolution(runKey, encounterId);
      if (result.success) {
        router.refresh();
      } else {
        setError(formatActionError(result.error, lang));
      }
    });
  }

  return (
    <div>
      {compact ? (
        <Button
          size="sm"
          iconOnly
          loading={pending}
          onClick={handleClick}
          icon={<UndoIcon className="h-4 w-4" />}
          aria-label={t.revert}
          title={t.revert}
        />
      ) : (
        <Button size="sm" loading={pending} onClick={handleClick}>
          {t.revert}
        </Button>
      )}
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
}
