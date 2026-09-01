import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "../../utils";
const cardStyles = cva("relative rounded-2xl border transition-colors duration-200 ease-out", {
    variants: {
        variant: {
            default: "bg-card border-border/70 text-card-foreground shadow-sm",
            inset: "bg-muted/40 border-border/50 text-foreground",
            ghost: "border-transparent bg-transparent",
            feature: "bg-card border-border/80 shadow-sm",
            glass: "bg-card border-border/60 shadow-sm",
        },
        interactive: {
            true: "hover:border-border cursor-pointer",
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
});
export const Card = React.forwardRef(function Card({ className, variant, interactive, pad, ...props }, ref) {
    return (<div ref={ref} className={cn(cardStyles({ variant, interactive, pad }), className)} {...props}/>);
});
//# sourceMappingURL=Card.jsx.map