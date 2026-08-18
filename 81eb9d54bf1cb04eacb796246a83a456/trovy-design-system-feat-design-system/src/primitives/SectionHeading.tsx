import * as React from "react";
import { cn } from "../utils/cn";
import { Eyebrow } from "./Badge";

/**
 * SectionHeading — the canonical H2 + eyebrow + supporting body pattern
 * used on every marketing section. Two layouts:
 *  - `center`: stacked, centered, single column.
 *  - `split`: title on the left, body on the right (1.25fr / 0.75fr).
 *
 * The `accent` prop renders the second line of the title in a softer ink
 * color (white/40) — the pattern used in nearly every landing H2.
 */
export interface SectionHeadingProps {
  eyebrow: string;
  title: React.ReactNode;
  accent?: React.ReactNode;
  body?: React.ReactNode;
  layout?: "center" | "split";
  align?: "left" | "center";
  size?: "md" | "lg" | "xl";
  className?: string;
  bodyClassName?: string;
}

export function SectionHeading({
  eyebrow,
  title,
  accent,
  body,
  layout = "split",
  align = "left",
  size = "lg",
  className,
  bodyClassName,
}: SectionHeadingProps) {
  const sizeClass =
    size === "xl"
      ? "text-[44px] sm:text-5xl md:text-[64px]"
      : size === "lg"
        ? "text-4xl sm:text-5xl md:text-6xl"
        : "text-3xl sm:text-4xl md:text-[44px]";

  const alignClass = align === "center" ? "text-center" : "text-left";
  const mxClass = align === "center" ? "mx-auto" : "";

  if (layout === "center") {
    return (
      <div className={cn("max-w-3xl", mxClass, alignClass, className)}>
        <Eyebrow>{eyebrow}</Eyebrow>
        <h2
          className={cn(
            "mt-5 max-w-3xl text-balance font-display font-semibold leading-[1.02] tracking-tighter",
            sizeClass,
            "text-ink"
          )}
        >
          {title}
          {accent && (
            <>
              <br />
              <span className="text-fg/40">{accent}</span>
            </>
          )}
        </h2>
        {body && (
          <p
            className={cn(
              "mt-6 max-w-xl text-base leading-7 text-fg-secondary",
              mxClass,
              bodyClassName
            )}
          >
            {body}
          </p>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "grid gap-8 md:grid-cols-[1.25fr_0.75fr] md:items-end",
        className
      )}
    >
      <div>
        <Eyebrow>{eyebrow}</Eyebrow>
        <h2
          className={cn(
            "mt-5 max-w-3xl text-balance font-display font-semibold leading-[1.04] tracking-tighter",
            sizeClass,
            "text-ink"
          )}
        >
          {title}
          {accent && (
            <>
              <br />
              <span className="text-fg/40">{accent}</span>
            </>
          )}
        </h2>
      </div>
      {body && (
        <p
          className={cn(
            "max-w-md text-base leading-7 text-fg-secondary",
            bodyClassName
          )}
        >
          {body}
        </p>
      )}
    </div>
  );
}
