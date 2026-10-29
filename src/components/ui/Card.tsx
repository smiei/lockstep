import type { HTMLAttributes } from "react";
import { cn } from "./cn";

// One surface, replacing 52 distinct card-like class strings: the specimen
// tray - white on the sage ground, a hairline sage rule, nearly square
// corners. `bg-panel` is also what keeps it readable in dark mode.
type Padding = "none" | "sm" | "md";

const PADDING: Record<Padding, string> = {
  none: "",
  sm: "p-3",
  md: "p-4",
};

export function Card({
  padding = "md",
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLDivElement> & { padding?: Padding }) {
  return (
    <div
      className={cn("rounded-md border border-line bg-panel", PADDING[padding], className)}
      {...rest}
    >
      {children}
    </div>
  );
}
