import * as React from "react";
import { cn } from "../../utils";
import { Eyebrow } from "./Badge";

export interface SectionHeadingProps {
  eyebrow?: string;
  title: React.ReactNode;
  accent?: React.ReactNode;
  body?: React.ReactNode;
  layout?: "center" | "split";
  align?: "left" | "center";
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  bodyClassName?: string;
  eyebrowTone?: "accent" | "amber" | "positive" | "neutral";
}

export function SectionHeading({
  eyebrow,
  title,
  accent,
  body,
  layout = "split",
  align = "left",
  size = "md",
  className,
  bodyClassName,
  eyebrowTone = "accent",
}: SectionHeadingProps) {
  const sizeClass =
    size === "xl"
      ? "text-3xl sm:text-4xl md:text-5xl"
      : size === "lg"
        ? "text-2xl sm:text-3xl md:text-4xl"
        : size === "md"
          ? "text-xl sm:text-2xl md:text-3xl"
          : "text-lg sm:text-xl";

  const alignClass = align === "center" ? "text-center" : "text-left";
  const mxClass = align === "center" ? "mx-auto" : "";

  if (layout === "center") {
    return (
      <div className={cn("max-w-3xl", mxClass, alignClass, className)}>
        {eyebrow && <Eyebrow tone={eyebrowTone}>{eyebrow}</Eyebrow>}
        <h2
          className={cn(
            "mt-3 max-w-3xl text-balance font-satoshi font-bold leading-tight tracking-tight text-foreground",
            sizeClass
          )}
        >
          {title}
          {accent && (
            <>
              {" "}
              <span className="text-muted-foreground font-semibold">{accent}</span>
            </>
          )}
        </h2>
        {body && (
          <p
            className={cn(
              "mt-3 max-w-xl text-sm sm:text-base leading-relaxed text-muted-foreground",
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
        "grid gap-4 md:grid-cols-[1.25fr_0.75fr] md:items-end justify-between",
        className
      )}
    >
      <div>
        {eyebrow && <Eyebrow tone={eyebrowTone}>{eyebrow}</Eyebrow>}
        <h2
          className={cn(
            "mt-2 max-w-3xl text-balance font-satoshi font-bold leading-tight tracking-tight text-foreground",
            sizeClass
          )}
        >
          {title}
          {accent && (
            <>
              {" "}
              <span className="text-muted-foreground font-semibold">{accent}</span>
            </>
          )}
        </h2>
      </div>
      {body && (
        <p
          className={cn(
            "max-w-md text-sm sm:text-base leading-relaxed text-muted-foreground",
            bodyClassName
          )}
        >
          {body}
        </p>
      )}
    </div>
  );
}
