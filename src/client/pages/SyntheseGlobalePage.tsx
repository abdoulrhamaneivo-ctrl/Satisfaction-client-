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
import {
  getAnalysesGlobales,
  declencherAnalyseGlobale,
} from 'wasp/client/operations';
import { useAuth } from 'wasp/client/auth';
import {
  Sparkles,
  Loader2,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  ThumbsUp,
  ThumbsDown,
  TrendingUp,
  ListOrdered,
  Info,
  CalendarDays,
  Users,
  Target,
} from 'lucide-react';
import { RequireAuth } from '../components/RequireAuth';
import { RequireEnterpriseRole } from '../components/RequireEnterpriseRole';
import { AmbientBackground } from '../components/AmbientBackground';
import { PageShell, PageTopNav } from '../components/PageShell';
import { PageHeader } from '../components/PageHeader';
import { EmptyState } from '../components/EmptyState';
import { Reveal } from '../components/ds';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { useToast } from '../hooks/use-toast';

// ---------- Helpers purs (testables) ----------

export function parseJson<T>(brut: string | null | undefined, defaut: T): T {
  if (!brut) return defaut;
  try {
    const v = JSON.parse(brut);
    return (v ?? defaut) as T;
  } catch {
    return defaut;
  }
}

export function libellePeriode(ligne: any): string {
  const debut = new Date(ligne.debut);
  const fin = new Date(ligne.fin);
  const d = debut.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
  const f = fin.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  return ligne.periode === 'SEMAINE' ? `Semaine ${d} → ${f}` : `Mois ${f}`;
}

const CONFIANCE_STYLE: Record<string, string> = {
  ELEVEE: 'bg-success/10 text-success',
  MOYENNE: 'bg-warning/10 text-warning',
  FAIBLE: 'bg-muted text-muted-foreground',
};

function badgeConfiance(v?: string | null) {
  const val = v || 'FAIBLE';
  return (
    <span className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${CONFIANCE_STYLE[val] ?? CONFIANCE_STYLE.FAIBLE}`}>
      confiance {val.toLowerCase()}
    </span>
  );
}

function ListeBulles({ titre, items, icon: Icon, tone }: { titre: string; items: string[]; icon: any; tone: string }) {
  if (items.length === 0) return null;
  return (
    <div className="rounded-2xl border border-border/80 bg-card/70 p-4">
      <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
        <Icon className={`size-4 ${tone}`} aria-hidden /> {titre}
      </p>
      <ul className="space-y-1.5">
        {items.map((t, i) => (
          <li key={i} className="flex gap-2 text-sm leading-6 text-foreground">
            <span className="mt-2 size-1.5 shrink-0 rounded-full bg-current opacity-40" aria-hidden />
            {t}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------- Page ----------

export const SyntheseGlobalePage: React.FC = () => {
  const { data: user } = useAuth();
  const { toast } = useToast();
  const estDirection = user?.role === 'DIRECTION';

  const [periode, setPeriode] = useState<'SEMAINE' | 'MOIS'>('SEMAINE');
  const [selection, setSelection] = useState<string | null>(null);
  const [declenchement, setDeclenchement] = useState(false);

  const { data: analyses, isLoading, refetch } = useQuery(
    getAnalysesGlobales,
    { periode },
    // Rafraîchissement tant qu'une analyse est en file (job PgBoss).
    { refetchInterval: (q: any) => (q.state.data?.some?.((a: any) => a.status === 'PENDING') ? 5000 : false) },
  );

  const lignes = useMemo(() => analyses ?? [], [analyses]);
  const courante = useMemo(() => {
    const trouvee = selection ? lignes.find((l: any) => String(l.id) === selection) : undefined;
    return trouvee ?? lignes[0] ?? null;
  }, [lignes, selection]);

  const indicateurs = parseJson<any>(courante?.indicateurs, null);
  const snapshot = parseJson<any>(courante?.datasetSnapshot, null);
  const pointsPositifs = parseJson<string[]>(courante?.pointsPositifs, []);
  const pointsNegatifs = parseJson<string[]>(courante?.pointsNegatifs, []);
  const irritants = parseJson<any[]>(courante?.irritants, []);
  const tendances = parseJson<string[]>(courante?.tendances, []);
  const anomalies = parseJson<string[]>(courante?.anomalies, []);
  const priorites = parseJson<string[]>(courante?.priorites, []);
  const limites = parseJson<string[]>(courante?.limites, []);

  const lancerAnalyse = async () => {
    setDeclenchement(true);
    try {
      const r: any = await declencherAnalyseGlobale({ periode });
      if (r?.dejaExistante) {
        toast({
          variant: 'success',
          title: 'Analyse déjà disponible',
          description: 'Une synthèse existe déjà pour cette période — affichage en cours.',
        });
      } else {
        toast({
          variant: 'success',
          title: 'Analyse mise en file',
          description: 'La synthèse sera calculée sous peu (actualisation automatique).',
        });
      }
      setSelection(null);
      refetch();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Déclenchement impossible', description: e?.message || 'Erreur inconnue' });
    } finally {
      setDeclenchement(false);
    }
  };

  return (
    <RequireEnterpriseRole>
      <RequireAuth>
        <AmbientBackground>
          <PageShell>
            <PageTopNav
              racine="Direction"
              agence={(user as any)?.agence?.nom_agence || 'Toutes les agences'}
              actuel="Synthèse globale"
              onglets={[
                { label: 'Tableau synthétique', to: '/dashboard' },
                { label: 'Synthèse IA', to: '/synthese' },
                { label: 'Avis & CSAT', to: '/avis' },
              ]}
            />

            <Reveal direction="down">
              <PageHeader
                icon={Sparkles}
                eyebrow="Expérience client"
                title="Synthèse globale"
                description="Lecture consolidée de toutes les agences : CSAT, NPS, irritants récurrents et priorités. L'IA ne mesure rien — tous les chiffres proviennent du calcul déterministe, et chaque limite est affichée."
                actions={
                  <div className="flex items-center gap-2 flex-wrap">
                    <Select value={periode} onValueChange={(v) => { setPeriode(v as any); setSelection(null); }}>
                      <SelectTrigger className="h-10 w-40 rounded-xl border-border/80 bg-card/80 font-semibold shadow-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="SEMAINE">Semaine</SelectItem>
                        <SelectItem value="MOIS">Mois</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      onClick={() => refetch()}
                      disabled={isLoading}
                      className="h-10 rounded-xl border-border/80 font-bold"
                    >
                      <RefreshCw className={`size-4 ${isLoading ? 'animate-spin' : ''}`} />
                      Actualiser
                    </Button>
                    {estDirection && (
                      <Button onClick={lancerAnalyse} disabled={declenchement} className="h-10 rounded-xl font-bold">
                        {declenchement ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                        Analyser
                      </Button>
                    )}
                  </div>
                }
              />
            </Reveal>

            {isLoading && (
              <div className="grid gap-4 lg:grid-cols-3">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-32 rounded-2xl" />
                ))}
              </div>
            )}

            {!isLoading && lignes.length > 0 && (
              <Reveal>
                <div className="mb-6 flex flex-wrap gap-2">
                  {lignes.map((l: any) => (
                    <button
                      key={String(l.id)}
                      type="button"
                      onClick={() => setSelection(String(l.id))}
                      className={`rounded-xl border px-3 py-2 text-left text-xs font-semibold transition ${
                        String(courante?.id) === String(l.id)
                          ? 'border-primary/50 bg-primary/10 text-primary'
                          : 'border-border/80 bg-card/60 text-muted-foreground hover:bg-accent/50'
                      }`}
                    >
                      <span className="block">{libellePeriode(l)}</span>
                      <span className="block text-[10px] font-bold uppercase">
                        {l.status === 'DONE' ? 'Publiée' : l.status === 'PENDING' ? 'En cours…' : 'Échec'}
                      </span>
                    </button>
                  ))}
                </div>
              </Reveal>
            )}

            {!isLoading && !courante && (
              <EmptyState
                icon={Sparkles}
                title="Aucune synthèse pour le moment"
                description={
                  estDirection
                    ? 'Lancez une analyse : elle est calculée en tâche de fond (le lundi à 6h automatiquement).'
                    : 'La direction déclenche les synthèses ; revenez après la prochaine publication hebdomadaire.'
                }
                action={estDirection ? <Button onClick={lancerAnalyse} disabled={declenchement} className="rounded-xl font-bold"><Sparkles className="size-4" /> Lancer l'analyse</Button> : undefined}
                className="py-16"
              />
            )}

            {courante && (
              <div className="space-y-6">
                {courante.status === 'PENDING' && (
                  <div className="flex items-center gap-3 rounded-2xl border border-info/30 bg-info/5 p-4 text-sm text-info">
                    <Loader2 className="size-5 animate-spin" aria-hidden />
                    Synthèse en cours de calcul (actualisation automatique toutes les 5 s).
                  </div>
                )}
                {courante.status === 'FAILED' && (
                  <div className="flex items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                    <AlertTriangle className="mt-0.5 size-5 shrink-0" aria-hidden />
                    <span>Échec de la synthèse : {courante.error || 'cause inconnue'}. Les chiffres ci-dessous restent valables.</span>
                  </div>
                )}

                {/* Chiffres déterministes */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    { label: 'CSAT', valeur: indicateurs?.csat != null ? `${Number(indicateurs.csat).toFixed(1)}%` : 'N/A', icon: Target },
                    { label: 'NPS', valeur: indicateurs?.nps != null ? String(Math.round(Number(indicateurs.nps))) : 'N/A', icon: TrendingUp },
                    { label: 'Avis analysés', valeur: snapshot?.volumeAvis != null ? String(snapshot.volumeAvis) : String(courante.volumeAvis ?? 0), icon: Users },
                    { label: 'Qualité des données', valeur: courante.qualiteDonnees != null ? `${Math.round(Number(courante.qualiteDonnees) * 100)}%` : 'N/A', icon: CheckCircle2 },
                  ].map((k) => (
                    <div key={k.label} className="rounded-2xl border border-border/80 bg-card/70 p-4">
                      <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                        <k.icon className="size-4" aria-hidden /> {k.label}
                      </p>
                      <p className="mt-2 text-2xl font-bold text-foreground">{k.valeur}</p>
                    </div>
                  ))}
                </div>

                {/* Résumé exécutif */}
                <Reveal>
                  <div className="rounded-2xl border border-primary/25 bg-primary/5 p-5">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-primary">
                        <Sparkles className="size-4" aria-hidden /> Résumé exécutif
                      </p>
                      {badgeConfiance(courante.confiance)}
                      <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <CalendarDays className="size-3.5" aria-hidden /> {libellePeriode(courante)}
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
                  <ListeBulles titre="Points positifs" items={pointsPositifs} icon={ThumbsUp} tone="text-success" />
                  <ListeBulles titre="Points de friction" items={pointsNegatifs} icon={ThumbsDown} tone="text-destructive" />
                </div>

                {/* Irritants : priorité déterministe */}
                {irritants.length > 0 && (
                  <Reveal>
                    <div className="rounded-2xl border border-border/80 bg-card/70 p-5">
                      <p className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                        <AlertTriangle className="size-4" aria-hidden /> Irritants (priorité calculée)
                      </p>
                      <ul className="space-y-3">
                        {irritants.map((i, idx) => (
                          <li key={`${i.theme}-${idx}`} className="rounded-xl border border-border/60 bg-background/40 p-3">
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
                          </li>
                        ))}
                      </ul>
                    </div>
                  </Reveal>
                )}

                <div className="grid gap-4 lg:grid-cols-3">
                  <ListeBulles titre="Tendances" items={tendances} icon={TrendingUp} tone="text-primary" />
                  <ListeBulles titre="Anomalies" items={anomalies} icon={AlertTriangle} tone="text-warning" />
                  <ListeBulles titre="Priorités recommandées" items={priorites} icon={ListOrdered} tone="text-primary" />
                </div>

                {limites.length > 0 && (
                  <div className="rounded-2xl border border-warning/30 bg-warning/5 p-5">
                    <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-warning">
                      <Info className="size-4" aria-hidden /> Limites et réserves
                    </p>
                    <ul className="space-y-1.5">
                      {limites.map((l, i) => (
                        <li key={i} className="text-sm leading-6 text-foreground">{l}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <p className="text-[11px] text-muted-foreground">
                  {courante.provider && courante.model
                    ? `Modèle : ${courante.provider}/${courante.model} · prompt v${courante.promptVersion ?? '?'} · analyse v${courante.analysisVersion ?? '1'}`
                    : 'Aucun modèle IA utilisé pour cette période (volume insuffisant ou budget épuisé).'}
                  {courante.volumeCommentaires > 0 && ` · ${courante.volumeCommentaires} commentaire(s) analysé(s).`}
                </p>
              </div>
            )}
          </PageShell>
        </AmbientBackground>
      </RequireAuth>
    </RequireEnterpriseRole>
  );
};

export default SyntheseGlobalePage;
