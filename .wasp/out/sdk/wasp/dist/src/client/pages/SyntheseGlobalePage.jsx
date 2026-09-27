// src/client/pages/SyntheseGlobalePage.tsx
// ============================================================================
// SYNTHÈSE GLOBALE D'EXPÉRIENCE CLIENT (vague 1, Phase K)
// L'IA ne mesure rien : elle verbalise les agrégats déterministes calculés
// par le moteur global. La page affiche le résumé exécutif, les irritants
// priorisés (calcul déterministe), les tendances/anomalies/priorités, et
// TOUJOURS les limites + le volume analysé (aucune synthèse sans contexte).
// ============================================================================
import React, { useMemo, useState } from 'react';
import { useQuery } from 'wasp/client/operations';
import { getAnalysesGlobales, declencherAnalyseGlobale, getObjectifsParAgence, } from 'wasp/client/operations';
import { useAuth } from 'wasp/client/auth';
import { Sparkles, Loader2, RefreshCw, AlertTriangle, CheckCircle2, ThumbsUp, ThumbsDown, TrendingUp, ListOrdered, Info, CalendarDays, Users, Target, Gauge, } from 'lucide-react';
import { RequireAuth } from '../components/RequireAuth';
import { RequireEnterpriseRole } from '../components/RequireEnterpriseRole';
import { AmbientBackground } from '../components/AmbientBackground';
import { PageShell, PageTopNav } from '../components/PageShell';
import { PageHeader } from '../components/PageHeader';
import { EmptyState } from '../components/EmptyState';
import { Reveal } from '../components/ds';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from '../components/ui/select';
import { useToast } from '../hooks/use-toast';
// ---------- Helpers purs (testables) ----------
/**
 * Lecture du NPS persisté : l'objet agrégé `{nps, promoteurs, passifs,
 * detracteurs, volume}` (jamais `Number(objet)` → NaN, bug corrigé le
 * 2026-09-27), avec repli sur un scalaire historique éventuel.
 */
export function lireNpsValeur(indicateurs) {
    const objet = indicateurs?.nps != null && typeof indicateurs.nps === 'object' ? indicateurs.nps : null;
    if (objet != null && typeof objet.nps === 'number')
        return objet.nps;
    if (typeof indicateurs?.nps === 'number')
        return indicateurs.nps;
    return null;
}
/** Ventilation promoteurs/passifs/détracteurs, ou `undefined` si indisponible. */
export function lireNpsDetail(indicateurs) {
    const objet = indicateurs?.nps != null && typeof indicateurs.nps === 'object' ? indicateurs.nps : null;
    if (objet == null || (objet.volume ?? 0) <= 0)
        return undefined;
    return `${objet.promoteurs ?? 0} promoteurs · ${objet.passifs ?? 0} passifs · ${objet.detracteurs ?? 0} détracteurs (${objet.volume} notes)`;
}
export function parseJson(brut, defaut) {
    if (!brut)
        return defaut;
    try {
        const v = JSON.parse(brut);
        return (v ?? defaut);
    }
    catch {
        return defaut;
    }
}
export function libellePeriode(ligne) {
    const debut = new Date(ligne.debut);
    const fin = new Date(ligne.fin);
    const d = debut.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
    const f = fin.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
    return ligne.periode === 'SEMAINE' ? `Semaine ${d} → ${f}` : `Mois ${f}`;
}
const CONFIANCE_STYLE = {
    ELEVEE: 'bg-success/10 text-success',
    MOYENNE: 'bg-warning/10 text-warning',
    FAIBLE: 'bg-muted text-muted-foreground',
};
function badgeConfiance(v) {
    const val = v || 'FAIBLE';
    return (<span className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${CONFIANCE_STYLE[val] ?? CONFIANCE_STYLE.FAIBLE}`}>
      confiance {val.toLowerCase()}
    </span>);
}
function ListeBulles({ titre, items, icon: Icon, tone }) {
    if (items.length === 0)
        return null;
    return (<div className="rounded-2xl border border-border/80 bg-card/70 p-4">
      <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
        <Icon className={`size-4 ${tone}`} aria-hidden/> {titre}
      </p>
      <ul className="space-y-1.5">
        {items.map((t, i) => (<li key={i} className="flex gap-2 text-sm leading-6 text-foreground">
            <span className="mt-2 size-1.5 shrink-0 rounded-full bg-current opacity-40" aria-hidden/>
            {t}
          </li>))}
      </ul>
    </div>);
}
// ---------- Page ----------
/**
 * Intervalle de rafraîchissement de la liste des analyses.
 *
 * TanStack Query v4 : le 1er argument est la DONNÉE (TData | undefined), pas
 * la query. La forme v5 `(q) => q.state.data…` lève `TypeError` au montage
 * (données encore `undefined`) → page blanche /synthese, attrapée par le
 * routeur. Testé ci-dessous : toute réintroduction de `q.state` doit faire
 * échouer `SyntheseGlobalePage.test.ts`.
 */
export function intervalleActualisationSynthese(donnees) {
    return Array.isArray(donnees) && donnees.some((a) => a?.status === 'PENDING')
        ? 5000
        : false;
}
export const SyntheseGlobalePage = () => {
    const { data: user } = useAuth();
    const { toast } = useToast();
    const estDirection = user?.role === 'DIRECTION';
    const [periode, setPeriode] = useState('SEMAINE');
    const [selection, setSelection] = useState(null);
    const [declenchement, setDeclenchement] = useState(false);
    const { data: analyses, isLoading, refetch } = useQuery(getAnalysesGlobales, { periode }, 
    // Rafraîchissement tant qu'une analyse est en file (job PgBoss).
    { refetchInterval: intervalleActualisationSynthese });
    const lignes = useMemo(() => analyses ?? [], [analyses]);
    const courante = useMemo(() => {
        const trouvee = selection ? lignes.find((l) => String(l.id) === selection) : undefined;
        return trouvee ?? lignes[0] ?? null;
    }, [lignes, selection]);
    const indicateurs = parseJson(courante?.indicateurs, null);
    const snapshotCES = indicateurs?.ces ?? null;
    const npsValeur = lireNpsValeur(indicateurs);
    const npsDetail = lireNpsDetail(indicateurs);
    // Richesse qualitative + ventilation : absents des snapshots antérieurs
    // au 2026-09-27 → gardes `??` systématiques, jamais de crash sur l'ancien.
    const richesse = indicateurs?.richesse ?? null;
    const ventilation = indicateurs?.ventilation ?? {};
    const ventilationAgences = ventilation.parAgence ?? [];
    const ventilationServices = ventilation.parService ?? [];
    const guichetsTop = ventilation.guichetsTop ?? [];
    const guichetsFlop = ventilation.guichetsFlop ?? [];
    const snapshot = parseJson(courante?.datasetSnapshot, null);
    const pointsPositifs = parseJson(courante?.pointsPositifs, []);
    const pointsNegatifs = parseJson(courante?.pointsNegatifs, []);
    const irritants = parseJson(courante?.irritants, []);
    const tendances = parseJson(courante?.tendances, []);
    const anomalies = parseJson(courante?.anomalies, []);
    const priorites = parseJson(courante?.priorites, []);
    const limites = parseJson(courante?.limites, []);
    // Objectifs par agence : requête DIRECTION seule (403 sinon) — on ne
    // l'appelle que pour la Direction, et la section est masquée aux autres.
    const { data: objectifsParAgence } = useQuery(getObjectifsParAgence, undefined, { enabled: estDirection });
    const lancerAnalyse = async () => {
        setDeclenchement(true);
        try {
            const r = await declencherAnalyseGlobale({ periode });
            if (r?.dejaExistante) {
                toast({
                    variant: 'success',
                    title: 'Analyse déjà disponible',
                    description: 'Une synthèse existe déjà pour cette période — affichage en cours.',
                });
            }
            else {
                toast({
                    variant: 'success',
                    title: 'Analyse mise en file',
                    description: 'La synthèse sera calculée sous peu (actualisation automatique).',
                });
            }
            setSelection(null);
            refetch();
        }
        catch (e) {
            toast({ variant: 'destructive', title: 'Déclenchement impossible', description: e?.message || 'Erreur inconnue' });
        }
        finally {
            setDeclenchement(false);
        }
    };
    return (<RequireEnterpriseRole>
      <RequireAuth>
        <AmbientBackground>
          <PageShell>
            <PageTopNav racine="Direction" agence={user?.agence?.nom_agence || 'Toutes les agences'} actuel="Synthèse globale" onglets={[
            { label: 'Tableau synthétique', to: '/dashboard' },
            { label: 'Synthèse IA', to: '/synthese' },
            { label: 'Avis & CSAT', to: '/avis' },
        ]}/>

            <Reveal direction="down">
              <PageHeader icon={Sparkles} eyebrow="Expérience client" title="Synthèse globale" description="Lecture consolidée de toutes les agences : CSAT, NPS, irritants récurrents et priorités. L'IA ne mesure rien — tous les chiffres proviennent du calcul déterministe, et chaque limite est affichée." actions={<div className="flex items-center gap-2 flex-wrap">
                    <Select value={periode} onValueChange={(v) => { setPeriode(v); setSelection(null); }}>
                      <SelectTrigger className="h-10 w-40 rounded-xl border-border/80 bg-card/80 font-semibold shadow-sm" aria-label="Période analysée">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="SEMAINE">Semaine</SelectItem>
                        <SelectItem value="MOIS">Mois</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="outline" onClick={() => refetch()} disabled={isLoading} className="h-10 rounded-xl border-border/80 font-bold">
                      <RefreshCw className={`size-4 ${isLoading ? 'animate-spin' : ''}`}/>
                      Actualiser
                    </Button>
                    {estDirection && (<Button onClick={lancerAnalyse} disabled={declenchement} className="h-10 rounded-xl font-bold">
                        {declenchement ? <Loader2 className="size-4 animate-spin"/> : <Sparkles className="size-4"/>}
                        Analyser
                      </Button>)}
                  </div>}/>
            </Reveal>

            {isLoading && (<div className="grid gap-4 lg:grid-cols-3">
                {[0, 1, 2].map((i) => (<Skeleton key={i} className="h-32 rounded-2xl"/>))}
              </div>)}

            {!isLoading && lignes.length > 0 && (<Reveal>
                <div className="mb-6 flex flex-wrap gap-2">
                  {lignes.map((l) => (<button key={String(l.id)} type="button" onClick={() => setSelection(String(l.id))} className={`rounded-xl border px-3 py-2 text-left text-xs font-semibold transition ${String(courante?.id) === String(l.id)
                    ? 'border-primary/50 bg-primary/10 text-primary'
                    : 'border-border/80 bg-card/60 text-muted-foreground hover:bg-accent/50'}`}>
                      <span className="block">{libellePeriode(l)}</span>
                      <span className="block text-[10px] font-bold uppercase">
                        {l.status === 'DONE' ? 'Publiée' : l.status === 'PENDING' ? 'En cours…' : 'Échec'}
                      </span>
                    </button>))}
                </div>
              </Reveal>)}

            {!isLoading && !courante && (<EmptyState icon={Sparkles} title="Aucune synthèse pour le moment" description={estDirection
                ? 'Lancez une analyse : elle est calculée en tâche de fond (le lundi à 6h automatiquement).'
                : 'La direction déclenche les synthèses ; revenez après la prochaine publication hebdomadaire.'} action={estDirection ? <Button onClick={lancerAnalyse} disabled={declenchement} className="rounded-xl font-bold"><Sparkles className="size-4"/> Lancer l'analyse</Button> : undefined} className="py-16"/>)}

            {courante && (<div className="space-y-6">
                {courante.status === 'PENDING' && (<div className="flex items-center gap-3 rounded-2xl border border-info/30 bg-info/5 p-4 text-sm text-info">
                    <Loader2 className="size-5 animate-spin" aria-hidden/>
                    Synthèse en cours de calcul (actualisation automatique toutes les 5 s).
                  </div>)}
                {courante.status === 'FAILED' && (<div className="flex items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                    <AlertTriangle className="mt-0.5 size-5 shrink-0" aria-hidden/>
                    <span>Échec de la synthèse : {courante.error || 'cause inconnue'}. Les chiffres ci-dessous restent valables.</span>
                  </div>)}

                {/* Chiffres déterministes */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                { label: 'CSAT', valeur: indicateurs?.csat != null ? `${Number(indicateurs.csat).toFixed(1)}%` : 'N/A', icon: Target },
                {
                    label: 'NPS',
                    valeur: npsValeur != null ? `${npsValeur >= 0 ? '+' : ''}${Math.round(npsValeur)}` : 'N/A',
                    detail: npsDetail,
                    icon: TrendingUp,
                },
                { label: 'CES moyen', valeur: snapshotCES && snapshotCES.note_moyenne != null ? `${snapshotCES.note_moyenne}/${snapshotCES.echelle}` : 'non mesuré', icon: Gauge },
                { label: 'Avis analysés', valeur: snapshot?.volumeAvis != null ? String(snapshot.volumeAvis) : String(courante.volumeAvis ?? 0), icon: Users },
                { label: 'Qualité technique', valeur: courante.qualiteDonnees != null ? `${Math.round(Number(courante.qualiteDonnees))}/100` : 'N/A', icon: CheckCircle2 },
                {
                    label: 'Richesse qualitative',
                    valeur: richesse?.score != null ? `${Math.round(Number(richesse.score))}/100` : 'N/A',
                    detail: richesse?.details != null
                        ? `${richesse.details.commentaires ?? 0} % d'avis commentés · ${richesse.details.substantiels ?? 0} % de verbatims substantiels`
                        : undefined,
                    icon: Info,
                },
            ].map((k) => (<div key={k.label} className="rounded-2xl border border-border/80 bg-card/70 p-4">
                      <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                        <k.icon className="size-4" aria-hidden/> {k.label}
                      </p>
                      <p className="mt-2 text-2xl font-bold text-foreground">{k.valeur}</p>
                      {k.detail != null && (<p className="mt-1 text-[11px] leading-5 text-muted-foreground">{k.detail}</p>)}
                    </div>))}
                </div>

                {/* Ventilation déterministe (mêmes objets que le dashboard live, figés pour la période) */}
                {(ventilationAgences.length > 0 || ventilationServices.length > 0 || guichetsTop.length > 0 || guichetsFlop.length > 0) && (<Reveal>
                    <div className="rounded-2xl border border-border/80 bg-card/70 p-5">
                      <p className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                        <Users className="size-4" aria-hidden/> Ventilation — CSAT par segment (un avis = une voix)
                      </p>
                      <div className="grid gap-4 md:grid-cols-2">
                        {ventilationAgences.length > 0 && (<div>
                            <p className="mb-1 text-[11px] font-bold uppercase text-muted-foreground">Agences</p>
                            <ul className="space-y-1 text-sm">
                              {ventilationAgences.map((a) => (<li key={a.id} className="flex justify-between gap-2">
                                  <span className="truncate text-foreground">{a.nom}</span>
                                  <span className="shrink-0 font-bold text-foreground">
                                    {a.csat != null ? `${a.csat}/100` : '—'}
                                    <span className="ml-1 text-[11px] font-semibold text-muted-foreground">({a.volume} avis)</span>
                                  </span>
                                </li>))}
                            </ul>
                          </div>)}
                        {ventilationServices.length > 0 && (<div>
                            <p className="mb-1 text-[11px] font-bold uppercase text-muted-foreground">Opérations</p>
                            <ul className="space-y-1 text-sm">
                              {ventilationServices.map((s, i) => (<li key={s.id ?? `service-${i}`} className="flex justify-between gap-2">
                                  <span className="truncate text-foreground">{s.nom}</span>
                                  <span className="shrink-0 font-bold text-foreground">
                                    {s.csat != null ? `${s.csat}/100` : '—'}
                                    <span className="ml-1 text-[11px] font-semibold text-muted-foreground">({s.volume} avis)</span>
                                  </span>
                                </li>))}
                            </ul>
                          </div>)}
                        {guichetsTop.length > 0 && (<div>
                            <p className="mb-1 text-[11px] font-bold uppercase text-muted-foreground">Guichets — meilleurs (≥ 5 avis)</p>
                            <ul className="space-y-1 text-sm">
                              {guichetsTop.map((g) => (<li key={g.id} className="flex justify-between gap-2">
                                  <span className="truncate text-foreground">{g.nom}</span>
                                  <span className="shrink-0 font-bold text-success">
                                    {g.csat}/100
                                    <span className="ml-1 text-[11px] font-semibold text-muted-foreground">({g.volume} avis)</span>
                                  </span>
                                </li>))}
                            </ul>
                          </div>)}
                        {guichetsFlop.length > 0 && (<div>
                            <p className="mb-1 text-[11px] font-bold uppercase text-muted-foreground">Guichets — à accompagner (≥ 5 avis)</p>
                            <ul className="space-y-1 text-sm">
                              {guichetsFlop.map((g) => (<li key={g.id} className="flex justify-between gap-2">
                                  <span className="truncate text-foreground">{g.nom}</span>
                                  <span className="shrink-0 font-bold text-destructive">
                                    {g.csat}/100
                                    <span className="ml-1 text-[11px] font-semibold text-muted-foreground">({g.volume} avis)</span>
                                  </span>
                                </li>))}
                            </ul>
                          </div>)}
                      </div>
                    </div>
                  </Reveal>)}

                {/* Objectifs par agence (Direction seule — la requête est 403 sinon) */}
                {estDirection && Array.isArray(objectifsParAgence) && objectifsParAgence.length > 0 && (<Reveal>
                    <div className="rounded-2xl border border-border/80 bg-card/70 p-5">
                      <p className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                        <Target className="size-4" aria-hidden/> Objectifs par agence — réalisé vs cible (/100)
                      </p>
                      <div className="space-y-4">
                        {objectifsParAgence.map((ligne) => (<div key={ligne.agence?.id ?? ligne.agence?.nom_agence}>
                            <p className="mb-1 text-sm font-bold text-foreground">{ligne.agence?.nom_agence}</p>
                            {(ligne.objectifs ?? []).length === 0 ? (<p className="text-xs text-muted-foreground">Aucun objectif suivi pour cette agence.</p>) : (<ul className="space-y-1 text-sm">
                                {(ligne.objectifs ?? []).map((o) => (<li key={o.id} className="flex justify-between gap-2">
                                    <span className="truncate text-foreground">
                                      {o.critere?.libelle_critere ?? `Critère ${o.id_critere}`}
                                      <span className={`ml-2 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${o.statut === 'ATTEINT' ? 'bg-success/10 text-success' : o.statut === 'EN_RETARD' ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground'}`}>
                                        {o.statut === 'ATTEINT' ? 'atteint' : o.statut === 'EN_RETARD' ? 'en retard' : 'sans données'}
                                      </span>
                                    </span>
                                    <span className="shrink-0 font-bold text-foreground">
                                      {o.realise_pct != null ? `${o.realise_pct}/100` : '—'}
                                      <span className="ml-1 text-[11px] font-semibold text-muted-foreground">
                                        (cible {o.cible_pct}/100 · {o.nb_avis ?? 0} avis)
                                      </span>
                                    </span>
                                  </li>))}
                              </ul>)}
                          </div>))}
                      </div>
                    </div>
                  </Reveal>)}

                {/* Résumé exécutif */}
                <Reveal>
                  <div className="rounded-2xl border border-primary/25 bg-primary/5 p-5">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-primary">
                        <Sparkles className="size-4" aria-hidden/> Résumé exécutif
                      </p>
                      {badgeConfiance(courante.confiance)}
                      <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <CalendarDays className="size-3.5" aria-hidden/> {libellePeriode(courante)}
                      </span>
                    </div>
                    <p className="text-sm leading-6 text-foreground">
                      {courante.resumeExecutif ||
                (courante.status === 'DONE'
                    ? 'Pas de résumé : volume insuffisant ou synthèse non produite.'
                    : 'Synthèse en attente de calcul.')}
                    </p>
                  </div>
                </Reveal>

                <div className="grid gap-4 lg:grid-cols-2">
                  <ListeBulles titre="Points positifs" items={pointsPositifs} icon={ThumbsUp} tone="text-success"/>
                  <ListeBulles titre="Points de friction" items={pointsNegatifs} icon={ThumbsDown} tone="text-destructive"/>
                </div>

                {/* Irritants : priorité déterministe */}
                {irritants.length > 0 && (<Reveal>
                    <div className="rounded-2xl border border-border/80 bg-card/70 p-5">
                      <p className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                        <AlertTriangle className="size-4" aria-hidden/> Irritants (priorité calculée)
                      </p>
                      <ul className="space-y-3">
                        {irritants.map((i, idx) => (<li key={`${i.theme}-${idx}`} className="rounded-xl border border-border/60 bg-background/40 p-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="text-sm font-bold text-foreground">{i.theme}</span>
                              <span className="flex items-center gap-2">
                                {badgeConfiance(i.confiance)}
                                <span className="rounded bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase text-primary">
                                  priorité {Math.round(Number(i.priorite ?? 0))}
                                </span>
                              </span>
                            </div>
                            {i.constat && <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{i.constat}</p>}
                          </li>))}
                      </ul>
                    </div>
                  </Reveal>)}

                <div className="grid gap-4 lg:grid-cols-3">
                  <ListeBulles titre="Tendances" items={tendances} icon={TrendingUp} tone="text-primary"/>
                  <ListeBulles titre="Anomalies" items={anomalies} icon={AlertTriangle} tone="text-warning"/>
                  <ListeBulles titre="Priorités recommandées" items={priorites} icon={ListOrdered} tone="text-primary"/>
                </div>

                {limites.length > 0 && (<div className="rounded-2xl border border-warning/30 bg-warning/5 p-5">
                    <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-warning">
                      <Info className="size-4" aria-hidden/> Limites et réserves
                    </p>
                    <ul className="space-y-1.5">
                      {limites.map((l, i) => (<li key={i} className="text-sm leading-6 text-foreground">{l}</li>))}
                    </ul>
                  </div>)}

                <p className="text-[11px] text-muted-foreground">
                  {courante.provider && courante.model
                ? `Modèle : ${courante.provider}/${courante.model} · prompt v${courante.promptVersion ?? '?'} · analyse v${courante.analysisVersion ?? '1'}`
                : 'Aucun modèle IA utilisé pour cette période (volume insuffisant ou budget épuisé).'}
                  {courante.volumeCommentaires > 0 && ` · ${courante.volumeCommentaires} commentaire(s) analysé(s).`}
                </p>
              </div>)}
          </PageShell>
        </AmbientBackground>
      </RequireAuth>
    </RequireEnterpriseRole>);
};
export default SyntheseGlobalePage;
//# sourceMappingURL=SyntheseGlobalePage.jsx.map