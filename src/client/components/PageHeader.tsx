import React from 'react';
import { type LucideIcon } from 'lucide-react';
import { cn } from '../utils';

interface PageHeaderProps {
  /** Small uppercase eyebrow above the title. */
  eyebrow?: string;
  title: string;
  description?: string;
  icon?: LucideIcon;
  /** Right-aligned actions (buttons, etc.). */
  actions?: React.ReactNode;
  className?: string;
}

export const PageHeader = ({
  eyebrow,
  title,
  description,
  icon: Icon,
  actions,
  className,
}: PageHeaderProps) => {
  return (
    <div
      className={cn(
        'mb-8 flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between',
        className,
      )}
    >
      <div className="flex items-start gap-4">
        {Icon && (
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Icon className="size-5" strokeWidth={2} />
          </span>
        )}
        <div>
          {eyebrow && (
            <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
              {eyebrow}
            </p>
          )}
          <h1 className="text-title-lg font-bold tracking-tight text-foreground">
            {title}
          </h1>
          {description && (
            <p className="mt-1.5 max-w-xl text-sm text-muted-foreground">
              {description}
            </p>
          )}
        </div>
      </div>

      {actions && (
        <div className="flex shrink-0 flex-wrap items-center gap-3">{actions}</div>
      )}
    </div>
  );
};
