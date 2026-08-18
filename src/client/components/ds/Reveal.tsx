import * as React from "react";
import { motion } from "framer-motion";
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
  duration = 0.4,
}: RevealProps) {
  const getOffset = () => {
    switch (direction) {
      case "up":
        return { y: 16 };
      case "down":
        return { y: -16 };
      case "left":
        return { x: 16 };
      case "right":
        return { x: -16 };
      default:
        return {};
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, ...getOffset() }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ duration, delay, ease: [0.16, 1, 0.3, 1] }}
      className={cn(className)}
    >
      {children}
    </motion.div>
  );
}
