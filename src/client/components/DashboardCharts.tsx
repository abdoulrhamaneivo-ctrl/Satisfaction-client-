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
  LineChart,
  Line,
  Legend,
} from 'recharts';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';

export const HistogrammeSatisfaction = ({ data }: { data: any[] }) => {
  const counts = [1, 2, 3, 4, 5].map((note) => ({
    name: `${note} ⭐`,
    count: data.filter((r) => r.score_brut === note).length,
  }));

  return (
    <div className="h-72 rounded-2xl border border-border/70 bg-card p-5 shadow-premium">
      <h3 className="mb-4 text-sm font-bold text-foreground">Répartition des notes</h3>
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
                fill={
                  index === 0
                    ? 'hsl(var(--destructive))'
                    : index === 1
                    ? 'hsl(var(--warning))'
                    : index === counts.length - 1
                    ? 'hsl(var(--primary))'
                    : 'hsl(var(--muted-foreground))'
                }
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
      <h3 className="mb-4 text-sm font-bold text-foreground">Index de Conformité (5 Axes)</h3>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" data={data}>
          <PolarGrid className="stroke-border" />
          <PolarAngleAxis dataKey="subject" className="fill-foreground text-xs font-semibold" />
          <PolarRadiusAxis angle={30} domain={[0, 100]} className="text-[10px]" />
          <Radar
            name="Conformité"
            dataKey="A"
            stroke="hsl(var(--primary))"
            fill="hsl(var(--primary))"
            fillOpacity={0.3}
          />
          <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid hsl(var(--border))' }} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};

// ============================================================================
// Tendance mensuelle (LineChart — Module 3 : courbe d'évolution)
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
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
          <XAxis dataKey="mois" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
          <YAxis domain={[0, 5]} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
          <Tooltip
            contentStyle={{ borderRadius: 12, border: '1px solid hsl(var(--border))' }}
            formatter={(value: any) => [`${value}/5`, 'Score moyen']}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="score_moyen"
            name="Score moyen"
            stroke="hsl(var(--primary))"
            strokeWidth={2.5}
            dot={{ fill: 'hsl(var(--primary))', r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

// ============================================================================
// Comparaison agents (BarChart horizontal — Module 3 : vue par agent)
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
      <h3 className="mb-4 text-sm font-bold text-foreground">Scores par agent</h3>
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
                  entry.score_moyen >= 4
                    ? 'hsl(var(--primary))'
                    : entry.score_moyen >= 3
                    ? 'hsl(var(--warning))'
                    : 'hsl(var(--destructive))'
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
