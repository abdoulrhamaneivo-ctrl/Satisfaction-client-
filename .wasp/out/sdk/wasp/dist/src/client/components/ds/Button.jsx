import * as React from "react";
import { Link } from "react-router";
import { cva } from "class-variance-authority";
import { cn } from "../../utils";
const buttonStyles = cva([
    "inline-flex items-center justify-center gap-2",
    "font-semibold tracking-tight select-none whitespace-nowrap",
    "transition-colors duration-150 ease-out",
    "disabled:pointer-events-none disabled:opacity-50",
    "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
].join(" "), {
    variants: {
        intent: {
            primary: [
                "bg-primary text-primary-foreground",
                "shadow-sm",
                "hover:bg-primary/90",
            ],
            secondary: [
                "bg-secondary text-secondary-foreground",
                "shadow-sm",
                "hover:bg-secondary/90",
            ],
            accent: [
                "bg-primary/10 text-primary border border-primary/20",
                "hover:bg-primary/20",
            ],
            ghost: [
                "text-muted-foreground",
                "hover:bg-muted hover:text-foreground",
            ],
            outline: [
                "border border-border bg-card text-foreground",
                "hover:border-primary/40 hover:bg-card",
            ],
            danger: [
                "bg-destructive/10 text-destructive border border-destructive/20",
                "hover:bg-destructive/20",
            ],
        },
        size: {
            sm: "h-8 rounded-lg px-3 text-xs",
            md: "h-10 rounded-xl px-4 text-sm",
            lg: "h-12 rounded-xl px-6 text-sm font-semibold",
            icon: "size-9 rounded-lg p-0",
        },
    },
    defaultVariants: {
        intent: "primary",
        size: "md",
    },
});
export const Button = React.forwardRef(function Button({ className, intent, size, href, to, external, children, ...props }, ref) {
    const classes = cn(buttonStyles({ intent, size }), className);
    if (to) {
        return (<Link to={to} className={classes}>
          {children}
        </Link>);
    }
    if (href) {
        const isExternal = external || /^https?:\/\//.test(href);
        return (<a href={href} className={classes} target={isExternal ? "_blank" : undefined} rel={isExternal ? "noreferrer noopener" : undefined}>
          {children}
        </a>);
    }
    return (<button ref={ref} className={classes} {...props}>
        {children}
      </button>);
});
//# sourceMappingURL=Button.jsx.map