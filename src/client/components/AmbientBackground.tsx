import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../utils';

/**
 * Brand-aligned ambient page shell.
 * Soft, slowly-floating navy + amber halos on a subtly tinted background.
 * Keeps the exact brand palette (primary / secondary) — no off-brand hues.
 * Light mode: slightly warm background with visible halos.
 * Dark mode: rich navy shell with glowing halos.
 */
export const AmbientBackground = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className={cn(
        'bg-app-shell relative min-h-screen overflow-hidden',
        // Mode clair : fond très légèrement crème pour différencier du blanc pur
        'bg-[hsl(20,35%,98%)] dark:bg-transparent',
        className,
      )}
    >
      {/* Ambient halos — renforcés en mode clair */}
      <div
        aria-hidden
        className="animate-float-slow pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-primary/[0.12] dark:bg-primary/10 blur-3xl"
      />
      <div
        aria-hidden
        className="animate-float-slower pointer-events-none absolute -right-20 top-32 h-80 w-80 rounded-full bg-secondary/[0.18] dark:bg-secondary/15 blur-3xl"
      />
      <div
        aria-hidden
        className="animate-float-slow pointer-events-none absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-secondary-muted/[0.22] dark:bg-secondary-muted/20 blur-3xl"
      />

      <div className="relative z-10">{children}</div>
    </motion.div>
  );
};
