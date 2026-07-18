import React, { useState, useCallback } from 'react';
import { useQuery, getAvisGroupes, getAgences, getGuichets, getServices, exportAvisGroupes } from 'wasp/client/operations';
import { useAuth } from 'wasp/client/auth';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquareQuote, Inbox, Filter, RotateCcw, Calendar,
  User as UserIcon, HelpCircle, Layers, Building, Store,
  Download, Loader2, ChevronDown,
} from 'lucide-react';
import { AmbientBackground } from '../components/AmbientBackground';
import { PageHeader } from '../components/PageHeader';
import { MotionCard } from '../components/MotionCard';
import { EmptyState } from '../components/EmptyState';
import { RequireAuth } from '../components/RequireAuth';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { exportToCSV, formaterAvisPourCSV } from '../utils/exportData';
import { useToast } from '../hooks/use-toast';

export const AvisPage = () => {
  const { data: user } = useAuth();
  const { toast } = useToast();

  // Filter States
  const [selectedAgenceId, setSelectedAgenceId] = useState<number | undefined>(undefined);
  const [selectedGuichetId, setSelectedGuichetId] = useState<number | undefined>(undefined);
  const [selectedServiceId, setSelectedServiceId] = useState<number | undefined>(undefined);
  const [selectedScore, setSelectedScore] = useState<number | undefined>(undefined);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Pagination state
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  const isDirection = user?.role === 'DIRECTION';
  const effectiveAgenceId: number | undefined = isDirection
    ? selectedAgenceId
    : (user?.id_agence || undefined);

  // Queries for filters
  const { data: agences } = useQuery(getAgences, undefined, { enabled: isDirection });

  const { data: guichets } = useQuery(
    getGuichets,
    { id_agence: effectiveAgenceId || 0 },
    { enabled: !!effectiveAgenceId }
  );

  const { data: services } = useQuery(getServices);

  // Main avis query — paginée
  const queryArgs = {
    id_agence: effectiveAgenceId,
    id_guichet: selectedGuichetId,
    id_service: selectedServiceId,
    score: selectedScore,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    page,
    pageSize: PAGE_SIZE,
  };

  const { data: avisData, isLoading } = useQuery(getAvisGroupes, queryArgs);

  // Pages accumulées (on ajoute les nouvelles au fur et à mesure)
  const [allAvis, setAllAvis] = useState<any[]>([]);
  const [lastQueryKey, setLastQueryKey] = useState('');

  // Clé de filtre pour détecter un changement de filtres → réinitialiser la liste
  const filterKey = JSON.stringify({
    effectiveAgenceId, selectedGuichetId, selectedServiceId, selectedScore, startDate, endDate,
  });

  React.useEffect(() => {
    if (filterKey !== lastQueryKey) {
      // Les filtres ont changé : on réinitialise
      setPage(1);
      setAllAvis([]);
      setLastQueryKey(filterKey);
    }
  }, [filterKey, lastQueryKey]);

  React.useEffect(() => {
    if (avisData?.avis && avisData.avis.length > 0) {
      if (page === 1) {
        setAllAvis(avisData.avis);
      } else {
        setAllAvis((prev) => [...prev, ...avisData.avis]);
      }
    }
  }, [avisData?.avis, page]);

  const hasMore = avisData?.hasMore ?? false;
  const totalInWindow = avisData?.total ?? 0;

  const handleLoadMore = () => {
    setPage((p) => p + 1);
  };

  const handleResetFilters = () => {
    if (isDirection) setSelectedAgenceId(undefined);
    setSelectedGuichetId(undefined);
    setSelectedServiceId(undefined);
    setSelectedScore(undefined);
    setStartDate('');
    setEndDate('');
    setPage(1);
    setAllAvis([]);
  };

  // Export CSV — charge TOUS les avis filtrés (sans pagination)
  const [exporting, setExporting] = useState(false);
  const handleExportCSV = useCallback(async () => {
    setExporting(true);
    try {
      const exportArgs = {
        id_agence: effectiveAgenceId,
        id_guichet: selectedGuichetId,
        id_service: selectedServiceId,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      };
      const raw = await exportAvisGroupes(exportArgs);
      const formatted = formaterAvisPourCSV(raw as any[]);
      const date = new Date().toISOString().split('T')[0];
      exportToCSV(formatted, `CXSAT_Avis_${date}`);
      toast({ title: 'Export réussi', description: `${formatted.length} avis exportés.` });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erreur export', description: err.message });
    } finally {
      setExporting(false);
    }
  }, [effectiveAgenceId, selectedGuichetId, selectedServiceId, startDate, endDate, toast]);

  const getScoreEmoji = (score: number) => {
    switch (score) {
      case 1: return '😡';
      case 2: return '😟';
      case 3: return '😐';
      case 4: return '🙂';
      case 5: return '🤩';
      default: return '💬';
    }
  };

  const getScoreColorClass = (score: number) => {
    if (score <= 2) return 'bg-destructive/10 text-destructive border border-destructive/20';
    if (score === 3) return 'bg-warning/10 text-warning border border-warning/20';
    return 'bg-success/10 text-success border border-success/20';
  };

  return (
    <RequireAuth>
      <AmbientBackground>
        <div className="mx-auto max-w-7xl p-6 lg:p-10 space-y-8">
          <PageHeader
            icon={MessageSquareQuote}
            eyebrow="Écoute client"
            title="Derniers retours clients"
            description="Consultez et filtrez les avis collectés en temps réel sur l'ensemble de vos points de contact."
            actions={
              <div className="flex items-center gap-3">
                {allAvis.length > 0 && (
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                    {allAvis.length}{hasMore ? '+' : ''} retour{allAvis.length > 1 ? 's' : ''}
                  </span>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportCSV}
                  disabled={exporting || allAvis.length === 0}
                  id="btn-export-csv"
                >
                  {exporting ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Download className="size-4" />
                  )}
                  <span className="ml-1.5">Exporter CSV</span>
                </Button>
              </div>
            }
          />

          {/* Filters Dashboard Panel */}
          <MotionCard interactive={false} className="p-6">
            <div className="flex items-center justify-between border-b border-border pb-4 mb-5">
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Filter size={16} /> Filtres de recherche
              </h2>
              <button
                onClick={handleResetFilters}
                className="text-xs font-semibold text-muted-foreground hover:text-primary transition-all flex items-center gap-1"
              >
                <RotateCcw size={12} /> Réinitialiser
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {/* Agency Filter (DIRECTION only) */}
              {isDirection && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                    <Building size={12} /> Agence
                  </label>
                  <select
                    value={selectedAgenceId || ''}
                    onChange={(e) => {
                      setSelectedAgenceId(e.target.value ? Number(e.target.value) : undefined);
                      setSelectedGuichetId(undefined);
                    }}
                    className="w-full h-11 px-3 border border-border/80 bg-background rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary text-foreground font-semibold"
                  >
                    <option value="">Toutes les agences</option>
                    {agences?.map((a: any) => (
                      <option key={a.id} value={a.id}>{a.nom_agence} ({a.commune})</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Guichet Filter */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <Store size={12} /> Guichet / Caisse
                </label>
                <select
                  value={selectedGuichetId || ''}
                  onChange={(e) => setSelectedGuichetId(e.target.value ? Number(e.target.value) : undefined)}
                  disabled={isDirection && !selectedAgenceId}
                  className="w-full h-11 px-3 border border-border/80 bg-background rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary text-foreground font-semibold disabled:opacity-60"
                >
                  <option value="">{isDirection && !selectedAgenceId ? "Sélectionnez une agence d'abord" : 'Tous les guichets'}</option>
                  {guichets?.map((g: any) => (
                    <option key={g.id} value={g.id}>{g.nom_guichet} ({g.type_guichet})</option>
                  ))}
                </select>
              </div>

              {/* Service Filter */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <Layers size={12} /> Opération / Service
                </label>
                <select
                  value={selectedServiceId || ''}
                  onChange={(e) => setSelectedServiceId(e.target.value ? Number(e.target.value) : undefined)}
                  className="w-full h-11 px-3 border border-border/80 bg-background rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary text-foreground font-semibold"
                >
                  <option value="">Toutes les opérations</option>
                  {services?.map((s: any) => (
                    <option key={s.id} value={s.id}>{s.libelle_service}</option>
                  ))}
                </select>
              </div>

              {/* Score Filter */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <HelpCircle size={12} /> Évaluation (Note)
                </label>
                <select
                  value={selectedScore || ''}
                  onChange={(e) => setSelectedScore(e.target.value ? Number(e.target.value) : undefined)}
                  className="w-full h-11 px-3 border border-border/80 bg-background rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary text-foreground font-semibold"
                >
                  <option value="">Tous les scores</option>
                  <option value="5">🤩 Très satisfait (5/5)</option>
                  <option value="4">🙂 Satisfait (4/5)</option>
                  <option value="3">😐 Neutre (3/5)</option>
                  <option value="2">😟 Mécontent (2/5)</option>
                  <option value="1">😡 Très mécontent (1/5)</option>
                </select>
              </div>

              {/* Start Date Filter */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <Calendar size={12} /> Date Début
                </label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-11 font-semibold"
                />
              </div>

              {/* End Date Filter */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <Calendar size={12} /> Date Fin
                </label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-11 font-semibold"
                />
              </div>
            </div>
          </MotionCard>

          {/* Responses List or states */}
          {isLoading && page === 1 ? (
            <div className="space-y-4">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-28 animate-pulse rounded-2xl border border-border/70 bg-card-subtle/50"
                />
              ))}
            </div>
          ) : allAvis.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title="Aucun retour ne correspond à vos filtres"
              description="Essayez de modifier vos critères de filtrage ou de réinitialiser le panneau de recherche."
            />
          ) : (
            <>
              <div className="grid gap-5">
                <AnimatePresence initial={false}>
                  {allAvis.map((rep: any, i: number) => (
                    <motion.div
                      key={rep.id_soumission?.toString() ?? i}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: Math.min(i * 0.02, 0.2) }}
                    >
                      <MotionCard interactive={false} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-5 shadow-premium-sm border-border/70">
                        <div className="space-y-2.5 flex-1">
                          {/* Badge / Header row */}
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold shadow-sm ${getScoreColorClass(Math.round(rep.score_moyen))}`}>
                              <span className="text-sm">{getScoreEmoji(Math.round(rep.score_moyen))}</span>
                              Note moyenne : {rep.score_moyen}/5
                            </span>

                            {rep.service && (
                              <span className="bg-primary/5 dark:bg-primary/10 border border-primary/10 text-primary text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-md">
                                {rep.service.libelle_service}
                              </span>
                            )}

                            {rep.reponses?.map((r: any) => (
                              <span
                                key={r.id.toString()}
                                className="flex items-center gap-1 text-xs font-bold text-muted-foreground bg-muted border border-border/40 rounded-md px-2 py-0.5"
                                title={r.critere?.libelle_critere}
                              >
                                {getScoreEmoji(r.score_brut)} {r.critere?.libelle_critere || 'Critère'} ({r.score_brut}/5)
                              </span>
                            ))}
                          </div>

                          {/* Comment text */}
                          <p className="text-sm md:text-base font-medium text-foreground pl-1 leading-relaxed">
                            {rep.commentaire_texte ? (
                              <span>"{rep.commentaire_texte}"</span>
                            ) : (
                              <span className="text-muted-foreground italic text-xs font-normal">Aucun commentaire écrit</span>
                            )}
                          </p>

                          {rep.agent && (
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted w-fit px-2.5 py-1 rounded-lg border border-border/40">
                              <UserIcon size={12} className="text-primary" />
                              <span className="font-semibold text-muted-foreground">Agent en service :</span>
                              <span className="font-bold text-foreground">
                                {[rep.agent.prenom, rep.agent.nom].filter(Boolean).join(' ') || rep.agent.username}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Metadata column */}
                        <div className="shrink-0 flex md:flex-col justify-between items-center md:items-end text-xs text-muted-foreground border-t md:border-t-0 border-border/50 pt-3 md:pt-0">
                          <div className="text-left md:text-right">
                            <p className="font-extrabold text-foreground flex items-center md:justify-end gap-1">
                              <Store size={12} /> {rep.guichet?.nom_guichet || 'Guichet'}
                            </p>
                            {isDirection && rep.agence && (
                              <p className="text-[10px] font-semibold text-muted-foreground">
                                {rep.agence.nom_agence}
                              </p>
                            )}
                          </div>
                          <p className="mt-1 font-medium">{new Date(rep.date_reponse).toLocaleString()}</p>
                        </div>
                      </MotionCard>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              {/* Bouton "Charger plus" */}
              {(hasMore || isLoading) && (
                <div className="flex justify-center pt-2">
                  <Button
                    variant="outline"
                    onClick={handleLoadMore}
                    disabled={isLoading}
                    id="btn-charger-plus"
                    className="gap-2"
                  >
                    {isLoading ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <ChevronDown className="size-4" />
                    )}
                    {isLoading ? 'Chargement...' : `Charger plus d'avis`}
                  </Button>
                </div>
              )}

              {!hasMore && allAvis.length > 0 && (
                <p className="text-center text-xs text-muted-foreground py-2">
                  — {allAvis.length} avis affichés — fin de la liste —
                </p>
              )}
            </>
          )}
        </div>
      </AmbientBackground>
    </RequireAuth>
  );
};