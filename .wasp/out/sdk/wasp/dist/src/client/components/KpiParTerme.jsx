// src/client/components/KpiParTerme.tsx
// ============================================================================
// Task 3 — KPI par terme : tableau par question, barres motifs/problèmes,
// détail NPS, courbes par terme. Lecture seule d'agrégats serveur
// (getMoyennesParCritere, getRepartitionOptions, getTendanceParCritere) :
// aucun verbatim ne transite ici (répartition sur ids d'options).
//
// Conventions (plan global) : seuil n>=5 → '—' + mention 'base
// insuffisante' (jamais de % sur 2 avis) ; NPS = %promoteurs −
// %détracteurs avec son détail (n, promoteurs/passifs/détracteurs) ;
// mobile = cartes (pas de scroll horizontal à 360px), tableau dès sm
// (desktop inchangé) ; graphiques = role="img" + tableau sr-only
// (même patron que DashboardCharts, vague 4).
// ============================================================================
import React from 'react';
import { useQuery, getMoyennesParCritere, getRepartitionOptions, getTendanceParCritere, } from 'wasp/client/operations';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, } from 'recharts';
import { BarChart3, ListOrdered, TrendingUp } from 'lucide-react';
import { ChartSkeleton } from './DashboardCharts';
import { DataTable, DataTableRow } from './ui/DataTable';
import { EmptyState } from './EmptyState';
/** Mention standard sous le seuil (jamais un chiffre seul ambigu). */
export function mentionBaseInsuffisante(nb) {
    return `base insuffisante (${nb} avis, seuil 5)`;
}
function TableauSrOnly({ legende, entetes, lignes, }) {
    return (<table className="sr-only">
      <caption>{legende}</caption>
      <thead>
        <tr>
          {entetes.map((e) => (<th key={e} scope="col">
              {e}
            </th>))}
        </tr>
      </thead>
      <tbody>
        {lignes.map((l, i) => (<tr key={i}>
            {l.map((c, j) => (<td key={j}>{c}</td>))}
          </tr>))}
      </tbody>
    </table>);
}
const COULEUR_BANDE = ['bg-destructive', 'bg-destructive', 'bg-warning', 'bg-success', 'bg-success'];
/**
 * Tableau par question (critères de SATISFACTION seuls : SMILEY et scorés
 * valencés — TEXTE, choix catégoriels, NPS et CES ont leurs blocs dédiés
 * ou sont exclus des moyennes par construction serveur).
 */
export function TableauQuestions({ criteres }) {
    const lignes = (criteres ?? []).filter((c) => c.kind === 'SATISFACTION');
    if (lignes.length === 0)
        return null;
    return (<div>
      {/* Mobile : cartes (le tableau forcerait un scroll horizontal à 360px). */}
      <ul className="space-y-3 sm:hidden">
        {lignes.map((c) => (<li key={c.id_critere} className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm">
            <p className="text-sm font-bold text-foreground">{c.libelle}</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">{c.nb_avis} avis</p>
            <div className="mt-2 flex items-baseline justify-between gap-2">
              <span className="text-2xl font-bold text-foreground">
                {c.moyenne_sur5 !== null ? `${c.moyenne_sur5}/5` : '—'}
              </span>
              <span className="text-xs font-semibold text-muted-foreground">
                {c.satisfaction_pct !== null ? `${c.satisfaction_pct}% ≥ 4/5` : mentionBaseInsuffisante(c.nb_notables)}
              </span>
            </div>
            {c.nb_notables > 0 && (<div className="mt-2 flex h-1.5 gap-0.5 overflow-hidden rounded-full" aria-hidden>
                {[1, 2, 3, 4, 5].map((n) => (<div key={n} className={COULEUR_BANDE[n - 1]} style={{ width: `${(Number(c.distribution?.[String(n)] ?? 0) / Math.max(c.nb_notables, 1)) * 100}%` }}/>))}
              </div>)}
          </li>))}
      </ul>
      <div className="hidden sm:block">
        <DataTable headers={['Question', 'Avis', 'Moyenne /5', '% ≥ 4/5', 'Répartition 1→5']}>
          {lignes.map((c) => (<DataTableRow key={c.id_critere} aria-label={`${c.libelle}, ${c.moyenne_sur5 ?? 'sans moyenne'}/5 sur ${c.nb_avis} avis`}>
              <td className="max-w-72 px-6 py-4 font-medium text-foreground">{c.libelle}</td>
              <td className="px-6 py-4 text-muted-foreground">{c.nb_avis}</td>
              <td className="px-6 py-4 font-bold text-foreground">
                {c.moyenne_sur5 !== null ? `${c.moyenne_sur5}/5` : <span title={mentionBaseInsuffisante(c.nb_notables)}>—</span>}
              </td>
              <td className="px-6 py-4 text-muted-foreground">
                {c.satisfaction_pct !== null ? `${c.satisfaction_pct}%` : <span title={mentionBaseInsuffisante(c.nb_notables)}>—</span>}
              </td>
              <td className="min-w-40 px-6 py-4">
                <div className="flex h-2 gap-0.5 overflow-hidden rounded-full" aria-hidden>
                  {[1, 2, 3, 4, 5].map((n) => (<div key={n} className={COULEUR_BANDE[n - 1]} title={`${c.distribution?.[String(n)] ?? 0} avis à ${n}/5`} style={{ width: `${(Number(c.distribution?.[String(n)] ?? 0) / Math.max(c.nb_notables, 1)) * 100}%` }}/>))}
                </div>
              </td>
            </DataTableRow>))}
        </DataTable>
      </div>
    </div>);
}
/**
 * Détail NPS d'une question (n, promoteurs/passifs/détracteurs, indice).
 * L'indice vaut '—' sous le seuil, le détail restant affiché.
 */
export function DetailNPS({ ligne }) {
    const d = ligne.nps_detail ?? { volume: 0, promoteurs: 0, passifs: 0, detracteurs: 0 };
    // Français correct : « 1 passif » mais « 4 promoteurs ».
    const pluriel = (n, singulier) => `${n} ${singulier}${n > 1 ? 's' : ''}`;
    return (<div className="rounded-2xl border border-border/80 bg-card/70 p-4">
      <p className="text-sm font-bold text-foreground">{ligne.libelle}</p>
      <div className="mt-1 flex items-baseline gap-3">
        <span className="text-2xl font-bold text-foreground" title={ligne.nps === null ? mentionBaseInsuffisante(d.volume) : '% promoteurs − % détracteurs'}>
          {ligne.nps !== null ? `${ligne.nps >= 0 ? '+' : ''}${ligne.nps}` : '—'}
        </span>
        <span className="text-xs font-semibold text-muted-foreground">
          {d.volume} avis : {pluriel(d.promoteurs, 'promoteur')} · {pluriel(d.passifs, 'passif')} · {pluriel(d.detracteurs, 'détracteur')}
        </span>
      </div>
      {ligne.nps === null && (<p className="mt-1 text-[11px] text-muted-foreground">{mentionBaseInsuffisante(d.volume)}</p>)}
    </div>);
}
/**
 * Barres motifs/problèmes : répartition des choix d'un critère catégoriel
 * (QCM Motif, CASES Problèmes). % = part des AVIS cochant l'option
 * (dénominateur = avis, pas coches) ; '—' sous le seuil, effectifs gardés.
 */
export function BarresRepartition({ idCritere, libelle, nbJours }) {
    const { data, isLoading } = useQuery(getRepartitionOptions, { id_critere: idCritere, nbJours });
    const options = data?.options ?? [];
    const nbAvis = data?.nb_avis ?? 0;
    const max = Math.max(...options.map((o) => o.nb ?? 0), 1);
    return (<div className="rounded-2xl border border-border/80 bg-card/70 p-4">
      <p className="flex items-center gap-2 text-sm font-bold text-foreground">
        <BarChart3 className="size-4 text-secondary" aria-hidden/> {libelle}
      </p>
      <p className="mt-0.5 text-[11px] text-muted-foreground">{nbAvis} avis · % des avis cochant chaque choix</p>
      {isLoading ? (<ChartSkeleton variant="horizontalBar" heightClass="h-32" label={`Chargement de la répartition ${libelle}`}/>) : options.length === 0 || nbAvis === 0 ? (<p className="mt-3 text-xs text-muted-foreground">Aucune réponse sur la période.</p>) : (<div className="mt-3">
          <div role="img" aria-label={`Répartition ${libelle} sur ${nbAvis} avis : ${options
                .map((o) => `${o.libelle} ${o.nb} avis${o.pct !== null ? ` (${o.pct}%)` : ''}`)
                .join(', ')}.`}>
            <ul className="space-y-2">
              {options.map((o) => (<li key={o.option_id}>
                  <div className="flex items-baseline justify-between gap-2 text-xs">
                    <span className="min-w-0 truncate font-semibold text-foreground">{o.libelle}</span>
                    <span className="shrink-0 tabular-nums text-muted-foreground">
                      {o.nb} · {o.pct !== null ? `${o.pct}%` : '—'}
                    </span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted/60">
                    <div className="h-full rounded-full bg-secondary" style={{ width: `${Math.max((o.nb / max) * 100, o.nb > 0 ? 4 : 0)}%` }} title={o.pct !== null ? `${o.pct}% des avis` : mentionBaseInsuffisante(nbAvis)}/>
                  </div>
                </li>))}
            </ul>
          </div>
          <TableauSrOnly legende={`Répartition ${libelle}`} entetes={['Choix', "Nombre d'avis", '% des avis']} lignes={options.map((o) => [o.libelle, o.nb, o.pct !== null ? `${o.pct}%` : 'base insuffisante'])}/>
        </div>)}
    </div>);
}
/**
 * Courbes par terme : moyenne globale mensuelle, NPS mensuel, et courbes
 * par question de satisfaction (3 plus gros volumes — au-delà, illisible
 * au pouce). L'axe part de 1/5 : une courbe démarrant à 0 exagérerait
 * les variations (même convention que TendanceMensuelle).
 */
export function CourbesParTerme({ nbMois }) {
    const { data, isLoading } = useQuery(getTendanceParCritere, { nbMois });
    const points = data?.points ?? [];
    const series = (data?.series ?? []).slice(0, 3);
    const avecNPS = points.some((p) => p.nps !== null && p.nps !== undefined);
    // Recharts : une clé de série par critère (libellé porté par `name`).
    const lignesTermes = points.map((p) => {
        const ligne = { mois: p.libelle };
        for (const s of series) {
            const pt = (s.points ?? []).find((q) => q.cle === p.cle);
            ligne[`s${s.id_critere}`] = pt?.moyenne_sur5 ?? null;
        }
        return ligne;
    });
    const COULEURS_SERIES = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--success))'];
    if (isLoading) {
        return <ChartSkeleton variant="area" heightClass="h-72" label="Chargement des tendances par question"/>;
    }
    if (points.length === 0)
        return null;
    return (<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="h-72 rounded-2xl border border-border/70 bg-card p-5 shadow-premium">
        <h3 className="mb-1 text-sm font-bold text-foreground">Tendance mensuelle — Score moyen / 5</h3>
        <p className="mb-3 text-xs text-muted-foreground">Satisfaction seule, par avis (un avis = une voix)</p>
        <div role="img" aria-label={`Tendance mensuelle du score moyen : ${points
            .map((p) => `${p.libelle} ${p.moyenne_sur5 ?? 'base insuffisante'}/5 (${p.nb_avis} avis)`)
            .join(', ')}.`}>
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
            <AreaChart data={points} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border"/>
              <XAxis dataKey="libelle" tick={{ fontSize: 11 }} className="fill-muted-foreground"/>
              <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fontSize: 11 }} className="fill-muted-foreground"/>
              <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid hsl(var(--border))' }} formatter={(value, _name, item) => [
            value == null ? 'base insuffisante' : `${value}/5`,
            `Score moyen (${item?.payload?.nb_avis ?? 0} avis)`,
        ]}/>
              <Area type="monotone" dataKey="moyenne_sur5" name="Score moyen" stroke="hsl(var(--secondary))" strokeWidth={3} fill="hsl(var(--secondary))" fillOpacity={0.15} connectNulls={false} activeDot={{ r: 6 }}/>
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <TableauSrOnly legende="Score moyen par mois, sur 5" entetes={['Mois', 'Score moyen sur 5', "Nombre d'avis"]} lignes={points.map((p) => [p.libelle, p.moyenne_sur5 ?? 'base insuffisante', p.nb_avis])}/>
      </div>

      {avecNPS && (<div className="h-72 rounded-2xl border border-border/70 bg-card p-5 shadow-premium">
          <h3 className="mb-1 text-sm font-bold text-foreground">NPS mensuel</h3>
          <p className="mb-3 text-xs text-muted-foreground">% promoteurs (9-10) − % détracteurs (0-6)</p>
          <div role="img" aria-label={`NPS mensuel : ${points
                .map((p) => `${p.libelle} ${p.nps ?? 'base insuffisante'} (${p.nps_detail?.volume ?? 0} notes)`)
                .join(', ')}.`}>
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <BarChart data={points} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border"/>
                <XAxis dataKey="libelle" tick={{ fontSize: 11 }} className="fill-muted-foreground"/>
                <YAxis domain={[-100, 100]} tick={{ fontSize: 11 }} className="fill-muted-foreground"/>
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid hsl(var(--border))' }} formatter={(value, _name, item) => [
                value == null ? 'base insuffisante' : `${value >= 0 ? '+' : ''}${value}`,
                `NPS (${item?.payload?.nps_detail?.volume ?? 0} notes)`,
            ]}/>
                <Bar dataKey="nps" name="NPS" radius={[6, 6, 0, 0]}>
                  {points.map((p, i) => (<Cell key={i} fill={(p.nps ?? 0) >= 0 ? 'hsl(var(--success))' : 'hsl(var(--destructive))'}/>))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <TableauSrOnly legende="NPS par mois" entetes={['Mois', 'NPS', 'Promoteurs', 'Passifs', 'Détracteurs']} lignes={points.map((p) => [
                p.libelle,
                p.nps ?? 'base insuffisante',
                p.nps_detail?.promoteurs ?? 0,
                p.nps_detail?.passifs ?? 0,
                p.nps_detail?.detracteurs ?? 0,
            ])}/>
        </div>)}

      {series.length > 0 && (<div className="h-72 rounded-2xl border border-border/70 bg-card p-5 shadow-premium lg:col-span-2">
          <h3 className="mb-1 text-sm font-bold text-foreground">Courbes par question (3 plus gros volumes)</h3>
          <p className="mb-3 text-xs text-muted-foreground">Moyenne /5 par mois et par question — point masqué sous 5 avis</p>
          <div role="img" aria-label={`Courbes par question : ${series.map((s) => s.libelle).join(', ')}.`}>
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <LineChart data={lignesTermes} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border"/>
                <XAxis dataKey="mois" tick={{ fontSize: 11 }} className="fill-muted-foreground"/>
                <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fontSize: 11 }} className="fill-muted-foreground"/>
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid hsl(var(--border))' }} formatter={(value, name) => [value == null ? 'base insuffisante' : `${value}/5`, name]}/>
                <Legend />
                {series.map((s, i) => (<Line key={s.id_critere} type="monotone" dataKey={`s${s.id_critere}`} name={s.libelle.length > 28 ? `${s.libelle.slice(0, 27)}…` : s.libelle} stroke={COULEURS_SERIES[i % COULEURS_SERIES.length]} strokeWidth={2.5} dot={false} connectNulls={false}/>))}
              </LineChart>
            </ResponsiveContainer>
          </div>
          <TableauSrOnly legende="Moyennes mensuelles par question, sur 5" entetes={['Mois', ...series.map((s) => s.libelle)]} lignes={lignesTermes.map((l) => [l.mois, ...series.map((s) => l[`s${s.id_critere}`] ?? 'base insuffisante')])}/>
        </div>)}
    </div>);
}
/**
 * Section composite Task 3 : tableau par question + détail NPS + barres
 * motifs/problèmes + courbes par terme. Une seule section à insérer par
 * page (Dashboard = vue agence, Synthèse = vue réseau pour la Direction).
 */
export function SectionKpiParTerme({ nbJours, nbMois, labelPeriode, }) {
    const { data: moyennes, isLoading } = useQuery(getMoyennesParCritere, { nbJours });
    const criteres = moyennes?.criteres ?? [];
    const lignesNPS = criteres.filter((c) => c.kind === 'NPS' && (c.nps_detail?.volume ?? 0) > 0);
    // Barres motifs/problèmes : critères catégoriels répondus (Motif, Problème
    // spécifique…), plafonnés pour ne pas multiplier les requêtes (1 par bloc).
    const MAX_REPARTITIONS = 4;
    const categoriels = criteres.filter((c) => c.kind === 'CATEGORIEL' && c.nb_avis > 0).slice(0, MAX_REPARTITIONS);
    return (<section aria-label={`KPI par question (${labelPeriode})`}>
      <div className="mb-4 flex items-center gap-2">
        <ListOrdered className="size-5 text-primary-strong"/>
        <h2 className="text-lg font-bold text-foreground font-satoshi">Par question ({labelPeriode})</h2>
      </div>
      {isLoading ? (<ChartSkeleton variant="horizontalBar" heightClass="h-40" label="Chargement des moyennes par question"/>) : criteres.length === 0 ? (<EmptyState icon={ListOrdered} title="Aucune réponse par question" description="Les moyennes par question apparaîtront ici dès que des avis auront été collectés sur la période."/>) : (<div className="space-y-6">
          <TableauQuestions criteres={criteres}/>
          {lignesNPS.length > 0 && (<div>
              <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                <TrendingUp className="size-4" aria-hidden/> Recommandation (NPS)
              </p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {lignesNPS.map((c) => (<DetailNPS key={c.id_critere} ligne={c}/>))}
              </div>
            </div>)}
          {categoriels.length > 0 && (<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {categoriels.map((c) => (<BarresRepartition key={c.id_critere} idCritere={c.id_critere} libelle={c.libelle} nbJours={nbJours}/>))}
            </div>)}
          <CourbesParTerme nbMois={nbMois}/>
        </div>)}
      {criteres.length > 0 && (<p className="mt-3 text-xs text-muted-foreground font-medium">
          Moyennes sur <code>score_normalise</code> seul, questions de satisfaction uniquement — seuil 5 avis
          (« — » = base insuffisante).
        </p>)}
    </section>);
}
//# sourceMappingURL=KpiParTerme.jsx.map