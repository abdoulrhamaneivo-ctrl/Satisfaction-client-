import React from 'react';
import { cn } from '../../utils';

export const DataTable = ({
  headers,
  children,
  maxHeight,
  className,
}: {
  headers?: string[];
  children: React.ReactNode;
  maxHeight?: string;
  className?: string;
}) => (
  <div className={cn("overflow-hidden rounded-3xl border border-border/80 bg-card shadow-sm ring-1 ring-border/50", className)}>
    <div
      className="overflow-x-auto momentum-scroll scroll-fade-x"
      style={maxHeight ? { maxHeight, overflowY: 'auto' } : undefined}
    >
      <table className="w-full min-w-[640px] text-left text-sm">
        {headers && (
          <thead className="sticky top-0 z-10 bg-muted/60 text-muted-foreground uppercase font-semibold text-[11px] tracking-wider border-b border-border/70">
            <tr>
              {headers.map((h) => (
                <th key={h} className="whitespace-nowrap px-6 py-3.5 font-satoshi">{h}</th>
              ))}
            </tr>
          </thead>
        )}
        <tbody className="divide-y divide-border/60 font-medium">
          {children}
        </tbody>
      </table>
    </div>
  </div>
);

export const DataTableRow = ({
  children,
  onClick,
  className = '',
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}) => (
  <tr
    onClick={onClick}
    className={cn(
      "border-b border-border/60 last:border-0 transition-colors duration-150 hover:bg-primary/5",
      onClick && "cursor-pointer active:bg-primary/10",
      className
    )}
  >
    {children}
  </tr>
);
