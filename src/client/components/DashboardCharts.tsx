import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  AreaChart,
  Area,
  Legend,
} from 'recharts';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';

// Échelle sémantique universelle pour le CSAT (du rouge très mécontent au vert très satisfait)
const CSAT_COLORS = [
  '#EF4444', // 1 ⭐ : Rouge (Très mécontent)
  '#F97316', // 2 ⭐ : Orange (Mécontent)
  '#F59E0B', // 3 ⭐ : Jaune/Ambre (Neutre)
  '#84CC16', // 4 ⭐ : Vert clair (Satisfait)
  '#10B981', // 5 ⭐ : Vert émeraude (Très satisfait)
];

export const HistogrammeSatisfaction = ({ data }: { data: any[] }) => {
  const normaliserScoreSur5 = (reponse: any): number | null => {
    const type = reponse.critere?.type_reponse;
    if (type === 'TEXTE' || type === 'CASES' || type === 'QCM') return null;
    if (type === 'ECHELLE') {
      const [minBrut, maxBrut] = (reponse.critere?.options_reponse || '1,5').split(',');
      const min = Number(minBrut);
      const max = Number(maxBrut);
      if (Number.isFinite(min) && Number.isFinite(max) && max > min) {
        return Math.max(1, Math.min(5, 1 + ((reponse.score_brut - min) / (max - min)) * 4));
      }
    }
    return reponse.score_brut >= 1 && reponse.score_brut <= 5 ? reponse.score_brut : null;
  };

  const scores = data
    .map(normaliserScoreSur5)
    .filter((score): score is number => score !== null);
  const counts = [1, 2, 3, 4, 5].map((note) => ({
    name: `${note} ⭐`,
    count: scores.filter((score) => Math.round(score) === note).length,
  }));

  if (scores.length === 0) {
    return (
      <div className="flex h-72 items-center justify-center rounded-2xl border border-border/70 bg-card p-5 text-sm text-muted-foreground">
        Aucune réponse chiffrée n’est disponible pour cette répartition.
      </div>
    );
  }

  return (
    <div className="h-72 rounded-2xl border border-border/70 bg-card p-5 shadow-premium">
      <h3 className="mb-1 text-sm font-bold text-foreground">Répartition des notes</h3>
      <p className="mb-3 text-xs text-muted-foreground">Scores normalisés sur 5 — réponses qualitatives exclues</p>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={counts}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
          <XAxis dataKey="name" className="fill-muted-foreground" tick={{ fontSize: 12 }} />
          <YAxis className="fill-muted-foreground" tick={{ fontSize: 12 }} />
          <Tooltip
            contentStyle={{ borderRadius: 12, border: '1px solid hsl(var(--border))' }}
            labelStyle={{ fontWeight: 700 }}
          />
          <Bar dataKey="count" radius={[6, 6, 0, 0]}>
            {counts.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={CSAT_COLORS[index]}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export const RadarQualite = ({ data }: { data: any[] }) => {
  return (
    <div className="h-72 rounded-2xl border border-border/70 bg-card p-5 shadow-premium">
      <h3 className="mb-1 text-sm font-bold text-foreground">Maturité du pilotage</h3>
      <p className="mb-3 text-xs text-muted-foreground">Planification, collecte récente et traitement des alertes</p>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" data={data}>
          <PolarGrid className="stroke-border" />
          <PolarAngleAxis dataKey="subject" className="fill-foreground text-xs font-semibold" />
          <PolarRadiusAxis angle={30} domain={[0, 100]} className="text-[10px]" />
          <Radar
            name="Conformité"
            dataKey="A"
            stroke="#F97316"
            fill="#F97316"
            fillOpacity={0.35}
          />
          <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid hsl(var(--border))' }} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};

// ============================================================================
// Tendance mensuelle (AreaChart avec gradient - Évolution)
// ============================================================================

export const TendanceMensuelle = ({ data }: { data: any[] }) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-72 items-center justify-center rounded-2xl border border-border/70 bg-card p-5 text-sm text-muted-foreground">
        Pas encore assez de données pour afficher la tendance.
      </div>
    );
  }

  return (
    <div className="h-72 rounded-2xl border border-border/70 bg-card p-5 shadow-premium">
      <h3 className="mb-4 text-sm font-bold text-foreground">Tendance mensuelle — Score moyen / 5</h3>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="tendanceGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#F97316" stopOpacity={0.4}/>
              <stop offset="95%" stopColor="#F97316" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
          <XAxis dataKey="mois" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
          <YAxis domain={[0, 5]} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
          <Tooltip
            contentStyle={{ borderRadius: 12, border: '1px solid hsl(var(--border))' }}
            formatter={(value: any) => [`${value}/5`, 'Score moyen']}
          />
          <Legend />
          <Area
            type="monotone"
            dataKey="score_moyen"
            name="Score moyen"
            stroke="#F97316"
            strokeWidth={3}
            fill="url(#tendanceGrad)"
            dot={{ fill: '#F97316', r: 4 }}
            activeDot={{ r: 6 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

// ============================================================================
// Classement des guichets (drill-down "où est le problème")
// ============================================================================
// Volontairement trié du pire score au meilleur (fait côté backend) : sur un
// dashboard de pilotage, on doit repérer les points faibles en priorité.

export const ClassementGuichets = ({ data }: { data: any[] }) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-72 items-center justify-center rounded-2xl border border-border/70 bg-card p-5 text-sm text-muted-foreground">
        Aucune donnée par guichet disponible.
      </div>
    );
  }

  const hauteur = Math.max(288, data.length * 40);

  return (
    <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-premium" style={{ height: hauteur }}>
      <h3 className="mb-1 text-sm font-bold text-foreground">Classement des guichets</h3>
      <p className="mb-3 text-xs text-muted-foreground">Du plus faible au plus performant</p>
      <ResponsiveContainer width="100%" height="88%">
        <BarChart data={data} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-border" />
          <XAxis type="number" domain={[0, 5]} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
          <YAxis type="category" dataKey="nom" width={120} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
          <Tooltip
            contentStyle={{ borderRadius: 12, border: '1px solid hsl(var(--border))' }}
            formatter={(value: any, _name: any, item: any) => [
              `${value}/5 (${item?.payload?.nb_avis ?? 0} avis)`,
              item?.payload?.agence || 'Score moyen',
            ]}
          />
          <Bar dataKey="score_moyen" name="Score moyen" radius={[0, 6, 6, 0]}>
            {data.map((entry, index) => (
              <Cell
                key={`guichet-${index}`}
                fill={
                  entry.score_moyen >= 4.0
                    ? '#10B981'
                    : entry.score_moyen >= 3.0
                    ? '#F59E0B'
                    : '#EF4444'
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

// ============================================================================
// Comparaison agents (BarChart horizontal avec seuils de performance)
// ============================================================================

export const ComparaisonAgents = ({ data }: { data: any[] }) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-2xl border border-border/70 bg-card p-5 text-sm text-muted-foreground">
        Aucune donnée par agent disponible.
      </div>
    );
  }

  return (
    <div className="h-64 rounded-2xl border border-border/70 bg-card p-5 shadow-premium">
      <h3 className="mb-4 text-sm font-bold text-foreground">Scores de satisfaction par agent</h3>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-border" />
          <XAxis type="number" domain={[0, 5]} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
          <YAxis type="category" dataKey="nom" width={110} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
          <Tooltip
            contentStyle={{ borderRadius: 12, border: '1px solid hsl(var(--border))' }}
            formatter={(value: any) => [`${value}/5`, 'Score moyen']}
          />
          <Bar dataKey="score_moyen" name="Score moyen" radius={[0, 6, 6, 0]}>
            {data.map((entry, index) => (
              <Cell
                key={`agent-${index}`}
                fill={
                  entry.score_moyen >= 4.0
                    ? '#10B981' // Vert émeraude : Satisfaisant
                    : entry.score_moyen >= 3.0
                    ? '#F59E0B' // Orange / Ambre : Moyen
                    : '#EF4444' // Rouge : Insuffisant
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
