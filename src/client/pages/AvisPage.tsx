import React, { useState } from 'react';
import { useQuery, getReponses, getAgences, getGuichets, getServices } from 'wasp/client/operations';
import { useAuth } from 'wasp/client/auth';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquareQuote, Inbox, Filter, RotateCcw, Calendar, User as UserIcon, HelpCircle, Layers, Building, Store } from 'lucide-react';
import { AmbientBackground } from '../components/AmbientBackground';
import { PageHeader } from '../components/PageHeader';
import { MotionCard } from '../components/MotionCard';
import { EmptyState } from '../components/EmptyState';
import { RequireAuth } from '../components/RequireAuth';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';

export const AvisPage = () => {
  const { data: user } = useAuth();
  
  // Filter States
  const [selectedAgenceId, setSelectedAgenceId] = useState<number | undefined>(undefined);
  const [selectedGuichetId, setSelectedGuichetId] = useState<number | undefined>(undefined);
  const [selectedServiceId, setSelectedServiceId] = useState<number | undefined>(undefined);
  const [selectedScore, setSelectedScore] = useState<number | undefined>(undefined);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const isDirection = user?.role === 'DIRECTION';
  const effectiveAgenceId: number | undefined = isDirection
    ? selectedAgenceId
    : (user?.id_agence ?? undefined);

  // Queries for filters
  const { data: agences } = useQuery(getAgences, { enabled: isDirection });
  
  const { data: guichets } = useQuery(
    getGuichets,
    { id_agence: effectiveAgenceId || 0 },
    { enabled: !!effectiveAgenceId }
  );

  const { data: services } = useQuery(getServices);

  // Main responses query with dynamic filters
  const { data: reponses, isLoading } = useQuery(getReponses, {
    id_agence: effectiveAgenceId,
    id_guichet: selectedGuichetId,
    id_service: selectedServiceId,
    score: selectedScore,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  });

  const reponsesList: any[] = reponses || [];

  const handleResetFilters = () => {
    if (isDirection) setSelectedAgenceId(undefined);
    setSelectedGuichetId(undefined);
    setSelectedServiceId(undefined);
    setSelectedScore(undefined);
    setStartDate('');
    setEndDate('');
  };

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
    if (score <= 2) return 'bg-rose-50 dark:bg-rose-950/20 text-rose-600 border border-rose-100 dark:border-rose-900/30';
    if (score === 3) return 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 border border-amber-100 dark:border-amber-900/30';
    return 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 border border-emerald-100 dark:border-emerald-900/30';
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
              reponsesList.length > 0 && (
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                  {reponsesList.length} retour{reponsesList.length > 1 ? 's' : ''}
                </span>
              )
            }
          />

          {/* Filters Dashboard Panel */}
          <MotionCard interactive={false} className="p-6">
            <div className="flex items-center justify-between border-b border-border pb-4 mb-5">
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-neutral-500 flex items-center gap-2">
                <Filter size={16} /> Filtres de recherche
              </h2>
              <button 
                onClick={handleResetFilters}
                className="text-xs font-semibold text-neutral-400 hover:text-primary transition-all flex items-center gap-1"
              >
                <RotateCcw size={12} /> Réinitialiser
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {/* Agency Filter (DIRECTION only) */}
              {isDirection && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1">
                    <Building size={12} /> Agence
                  </label>
                  <select
                    value={selectedAgenceId || ''}
                    onChange={(e) => {
                      setSelectedAgenceId(e.target.value ? Number(e.target.value) : undefined);
                      setSelectedGuichetId(undefined); // reset dependent guichet
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
                <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1">
                  <Store size={12} /> Guichet / Caisse
                </label>
                <select
                  value={selectedGuichetId || ''}
                  onChange={(e) => setSelectedGuichetId(e.target.value ? Number(e.target.value) : undefined)}
                  disabled={isDirection && !selectedAgenceId}
                  className="w-full h-11 px-3 border border-border/80 bg-background rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary text-foreground font-semibold disabled:opacity-60"
                >
                  <option value="">{isDirection && !selectedAgenceId ? 'Sélectionnez une agence d\'abord' : 'Tous les guichets'}</option>
                  {guichets?.map((g: any) => (
                    <option key={g.id} value={g.id}>{g.nom_guichet} ({g.type_guichet})</option>
                  ))}
                </select>
              </div>

              {/* Service Filter */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1">
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
                <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1">
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
                <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1">
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
                <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1">
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
          {isLoading ? (
            <div className="space-y-4">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-28 animate-pulse rounded-2xl border border-border/70 bg-card-subtle/50"
                />
              ))}
            </div>
          ) : reponsesList.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title="Aucun retour ne correspond à vos filtres"
              description="Essayez de modifier vos critères de filtrage ou de réinitialiser le panneau de recherche."
            />
          ) : (
            <div className="grid gap-5">
              {reponsesList.map((rep: any, i: number) => (
                <motion.div
                  key={rep.id.toString()}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: Math.min(i * 0.03, 0.3) }}
                >
                  <MotionCard interactive={false} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-5 shadow-premium-sm border-border/70">
                    <div className="space-y-2.5 flex-1">
                      {/* Badge / Header row */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold shadow-sm ${getScoreColorClass(rep.score_brut)}`}>
                          <span className="text-sm">{getScoreEmoji(rep.score_brut)}</span>
                          Note: {rep.score_brut}/5
                        </span>
                        
                        {rep.service && (
                          <span className="bg-primary/5 dark:bg-primary/10 border border-primary/10 text-primary text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-md">
                            {rep.service.libelle_service}
                          </span>
                        )}

                        <span className="text-xs font-bold text-neutral-400 dark:text-neutral-500">
                          {rep.critere?.libelle_critere || 'Critère'}
                        </span>
                      </div>

                      {/* Comment text */}
                      <p className="text-sm md:text-base font-medium text-neutral-800 dark:text-neutral-200 pl-1 leading-relaxed">
                        {rep.commentaire_texte ? (
                          <span>"{rep.commentaire_texte}"</span>
                        ) : (
                          <span className="text-neutral-400 italic text-xs font-normal">Aucun commentaire écrit</span>
                        )}
                      </p>

                      {/* Agent row if present */}
                      {rep.agent && (
                        <div className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-slate-400 bg-neutral-50 dark:bg-slate-900/50 w-fit px-2.5 py-1 rounded-lg border border-border/40">
                          <UserIcon size={12} className="text-primary" />
                          <span className="font-semibold text-neutral-400">Agent en service :</span>
                          <span className="font-bold text-neutral-700 dark:text-neutral-300">
                            {[rep.agent.prenom, rep.agent.nom].filter(Boolean).join(' ') || rep.agent.username}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Metadata column */}
                    <div className="shrink-0 flex md:flex-col justify-between items-center md:items-end text-xs text-neutral-400 dark:text-slate-500 border-t md:border-t-0 border-border/50 pt-3 md:pt-0">
                      <div className="text-left md:text-right">
                        <p className="font-extrabold text-neutral-700 dark:text-neutral-300 flex items-center md:justify-end gap-1">
                          <Store size={12} /> {rep.guichet?.nom_guichet || 'Guichet'}
                        </p>
                        {isDirection && rep.agence && (
                          <p className="text-[10px] font-semibold text-neutral-500">
                            {rep.agence.nom_agence}
                          </p>
                        )}
                      </div>
                      <p className="mt-1 font-medium">{new Date(rep.date_reponse).toLocaleString()}</p>
                    </div>
                  </MotionCard>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </AmbientBackground>
    </RequireAuth>
  );
};