import React from 'react';
import { motion } from 'framer-motion';
import { type LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '../utils';

type Accent = 'primary' | 'secondary' | 'success' | 'destructive';

const accentSurface: Record<Accent, string> = {
  primary: 'bg-primary/10 text-primary border-primary/25',
  secondary: 'bg-secondary/15 text-secondary border-secondary/30',
  success: 'bg-success/15 text-success border-success/30',
  destructive: 'bg-destructive/15 text-destructive border-destructive/30',
};

interface StatCardProps {
  title: string;
  value: string;
  icon?: LucideIcon;
  accent?: Accent;
  /** e.g. "+12%" — positive shows up-trend, negative shows down-trend. */
  trend?: string;
  trendDirection?: 'up' | 'down';
  /** For staggered entrance animation. */
  index?: number;
}

export const StatCard = ({
  title,
  value,
  icon: Icon,
  accent = 'primary',
  trend,
  trendDirection = 'up',
  index = 0,
}: StatCardProps) => {
  const TrendIcon = trendDirection === 'up' ? TrendingUp : TrendingDown;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -4 }}
      className="group relative overflow-hidden rounded-2xl border border-border/70 bg-card/90 p-6 shadow-sm backdrop-blur-sm transition-all duration-300 hover:border-border hover:shadow-premium-lg"
    >
      <div className="flex items-start justify-between gap-4">
        <span className="text-[11px] font-extrabold uppercase tracking-widest text-muted-foreground">
          {title}
        </span>
        {Icon && (
          <span
            className={cn(
              'flex size-10 items-center justify-center rounded-xl border transition-transform duration-300 group-hover:scale-105',
              accentSurface[accent],
            )}
          >
            <Icon className="size-5" strokeWidth={2} />
          </span>
        )}
      </div>

      <div className="mt-4 flex items-baseline gap-3">
        <p className="text-3xl font-black tracking-tight text-foreground sm:text-4xl tabular-nums font-satoshi">
          {value}
        </p>
        {trend && (
          <span
            className={cn(
              'mb-0.5 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold',
              trendDirection === 'up'
                ? 'bg-success/10 text-success border-success/20'
                : 'bg-destructive/10 text-destructive border-destructive/20',
            )}
          >
            <TrendIcon className="size-3" />
            {trend}
          </span>
        )}
      </div>

      {/* Signature Trovy DS hover hairline gradient */}
      <span className="absolute inset-x-0 bottom-0 h-0.5 origin-left scale-x-0 bg-gradient-to-r from-primary via-secondary to-primary transition-transform duration-300 group-hover:scale-x-100" />
    </motion.div>
  );
};
