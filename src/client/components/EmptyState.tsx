import React from 'react';
import { motion } from 'framer-motion';
import { type LucideIcon } from 'lucide-react';
import { cn } from '../utils';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState = ({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className={cn(
        'flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card-subtle/40 px-6 py-14 text-center',
        className,
      )}
    >
      <span className="relative mb-5 flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-inset ring-primary/10">
        <span className="animate-float-slow absolute inset-0 rounded-2xl bg-secondary/10 blur-md" />
        <Icon className="relative size-7" strokeWidth={2} />
      </span>
      <h3 className="text-title-xsm font-bold text-foreground">{title}</h3>
      {description && (
        <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </motion.div>
  );
};
