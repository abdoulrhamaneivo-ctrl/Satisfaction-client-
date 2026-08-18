"use client";

import * as React from "react";
import { cn } from "../utils/cn";

/**
 * Reveal — opacity + translateY reveal on intersection.
 *
 * Used on every section / card on the marketing surface to give the page
 * a sense of precision as it scrolls in. Honors `prefers-reduced-motion`
 * (renders immediately in that case). `delay` is a stagger hint in ms;
 * cap at ~600ms before it stops feeling intentional.
 */
export function Reveal({
  children,
  delay = 0,
  y = 14,
  className,
  as: Tag = "div",
}: {
  children: React.ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  as?: keyof React.JSX.IntrinsicElements;
}) {
  const ref = React.useRef<HTMLElement | null>(null);
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.05 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return React.createElement(
    Tag,
    {
      ref,
      className: cn(className),
      style: {
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : `translateY(${y}px)`,
        transition: `opacity var(--ds-duration-reveal) var(--ds-ease-out) ${delay}ms, transform var(--ds-duration-reveal) var(--ds-ease-out) ${delay}ms`,
        willChange: visible ? "auto" : "opacity, transform",
      },
    },
    children
  );
}
