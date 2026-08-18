import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../utils/cn";

/**
 * Card — the default surface for grouped content.
 *
 * Two variants:
 *  - `default`: subtle, the workhorse. Used 80% of the time.
 *  - `feature`: stronger, with the indigo top edge. Reserved for the one
 *    card on a page that's the "spotlight" (e.g. the highlighted plan).
 *
 * `interactive` adds the hover lift + accent ring used on clickable cards.
 */
const cardStyles = cva(
  "relative rounded-card border transition-all duration-base ease-out",
  {
    variants: {
      variant: {
        default: "bg-bg-2/60 border-edge",
        inset: "bg-bg-inset/60 border-edge-subtle",
        ghost: "border-transparent",
        feature: [
          "bg-gradient-to-b from-[#151725] to-[#101116]",
          "border-accent/40",
          "shadow-2",
        ],
      },
      interactive: {
        true: "hover:-translate-y-0.5 hover:border-edge-strong hover:shadow-2 cursor-pointer",
        false: "",
      },
      pad: {
        sm: "p-5",
        md: "p-6",
        lg: "p-7",
        xl: "p-9",
      },
    },
    defaultVariants: {
      variant: "default",
      interactive: false,
      pad: "md",
    },
  }
);

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardStyles> {}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  function Card({ className, variant, interactive, pad, ...props }, ref) {
    return (
      <div
        ref={ref}
        className={cn(cardStyles({ variant, interactive, pad }), className)}
        {...props}
      />
    );
  }
);
