import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, AreaChart, Area, Legend, } from 'recharts';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';
import { Skeleton } from './ui/skeleton';
import { cn } from '../utils';
function ChartSkeletonBars({ variant }) {
    if (variant === 'radar') {
        return (<div className="flex flex-1 items-center justify-center">
        <Skeleton className="size-44 rounded-full border border-brand-green-deep/10"/>
      </div>);
    }
    if (variant === 'area') {
        return (<div className="relative flex flex-1 flex-col justify-end gap-2 pt-6">
        <Skeleton className="absolute inset-x-0 bottom-8 h-px bg-brand-green-deep/20"/>
        <div className="flex h-full items-end justify-between gap-2 px-2">
          {[42, 58, 48, 72, 55, 68, 50, 62].map((h, i) => (<Skeleton key={i} className="w-full rounded-t-md bg-gradient-to-t from-brand-green-deep/25 to-primary/15" style={{ height: `${h}%` }}/>))}
        </div>
      </div>);
    }
    if (variant === 'horizontalBar') {
        return (<div className="flex flex-1 flex-col justify-center gap-3 py-2">
        {[88, 72, 56, 44, 32].map((w, i) => (<div key={i} className="flex items-center gap-3">
            <Skeleton className="h-3 w-16 shrink-0 rounded-md"/>
            <Skeleton className="h-5 rounded-md bg-gradient-to-r from-brand-green-deep/20 to-primary/15" style={{ width: `${w}%` }}/>
          </div>))}
      </div>);
    }
    if (variant === 'heatmap') {
        return (<div className="grid flex-1 grid-cols-7 gap-1.5 pt-2">
        {Array.from({ length: 42 }).map((_, i) => (<Skeleton key={i} className={cn('aspect-square rounded-sm', i % 5 === 0 ? 'bg-primary/20' : 'bg-brand-green-deep/15')}/>))}
      </div>);
    }
    return (<div className="flex flex-1 items-end justify-between gap-3 px-2 pb-2">
      {[55, 78, 42, 90, 65].map((h, i) => (<Skeleton key={i} className="w-full rounded-t-lg bg-gradient-to-t from-brand-green-deep/25 to-primary/15" style={{ height: `${h}%` }}/>))}
    </div>);
}
export function ChartSkeleton({ variant = 'bar', subtitle, className, heightClass = 'h-72', label = 'Chargement du graphique en cours', }) {
    return (<div role="status" aria-live="polite" aria-busy="true" aria-label={label} className={cn('flex flex-col rounded-2xl border border-border/70 bg-card p-5 shadow-premium', heightClass, className)}>
      <span className="sr-only">{label}</span>
      <Skeleton className="mb-2 h-4 w-40 rounded-md"/>
      {subtitle !== undefined ? (<Skeleton className="mb-4 h-3 w-56 rounded-md opacity-80"/>) : (<div className="mb-4"/>)}
      <ChartSkeletonBars variant={variant}/>
    </div>);
}
export const HistogrammeSatisfactionSkeleton = () => (<ChartSkeleton variant="bar" subtitle="" label="Chargement de la répartition des notes"/>);
export const RadarQualiteSkeleton = () => (<ChartSkeleton variant="radar" label="Chargement du radar de maturité"/>);
export const TendanceMensuelleSkeleton = () => (<ChartSkeleton variant="area" label="Chargement de la tendance mensuelle"/>);
export const ClassementGuichetsSkeleton = () => (<ChartSkeleton variant="horizontalBar" heightClass="min-h-72" label="Chargement du classement des guichets"/>);
export const ComparaisonAgentsSkeleton = () => (<ChartSkeleton variant="horizontalBar" heightClass="h-64" label="Chargement de la comparaison des agents"/>);
export const HeatmapReponsesSkeleton = () => (<ChartSkeleton variant="heatmap" heightClass="h-96" label="Chargement de la heatmap d'affluence"/>);
// Échelle sémantique universelle pour le CSAT (du rouge très mécontent au vert très satisfait)
// Utilise les tokens CSS du design system pour rester cohérent avec la charte.
const CSAT_COLORS = [
    'hsl(var(--destructive))', // 1 ⭐ : Rouge (Très mécontent)
    'hsl(36 80% 50%)', // 2 ⭐ : Orange postal (Mécontent)
    'hsl(var(--warning))', // 3 ⭐ : Jaune Or (Neutre)
    'hsl(100 45% 48%)', // 4 ⭐ : Vert clair (Satisfait)
    'hsl(var(--success))', // 5 ⭐ : Vert succès (Très satisfait)
];
export const HistogrammeSatisfaction = ({ data }) => {
    const normaliserScoreSur5 = (reponse) => {
        const type = reponse.critere?.type_reponse;
        if (type === 'TEXTE' || type === 'CASES' || type === 'QCM')
            return null;
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
        .filter((score) => score !== null);
    const counts = [1, 2, 3, 4, 5].map((note) => ({
        name: `${note} ⭐`,
        count: scores.filter((score) => Math.round(score) === note).length,
    }));
    if (scores.length === 0) {
        return (<div className="flex h-72 items-center justify-center rounded-2xl border border-border/70 bg-card p-5 text-sm text-muted-foreground">
        Aucune réponse chiffrée n’est disponible pour cette répartition.
      </div>);
    }
    return (<div className="h-72 rounded-2xl border border-border/70 bg-card p-5 shadow-premium">
      <h3 className="mb-1 text-sm font-bold text-foreground">Répartition des notes</h3>
      <p className="mb-3 text-xs text-muted-foreground">Scores normalisés sur 5 — réponses qualitatives exclues</p>
      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
        <BarChart data={counts}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border"/>
          <XAxis dataKey="name" className="fill-muted-foreground" tick={{ fontSize: 12 }}/>
          <YAxis className="fill-muted-foreground" tick={{ fontSize: 12 }}/>
          <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid hsl(var(--border))' }} labelStyle={{ fontWeight: 700 }}/>
          <Bar dataKey="count" radius={[6, 6, 0, 0]}>
            {counts.map((_entry, index) => (<Cell key={`cell-${index}`} fill={CSAT_COLORS[index]}/>))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>);
};
export const RadarQualite = ({ data }) => {
    return (<div className="h-72 rounded-2xl border border-border/70 bg-card p-5 shadow-premium">
      <h3 className="mb-1 text-sm font-bold text-foreground">Maturité du pilotage</h3>
      <p className="mb-3 text-xs text-muted-foreground">Planification, collecte récente et traitement des alertes</p>
      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
        <RadarChart cx="50%" cy="50%" data={data}>
          <PolarGrid className="stroke-border"/>
          <PolarAngleAxis dataKey="subject" className="fill-foreground text-xs font-semibold"/>
          <PolarRadiusAxis angle={30} domain={[0, 100]} className="text-[10px]"/>
          <Radar name="Conformité" dataKey="A" stroke="hsl(var(--secondary))" fill="hsl(var(--secondary))" fillOpacity={0.35}/>
          <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid hsl(var(--border))' }}/>
        </RadarChart>
      </ResponsiveContainer>
    </div>);
};
// ============================================================================
// Tendance mensuelle (AreaChart avec gradient - Évolution)
// ============================================================================
export const TendanceMensuelle = ({ data }) => {
    if (!data || data.length === 0) {
        return (<div className="flex h-72 items-center justify-center rounded-2xl border border-border/70 bg-card p-5 text-sm text-muted-foreground">
        Pas encore assez de données pour afficher la tendance.
      </div>);
    }
    return (<div className="h-72 rounded-2xl border border-border/70 bg-card p-5 shadow-premium">
      <h3 className="mb-1 text-sm font-bold text-foreground">Tendance mensuelle — Score moyen / 5</h3>
      <p className="mb-3 text-xs text-muted-foreground">
        {data.length >= 2 ? ((() => {
            const dernier = data[data.length - 1];
            const precedent = data[data.length - 2];
            const delta = parseFloat((dernier.score_moyen - precedent.score_moyen).toFixed(2));
            if (delta > 0)
                return <span className="font-semibold text-success">↗ En hausse de {delta} pt ce mois-ci ({dernier.nb_avis} avis)</span>;
            if (delta < 0)
                return <span className="font-semibold text-destructive">↘ En baisse de {Math.abs(delta)} pt ce mois-ci ({dernier.nb_avis} avis)</span>;
            return <span>Stable par rapport au mois précédent ({dernier.nb_avis} avis)</span>;
        })()) : ('Évolution du score moyen des avis, mois par mois')}
      </p>
      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
        <AreaChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id="tendanceGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--secondary))" stopOpacity={0.4}/>
              <stop offset="95%" stopColor="hsl(var(--secondary))" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border"/>
          <XAxis dataKey="mois" tick={{ fontSize: 11 }} className="fill-muted-foreground"/>
          {/* L'axe commence à la note minimale possible (1/5) : une courbe qui
            démarre à 0 exagérait visuellement les variations. */}
          <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fontSize: 11 }} className="fill-muted-foreground"/>
          <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid hsl(var(--border))' }} formatter={(value, _name, item) => [`${value}/5`, `Score moyen (${item?.payload?.nb_avis ?? 0} avis)`]}/>
          <Legend />
          <Area type="monotone" dataKey="score_moyen" name="Score moyen" stroke="hsl(var(--secondary))" strokeWidth={3} fill="url(#tendanceGrad)" dot={(props) => {
            // Chaque point est coloré selon le niveau de satisfaction :
            // vert ≥ 4 (bien), jaune ≥ 3 (moyen), rouge < 3 (problème).
            const { cx, cy, payload, index } = props;
            const fill = payload.score_moyen >= 4 ? 'hsl(var(--success))'
                : payload.score_moyen >= 3 ? 'hsl(var(--warning))'
                    : 'hsl(var(--destructive))';
            return <circle key={`dot-${index}`} cx={cx} cy={cy} r={4} fill={fill}/>;
        }} activeDot={{ r: 6 }}/>
        </AreaChart>
      </ResponsiveContainer>
    </div>);
};
// ============================================================================
// Classement des guichets (drill-down "où est le problème")
// ============================================================================
// Volontairement trié du pire score au meilleur (fait côté backend) : sur un
// dashboard de pilotage, on doit repérer les points faibles en priorité.
export const ClassementGuichets = ({ data }) => {
    if (!data || data.length === 0) {
        return (<div className="flex h-72 items-center justify-center rounded-2xl border border-border/70 bg-card p-5 text-sm text-muted-foreground">
        Aucune donnée par guichet disponible.
      </div>);
    }
    const hauteur = Math.max(288, data.length * 40);
    return (<div className="rounded-2xl border border-border/70 bg-card p-5 shadow-premium" style={{ height: hauteur }}>
      <h3 className="mb-1 text-sm font-bold text-foreground">Classement des guichets</h3>
      <p className="mb-3 text-xs text-muted-foreground">Du plus faible au plus performant</p>
      <ResponsiveContainer width="100%" height="88%" minWidth={0} minHeight={0}>
        <BarChart data={data} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-border"/>
          <XAxis type="number" domain={[0, 5]} tick={{ fontSize: 11 }} className="fill-muted-foreground"/>
          <YAxis type="category" dataKey="nom" width={120} tick={{ fontSize: 11 }} className="fill-muted-foreground"/>
          <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid hsl(var(--border))' }} formatter={(value, _name, item) => [
            `${value}/5 (${item?.payload?.nb_avis ?? 0} avis)`,
            item?.payload?.agence || 'Score moyen',
        ]}/>
          <Bar dataKey="score_moyen" name="Score moyen" radius={[0, 6, 6, 0]}>
            {data.map((entry, index) => (<Cell key={`guichet-${index}`} fill={entry.score_moyen >= 4.0
                ? 'hsl(var(--success))'
                : entry.score_moyen >= 3.0
                    ? 'hsl(var(--warning))'
                    : 'hsl(var(--destructive))'}/>))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>);
};
// ============================================================================
// Comparaison agents (BarChart horizontal avec seuils de performance)
// ============================================================================
export const ComparaisonAgents = ({ data }) => {
    if (!data || data.length === 0) {
        return (<div className="flex h-64 items-center justify-center rounded-2xl border border-border/70 bg-card p-5 text-sm text-muted-foreground">
        Aucune donnée par agent disponible.
      </div>);
    }
    return (<div className="h-64 rounded-2xl border border-border/70 bg-card p-5 shadow-premium">
      <h3 className="mb-4 text-sm font-bold text-foreground">Scores de satisfaction par agent</h3>
      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
        <BarChart data={data} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-border"/>
          <XAxis type="number" domain={[0, 5]} tick={{ fontSize: 11 }} className="fill-muted-foreground"/>
          <YAxis type="category" dataKey="nom" width={110} tick={{ fontSize: 11 }} className="fill-muted-foreground"/>
          <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid hsl(var(--border))' }} formatter={(value) => [`${value}/5`, 'Score moyen']}/>
          <Bar dataKey="score_moyen" name="Score moyen" radius={[0, 6, 6, 0]}>
            {data.map((entry, index) => (<Cell key={`agent-${index}`} fill={entry.score_moyen >= 4.0
                ? 'hsl(var(--success))'
                : entry.score_moyen >= 3.0
                    ? 'hsl(var(--warning))'
                    : 'hsl(var(--destructive))'}/>))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>);
};
