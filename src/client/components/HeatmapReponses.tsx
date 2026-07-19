import React, { useMemo, useState } from 'react';

type Cellule = {
  jour: number;
  jour_label: string;
  heure: number;
  nb: number;
  score_moyen: number | null;
};

type HeatmapData = {
  nb_jours: number;
  total_avis: number;
  max_nb: number;
  cellules: Cellule[];
};

// Ordre d'affichage Lundi -> Dimanche (plus lisible pour un usage pro que
// l'ordre JS natif Dimanche -> Samedi renvoyé par getDay()).
const ORDRE_JOURS = [1, 2, 3, 4, 5, 6, 0];
const JOURS_ABREGES: Record<number, string> = {
  0: 'Dim',
  1: 'Lun',
  2: 'Mar',
  3: 'Mer',
  4: 'Jeu',
  5: 'Ven',
  6: 'Sam',
};

// Intensité de couleur en fonction du volume relatif d'avis sur le créneau.
// On garde une échelle neutre (primaire) pour le volume — la couleur ne
// préjuge pas de la satisfaction, seulement de l'affluence. Le score moyen
// est affiché séparément dans le tooltip pour ne pas superposer deux
// informations dans une seule teinte.
function intensiteVersOpacite(nb: number, maxNb: number): number {
  if (maxNb <= 0 || nb <= 0) return 0;
  // Racine carrée pour éviter qu'un seul créneau très chargé n'écrase
  // visuellement tous les autres (loi de puissance typique du trafic client).
  return Math.min(1, 0.12 + 0.88 * Math.sqrt(nb / maxNb));
}

function couleurScore(score: number | null): string | null {
  if (score === null) return null;
  if (score < 2.5) return 'var(--destructive, #EF4444)';
  if (score < 3.5) return '#F59E0B';
  return 'var(--success, #10B981)';
}

export const HeatmapReponses = ({ data, isLoading }: { data?: HeatmapData; isLoading?: boolean }) => {
  const [survol, setSurvol] = useState<Cellule | null>(null);

  const grilleParJour = useMemo(() => {
    const map = new Map<number, Cellule[]>();
    for (const jour of ORDRE_JOURS) map.set(jour, []);
    for (const c of data?.cellules ?? []) {
      map.get(c.jour)?.push(c);
    }
    for (const jour of ORDRE_JOURS) {
      map.get(jour)?.sort((a, b) => a.heure - b.heure);
    }
    return map;
  }, [data]);

  if (isLoading) {
    return <div className="h-96 animate-pulse rounded-2xl border border-border/70 bg-card-subtle/50" />;
  }

  if (!data || data.total_avis === 0) {
    return (
      <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-premium">
        <h3 className="mb-2 text-sm font-bold text-foreground">Affluence par jour et heure</h3>
        <p className="text-sm text-muted-foreground">Pas encore assez d'avis sur cette période pour afficher une heatmap.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-premium">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-foreground">Affluence par jour et heure</h3>
          <p className="text-xs text-muted-foreground">
            {data.total_avis} avis sur les {data.nb_jours} derniers jours — couleur = volume, chiffre = note moyenne
          </p>
        </div>
        {survol && (
          <div className="rounded-lg border border-border/70 bg-card-subtle/80 px-3 py-1.5 text-xs">
            <span className="font-semibold text-foreground">
              {survol.jour_label} {String(survol.heure).padStart(2, '0')}h
            </span>{' '}
            <span className="text-muted-foreground">
              — {survol.nb} avis
              {survol.score_moyen !== null ? `, note moyenne ${survol.score_moyen}/5` : ''}
            </span>
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[820px]">
          {/* En-tête des heures */}
          <div className="grid grid-cols-[3rem_repeat(24,minmax(0,1fr))] gap-1">
            <div />
            {Array.from({ length: 24 }, (_, h) => (
              <div key={h} className="text-center text-[10px] text-muted-foreground">
                {h % 3 === 0 ? h : ''}
              </div>
            ))}
          </div>

          {/* Lignes jour x heure */}
          <div className="mt-1 flex flex-col gap-1">
            {ORDRE_JOURS.map((jour) => (
              <div key={jour} className="grid grid-cols-[3rem_repeat(24,minmax(0,1fr))] items-center gap-1">
                <div className="text-xs font-semibold text-foreground">{JOURS_ABREGES[jour]}</div>
                {(grilleParJour.get(jour) ?? []).map((cellule) => {
                  const opacite = intensiteVersOpacite(cellule.nb, data.max_nb);
                  const couleur = couleurScore(cellule.score_moyen);
                  return (
                    <button
                      key={`${cellule.jour}-${cellule.heure}`}
                      type="button"
                      onMouseEnter={() => setSurvol(cellule)}
                      onFocus={() => setSurvol(cellule)}
                      onMouseLeave={() => setSurvol((s) => (s === cellule ? null : s))}
                      className="aspect-square w-full rounded-[4px] border border-border/40 transition-transform hover:scale-110 hover:z-10"
                      style={{
                        backgroundColor:
                          cellule.nb > 0 && couleur
                            ? couleur
                            : 'var(--muted, #E5E7EB)',
                        opacity: cellule.nb > 0 ? opacite : 0.25,
                      }}
                      aria-label={`${cellule.jour_label} ${cellule.heure}h : ${cellule.nb} avis`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4 text-[11px] text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <span className="inline-block size-3 rounded-[3px]" style={{ backgroundColor: 'var(--success, #10B981)' }} />
          Note moyenne ≥ 3.5
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block size-3 rounded-[3px]" style={{ backgroundColor: '#F59E0B' }} />
          Note moyenne 2.5 – 3.5
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block size-3 rounded-[3px]" style={{ backgroundColor: 'var(--destructive, #EF4444)' }} />
          Note moyenne &lt; 2.5
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block size-3 rounded-[3px] opacity-25" style={{ backgroundColor: 'var(--muted, #E5E7EB)' }} />
          Aucun avis
        </div>
        <div className="ml-auto">Intensité de la couleur = volume d'avis sur le créneau</div>
      </div>
    </div>
  );
};
