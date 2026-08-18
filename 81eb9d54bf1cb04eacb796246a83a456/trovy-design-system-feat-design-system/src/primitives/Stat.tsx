import * as React from "react";
import { cn } from "../utils/cn";

/**
 * Stat — large number + small label.
 *
 * Used in the benefits row and the admin dashboards. The number is set
 * in display font with the signature colour; the label is the canonical
 * 11px uppercase eyebrow.
 */
export function Stat({
  value,
  label,
  tone = "amber",
  className,
}: {
  value: React.ReactNode;
  label: React.ReactNode;
  tone?: "amber" | "accent" | "positive" | "ink";
  className?: string;
}) {
  const toneClass =
    tone === "amber"
      ? "text-amber"
      : tone === "accent"
        ? "text-accent"
        : tone === "positive"
          ? "text-positive"
          : "text-ink";
  return (
    <div className={cn("p-6 md:p-8", className)}>
      <div
        className={cn(
          "font-display text-3xl font-semibold tracking-tighter md:text-4xl",
          toneClass
        )}
      >
        {value}
      </div>
      <div className="mt-2 text-[11px] font-semibold uppercase tracking-eyebrow text-fg-tertiary">
        {label}
      </div>
    </div>
  );
}
