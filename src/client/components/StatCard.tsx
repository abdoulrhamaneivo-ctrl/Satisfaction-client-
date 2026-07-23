import React from 'react';
import { motion } from 'framer-motion';
import { type LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '../utils';

type Accent = 'primary' | 'secondary' | 'success' | 'destructive';

const accentSurface: Record<Accent, string> = {
  primary: 'bg-primary/10 text-primary ring-primary/10',
  secondary: 'bg-secondary/10 text-secondary ring-secondary/15',
  success: 'bg-success/10 text-success ring-success/15',
  destructive: 'bg-destructive/10 text-destructive ring-destructive/15',
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
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.06, ease: 'easeOut' }}
      whileHover={{ y: -4 }}
      className="group relative overflow-hidden rounded-2xl border border-border/70 bg-card p-6 shadow-premium transition-shadow duration-300 hover:shadow-premium-lg"
    >
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        {Icon && (
          <span
            className={cn(
              'flex size-10 items-center justify-center rounded-xl ring-1 ring-inset',
              accentSurface[accent],
            )}
          >
            <Icon className="size-5" strokeWidth={2} />
          </span>
        )}
      </div>

      <div className="mt-4 flex items-end gap-3">
        <p className="text-title-lg font-black tracking-tight text-foreground">
          {value}
        </p>
        {trend && (
          <span
            className={cn(
              'mb-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold',
              trendDirection === 'up'
                ? 'bg-success/10 text-success'
                : 'bg-destructive/10 text-destructive',
            )}
          >
            <TrendIcon className="size-3" />
            {trend}
          </span>
        )}
      </div>

      {/* Subtle brand accent bar on hover */}
      <span className="absolute inset-x-0 bottom-0 h-0.5 origin-left scale-x-0 bg-gradient-to-r from-primary to-secondary transition-transform duration-300 group-hover:scale-x-100" />
    </motion.div>
  );
};
