import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../utils";

const cardStyles = cva(
  "relative rounded-2xl border transition-all duration-200 ease-out",
  {
    variants: {
      variant: {
        default: "bg-card/95 border-border/70 text-card-foreground shadow-sm",
        inset: "bg-muted/40 border-border/50 text-foreground",
        ghost: "border-transparent bg-transparent",
        feature: [
          "bg-gradient-to-b from-card via-card to-muted/30",
          "border-primary/40 shadow-premium",
        ],
        glass: [
          "bg-card/80 backdrop-blur-md border-border/60",
          "shadow-premium",
        ],
      },
      interactive: {
        true: "hover:-translate-y-1 hover:border-border hover:shadow-premium-lg cursor-pointer",
        false: "",
      },
      pad: {
        none: "p-0",
        sm: "p-4 sm:p-5",
        md: "p-5 sm:p-6",
        lg: "p-6 sm:p-8",
        xl: "p-8 sm:p-10",
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
