import React from 'react';
import { cn } from '../../utils';
export const DataTable = ({ headers, children, maxHeight, className, }) => (<div className={cn("overflow-hidden rounded-3xl border border-border/80 bg-card shadow-sm ring-1 ring-border/50", className)}>
    <div className="overflow-x-auto momentum-scroll scroll-fade-x" style={maxHeight ? { maxHeight, overflowY: 'auto' } : undefined}>
      <table className="w-full min-w-[640px] text-left text-sm">
        {headers && (<thead className="sticky top-0 z-10 bg-muted/60 text-muted-foreground uppercase font-semibold text-[11px] tracking-wider border-b border-border/70">
            <tr>
              {headers.map((h) => (<th key={h} className="whitespace-nowrap px-6 py-3.5 font-satoshi">{h}</th>))}
            </tr>
          </thead>)}
        <tbody className="divide-y divide-border/60 font-medium">
          {children}
        </tbody>
      </table>
    </div>
  </div>);
export const DataTableRow = ({ children, onClick, onKeyDown, tabIndex, className = '', 'aria-label': ariaLabel, }) => {
    const activable = typeof onClick === 'function';
    return (<tr onClick={onClick} 
    // Vague 4 (WCAG 2.2 AA — 2.1.1 / 4.1.2) : une ligne cliquable doit
    // être atteignable ET activable au clavier. `<tr onClick>` seul
    // n'était ni focusable ni activable : la ligne était un piège
    // visuel — on voyait la main du curseur, le clavier ne pouvait
    // rien. On rend donc la ligne focusable et on rejoue le clic sur
    // Entrée / Espace, comme pour un bouton natif.
    // On ne pose PAS `role="button"` sur la ligne : ce rôle
    // remplacerait le rôle `row` et les cellules perdraient leur
    // announces dans la navigation par tableau des lecteurs d'écran.
    // Le contenu de la ligne reste lu normalement, l'activation est
    // exposée via `aria-label` par l'appelant.
    tabIndex={tabIndex ?? (activable ? 0 : undefined)} aria-label={ariaLabel} onKeyDown={(event) => {
            onKeyDown?.(event);
            if (event.defaultPrevented)
                return;
            if (!activable)
                return;
            if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') {
                event.preventDefault();
                onClick?.();
            }
        }} className={cn("border-b border-border/60 last:border-0 transition-colors duration-150 hover:bg-primary/5", activable && "cursor-pointer active:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring", className)}>
      {children}
    </tr>);
};
