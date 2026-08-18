import * as React from "react";
import { cn } from "../utils/cn";

/**
 * Container — capped-width layout wrapper.
 *
 * The marketing surface uses four canonical widths, controlled by `width`:
 *  - `prose` (576) — small centered content like an FAQ.
 *  - `narrow` (900) — solo CTAs.
 *  - `default` (1152) — most sections.
 *  - `wide` (1280) — hero with product mock and the pricing cards row.
 *
 * The padding matches the Tailwind container defaults (1.25rem mobile,
 * 2rem desktop).
 */
export interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  width?: "prose" | "narrow" | "default" | "wide";
  as?: keyof React.JSX.IntrinsicElements;
}

const widthClass = {
  prose: "max-w-[36rem]",
  narrow: "max-w-[56rem]",
  default: "max-w-[72rem]",
  wide: "max-w-[80rem]",
};

export const Container = React.forwardRef<HTMLDivElement, ContainerProps>(
  function Container({ className, width = "default", ...props }, ref) {
    return (
      <div
        ref={ref}
        className={cn("mx-auto w-full px-5 lg:px-8", widthClass[width], className)}
        {...props}
      />
    );
  }
);
