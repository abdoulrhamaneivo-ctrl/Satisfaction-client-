import * as React from "react";
import { cn } from "../utils/cn";

/**
 * Kbd — keyboard key chip. The `⌘K` motif shows up in the hero, the
 * floating command bar, and the doc site, so it gets its own primitive.
 *
 * Renders inside a small dark chip with a 1px highlight on the top edge
 * to evoke a physical key.
 */
export function Kbd({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <kbd
      className={cn(
        "inline-flex h-5 min-w-[20px] items-center justify-center rounded-sm border border-edge-strong bg-bg-1 px-1.5",
        "font-mono text-[10px] font-medium text-fg-secondary",
        "shadow-[0_1px_0_var(--ds-border-subtle),inset_0_-1px_0_rgba(0,0,0,0.4)]",
        className
      )}
    >
      {children}
    </kbd>
  );
}
