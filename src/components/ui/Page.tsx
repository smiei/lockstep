import type { ReactNode } from "react";
import { cn } from "./cn";

// The page title was rendered five different ways for the same role, and it was
// always an <h2> - the only <h1> in the app was the name in the header. Here it
// is the <h1>, once, with the actions slot every page ended up hand-rolling.
export function PageHeader({
  title,
  description,
  align = "start",
  children,
}: {
  title: string;
  // "center" for a page that is a single centred block (the start page's welcome).
  align?: "start" | "center";
  // Small print that belongs to the page as a whole - e.g. the TM tab's note
  // that a randomizer may have re-rolled compatibility.
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "mb-6 flex flex-wrap gap-3",
        align === "center" ? "justify-center text-center" : "justify-between",
        // With a description the block is two lines tall, so the actions align
        // to the title; without one they sit centred against it.
        description ? "items-start" : "items-center",
      )}
    >
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">{title}</h1>
        {description && (
          <p className={cn("mt-1.5 max-w-prose text-sm text-ink-muted", align === "center" && "mx-auto")}>{description}</p>
        )}
      </div>
      {children}
    </div>
  );
}

// A titled block within a page. Four to five variants of this eyebrow existed
// (uppercase or not, text-sm or text-xs, mb-3 or mb-2, coloured or not). Since
// the redesign it is a plain bold heading, not a tracked small-caps eyebrow:
// the heading carries its own weight.
export function Section({
  title,
  actions,
  className,
  children,
}: {
  title?: string;
  actions?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={cn("mb-8", className)}>
      {(title || actions) && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          {title && (
            <h2 className="text-lg font-bold tracking-tight text-ink">{title}</h2>
          )}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

// Five places rendered a bare bordered box when their list came up empty - a
// filtered-to-nothing Pokédex, an "open only" tracker with everything done.
export function EmptyState({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-md border border-dashed border-line-strong bg-panel/60 px-6 py-10 text-center">
      <p className="text-sm text-ink-muted">{title}</p>
      {hint && <p className="mt-1 text-xs text-ink-subtle">{hint}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}
