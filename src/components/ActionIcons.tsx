import type { ReactNode } from "react";

// Line icons for the Encounter row's small square buttons, drawn in NavIcon's
// idiom (24 viewBox, no fills, currentColor, 1.75 stroke). They replace the
// emoji the buttons used to carry: an emoji is drawn by the platform's font, so
// the bin came out as a pale one-colour glyph on Windows and a full-colour
// picture on Android, and could not take the button's text colour at all.
// Decorative - the buttons carry their own aria-label.
function LineIcon({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {children}
    </svg>
  );
}

// Clear an entry: a bin.
export function TrashIcon({ className }: { className?: string }) {
  return (
    <LineIcon className={className}>
      <path d="M4 6.5h16" />
      <path d="M9.5 6.5V4.5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v2" />
      <path d="M6.5 6.5l.9 13a1.5 1.5 0 0 0 1.5 1.4h6.2a1.5 1.5 0 0 0 1.5-1.4l.9-13" />
      <path d="M10 10.5v6.5" />
      <path d="M14 10.5v6.5" />
    </LineIcon>
  );
}

// Shiny: a four-point sparkle with a small one beside it.
export function SparkleIcon({ className }: { className?: string }) {
  return (
    <LineIcon className={className}>
      <path d="M10 3.5l1.6 4.9 4.9 1.6-4.9 1.6L10 16.5l-1.6-4.9L3.5 10l4.9-1.6z" />
      <path d="M18 14.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z" />
    </LineIcon>
  );
}
