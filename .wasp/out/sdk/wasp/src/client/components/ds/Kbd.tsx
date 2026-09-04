import * as React from "react";
import { cn } from "../../utils";

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
        "inline-flex h-5 min-w-[20px] items-center justify-center rounded px-1.5 font-mono text-[10px] font-semibold text-muted-foreground bg-muted border border-border/80 shadow-[inset_0_-1px_0_rgba(0,0,0,0.2)] select-none",
        className
      )}
    >
      {children}
    </kbd>
  );
}
