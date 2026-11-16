// The Johto/Kanto divider of the Encounter and Journey tabs. The margins are
// the caller's: the two lists space their sections differently.
export function RegionHeading({ label, className }: { label: string; className: string }) {
  return (
    <h2
      className={`${className} flex items-center gap-3 font-mono text-xs font-semibold uppercase tracking-wider text-ink-muted first:mt-0`}
    >
      <span>{label}</span>
      <span aria-hidden="true" className="h-px flex-1 bg-line-strong" />
    </h2>
  );
}
