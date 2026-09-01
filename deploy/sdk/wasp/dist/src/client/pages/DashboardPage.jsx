import React, { useRef, useState, useCallback } from 'react';
import { useQuery, getReponses, getRadarStats, getAlertes, getTachesCorrectives, getTendanceMensuelle, getStatsByAgent, getStatsByGuichet, getActionsPrioritaires, getKPIsPeriode, getObjectifs, getHeatmapReponses, getTempsTraitement, getThemesStats, } from 'wasp/client/operations';
import { useAuth } from 'wasp/client/auth';
import { Link as WaspRouterLink, routes } from 'wasp/client/router';
import { useNavigate } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import { motion } from 'framer-motion';
import { LayoutDashboard, Printer, Smile, MessageSquare, Star, Inbox, AlertTriangle, TrendingUp, Users, Target, Store, FileSpreadsheet, Loader2, Clock, Timer, CheckCircle2, ChevronRight, Tag } from 'lucide-react';
import { HistogrammeSatisfaction, RadarQualite, TendanceMensuelle, ComparaisonAgents, ClassementGuichets, HistogrammeSatisfactionSkeleton, RadarQualiteSkeleton, TendanceMensuelleSkeleton, ComparaisonAgentsSkeleton, ClassementGuichetsSkeleton, ChartSkeleton } from '../components/DashboardCharts';
import { HeatmapReponses } from '../components/HeatmapReponses';
import { RapportMensuelPrint } from '../components/RapportMensuelPrint';
import { AmbientBackground } from '../components/AmbientBackground';
import { PageHeader } from '../components/PageHeader';
import { DashboardSummary } from '../components/DashboardSummary';
import { StatCard } from '../components/StatCard';
import { EmptyState } from '../components/EmptyState';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from '../components/ui/select';
import { RequireAuth } from '../components/RequireAuth';
import { DataTable, DataTableRow } from '../components/ui/DataTable';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../components/ui/accordion';
import { ActionsPrioritaires } from '../components/ActionsPrioritaires';
import { ObjectifsProgress } from '../components/ObjectifsProgress';
import { regrouperAvisParSoumission } from '../utils';
import { exportToXLSX } from '../utils/exportData';
import { Eyebrow, Reveal, Card } from '../components/ds';
import { THEMES_LABELS } from '../components/AIAnalysisBadge';
const formatDelta = (value, suffix) => `${value > 0 ? '+' : ''}${value}${suffix}`;
const formatDuree = (heures) => {
    if (heures === null)
        return '—';
    if (heures < 24)
        return `${heures}h`;
    const jours = Math.floor(heures / 24);
    const reste = Math.round(heures % 24);
    return reste > 0 ? `${jours}j ${reste}h` : `${jours}j`;
};
export const DashboardPage = () => {
    const { data: user } = useAuth();
    const navigate = useNavigate();
    const [periodeJours, setPeriodeJours] = useState(30);
    // CONFIDENTIALITÉ MÉTIER (RG16/RG17 — Doc 08) : la DIRECTION ne reçoit pas
    // les réponses brutes — l'API renvoie 403 à getReponses pour elle. On ne
    // lance donc la query QUE pour les rôles autorisés (CHEF_AGENCE, QUALITE),
    // sinon react-query marque la page en erreur et le dashboard casse.
    // La Direction garde tous les agrégats : KPI, tendances, radar, heatmap,
    // comparaisons, thèmes — alimentés par leurs propres queries.
    const estDirection = user?.role === 'DIRECTION';
    const { data: reponses, isLoading: loadingReponses } = useQuery(getReponses, undefined, { enabled: !estDirection });
    const { data: radarData, isLoading: loadingRadar } = useQuery(getRadarStats);
    const { data: alertes, isLoading: loadingAlertes } = useQuery(getAlertes);
    const { data: taches, isLoading: loadingTaches } = useQuery(getTachesCorrectives);
    const { data: tendance, isLoading: loadingTendance } = useQuery(getTendanceMensuelle);
    const { data: statsByAgent, isLoading: loadingAgents } = useQuery(getStatsByAgent, { nbJours: periodeJours });
    const { data: statsByGuichet, isLoading: loadingGuichets } = useQuery(getStatsByGuichet, { nbJours: periodeJours });
    const { data: actionsPrioritaires, isLoading: loadingActions } = useQuery(getActionsPrioritaires);
    const { data: kpisPeriode, isLoading: loadingKpis } = useQuery(getKPIsPeriode, { nbJours: periodeJours });
    const { data: objectifs, isLoading: loadingObjectifs } = useQuery(getObjectifs);
    const { data: heatmap, isLoading: loadingHeatmap } = useQuery(getHeatmapReponses, { nbJours: 90 });
    const { data: tempsTraitement, isLoading: loadingTemps } = useQuery(getTempsTraitement, { nbJours: periodeJours });
    const { data: themesStats, isLoading: loadingThemes } = useQuery(getThemesStats, { nbJours: periodeJours });
    const reponsesList = reponses || [];
    const avisGroupes = regrouperAvisParSoumission(reponsesList);
    const alertesList = alertes || [];
    const tachesList = taches || [];
    const tendanceList = tendance || [];
    const agentsList = statsByAgent || [];
    const guichetsList = statsByGuichet || [];
    const objectifsList = objectifs || [];
    const isLoading = loadingReponses || loadingRadar || loadingAlertes || loadingTaches;
    const periodeActuelle = kpisPeriode?.periode_actuelle;
    const satisfaction = periodeActuelle ? periodeActuelle.satisfaction.toFixed(0) : '0';
    const noteMoyenne = periodeActuelle ? periodeActuelle.moyenne.toFixed(1) : '0.0';
    const totalAvisPeriode = periodeActuelle ? periodeActuelle.nb : 0;
    const labelPeriode = periodeJours === 1 ? '24h' : `${periodeJours}j`;
    const alertesNouvelles = alertesList.filter((a) => a.statut_alerte === 'NOUVELLE').length;
    const deltaSatisfaction = kpisPeriode?.delta_satisfaction_pts ?? 0;
    const deltaNote = kpisPeriode?.delta_note_pts ?? 0;
    const deltaVolume = kpisPeriode?.delta_volume_pct ?? 0;
    const printRef = useRef(null);
    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: `Rapport-Mensuel-Yeba-${user?.id_agence || 'Agence'}`,
    });
    const [exportingXLSX, setExportingXLSX] = useState(false);
    const handleExportXLSX = useCallback(async () => {
        setExportingXLSX(true);
        try {
            await exportToXLSX([
                {
                    name: 'Avis clients',
                    data: avisGroupes.map((a) => ({
                        'Date & Heure': a.reponses[0]?.date_reponse ? new Date(a.reponses[0].date_reponse).toLocaleString('fr-FR') : 'Non renseigné',
                        'Guichet': a.reponses[0]?.guichet?.nom_guichet || 'Guichet principal',
                        'Service': a.reponses[0]?.service?.libelle_service || 'Général',
                        'Note moyenne (/5)': typeof a.score_moyen === 'number' ? Number(a.score_moyen.toFixed(2)) : 'N/A',
                        'Détail critères': a.reponses.map((r) => `${r.critere?.libelle_critere || 'Critère'}: ${r.score_brut}/5`).join(' | '),
                        'Commentaire': a.reponses[0]?.commentaire_texte && a.reponses[0].commentaire_texte.trim() !== '' ? a.reponses[0].commentaire_texte.trim() : 'Aucun commentaire écrit',
                    })),
                },
                {
                    name: 'Alertes',
                    data: alertesList.map((a) => ({
                        'Date d\'alerte': a.date_creation ? new Date(a.date_creation).toLocaleString('fr-FR') : 'N/A',
                        'Type d\'incident': a.type_alerte || 'Note insatisfaisante',
                        'Statut': a.statut_alerte === 'TRAITEE' ? 'Traitée' : 'En attente',
                        'Guichet concerné': a.guichet?.nom_guichet || 'Guichet principal',
                        'Date de résolution': a.date_traitement ? new Date(a.date_traitement).toLocaleString('fr-FR') : 'Non encore traitée',
                    })),
                },
                {
                    name: 'Taches correctives',
                    data: tachesList.map((t) => ({
                        'Action à réaliser': t.titre || 'Tâche corrective',
                        'Statut Kanban': t.statut_tache || 'À FAIRE',
                        'Date d\'échéance': t.date_echeance ? new Date(t.date_echeance).toLocaleString('fr-FR') : 'Aucune date',
                        'Date de clôture': t.date_cloture ? new Date(t.date_cloture).toLocaleString('fr-FR') : 'En cours d\'exécution',
                        'Agent responsable': t.responsable ? `${t.responsable.prenom || ''} ${t.responsable.nom || ''}`.trim() : 'Non assigné',
                    })),
                },
                {
                    name: `Synthèse KPIs ${labelPeriode}`,
                    data: kpisPeriode ? [{
                            'Satisfaction Usagers (%)': periodeActuelle?.satisfaction ? `${periodeActuelle.satisfaction.toFixed(1)}%` : '0%',
                            'Moyenne globale (/5)': periodeActuelle?.moyenne ? `${periodeActuelle.moyenne.toFixed(2)}/5` : '0/5',
                            'Volume total avis': periodeActuelle?.nb ?? 0,
                            'Évolution satisfaction': `${kpisPeriode.delta_satisfaction_pts >= 0 ? '+' : ''}${kpisPeriode.delta_satisfaction_pts ?? 0} pts`,
                            'Évolution moyenne': `${kpisPeriode.delta_note_pts >= 0 ? '+' : ''}${kpisPeriode.delta_note_pts ?? 0} pts`,
                            'Évolution volume': `${kpisPeriode.delta_volume_pct >= 0 ? '+' : ''}${kpisPeriode.delta_volume_pct ?? 0}%`,
                        }] : [],
                },
            ], `Yeba_Rapport_Complet_${new Date().toISOString().split('T')[0]}`);
        }
        catch (err) {
            console.error('Erreur export XLSX', err);
        }
        finally {
            setExportingXLSX(false);
        }
    }, [avisGroupes, alertesList, tachesList, kpisPeriode, periodeActuelle, labelPeriode]);
    return (<RequireAuth>
      <AmbientBackground>
        <div className="mx-auto max-w-[1440px] p-6 lg:p-10 space-y-8">
          {/* Fil d'Ariane & navigation secondaire */}
          <nav aria-label="Fil d'Ariane" className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/70 pb-4">
            <ol className="flex flex-wrap items-center gap-2 text-xs font-semibold text-muted-foreground list-none p-0 m-0">
              <li>Agences</li>
              <li aria-hidden className="text-border">/</li>
              <li className="text-foreground">{user?.agence?.nom_agence || "Agence Principale"}</li>
              <li aria-hidden className="text-border">/</li>
              <li className="text-primary font-bold" aria-current="page">Tableau de bord</li>
            </ol>
            
            <div className="flex items-center gap-1 rounded-xl border border-border/60 bg-muted/30 p-1 text-xs font-bold">
              <span className="rounded-lg bg-card px-3 py-1.5 text-primary shadow-sm font-bold cursor-default">
                Tableau synthétique
              </span>
              <button type="button" onClick={() => navigate('/alertes-taches')} className="rounded-lg px-3 py-1.5 text-muted-foreground transition-colors hover:bg-card/80 hover:text-foreground cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40">
                Kanban Incidents
              </button>
              <button type="button" onClick={() => navigate('/guichets')} className="rounded-lg px-3 py-1.5 text-muted-foreground transition-colors hover:bg-card/80 hover:text-foreground cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40">
                Guichets & Kits
              </button>
            </div>
          </nav>

          <Reveal direction="down">
            <PageHeader icon={LayoutDashboard} eyebrow="Vue d'ensemble" title="Tableau de bord" description={user?.role === 'DIRECTION'
            ? "Vue entreprise : suivi consolidé de toutes vos agences."
            : `Vue agence : données de ${user?.agence?.nom_agence || 'votre agence'} en temps réel.`} actions={<div className="flex items-center gap-2 flex-wrap">
                  <Select value={String(periodeJours)} onValueChange={(v) => setPeriodeJours(Number(v))}>
                    <SelectTrigger className="h-10 w-44 rounded-xl border-border/80 bg-card/80 font-semibold shadow-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-border/80 shadow-premium">
                      <SelectItem value="7">7 derniers jours</SelectItem>
                      <SelectItem value="30">30 derniers jours</SelectItem>
                      <SelectItem value="90">90 derniers jours</SelectItem>
                    </SelectContent>
                  </Select>
                  <motion.div whileTap={{ scale: 0.97 }}>
                    <Button variant="outline" onClick={() => handlePrint()} disabled={isLoading} className="rounded-xl border-border/80 font-bold">
                      <Printer className="size-4"/> Exporter (PDF)
                    </Button>
                  </motion.div>
                  <motion.div whileTap={{ scale: 0.97 }}>
                    <Button variant="outline" onClick={handleExportXLSX} disabled={isLoading || exportingXLSX} className="rounded-xl border-border/80 font-bold">
                      {exportingXLSX ? (<Loader2 className="size-4 animate-spin"/>) : (<FileSpreadsheet className="size-4"/>)}
                      Exporter XLSX
                    </Button>
                  </motion.div>
                </div>}/>
          </Reveal>

          <Reveal delay={0.05}>
            <DashboardSummary prenom={user?.prenom} satisfaction={Number(satisfaction)} totalAvis={totalAvisPeriode} alertesNouvelles={alertesNouvelles} tachesEnRetard={actionsPrioritaires?.tachesEnRetard?.length ?? 0} labelPeriode={labelPeriode} isLoading={loadingKpis || loadingActions}/>
          </Reveal>

          {user?.role === 'DIRECTION' && (<p className="text-xs text-muted-foreground font-medium">
              Vue Entreprise : ces chiffres sont cumulés sur l'ensemble du réseau.
            </p>)}

          {user?.role !== 'DIRECTION' && user?.agence?.nom_agence && (<p className="text-xs text-muted-foreground font-medium">
              Vue Agence : ces chiffres ne portent que sur {user.agence.nom_agence}.
            </p>)}

          {/* NIVEAU 1 — Quoi faire aujourd'hui */}
          <section id="actions-prioritaires">
            <ActionsPrioritaires alertesNouvelles={actionsPrioritaires?.alertesNouvelles ?? []} tachesEnRetard={actionsPrioritaires?.tachesEnRetard ?? []} isLoading={loadingActions}/>
          </section>

          {/* NIVEAU 2 — KPIs exécutifs */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
            <StatCard title={`Satisfaction (${labelPeriode})`} value={`${satisfaction}%`} icon={Smile} accent="success" index={0} trend={!loadingKpis ? formatDelta(deltaSatisfaction, ' pts') : undefined} trendDirection={deltaSatisfaction >= 0 ? 'up' : 'down'}/>
            <StatCard title={`Total Avis (${labelPeriode})`} value={String(totalAvisPeriode)} icon={MessageSquare} accent="primary" index={1} trend={!loadingKpis ? formatDelta(deltaVolume, '%') : undefined} trendDirection={deltaVolume >= 0 ? 'up' : 'down'}/>
            <StatCard title={`Note Moyenne (${labelPeriode})`} value={`${noteMoyenne} / 5`} icon={Star} accent="secondary" index={2} trend={!loadingKpis ? formatDelta(deltaNote, ' pts') : undefined} trendDirection={deltaNote >= 0 ? 'up' : 'down'}/>
            <StatCard title="Alertes nouvelles" value={String(alertesNouvelles)} icon={AlertTriangle} accent={alertesNouvelles > 0 ? 'destructive' : 'success'} index={3}/>
          </div>

          {/* Objectifs */}
          <section>
            <div className="mb-4 flex items-center gap-2">
              <Target className="size-5 text-primary"/>
              <h2 className="text-xl font-bold text-foreground font-satoshi">Objectifs de satisfaction</h2>
            </div>
            {loadingObjectifs ? (<ChartSkeleton variant="horizontalBar" heightClass="h-40" label="Chargement des objectifs de satisfaction"/>) : (<ObjectifsProgress data={objectifsList}/>)}
          </section>

          {/* Thèmes récurrents — valeur ajoutée : de quoi se plaignent les clients */}
          <section>
            <div className="mb-4 flex items-center gap-2">
              <Tag className="size-5 text-primary"/>
              <h2 className="text-lg font-bold text-foreground font-satoshi">Thèmes récurrents ({labelPeriode})</h2>
            </div>
            {loadingThemes ? (<ChartSkeleton variant="horizontalBar" heightClass="h-40" label="Chargement des thèmes récurrents"/>) : themesStats?.topThemes?.length ? (<Card className="p-6">
                {/* Chips de thèmes façon Stitch : pastilles colorées alternées
                vert/jaune avec barre de progression intégrée, plus lisibles
                que l'ancienne liste de barres grises. */}
                <div className="flex flex-wrap gap-2.5">
                  {themesStats.topThemes.slice(0, 6).map(({ theme, count }, i) => {
                const pct = themesStats.total > 0 ? Math.round((count / themesStats.total) * 100) : 0;
                const isYellow = i % 2 === 1;
                return (<span key={theme} title={`${count} mention${count > 1 ? 's' : ''} (${pct}%)`} className={`relative inline-flex items-center gap-2 overflow-hidden rounded-full border px-3.5 py-1.5 text-xs font-semibold text-foreground transition-colors ${isYellow
                        ? 'border-warning/30 bg-warning/10 hover:bg-warning/20'
                        : 'border-primary/25 bg-primary/10 hover:bg-primary/20'}`}>
                        {/* Barre de progression comme fond de la chip */}
                        <span aria-hidden className={`absolute inset-y-0 left-0 ${isYellow ? 'bg-warning/25' : 'bg-primary/15'}`} style={{ width: `${Math.max(pct, 8)}%` }}/>
                        <span className="relative font-medium">{THEMES_LABELS[theme] ?? theme}</span>
                        <span className="relative tabular-nums text-muted-foreground">{count}</span>
                      </span>);
            })}
                </div>
              </Card>) : (<EmptyState icon={Tag} title="Aucun thème analysé" description="Les thèmes apparaîtront ici dès que l'IA aura analysé des commentaires clients."/>)}
          </section>

          {/* Analyses détaillées */}
          <section className="rounded-3xl border border-border/80 bg-card/80 px-6 shadow-premium sm:px-8">
            <Accordion type="single" collapsible>
              <AccordionItem value="analyses" className="border-none">
                <AccordionTrigger className="py-6 text-lg font-bold text-foreground hover:no-underline font-satoshi">
                  Analyses détaillées
                </AccordionTrigger>
                <AccordionContent className="pb-8">
                  <p className="mb-6 max-w-2xl text-sm text-muted-foreground">
                    Délais de traitement, répartition des notes, tendances et performances par point de service.
                  </p>
                  <div className="space-y-8">
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                      <StatCard title={`Prise en charge moyenne (${labelPeriode})`} value={formatDuree(tempsTraitement?.prise_en_charge?.moyenne_heures ?? null)} icon={Timer} accent="secondary" index={4} trend={!loadingTemps && tempsTraitement?.prise_en_charge?.delta_heures !== null
            ? formatDelta(tempsTraitement?.prise_en_charge?.delta_heures ?? 0, 'h')
            : undefined} trendDirection={(tempsTraitement?.prise_en_charge?.delta_heures ?? 0) <= 0 ? 'up' : 'down'}/>
                      <StatCard title={`Résolution moyenne (${labelPeriode})`} value={formatDuree(tempsTraitement?.resolution?.moyenne_heures ?? null)} icon={CheckCircle2} accent="primary" index={5} trend={!loadingTemps && tempsTraitement?.resolution?.delta_heures !== null
            ? formatDelta(tempsTraitement?.resolution?.delta_heures ?? 0, 'h')
            : undefined} trendDirection={(tempsTraitement?.resolution?.delta_heures ?? 0) <= 0 ? 'up' : 'down'}/>
                    </div>

                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                      {isLoading ? (<>
                          <HistogrammeSatisfactionSkeleton />
                          <RadarQualiteSkeleton />
                        </>) : (<>
                          <HistogrammeSatisfaction data={reponsesList}/>
                          <RadarQualite data={radarData || []}/>
                        </>)}
                    </div>

                    <section>
                      <div className="mb-4 flex items-center gap-2">
                        <Store className="size-5 text-secondary"/>
                        <h2 className="text-lg font-bold text-foreground font-satoshi">Où se situe le problème ({labelPeriode})</h2>
                      </div>
                      {loadingGuichets ? (<ClassementGuichetsSkeleton />) : (<ClassementGuichets data={guichetsList}/>)}
                    </section>

                    <section>
                      <div className="mb-4 flex items-center gap-2">
                        <Clock className="size-5 text-secondary"/>
                        <h2 className="text-lg font-bold text-foreground font-satoshi">Quand les avis arrivent-ils</h2>
                      </div>
                      <HeatmapReponses data={heatmap} isLoading={loadingHeatmap}/>
                    </section>

                    <section>
                      <div className="mb-4 flex items-center gap-2">
                        <TrendingUp className="size-5 text-primary"/>
                        <h2 className="text-lg font-bold text-foreground font-satoshi">Évolution mensuelle</h2>
                      </div>
                      {loadingTendance ? (<TendanceMensuelleSkeleton />) : (<TendanceMensuelle data={tendanceList}/>)}
                    </section>

                    {agentsList.length > 0 && (<section>
                        <div className="mb-4 flex items-center gap-2">
                          <Users className="size-5 text-secondary"/>
                          <h2 className="text-lg font-bold text-foreground font-satoshi">Performance par agent ({labelPeriode})</h2>
                        </div>
                        {loadingAgents ? (<ComparaisonAgentsSkeleton />) : (<ComparaisonAgents data={agentsList}/>)}
                      </section>)}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </section>

          {/* Derniers avis — réservé aux rôles autorisés (la DIRECTION ne
            voit jamais les verbatims, RG16/RG17). Pour elle, cette section
            est remplacée par le bloc de synthèse directionnel ci-dessous. */}
          {!isLoading && !estDirection && (<section>
              <div className="mb-4 flex items-center justify-between">
                <Eyebrow tone="amber">Derniers retours enregistrés</Eyebrow>
                <div className="flex items-center gap-3">
                  {avisGroupes.length > 0 && (<span className="rounded-full bg-primary/10 border border-primary/20 px-3 py-1 text-xs font-bold text-primary">
                      {avisGroupes.length} avis
                    </span>)}
                  <WaspRouterLink to={routes.AvisRoute.to} className="flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors">
                    Voir tout <ChevronRight className="size-3.5"/>
                  </WaspRouterLink>
                </div>
              </div>

              {avisGroupes.length > 0 ? (<DataTable headers={['Note moyenne', 'Guichet', 'Critères', 'Date', '']}>
                  {avisGroupes.slice(0, 5).map((avis) => {
                    const premiere = avis.reponses[0];
                    return (<DataTableRow key={avis.id_soumission ?? premiere.id} onClick={() => navigate(routes.AvisRoute.to)}>
                        <td className="px-6 py-4">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-bold border ${avis.score_moyen <= 2
                            ? 'bg-destructive/10 text-destructive border-destructive/20'
                            : 'bg-success/10 text-success border-success/20'}`}>
                            {avis.score_moyen}/5
                          </span>
                        </td>
                        <td className="px-6 py-4 text-foreground font-medium">{premiere.guichet?.nom_guichet || 'Guichet inconnu'}</td>
                        <td className="px-6 py-4 text-muted-foreground">
                          {avis.reponses.map((r) => r.critere?.libelle_critere).filter(Boolean).join(', ') || 'Critère inconnu'}
                        </td>
                        <td className="px-6 py-4 text-muted-foreground">{new Date(premiere.date_reponse).toLocaleDateString()}</td>
                        <td className="px-6 py-4 text-right">
                          <ChevronRight className="ml-auto size-4 text-muted-foreground"/>
                        </td>
                      </DataTableRow>);
                })}
                </DataTable>) : (<EmptyState icon={Inbox} title="Aucun avis pour le moment" description="Dès que vos clients laisseront un retour, il apparaîtra ici avec les indicateurs associés."/>)}
            </section>)}

          {/* Synthèse DIRECTION : chiffres seulement, jamais de verbatim.
            Même en-tête visuel, contenu agrégé — la Direction voit le
            volume et l'état des actions, pas les retours individuels. */}
          {!isLoading && estDirection && (<section>
              <div className="mb-4 flex items-center justify-between">
                <Eyebrow tone="amber">Activité de la période ({labelPeriode})</Eyebrow>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-xl border border-border/60 bg-card/70 p-5">
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Avis reçus</p>
                  <p className="mt-2 text-3xl font-bold text-foreground font-satoshi">{totalAvisPeriode}</p>
                </div>
                <div className="rounded-xl border border-border/60 bg-card/70 p-5">
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Alertes nouvelles</p>
                  <p className="mt-2 text-3xl font-bold text-foreground font-satoshi">{alertesNouvelles}</p>
                </div>
                <div className="rounded-xl border border-border/60 bg-card/70 p-5">
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Tâches en cours</p>
                  <p className="mt-2 text-3xl font-bold text-foreground font-satoshi">
                    {tachesList.filter((t) => t.statut_tache !== 'TERMINEE').length}
                  </p>
                </div>
              </div>
            </section>)}
        </div>

        <div className="hidden">
          <RapportMensuelPrint ref={printRef} reponses={reponsesList} radarData={radarData || []} alertes={alertesList} taches={tachesList} themes={themesStats?.topThemes || []} guichets={guichetsList} agenceName={user?.agence?.nom_agence || (user?.id_agence ? `Agence #${user.id_agence}` : 'Mon Agence')} commune={user?.agence?.commune || ''} periodeLabel={periodeJours === 30 ? '30 derniers jours' : periodeJours === 1 ? '24 heures' : `${periodeJours} derniers jours`} dateDebut={(() => { const d = new Date(); d.setDate(d.getDate() - periodeJours); return d; })()} dateFin={new Date()} deltas={{
            satisfaction: kpisPeriode?.delta_satisfaction_pts ?? 0,
            note: kpisPeriode?.delta_note_pts ?? 0,
            volume: kpisPeriode?.delta_volume_pct ?? 0,
        }} tempsTraitement={tempsTraitement?.prise_en_charge || null}/>
        </div>
      </AmbientBackground>
    </RequireAuth>);
};
//# sourceMappingURL=DashboardPage.jsx.map