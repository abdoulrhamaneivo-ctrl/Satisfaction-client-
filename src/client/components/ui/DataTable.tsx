export const DataTable = ({ headers, children }: { headers?: string[]; children: React.ReactNode }) => (
  <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
    {/* Bug corrigé : c'est CE wrapper interne qui doit scroller
        horizontalement sur mobile, pas l'extérieur (qui doit garder
        overflow-hidden pour que les coins arrondis restent visibles).
        Avant, il n'y avait aucun scroll possible : sur un petit écran, les
        colonnes (Note, Guichet, Critères, Date...) étaient simplement
        rognées/invisibles hors de la largeur de l'écran. */}
    <div className="overflow-x-auto momentum-scroll scroll-fade-x">
      <table className="w-full min-w-[640px] text-left text-sm">
        {headers && (
          <thead className="bg-muted/50 text-muted-foreground uppercase font-semibold text-xs">
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
