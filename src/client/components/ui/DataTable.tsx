export const DataTable = ({
  headers,
  children,
  maxHeight,
}: {
  headers?: string[];
  children: React.ReactNode;
  /** Hauteur max avec en-tête collant (ex. "60vh") — utile pour les longues listes. */
  maxHeight?: string;
}) => (
  <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
    {/* Bug corrigé : c'est CE wrapper interne qui doit scroller
        horizontalement sur mobile, pas l'extérieur (qui doit garder
        overflow-hidden pour que les coins arrondis restent visibles).
        Avant, il n'y avait aucun scroll possible : sur un petit écran, les
        colonnes (Note, Guichet, Critères, Date...) étaient simplement
        rognées/invisibles hors de la largeur de l'écran. */}
    <div
      className="overflow-x-auto momentum-scroll scroll-fade-x"
      style={maxHeight ? { maxHeight, overflowY: 'auto' } : undefined}
    >
      <table className="w-full min-w-[640px] text-left text-sm">
        {headers && (
          <thead className="sticky top-0 z-10 bg-muted/95 text-muted-foreground uppercase font-semibold text-xs backdrop-blur supports-[backdrop-filter]:bg-muted/80">
            <tr>
              {headers.map((h) => (
                <th key={h} className="whitespace-nowrap px-6 py-3">{h}</th>
              ))}
            </tr>
          </thead>
        )}
        <tbody className="divide-y divide-border">
          {children}
        </tbody>
      </table>
    </div>
  </div>
);

/**
 * Ligne de tableau avec hover cohérent — à utiliser à la place de <tr> brut
 * pour que toutes les listes de l'app réagissent pareil au survol.
 */
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
    className={`border-b border-border last:border-0 transition-colors hover:bg-muted/50 ${
      onClick ? 'cursor-pointer' : ''
    } ${className}`}
  >
    {children}
  </tr>
);
