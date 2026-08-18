"use client";

import * as React from "react";
import Link from "next/link";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../utils/cn";

/**
 * Button — the single interactive primitive for the whole design system.
 *
 * Three intents (primary / secondary / ghost) × three sizes (sm / md / lg).
 * Renders as `<a>` when `href` is provided, otherwise as `<button>`. When
 * `href` is internal (`/` or starts with `/` and no protocol), we use
 * Next.js `<Link>` to avoid a full reload.
 *
 * The primary intent is reserved for the page's single most important
 * action. Secondary / ghost are for everything else.
 */
const buttonStyles = cva(
  [
    "inline-flex items-center justify-center gap-2",
    "font-semibold tracking-tight",
    "transition-all duration-base ease-out",
    "disabled:pointer-events-none disabled:opacity-50",
    "outline-none focus-visible:ring-2 focus-visible:ring-accent/55 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-0",
    "whitespace-nowrap select-none",
  ].join(" "),
  {
    variants: {
      intent: {
        primary: [
          "bg-ink text-fg-inverse",
          "shadow-1",
          "hover:-translate-y-0.5 hover:bg-[#eef0ff]",
        ],
        accent: [
          "bg-accent text-accent-fg",
          "shadow-glow",
          "hover:-translate-y-0.5 hover:bg-accent-hover",
        ],
        secondary: [
          "border border-edge bg-bg-2/60 text-ink",
          "backdrop-blur",
          "hover:-translate-y-0.5 hover:border-edge-strong hover:bg-bg-2",
        ],
        ghost: [
          "text-fg-secondary",
          "hover:bg-bg-2 hover:text-ink",
        ],
        outline: [
          "border border-edge-strong text-ink",
          "hover:-translate-y-0.5 hover:border-edge-strong hover:bg-bg-2/60",
        ],
        danger: [
          "bg-danger/10 text-danger border border-danger/20",
          "hover:bg-danger/15",
        ],
      },
      size: {
        sm: "h-8 rounded-md px-3 text-xs",
        md: "h-10 rounded-md px-4 text-sm",
        lg: "h-12 rounded-card px-5 text-sm",
      },
    },
    defaultVariants: {
      intent: "primary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "size">,
    VariantProps<typeof buttonStyles> {
  href?: string;
  external?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    { className, intent, size, href, external, children, ...props },
    ref
  ) {
    const classes = cn(buttonStyles({ intent, size }), className);

    if (href) {
      const isExternal = external || /^https?:\/\//.test(href);
      if (isExternal) {
        return (
          <a
            href={href}
            className={classes}
            target="_blank"
            rel="noreferrer noopener"
          >
            {children}
          </a>
        );
      }
      return (
        <Link href={href} className={classes}>
          {children}
        </Link>
      );
    }

    return (
      <button ref={ref} className={classes} {...props}>
        {children}
      </button>
    );
  }
);
