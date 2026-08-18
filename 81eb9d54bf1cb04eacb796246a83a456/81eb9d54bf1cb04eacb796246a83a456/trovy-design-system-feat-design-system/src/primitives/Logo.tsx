import * as React from "react";
import Link from "next/link";
import { cn } from "../utils/cn";

/**
 * Trovy logo mark — a tilted indigo square with an amber "spark" inset.
 * The mark is intentionally abstract; it doesn't read as any specific
 * glyph at small sizes, which lets the wordmark do the lifting.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "relative grid h-8 w-8 place-items-center overflow-hidden rounded-md bg-gradient-to-br from-[#7c83ff] to-[#4d54c2] text-white shadow-glow",
        className
      )}
      aria-hidden
    >
      <span className="absolute -right-1.5 -top-1.5 h-3.5 w-3.5 rotate-45 rounded-[2px] bg-amber" />
      <svg
        width="14"
        height="14"
        viewBox="0 0 14 14"
        fill="none"
        className="relative z-10"
      >
        <path
          d="M2 3.5L7 1L12 3.5V10.5L7 13L2 10.5V3.5Z"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
        <circle cx="7" cy="7" r="1.5" fill="currentColor" />
      </svg>
    </span>
  );
}

/**
 * Brand wordmark — the logo mark + the word "trovy". Used in the header,
 * footer, and auth pages.
 */
export function Brand({
  href = "/",
  locale,
  label = "trovy",
  className,
}: {
  href?: string;
  locale?: string;
  label?: string;
  className?: string;
}) {
  const finalHref = locale && locale !== "fr" ? `/${locale}` : href;
  return (
    <Link
      href={finalHref}
      className={cn(
        "inline-flex items-center gap-2.5 text-ink transition-opacity hover:opacity-90",
        className
      )}
    >
      <LogoMark />
      <span className="font-display text-[17px] font-bold tracking-tighter">
        {label}
      </span>
    </Link>
  );
}
