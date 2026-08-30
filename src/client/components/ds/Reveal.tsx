import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "../../utils";

export interface RevealProps {
  children: React.ReactNode;
  delay?: number;
  direction?: "up" | "down" | "left" | "right" | "none";
  className?: string;
  duration?: number;
}

export function Reveal({
  children,
  delay = 0,
  direction = "up",
  className,
  duration = 0.3,
}: RevealProps) {
  const reduce = useReducedMotion();

  const offset = reduce
    ? {}
    : direction === "up"
      ? { y: 12 }
      : direction === "down"
        ? { y: -12 }
        : direction === "left"
          ? { x: 12 }
          : direction === "right"
            ? { x: -12 }
            : {};

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, ...offset }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ duration, delay, ease: [0.16, 1, 0.3, 1] }}
      className={cn(className)}
    >
      {children}
    </motion.div>
  );
}
