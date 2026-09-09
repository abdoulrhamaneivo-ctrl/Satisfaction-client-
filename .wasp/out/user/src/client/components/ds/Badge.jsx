import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "../../utils";
const badgeStyles = cva("inline-flex items-center gap-1.5 font-semibold transition-colors select-none", {
    variants: {
        tone: {
            neutral: [
                "bg-muted/70 text-muted-foreground",
                "border border-border/60",
            ],
            accent: [
                "bg-primary/10 text-primary",
                "border border-primary/25",
                "shadow-sm",
            ],
            amber: [
                "bg-primary/12 text-primary",
                "border border-primary/25",
            ],
            navy: [
                "bg-secondary/12 text-secondary",
                "border border-secondary/25",
            ],
            positive: [
                "bg-success/15 text-success",
                "border border-success/30",
            ],
            danger: [
                "bg-destructive/15 text-destructive",
                "border border-destructive/30",
            ],
            warning: [
                "bg-warning/15 text-warning",
                "border border-warning/30",
            ],
            outline: [
                "bg-transparent text-muted-foreground",
                "border border-border",
            ],
        },
        size: {
            sm: "h-5 px-2 text-[10px] rounded-md",
            md: "h-6 px-2.5 text-[11px] rounded-lg",
            lg: "h-7 px-3 text-xs rounded-lg",
        },
        variant: {
            soft: "",
            solid: "border-transparent",
        },
    },
    compoundVariants: [
        { tone: "neutral", variant: "solid", class: "bg-muted text-foreground" },
        { tone: "accent", variant: "solid", class: "bg-primary text-primary-foreground" },
        { tone: "amber", variant: "solid", class: "bg-primary text-primary-foreground" },
        { tone: "navy", variant: "solid", class: "bg-secondary text-secondary-foreground" },
        { tone: "positive", variant: "solid", class: "bg-success text-success-foreground" },
        { tone: "danger", variant: "solid", class: "bg-destructive text-destructive-foreground" },
    ],
    defaultVariants: {
        tone: "neutral",
        size: "md",
        variant: "soft",
    },
});
export const Badge = React.forwardRef(function Badge({ className, tone, size, variant, ...props }, ref) {
    return (<span ref={ref} className={cn(badgeStyles({ tone, size, variant }), className)} {...props}/>);
});
/**
 * Eyebrow — A section-header label. "11px · tracking-widest · bold uppercase".
 * Signature Trovy DS pattern used above H1/H2 section headers.
 */
export function Eyebrow({ children, className, tone = "accent", }) {
    const toneClass = tone === "amber"
        ? "text-primary"
        : tone === "positive"
            ? "text-success"
            : tone === "neutral"
                ? "text-muted-foreground"
                : "text-secondary";
    const dotBg = tone === "amber"
        ? "bg-primary"
        : tone === "positive"
            ? "bg-success"
            : tone === "neutral"
                ? "bg-muted-foreground"
                : "bg-secondary";
    return (<span className={cn("inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest", toneClass, className)}>
      {tone !== "neutral" && (<span aria-hidden className={cn("h-1.5 w-1.5 rounded-full", dotBg)}/>)}
      {children}
    </span>);
}
