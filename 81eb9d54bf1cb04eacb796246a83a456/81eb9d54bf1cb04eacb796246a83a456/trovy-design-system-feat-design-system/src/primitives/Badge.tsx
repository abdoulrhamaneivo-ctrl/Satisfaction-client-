import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../utils/cn";

/**
 * Badge — small status / tag pill.
 *
 * Five tones: `neutral`, `accent` (indigo), `amber` (signature),
 * `positive`, `danger`. Eyebrow style is reserved for the small
 * "ALL-CAPS · TRACKED" labels used in section headers and chips.
 */
const badgeStyles = cva(
  "inline-flex items-center gap-1.5 font-semibold",
  {
    variants: {
      tone: {
        neutral: [
          "bg-bg-2 text-fg-secondary",
          "border border-edge",
        ],
        accent: [
          "bg-accent-soft text-[#aab0ff]",
          "border border-accent/25",
          "shadow-[0_0_24px_-12px_var(--ds-accent)]",
        ],
        amber: [
          "bg-amber-soft text-amber",
          "border border-amber/25",
        ],
        positive: [
          "bg-positive-soft text-positive",
          "border border-positive/25",
        ],
        danger: [
          "bg-danger-soft text-danger",
          "border border-danger/25",
        ],
        outline: [
          "bg-transparent text-fg-tertiary",
          "border border-edge-strong",
        ],
      },
      size: {
        sm: "h-6 px-2 text-[10px] rounded-md",
        md: "h-7 px-2.5 text-[11px] rounded-md",
        lg: "h-8 px-3 text-xs rounded-md",
      },
      variant: {
        soft: "",
        solid: "border-transparent",
      },
    },
    compoundVariants: [
      { tone: "neutral", variant: "solid", class: "bg-bg-3 text-ink" },
      { tone: "accent", variant: "solid", class: "bg-accent text-accent-fg border-transparent" },
      { tone: "amber", variant: "solid", class: "bg-amber text-amber-fg border-transparent" },
      { tone: "positive", variant: "solid", class: "bg-positive text-bg-0 border-transparent" },
    ],
    defaultVariants: {
      tone: "neutral",
      size: "md",
      variant: "soft",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeStyles> {}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  function Badge({ className, tone, size, variant, ...props }, ref) {
    return (
      <span
        ref={ref}
        className={cn(badgeStyles({ tone, size, variant }), className)}
        {...props}
      />
    );
  }
);

/**
 * Eyebrow — a section-header label. "12px · 0.18em tracking · bold uppercase".
 * Use above any H1/H2 to mark the section topic. Always followed by a heading.
 */
export function Eyebrow({
  children,
  className,
  tone = "accent",
}: {
  children: React.ReactNode;
  className?: string;
  tone?: "accent" | "amber" | "neutral";
}) {
  const toneClass =
    tone === "amber"
      ? "text-amber"
      : tone === "neutral"
        ? "text-fg-tertiary"
        : "text-accent";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-eyebrow",
        toneClass,
        className
      )}
    >
      {tone !== "neutral" && (
        <span
          aria-hidden
          className={cn(
            "h-1 w-1 rounded-pill",
            tone === "amber" ? "bg-amber" : "bg-accent"
          )}
        />
      )}
      {children}
    </span>
  );
}
