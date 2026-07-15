import React from 'react';
import { Target } from 'lucide-react';
import { cn } from '../utils';
import { EmptyState } from './EmptyState';

type Objectif = {
  id: number;
  critere?: { libelle_critere?: string };
  cible_pct: number;
  realise_pct: number | null;
  ecart: number | null;
  statut: 'ATTEINT' | 'EN_RETARD' | 'PAS_DE_DONNEES';
  nb_avis: number;
};

export const ObjectifsProgress = ({ data }: { data: Objectif[] }) => {
  if (!data || data.length === 0) {
    return (
      <EmptyState
        icon={Target}
        title="Aucun objectif défini"
        description="Fixez des objectifs de satisfaction par critère pour savoir si vous êtes sur la bonne trajectoire."
      />
    );
  }

  return (
    <div className="space-y-3 rounded-2xl border border-border/70 bg-card p-5 shadow-premium">
      <h3 className="text-sm font-bold text-foreground">Objectifs — cible vs réalisé</h3>
      <div className="space-y-4 pt-1">
        {data.map((obj) => {
          const label = obj.critere?.libelle_critere || 'Critère';
          const realise = obj.realise_pct ?? 0;
          const cible = obj.cible_pct;
          const color =
            obj.statut === 'ATTEINT' ? 'bg-success' : obj.statut === 'EN_RETARD' ? 'bg-destructive' : 'bg-muted-foreground/40';

          return (
            <div key={obj.id}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="font-medium text-foreground">{label}</span>
                {obj.statut === 'PAS_DE_DONNEES' ? (
                  <span className="text-xs text-muted-foreground">Pas encore de données</span>
                ) : (
                  <span
                    className={cn(
                      'text-xs font-bold',
                      obj.statut === 'ATTEINT' ? 'text-success' : 'text-destructive'
                    )}
                  >
                    {realise}% / {cible}% cible {obj.ecart! >= 0 ? `(+${obj.ecart})` : `(${obj.ecart})`}
                  </span>
                )}
              </div>
              <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={cn('h-full rounded-full transition-all', color)}
                  style={{ width: `${Math.min(100, Math.max(0, realise))}%` }}
                />
                {/* Marqueur de la cible */}
                <div
                  className="absolute top-0 h-full w-0.5 bg-foreground/60"
                  style={{ left: `${Math.min(100, Math.max(0, cible))}%` }}
                  title={`Cible : ${cible}%`}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
