import type { ReactNode } from "react";
import { cn } from "./cn";

// The collection label: the redesign's signature (globals.css
// `.specimen-label`). Rows of small mono data, each a left and an optional
// right value - "Nr. 004 · Platz 3", "Vertania Wald · Σ 505 → 860". `dead`
// switches the double frame for the heavy top rule a collection uses for a
// specimen withdrawn from the drawer (the Memorial, a dead pair).
export function SpecimenLabel({
  dead = false,
  className,
  children,
}: {
  dead?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        dead ? "specimen-label-dead py-1.5" : "specimen-label px-2 py-1.5",
        "text-xs leading-relaxed text-ink",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function LabelRow({
  left,
  right,
  strong = false,
}: {
  left: ReactNode;
  right?: ReactNode;
  // The first row - the catalogue number - is set heavier than the rest.
  strong?: boolean;
}) {
  return (
    <div className={cn("flex items-baseline justify-between gap-3", strong && "font-semibold")}>
      <span className="min-w-0 truncate">{left}</span>
      {right !== undefined && <span className="shrink-0 text-right">{right}</span>}
    </div>
  );
}
