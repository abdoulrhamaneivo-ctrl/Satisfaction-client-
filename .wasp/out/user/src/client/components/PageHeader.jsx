import React from 'react';
import { cn } from '../utils';
export const PageHeader = ({ eyebrow, title, description, icon: Icon, actions, className, }) => {
    return (<header className={cn('relative mb-8 flex flex-col gap-4 border-b border-border/80 pb-6 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div className="flex items-start gap-4 min-w-0">
        {Icon && (<span className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary shadow-sm ring-1 ring-primary/5">
            <Icon className="size-5" strokeWidth={2} aria-hidden/>
          </span>)}
        <div className="min-w-0">
          {eyebrow && (<p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              {eyebrow}
            </p>)}
          <h1 className="text-title-lg font-bold tracking-tight text-foreground font-satoshi text-balance">
            {title}
          </h1>
          {description && (<p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              {description}
            </p>)}
        </div>
      </div>

      {actions && (<div className="flex shrink-0 flex-wrap items-center gap-2.5 sm:gap-3">{actions}</div>)}
    </header>);
};
