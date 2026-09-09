import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '../utils';
const accentSurface = {
    primary: 'bg-primary/10 text-primary border-primary/25',
    secondary: 'bg-secondary/15 text-secondary border-secondary/30',
    success: 'bg-success/15 text-success border-success/30',
    destructive: 'bg-destructive/15 text-destructive border-destructive/30',
};
export const StatCard = ({ title, value, icon: Icon, accent = 'primary', trend, trendDirection = 'up', index = 0, }) => {
    const TrendIcon = trendDirection === 'up' ? TrendingUp : TrendingDown;
    const accentTopBar = {
        primary: 'from-primary/60 via-primary/30 to-transparent',
        secondary: 'from-secondary/60 via-secondary/30 to-transparent',
        success: 'from-success/60 via-success/30 to-transparent',
        destructive: 'from-destructive/60 via-destructive/30 to-transparent',
    };
    return (<motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: index * 0.05, ease: [0.16, 1, 0.3, 1] }} whileHover={{ y: -3 }} className="group relative overflow-hidden rounded-2xl border border-border/70 bg-card/95 p-5 sm:p-6 shadow-sm transition-[border-color,box-shadow] duration-300 hover:border-primary/25 hover:shadow-premium">
      {/* Accent top bar — executive KPI feel */}
      <span aria-hidden className={cn('absolute inset-x-0 top-0 h-1 bg-gradient-to-r opacity-80', accentTopBar[accent])}/>

      <div className="flex items-start justify-between gap-3">
        <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground leading-snug">
          {title}
        </span>
        {Icon && (<span className={cn('flex size-10 shrink-0 items-center justify-center rounded-xl border transition-transform duration-300 motion-safe:group-hover:scale-105', accentSurface[accent])}>
            <Icon className="size-[18px]" strokeWidth={2} aria-hidden/>
          </span>)}
      </div>

      <div className="mt-3.5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <p className="text-3xl font-bold tracking-tight text-foreground sm:text-[2.125rem] tabular-nums font-display">
          {value}
        </p>
        {trend && (<span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold tabular-nums', trendDirection === 'up'
                ? 'bg-success/10 text-success border-success/25'
                : 'bg-destructive/10 text-destructive border-destructive/25')}>
            <TrendIcon className="size-3" aria-hidden/>
            {trend}
          </span>)}
      </div>

      <span aria-hidden className="absolute inset-x-0 bottom-0 h-0.5 origin-left scale-x-0 bg-gradient-to-r from-primary via-secondary to-primary transition-transform duration-300 motion-safe:group-hover:scale-x-100"/>
    </motion.div>);
};
