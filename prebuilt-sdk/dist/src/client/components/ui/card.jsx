import { cva } from "class-variance-authority";
import * as React from "react";
import { cn } from "../../utils";
const cardVariants = cva("rounded-lg border border-border/80 bg-card shadow-sm", {
    variants: {
        variant: {
            default: "bg-card text-card-foreground",
            accent: "bg-card-accent text-card-accent-foreground ring-1 ring-primary/10",
            faded: "text-card-faded-foreground scale-95 opacity-50",
            bento: "bg-card-subtle/40 border-dashed border-secondary/20",
            bentoHighlight: "bg-card-subtle text-card-subtle-foreground border-none shadow-none ring-1 ring-primary/10",
            outer: "bg-card text-card-foreground shadow-premium",
            inner: "bg-muted/40 text-foreground border-border/60",
        },
    },
});
function Card({ className, variant = "default", ...props }) {
    return (<div data-slot="card" className={cn(cardVariants({ variant, className }))} {...props}/>);
}
function CardHeader({ className, ...props }) {
    return (<div data-slot="card-header" className={cn("flex flex-col space-y-1.5 p-6", className)} {...props}/>);
}
function CardTitle({ className, ...props }) {
    return (<h3 data-slot="card-title" className={cn("font-semibold leading-none tracking-tight", className)} {...props}/>);
}
function CardDescription({ className, ...props }) {
    return (<div data-slot="card-description" className={cn("text-muted-foreground text-sm", className)} {...props}/>);
}
function CardContent({ className, ...props }) {
    return (<div data-slot="card-content" className={cn("p-6 pt-0", className)} {...props}/>);
}
function CardFooter({ className, ...props }) {
    return (<div data-slot="card-footer" className={cn("flex items-center p-6 pt-0", className)} {...props}/>);
}
export { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, };
//# sourceMappingURL=card.jsx.map