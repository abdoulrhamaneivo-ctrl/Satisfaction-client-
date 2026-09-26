import React, { useRef, useState, useCallback } from 'react';
import {
  useQuery,
  getReponses,
  getRadarStats,
  getAlertes,
  getTachesCorrectives,
  getTendanceMensuelle,
  getStatsByAgent,
  getStatsByGuichet,
  getActionsPrioritaires,
  getKPIsPeriode,
  getObjectifs,
  getHeatmapReponses,
  getComparaisonAgences,
  getTempsTraitement,
  getThemesStats,
  getIndicateursExperience,
} from 'wasp/client/operations';
import { useAuth } from 'wasp/client/auth';
import { Link as WaspRouterLink, routes } from 'wasp/client/router';
import { useNavigate } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import { motion } from 'framer-motion';
import { LayoutDashboard, Printer, Smile, MessageSquare, Star, Inbox, AlertTriangle, TrendingUp, Users, Target, Store, FileSpreadsheet, Loader2, Clock, Timer, CheckCircle2, ChevronRight, Tag, Gauge, Scale } from 'lucide-react';
import { HistogrammeSatisfaction, RadarQualite, TendanceMensuelle, ComparaisonAgents, ClassementGuichets, HistogrammeSatisfactionSkeleton, RadarQualiteSkeleton, TendanceMensuelleSkeleton, ComparaisonAgentsSkeleton, ClassementGuichetsSkeleton, HeatmapReponsesSkeleton, ChartSkeleton } from '../components/DashboardCharts';
import { HeatmapReponses } from '../components/HeatmapReponses';
import { RapportMensuelPrint } from '../components/RapportMensuelPrint';
import { RapportReseauPrint } from '../components/RapportReseauPrint';
import { AmbientBackground } from '../components/AmbientBackground';
import { PageHeader } from '../components/PageHeader';
import { DashboardSummary } from '../components/DashboardSummary';
import { StatCard } from '../components/StatCard';
import { EmptyState } from '../components/EmptyState';
import { Button } from '../components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { RequireAuth } from '../components/RequireAuth';
import { RequireEnterpriseRole } from "../components/RequireEnterpriseRole";
import { PageShell, PageTopNav } from '../components/PageShell';
import { DataTable, DataTableRow } from '../components/ui/DataTable';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../components/ui/accordion';
import { ActionsPrioritaires } from '../components/ActionsPrioritaires';
import { ObjectifsProgress } from '../components/ObjectifsProgress';
import { regrouperAvisParSoumission, scoreNormaliseSur5Client, decrireReponseCourte } from '../utils';
import { exportToXLSX } from '../utils/exportData';
import { useBrand } from '../context/BrandContext';
import { Eyebrow, Reveal, Card } from '../components/ds';
import { THEMES_LABELS } from '../components/AIAnalysisBadge';

const formatDelta = (value: number, suffix: string) =>
  `${value > 0 ? '+' : ''}${value}${suffix}`;

const formatDuree = (heures: number | null) => {
  if (heures === null) return '—';
  if (heures < 24) return `${heures}h`;
  const jours = Math.floor(heures / 24);
  const reste = Math.round(heures % 24);
  return reste > 0 ? `${jours}j ${reste}h` : `${jours}j`;
};

export const DashboardPage = () => {
  const { data: user } = useAuth();
  const navigate = useNavigate();
  // Nom de l'entreprise pour les documents (exports, rapport imprimé).
  const { brandConfig } = useBrand();
  const nomEntrepriseDocs = brandConfig?.platform_name || 'Yeba';

  const [periodeJours, setPeriodeJours] = useState(30);

  // CONFIDENTIALITÉ MÉTIER (RG16/RG17 — Doc 08) : seule la DIRECTION pure
  // est refusée à getReponses — la cumulée charge les réponses comme un chef.
  const estDirection = user?.role === 'DIRECTION';
  const estDirectionPure = estDirection && (user as any)?.id_agence == null;
  const { data: reponses, isLoading: loadingReponses } = useQuery(
    getReponses,
    undefined,
    { enabled: !estDirectionPure }
  );
  const { data: radarData, isLoading: loadingRadar } = useQuery(getRadarStats);
  const { data: alertes, isLoading: loadingAlertes } = useQuery(getAlertes);
  const { data: taches, isLoading: loadingTaches } = useQuery(getTachesCorrectives);
  const { data: tendance, isLoading: loadingTendance } = useQuery(getTendanceMensuelle);
  const { data: statsByAgent, isLoading: loadingAgents } = useQuery(getStatsByAgent, { nbJours: periodeJours });
  const { data: statsByGuichet, isLoading: loadingGuichets } = useQuery(getStatsByGuichet, { nbJours: periodeJours });
  // Anti-400 : les comptes plateforme purs (sans tenant) font rejeter les
  // queries scopées entreprise en boucle — on ne les lance que si
  // l'utilisateur est rattaché à une entreprise ou une agence.
  const aUnTenant = Boolean((user as any)?.id_entreprise ?? (user as any)?.id_agence);
  const { data: actionsPrioritaires, isLoading: loadingActions } = useQuery(
    getActionsPrioritaires,
    undefined,
    { enabled: aUnTenant }
  );
  const { data: kpisPeriode, isLoading: loadingKpis } = useQuery(getKPIsPeriode, { nbJours: periodeJours });
  const { data: objectifs, isLoading: loadingObjectifs } = useQuery(getObjectifs);
  // PERFORMANCE (FIX 05/09) : la heatmap 90 jours est lourde côté Neon et
  // peu consultée — chargée seulement quand sa section est visible
  // (IntersectionObserver ci-dessous). Idem temps de traitement.
  const [refHeatmap, visibleHeatmap] = useVisibleOnce<HTMLDivElement>();
  const [refTemps, visibleTemps] = useVisibleOnce<HTMLDivElement>();
  const { data: heatmap, isLoading: loadingHeatmap } = useQuery(
    getHeatmapReponses,
    { nbJours: 90 },
    { enabled: visibleHeatmap } as any,
  );
  const { data: comparaisonAgences } = useQuery(
    getComparaisonAgences,
    { nbJours: periodeJours },
    { enabled: estDirection } // requete reservee DIRECTION (403 sinon pour les autres roles)
  );
    const { data: tempsTraitement, isLoading: loadingTemps } = useQuery(
    getTempsTraitement,
    { nbJours: periodeJours },
    { enabled: !loadingKpis } as any, // différé : après le premier écran (KPI)
  );
  const { data: themesStats, isLoading: loadingThemes } = useQuery(getThemesStats, { nbJours: periodeJours });
  // Vague 1 Phase I (§49, zone 1) : même moteur que l'IA globale — une
  // seule vérité statistique pour le dashboard et les synthèses.
  const { data: experience, isLoading: loadingExperience } = useQuery(
    getIndicateursExperience,
    { nbJours: periodeJours },
    { enabled: aUnTenant } as any,
  );

  const reponsesList: any[] = reponses || [];
  const avisGroupes = regrouperAvisParSoumission(reponsesList);
  const alertesList: any[] = alertes || [];
  const tachesList: any[] = taches || [];
  const tendanceList: any[] = tendance || [];
  const agentsList: any[] = statsByAgent || [];
  const guichetsList: any[] = statsByGuichet || [];
  const objectifsList: any[] = objectifs || [];

  const isLoading = loadingReponses || loadingRadar || loadingAlertes || loadingTaches;

  const periodeActuelle = kpisPeriode?.periode_actuelle;
  const satisfaction = periodeActuelle ? periodeActuelle.satisfaction.toFixed(0) : '0';
  const noteMoyenne = periodeActuelle ? periodeActuelle.moyenne.toFixed(1) : '0.0';
  const totalAvisPeriode = periodeActuelle ? periodeActuelle.nb : 0;
  const labelPeriode = periodeJours === 1 ? '24h' : `${periodeJours}j`;

  const alertesNouvelles = alertesList.filter((a: any) => a.statut_alerte === 'NOUVELLE').length;

  // Vague 1 Phase I : NPS scopé (null = pas de question NPS sur la période).
  // Le volume l'accompagne : l'export doit afficher la base (n) du NPS, sinon
  // un indice calculé sur 3 réponses se lit comme un indice sur 300.
  const npsAgregat: { nps: number; volume: number } | null =
    (experience as any)?.agregats?.nps && typeof (experience as any).agregats.nps.nps === 'number'
      ? {
          nps: (experience as any).agregats.nps.nps,
          volume: (experience as any).agregats.nps.volume ?? 0,
        }
      : null;

  const deltaSatisfaction = kpisPeriode?.delta_satisfaction_pts ?? 0;
  const deltaNote = kpisPeriode?.delta_note_pts ?? 0;
  const deltaVolume = kpisPeriode?.delta_volume_pct ?? 0;

  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Rapport-Mensuel-Yeba-${user?.id_agence || 'Agence'}`,
  });
  // Impression réseau (Direction) : contenu 100 % agrégé, pas de verbatims.
  const printRefReseau = useRef<HTMLDivElement>(null);
  const handlePrintReseau = useReactToPrint({
    contentRef: printRefReseau,
    documentTitle: `Rapport-Reseau-Yeba-${new Date().toISOString().split('T')[0]}`,
  });

  const [exportingXLSX, setExportingXLSX] = useState(false);
  const handleExportXLSX = useCallback(async () => {
    setExportingXLSX(true);
    try {
      await exportToXLSX(
        [
          // Confidentialité : la Direction ne reçoit jamais les verbatims —
          // sa feuille « Avis » est remplacée par la comparaison des agences.
          ...(estDirection
            ? [
                {
                  name: 'Comparaison agences',
                  data: (comparaisonAgences?.agences || []).map((a: any) => ({
                    'Agence': a.nom_agence,
                    'Commune': a.commune || '',
                    'Nb avis': a.nb_avis ?? 0,
                    'Note moyenne (/5)': a.score_moyen ?? '—',
                    'Tendance note': a.delta_note ?? '—',
                    'Taux satisfaction (%)': a.taux_satisfaction ?? '—',
                  })),
                },
              ]
            : [
                {
                  name: 'Avis clients',
                  data: avisGroupes.map((a) => ({
              'Date & Heure': a.reponses[0]?.date_reponse ? new Date(a.reponses[0].date_reponse).toLocaleString('fr-FR') : 'Non renseigné',
              'Guichet': a.reponses[0]?.guichet?.nom_guichet || 'Guichet principal',
              'Service': a.reponses[0]?.service?.libelle_service || 'Général',
              'Note moyenne (/5)': (() => {
                const notes = a.reponses.map((r: any) => scoreNormaliseSur5Client(r)).filter((s): s is number => s !== null);
                return notes.length > 0 ? Number((notes.reduce((s: number, v: number) => s + v, 0) / notes.length).toFixed(2)) : 'N/A';
              })(),
              'Détail critères': a.reponses.map((r: any) => decrireReponseCourte(r)).join(' | '),
              'Commentaire': a.reponses[0]?.commentaire_texte && a.reponses[0].commentaire_texte.trim() !== '' ? a.reponses[0].commentaire_texte.trim() : 'Aucun commentaire écrit',
            })),
              },
            ]
          ),
          {
            name: 'Alertes',
            data: alertesList.map((a: any) => ({
              'Date d\'alerte': a.date_creation ? new Date(a.date_creation).toLocaleString('fr-FR') : 'N/A',
              'Type d\'incident': a.type_alerte || 'Note insatisfaisante',
              'Statut': a.statut_alerte === 'TRAITEE' ? 'Traitée' : 'En attente',
              'Guichet concerné': a.guichet?.nom_guichet || 'Guichet principal',
              'Date de résolution': a.date_traitement ? new Date(a.date_traitement).toLocaleString('fr-FR') : 'Non encore traitée',
            })),
          },
          {
            name: 'Taches correctives',
            data: tachesList.map((t: any) => ({
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
          // Phase L : indicateurs d'expérience, avec leur dénominateur. Une
          // mesure absente vaut « N/A » (jamais 0 %) : le lecteur ne doit
          // jamais lire « 0 % d'effort élevé » là où on n'a rien mesuré.
          {
            name: 'Expérience',
            data: experience?.agregats
              ? [
                  {
                    Indicateur: 'CSAT (/100)',
                    Valeur: experience.agregats.csat != null ? experience.agregats.csat : 'N/A',
                    'Base (n)': experience.agregats.volumeNotables,
                    Formule: 'moyenne(score_normalise) des réponses notables',
                    Source: 'Réponses',
                  },
                  {
                    Indicateur: 'NPS',
                    Valeur: npsAgregat ? npsAgregat.nps : 'N/A',
                    'Base (n)': npsAgregat ? npsAgregat.volume : 0,
                    Formule: '% promoteurs (9-10) − % détracteurs (0-6)',
                    Source: 'Réponses',
                  },
                  {
                    Indicateur: 'Indice global (/100)',
                    Valeur: experience.indice?.indice != null ? experience.indice.indice : 'N/A',
                    'Base (n)': experience.agregats.volumeAvis,
                    Formule: experience.indice?.formule ?? '—',
                    Source: 'Réponses',
                  },
                  {
                    Indicateur: 'Qualité des données (/100)',
                    Valeur: experience.agregats.qualiteDonnees,
                    'Base (n)': experience.agregats.totalAnalyses,
                    Formule: 'notables + commentées + cohérence IA',
                    Source: 'Mixte',
                  },
                  {
                    Indicateur: experience.agregats.ces
                      ? `CES — top box faible effort (%) (échelle 1-${experience.agregats.ces.echelle})`
                      : 'CES — top box faible effort (%)',
                    Valeur: experience.agregats.ces ? Math.round(experience.agregats.ces.top_box * 10) / 10 : 'N/A',
                    'Base (n)': experience.agregats.ces ? experience.agregats.ces.volume : 0,
                    Formule: experience.agregats.ces
                      ? '1 = très facile ; top box = 1-2 (1-5) ou 1-3 (1-7)'
                      : 'aucune question d\'effort (CES) sur la période',
                    Source: 'Réponses',
                  },
                  {
                    Indicateur: experience.agregats.ces
                      ? `CES — note d'effort moyenne (1-${experience.agregats.ces.echelle}, 1 = très facile)`
                      : 'CES — note d\'effort moyenne',
                    Valeur: experience.agregats.ces ? experience.agregats.ces.note_effort_moyenne : 'N/A',
                    'Base (n)': experience.agregats.ces ? experience.agregats.ces.volume : 0,
                    Formule: 'moyenne(score_officiel) des réponses CES',
                    Source: 'Réponses',
                  },
                  {
                    Indicateur: 'CES — effort élevé (%)',
                    Valeur: experience.agregats.ces ? Math.round(experience.agregats.ces.taux_effort_eleve * 10) / 10 : 'N/A',
                    'Base (n)': experience.agregats.ces ? experience.agregats.ces.volume : 0,
                    Formule: experience.agregats.ces
                      ? '4-5 (1-5) ou 6-7 (1-7)'
                      : 'aucune question d\'effort (CES) sur la période',
                    Source: 'Réponses',
                  },
                ]
              : [],
          },
        ],
        `Yeba_Rapport_Complet_${new Date().toISOString().split('T')[0]}`,
        { entreprise: nomEntrepriseDocs, periode: labelPeriode }
      );
    } catch (err: any) {
      console.error('Erreur export XLSX', err);
    } finally {
      setExportingXLSX(false);
    }
  }, [avisGroupes, alertesList, tachesList, kpisPeriode, periodeActuelle, labelPeriode, nomEntrepriseDocs, estDirection, comparaisonAgences, experience, npsAgregat]);

  return (
    <RequireEnterpriseRole>
      <RequireAuth>
      <AmbientBackground>
        <PageShell>
          <PageTopNav
            racine="Agences"
            agence={(user as any)?.agence?.nom_agence || "Agence Principale"}
            actuel="Tableau de bord"
            onglets={[
              { label: 'Tableau synthétique', to: '/dashboard' },
              { label: 'Kanban Incidents', to: '/alertes-taches' },
              { label: 'Guichets & Kits', to: '/guichets' },
            ]}
          />

          <Reveal direction="down">
            <PageHeader
              icon={LayoutDashboard}
              eyebrow="Vue d'ensemble"
              title="Tableau de bord"
              description={
                user?.role === 'DIRECTION'
                  ? "Vue entreprise : suivi consolidé de toutes vos agences."
                  : `Vue agence : données de ${(user as any)?.agence?.nom_agence || 'votre agence'} en temps réel.`
              }
              actions={
                <div className="flex items-center gap-2 flex-wrap">
                  <Select value={String(periodeJours)} onValueChange={(v) => setPeriodeJours(Number(v))}>
                    <SelectTrigger className="h-10 w-44 rounded-xl border-border/80 bg-card/80 font-semibold shadow-sm" aria-label="Période analysée">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-border/80 shadow-premium">
                      <SelectItem value="7">7 derniers jours</SelectItem>
                      <SelectItem value="30">30 derniers jours</SelectItem>
                      <SelectItem value="90">90 derniers jours</SelectItem>
                    </SelectContent>
                  </Select>
                  <motion.div whileTap={{ scale: 0.97 }}>
                    <Button variant="outline" onClick={() => (estDirection ? handlePrintReseau() : handlePrint())} disabled={isLoading} className="rounded-xl border-border/80 font-bold">
                      <Printer className="size-4" /> Exporter (PDF)
                    </Button>
                  </motion.div>
                  <motion.div whileTap={{ scale: 0.97 }}>
                    <Button variant="outline" onClick={handleExportXLSX} disabled={isLoading || exportingXLSX} className="rounded-xl border-border/80 font-bold">
                      {exportingXLSX ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <FileSpreadsheet className="size-4" />
                      )}
                      Exporter XLSX
                    </Button>
                  </motion.div>
                </div>
              }
            />
          </Reveal>

          <Reveal delay={0.05}>
            <DashboardSummary
              prenom={(user as any)?.prenom}
              satisfaction={Number(satisfaction)}
              totalAvis={totalAvisPeriode}
              alertesNouvelles={alertesNouvelles}
              tachesEnRetard={actionsPrioritaires?.tachesEnRetard?.length ?? 0}
              labelPeriode={labelPeriode}
              isLoading={loadingKpis || loadingActions}
            />
          </Reveal>

          {user?.role === 'DIRECTION' && (
            <p className="text-xs text-muted-foreground font-medium">
              Vue Entreprise : ces chiffres sont cumulés sur l'ensemble du réseau.
            </p>
          )}

          {user?.role !== 'DIRECTION' && (user as any)?.agence?.nom_agence && (
            <p className="text-xs text-muted-foreground font-medium">
              Vue Agence : ces chiffres ne portent que sur {(user as any).agence.nom_agence}.
            </p>
          )}

          {/* ZONE 1 — Expérience client (§49, vague 1 Phase I) : indice
              global, CSAT, NPS, volume, confiance. Chaque chiffre porte sa
              définition (survol) : formule + source + période. */}
          {experience?.agregats && (
            <section aria-label="Expérience client">
              <div className="mb-4 flex items-center gap-2">
                <LayoutDashboard className="size-5 text-primary-strong" />
                <h2 className="text-xl font-bold text-foreground font-satoshi">
                  Expérience client ({labelPeriode})
                </h2>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5 lg:gap-5">
                <div title={`Indice global : ${experience.indice?.formule ?? '—'} — Source : réponses notables.`}>
                  <StatCard
                    title="Indice global"
                    value={loadingExperience ? '…' : experience.indice?.indice != null ? `${experience.indice.indice}/100` : 'N/A'}
                    icon={LayoutDashboard}
                    accent="primary"
                    index={0}
                  />
                </div>
                <div title="CSAT : moyenne des scores normalisés /100 des réponses notables.">
                  <StatCard
                    title="CSAT"
                    value={loadingExperience ? '…' : experience.agregats.csat != null ? `${experience.agregats.csat}/100` : 'N/A'}
                    icon={Smile}
                    accent="success"
                    index={1}
                    trend={experience.agregats.evolutionCsatPts != null ? formatDelta(experience.agregats.evolutionCsatPts, ' pts') : undefined}
                    trendDirection={(experience.agregats.evolutionCsatPts ?? 0) >= 0 ? 'up' : 'down'}
                  />
                </div>
                <div title="NPS : % promoteurs − % détracteurs (jamais une moyenne). N/A sans question NPS.">
                  <StatCard
                    title="NPS"
                    value={loadingExperience ? '…' : npsAgregat ? `${npsAgregat.nps >= 0 ? '+' : ''}${npsAgregat.nps}` : 'N/A'}
                    icon={TrendingUp}
                    accent="secondary"
                    index={2}
                  />
                </div>
                <div title="Volumes : avis = soumissions distinctes ; commentaires = lignes avec texte.">
                  <StatCard
                    title="Volume"
                    value={loadingExperience ? '…' : `${experience.agregats.volumeAvis} avis`}
                    icon={MessageSquare}
                    accent="primary"
                    index={3}
                    trend={experience.agregats.evolutionVolumePct != null ? formatDelta(experience.agregats.evolutionVolumePct, '%') : undefined}
                    trendDirection={(experience.agregats.evolutionVolumePct ?? 0) >= 0 ? 'up' : 'down'}
                  />
                </div>
                <div
                  title={
                    `Confiance : volume + qualité + cohérence. Qualité des données : ${experience.agregats.qualiteDonnees}/100.` +
                    // Vague 6 : le détail était déjà calculé et transporté,
                    // mais jamais montré. Un score sans ses composantes oblige
                    // à deviner la formule pour répondre à « pourquoi ? ».
                    (experience.agregats.qualiteDonneesDetails
                      ? ` Détail : ${experience.agregats.qualiteDonneesDetails.notables} % notables · ` +
                        `${experience.agregats.qualiteDonneesDetails.commentaires} % commentées · ` +
                        `${experience.agregats.qualiteDonneesDetails.coherence} % cohérence · ` +
                        `${experience.agregats.qualiteDonneesDetails.fraicheur_legacy} % fraîcheur · ` +
                        `${experience.agregats.qualiteDonneesDetails.volume} % volume.`
                      : '')
                  }
                >
                  <StatCard
                    title="Confiance"
                    value={loadingExperience ? '…' : experience.agregats.confiance === 'ELEVEE' ? 'Élevée' : experience.agregats.confiance === 'MOYENNE' ? 'Moyenne' : 'Faible'}
                    icon={CheckCircle2}
                    accent={experience.agregats.confiance === 'ELEVEE' ? 'success' : 'secondary'}
                    index={4}
                  />
                </div>
              </div>

              {/* Principal irritant : synthèse IA si disponible, sinon top thème live. */}
              {(() => {
                const analyse = experience.derniereAnalyse;
                const topLive = experience.agregats.themesTop?.[0];
                const irritant = analyse?.irritants?.[0];
                if (!irritant && !topLive) return null;
                return (
                  <div className="mt-4 rounded-2xl border border-warning/30 bg-warning/5 p-4">
                    <p className="text-[11px] font-black uppercase tracking-widest text-warning-strong">
                      Principal irritant
                    </p>
                    {irritant ? (
                      <p className="mt-1 text-sm font-bold text-foreground">
                        {irritant.theme} — priorité {irritant.priorite}/100
                        <span className="ml-2 text-xs font-medium text-muted-foreground">
                          {irritant.constat} · confiance {irritant.confiance}
                        </span>
                      </p>
                    ) : (
                      <p className="mt-1 text-sm font-bold text-foreground">
                        {topLive.theme} — {topLive.count} mention{topLive.count > 1 ? 's' : ''}
                        <span className="ml-2 text-xs font-medium text-muted-foreground">
                          estimation live (en attente de la synthèse IA du lundi)
                        </span>
                      </p>
                    )}
                    {analyse?.resumeExecutif && (
                      <p className="mt-2 text-xs text-muted-foreground font-medium italic">
                        « {analyse.resumeExecutif} »
                      </p>
                    )}
                  </div>
                );
              })()}

              {/* Phase L — effort perçu : top box (1 = très facile) + part
                  d'effort élevé. N/A tant qu'aucune question CES n'est active. */}
              {experience.agregats.ces && experience.agregats.ces.volume > 0 && (
                <div className="mt-4 grid gap-4 sm:grid-cols-3">
                  <StatCard
                    title="Effort perçu (top box)"
                    value={loadingExperience ? '…' : `${Math.round(experience.agregats.ces.top_box)} %`}
                    icon={Gauge}
                    accent="success"
                    index={0}
                  />
                  <StatCard
                    title={`CES moyen (1 = très facile, max ${experience.agregats.ces.echelle})`}
                    value={loadingExperience ? '…' : experience.agregats.ces.note_effort_moyenne != null ? `${experience.agregats.ces.note_effort_moyenne}/${experience.agregats.ces.echelle}` : 'N/A'}
                    icon={Scale}
                    accent="secondary"
                    index={1}
                  />
                  <StatCard
                    title="Effort élevé"
                    value={loadingExperience ? '…' : `${Math.round(experience.agregats.ces.taux_effort_eleve)} %`}
                    icon={AlertTriangle}
                    accent={experience.agregats.ces.taux_effort_eleve > 25 ? 'destructive' : 'primary'}
                    index={2}
                  />
                </div>
              )}

              <p className="mt-3 text-xs text-muted-foreground font-medium">
                Cohérence note/texte :{' '}
                {experience.agregats.totalAnalyses > 0
                  ? `${Math.round((1 - experience.agregats.tauxIncoherence) * 100)} % cohérents sur ${experience.agregats.totalAnalyses} analyses`
                  : 'aucune analyse IA sur la période'}
                {' · '}Données exploitables : {experience.agregats.qualiteDonnees}/100
                {' · '}Commentaires : {experience.agregats.volumeCommentaires}
              </p>
            </section>
          )}

          {/* NIVEAU 1 — Quoi faire aujourd'hui */}
          <section id="actions-prioritaires">
            <ActionsPrioritaires
              alertesNouvelles={actionsPrioritaires?.alertesNouvelles ?? []}
              tachesEnRetard={actionsPrioritaires?.tachesEnRetard ?? []}
              isLoading={loadingActions}
            />
          </section>

          {/* NIVEAU 2 — KPIs exécutifs */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
            <StatCard
              title={`Satisfaction (${labelPeriode})`}
              value={`${satisfaction}%`}
              icon={Smile}
              accent="success"
              index={0}
              trend={!loadingKpis ? formatDelta(deltaSatisfaction, ' pts') : undefined}
              trendDirection={deltaSatisfaction >= 0 ? 'up' : 'down'}
            />
            <StatCard
              title={`Total Avis (${labelPeriode})`}
              value={String(totalAvisPeriode)}
              icon={MessageSquare}
              accent="primary"
              index={1}
              trend={!loadingKpis ? formatDelta(deltaVolume, '%') : undefined}
              trendDirection={deltaVolume >= 0 ? 'up' : 'down'}
            />
            <StatCard
              title={`Note Moyenne (${labelPeriode})`}
              value={`${noteMoyenne} / 5`}
              icon={Star}
              accent="secondary"
              index={2}
              trend={!loadingKpis ? formatDelta(deltaNote, ' pts') : undefined}
              trendDirection={deltaNote >= 0 ? 'up' : 'down'}
            />
            <StatCard
              title="Alertes nouvelles"
              value={String(alertesNouvelles)}
              icon={AlertTriangle}
              accent={alertesNouvelles > 0 ? 'destructive' : 'success'}
              index={3}
            />
          </div>

          {/* Objectifs */}
          <section>
            <div className="mb-4 flex items-center gap-2">
              <Target className="size-5 text-primary-strong" />
              <h2 className="text-xl font-bold text-foreground font-satoshi">Objectifs de satisfaction</h2>
            </div>
            {loadingObjectifs ? (
              <ChartSkeleton variant="horizontalBar" heightClass="h-40" label="Chargement des objectifs de satisfaction" />
            ) : (
              <ObjectifsProgress data={objectifsList} />
            )}
          </section>

          {/* Thèmes récurrents — valeur ajoutée : de quoi se plaignent les clients */}
          <section>
            <div className="mb-4 flex items-center gap-2">
              <Tag className="size-5 text-primary-strong" />
              <h2 className="text-lg font-bold text-foreground font-satoshi">Thèmes récurrents ({labelPeriode})</h2>
            </div>
            {loadingThemes ? (
              <ChartSkeleton variant="horizontalBar" heightClass="h-40" label="Chargement des thèmes récurrents" />
            ) : themesStats?.topThemes?.length ? (
              <Card className="p-6">
                {/* Chips de thèmes façon Stitch : pastilles colorées alternées
                    vert/jaune avec barre de progression intégrée, plus lisibles
                    que l'ancienne liste de barres grises. */}
                <div className="flex flex-wrap gap-2.5">
                  {themesStats.topThemes.slice(0, 6).map(({ theme, count }, i) => {
                    const pct = themesStats.total > 0 ? Math.round((count / themesStats.total) * 100) : 0;
                    const isYellow = i % 2 === 1;
                    return (
                      <span
                        key={theme}
                        title={`${count} mention${count > 1 ? 's' : ''} (${pct}%)`}
                        className={`relative inline-flex items-center gap-2 overflow-hidden rounded-full border px-3.5 py-1.5 text-xs font-semibold text-foreground transition-colors ${
                          isYellow
                            ? 'border-warning/30 bg-warning/10 hover:bg-warning/20'
                            : 'border-primary/25 bg-primary/10 hover:bg-primary/20'
                        }`}
                      >
                        {/* Barre de progression comme fond de la chip */}
                        <span
                          aria-hidden
                          className={`absolute inset-y-0 left-0 ${isYellow ? 'bg-warning/25' : 'bg-primary/15'}`}
                          style={{ width: `${Math.max(pct, 8)}%` }}
                        />
                        <span className="relative font-medium">{THEMES_LABELS[theme] ?? theme}</span>
                        <span className="relative tabular-nums text-muted-foreground">{count}</span>
                      </span>
                    );
                  })}
                </div>
              </Card>
            ) : (
              <EmptyState icon={Tag} title="Aucun thème analysé" description="Les thèmes apparaîtront ici dès que l'IA aura analysé des commentaires clients." />
            )}
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
                      <StatCard
                        title={`Prise en charge moyenne (${labelPeriode})`}
                        value={formatDuree(tempsTraitement?.prise_en_charge?.moyenne_heures ?? null)}
                        icon={Timer}
                        accent="secondary"
                        index={4}
                        trend={
                          !loadingTemps && tempsTraitement?.prise_en_charge?.delta_heures !== null
                            ? formatDelta(tempsTraitement?.prise_en_charge?.delta_heures ?? 0, 'h')
                            : undefined
                        }
                        trendDirection={(tempsTraitement?.prise_en_charge?.delta_heures ?? 0) <= 0 ? 'up' : 'down'}
                      />
                      <StatCard
                        title={`Résolution moyenne (${labelPeriode})`}
                        value={formatDuree(tempsTraitement?.resolution?.moyenne_heures ?? null)}
                        icon={CheckCircle2}
                        accent="primary"
                        index={5}
                        trend={
                          !loadingTemps && tempsTraitement?.resolution?.delta_heures !== null
                            ? formatDelta(tempsTraitement?.resolution?.delta_heures ?? 0, 'h')
                            : undefined
                        }
                        trendDirection={(tempsTraitement?.resolution?.delta_heures ?? 0) <= 0 ? 'up' : 'down'}
                      />
                    </div>

                      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                        {isLoading ? (
                          <>
                            <HistogrammeSatisfactionSkeleton />
                            <RadarQualiteSkeleton />
                          </>
                        ) : (
                          <>
                            {/* L'histogramme lit les réponses brutes (403 Direction) :
                                on ne l'affiche que hors Direction pour éviter
                                une zone fantôme vide. Le radar est agrégé. */}
                            {!estDirection && <HistogrammeSatisfaction data={reponsesList} />}
                            <RadarQualite data={radarData || []} />
                          </>
                        )}
                      </div>

                    <section>
                      <div className="mb-4 flex items-center gap-2">
                        <Store className="size-5 text-secondary" />
                        <h2 className="text-lg font-bold text-foreground font-satoshi">Où se situe le problème ({labelPeriode})</h2>
                      </div>
                      {loadingGuichets ? (
                        <ClassementGuichetsSkeleton />
                      ) : (
                        <ClassementGuichets data={guichetsList} />
                      )}
                    </section>

                    <section ref={refHeatmap as any}>
                      <div className="mb-4 flex items-center gap-2">
                        <Clock className="size-5 text-secondary" />
                        <h2 className="text-lg font-bold text-foreground font-satoshi">Quand les avis arrivent-ils</h2>
                      </div>
                      <HeatmapReponses data={heatmap as any} isLoading={loadingHeatmap} />
                    </section>

                    <section>
                      <div className="mb-4 flex items-center gap-2">
                        <TrendingUp className="size-5 text-primary-strong" />
                        <h2 className="text-lg font-bold text-foreground font-satoshi">Évolution mensuelle</h2>
                      </div>
                      {loadingTendance ? (
                        <TendanceMensuelleSkeleton />
                      ) : (
                        <TendanceMensuelle data={tendanceList} />
                      )}
                    </section>

                    {agentsList.length > 0 && (
                      <section>
                        <div className="mb-4 flex items-center gap-2">
                          <Users className="size-5 text-secondary" />
                          <h2 className="text-lg font-bold text-foreground font-satoshi">Performance par agent ({labelPeriode})</h2>
                        </div>
                        {loadingAgents ? (
                          <ComparaisonAgentsSkeleton />
                        ) : (
                          <ComparaisonAgents data={agentsList} />
                        )}
                      </section>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </section>

          {/* Derniers avis — réservé aux rôles autorisés (la DIRECTION pure
              ne voit jamais les verbatims, RG16/RG17 ; la cumulée oui). */}
          {!isLoading && !estDirectionPure && (
            <section>
              <div className="mb-4 flex items-center justify-between">
                <Eyebrow tone="amber">Derniers retours enregistrés</Eyebrow>
                <div className="flex items-center gap-3">
                  {avisGroupes.length > 0 && (
                    <span className="rounded-full bg-primary/10 border border-primary/20 px-3 py-1 text-xs font-bold text-primary-strong">
                      {avisGroupes.length} avis
                    </span>
                  )}
                  <WaspRouterLink
                    to={routes.AvisRoute.to}
                    className="flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors"
                  >
                    Voir tout <ChevronRight className="size-3.5" />
                  </WaspRouterLink>
                </div>
              </div>

              {avisGroupes.length > 0 ? (
                <DataTable headers={['Note moyenne', 'Guichet', 'Critères', 'Date', '']}>
                  {avisGroupes.slice(0, 5).map((avis) => {
                    const premiere = avis.reponses[0];
                    return (
                      <DataTableRow
                        key={avis.id_soumission ?? premiere.id}
                        onClick={() => navigate(routes.AvisRoute.to)}
                        // Vague 4 : la ligne devient focusable et activable
                        // au clavier ; l'icône seule ne suffisait pas à
                        // dire ce que fait la ligne.
                        aria-label={`Ouvrir l’avis du ${premiere.guichet?.nom_guichet || 'guichet inconnu'}, note ${avis.score_moyen ?? 'non chiffrée'}/5`}
                      >
                        <td className="px-6 py-4">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-bold border ${
                              avis.score_moyen == null
                                ? 'bg-muted text-muted-foreground border-border'
                                : avis.score_moyen <= 2
                                  ? 'bg-destructive/10 text-destructive-strong border-destructive/20'
                                  : 'bg-success/10 text-success-strong border-success/20'
                            }`}
                          >
                            {avis.score_moyen == null ? '—' : `${avis.score_moyen}/5`}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-foreground font-medium">{premiere.guichet?.nom_guichet || 'Guichet inconnu'}</td>
                        <td className="px-6 py-4 text-muted-foreground">
                          {avis.reponses.map((r: any) => r.critere?.libelle_critere).filter(Boolean).join(', ') || 'Critère inconnu'}
                        </td>
                        <td className="px-6 py-4 text-muted-foreground">{new Date(premiere.date_reponse).toLocaleDateString()}</td>
                        <td className="px-6 py-4 text-right">
                          <ChevronRight className="ml-auto size-4 text-muted-foreground" />
                        </td>
                      </DataTableRow>
                    );
                  })}
                </DataTable>
              ) : (
                <EmptyState
                  icon={Inbox}
                  title="Aucun avis pour le moment"
                  description="Dès que vos clients laisseront un retour, il apparaîtra ici avec les indicateurs associés."
                />
              )}
            </section>
          )}

          {/* Synthèse DIRECTION pure : chiffres seulement, jamais de verbatim.
              La cumulée voit les derniers avis ci-dessus comme un chef. */}
          {!isLoading && estDirectionPure && (
            <section>
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
                    {tachesList.filter((t: any) => t.statut_tache !== 'TERMINEE').length}
                  </p>
                </div>
              </div>
            </section>
          )}

          {/* SANTÉ DU RÉSEAU — DIRECTION uniquement (Doc 12).
              Le chef d'agence ne la voit pas : il pilote la sienne, la
              Direction pilote le portefeuille. Top/flop en tête, détail par
              agence avec tendance vs période précédente. Scores = moyenne
              par avis, jamais de verbatim. */}
          {!isLoading && estDirection && comparaisonAgences && comparaisonAgences.agences.length > 0 && (
            <section className="mt-6">
              <div className="mb-4 flex items-center justify-between">
                <Eyebrow tone="accent">Santé du réseau ({labelPeriode})</Eyebrow>
                {comparaisonAgences.moyenne_globale !== null && (
                  <span className="text-xs font-bold text-muted-foreground">
                    Moyenne globale : <span className="text-foreground">{comparaisonAgences.moyenne_globale}/5</span>
                  </span>
                )}
              </div>
              {(comparaisonAgences.meilleure_agence || comparaisonAgences.agence_a_surveiller) && (
                <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {comparaisonAgences.meilleure_agence && (() => {
                    const top = comparaisonAgences.agences.find((x: any) => x.nom_agence === comparaisonAgences.meilleure_agence && x.nb_avis > 0);
                    return top ? (
                      <div className="flex items-center gap-3 rounded-xl border border-success/30 bg-success/5 p-4">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-success/15 text-lg" aria-hidden>🏆</span>
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-success-strong">Top agence</p>
                          <p className="truncate text-sm font-bold text-foreground">{top.nom_agence} — {top.score_moyen}/5</p>
                        </div>
                      </div>
                    ) : null;
                  })()}
                  {comparaisonAgences.agence_a_surveiller && (() => {
                    const flop = comparaisonAgences.agences.find((x: any) => x.nom_agence === comparaisonAgences.agence_a_surveiller && x.nb_avis > 0);
                    return flop ? (
                      <div className="flex items-center gap-3 rounded-xl border border-warning/30 bg-warning/5 p-4">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-warning/15 text-lg" aria-hidden>⚠️</span>
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-warning-strong">À surveiller</p>
                          <p className="truncate text-sm font-bold text-foreground">{flop.nom_agence} — {flop.score_moyen}/5</p>
                        </div>
                      </div>
                    ) : null;
                  })()}
                </div>
              )}
              <div className="space-y-2">
                {comparaisonAgences.agences.map((a: any) => {
                  const max = Math.max(...comparaisonAgences.agences.map((x: any) => x.nb_avis || 0), 1);
                  const delta = a.delta_note;
                  return (
                    <div key={a.id_agence} className="rounded-xl border border-border/60 bg-card/70 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold font-satoshi text-foreground">
                            {a.nom_agence}
                            {comparaisonAgences.meilleure_agence === a.nom_agence && a.nb_avis > 0 && (
                              <span className="ml-2 rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-success-strong">Meilleure</span>
                            )}
                            {comparaisonAgences.agence_a_surveiller === a.nom_agence && a.nb_avis > 0 && comparaisonAgences.agences.filter((x: any) => x.nb_avis > 0).length > 1 && (
                              <span className="ml-2 rounded-full bg-warning/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-warning-strong">À surveiller</span>
                            )}
                          </p>
                          <p className="text-[11px] text-muted-foreground">{a.commune || '—'} · {a.nb_avis} avis</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-lg font-bold font-satoshi text-foreground">
                            {a.score_moyen !== null ? `${a.score_moyen}/5` : '—'}
                          </p>
                          <p className="text-[11px] font-semibold text-muted-foreground">
                            {a.taux_satisfaction !== null ? `${a.taux_satisfaction}% satisfaits` : ''}
                            {delta !== null && delta !== undefined && (
                              <span className={`ml-1.5 font-bold ${delta >= 0 ? 'text-success-strong' : 'text-destructive-strong'}`}>
                                {delta >= 0 ? '▲' : '▼'} {Math.abs(delta)}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      {a.score_moyen !== null && (
                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted/60">
                          <div
                            className={`h-full rounded-full ${a.score_moyen >= 4 ? 'bg-success' : a.score_moyen >= 3 ? 'bg-warning' : 'bg-destructive'}`}
                            style={{ width: `${(a.score_moyen / 5) * 100}%` }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* NOTES PAR OPÉRATION (FIX 05/09) : la séparation des opérations
              s'arrêtait à la collecte — ici la ventilation par opération sur
              la période (moyenne par avis, même méthode que le global).
              Agrégats seuls, aucun verbatim : visible Direction + Chef. */}
          {!isLoading && (kpisPeriode as any)?.par_operation?.length > 0 && (
            <section className="mt-6">
              <div className="mb-4 flex items-center justify-between">
                <Eyebrow tone="neutral">Notes par opération ({labelPeriode})</Eyebrow>
              </div>
              <div className="space-y-2">
                {((kpisPeriode as any).par_operation as any[]).map((o: any) => (
                  <div key={o.id ?? 'general'} className="rounded-xl border border-border/60 bg-card/70 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold font-satoshi text-foreground">
                          {o.libelle}
                        </p>
                        <p className="text-[11px] text-muted-foreground">{o.nb} avis</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-lg font-bold font-satoshi text-foreground">
                          {o.nb > 0 ? `${o.moyenne}/5` : '—'}
                        </p>
                        {o.nb > 0 && (
                          <p className="text-[11px] font-semibold text-muted-foreground">{o.satisfaction}% satisfaits</p>
                        )}
                      </div>
                    </div>
                    {o.nb > 0 && (
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted/60">
                        <div
                          className={`h-full rounded-full ${o.moyenne >= 4 ? 'bg-success' : o.moyenne >= 3 ? 'bg-warning' : 'bg-destructive'}`}
                          style={{ width: `${(o.moyenne / 5) * 100}%` }}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

        <div className="hidden">
          {estDirection ? (
            <RapportReseauPrint
              ref={printRefReseau}
              entrepriseName={nomEntrepriseDocs}
              periodeLabel={labelPeriode}
              dateDebut={(() => { const d = new Date(); d.setDate(d.getDate() - periodeJours); return d; })()}
              dateFin={new Date()}
              satisfaction={Number(satisfaction)}
              noteMoyenne={Number(noteMoyenne)}
              totalAvis={totalAvisPeriode}
              deltaSatisfaction={deltaSatisfaction}
              deltaNote={deltaNote}
              deltaVolume={deltaVolume}
              moyenneGlobale={comparaisonAgences?.moyenne_globale ?? null}
              meilleureAgence={comparaisonAgences?.meilleure_agence ?? null}
              agenceASurveiller={comparaisonAgences?.agence_a_surveiller ?? null}
              agences={comparaisonAgences?.agences || []}
              alertesNouvelles={alertesNouvelles}
              tachesEnCours={tachesList.filter((t: any) => t.statut_tache !== 'TERMINEE').length}
              themes={themesStats?.topThemes || []}
              ces={experience?.agregats?.ces ?? null}
            />
          ) : (
          <RapportMensuelPrint
            ref={printRef}
            reponses={reponsesList}
            radarData={radarData || []}
            alertes={alertesList}
            taches={tachesList}
            themes={themesStats?.topThemes || []}
            guichets={guichetsList}
            agenceName={(user as any)?.agence?.nom_agence || (user?.id_agence ? `Agence #${user.id_agence}` : 'Mon Agence')}
            commune={(user as any)?.agence?.commune || ''}
            entrepriseName={nomEntrepriseDocs}
            periodeLabel={periodeJours === 30 ? '30 derniers jours' : periodeJours === 1 ? '24 heures' : `${periodeJours} derniers jours`}
            dateDebut={(() => { const d = new Date(); d.setDate(d.getDate() - periodeJours); return d; })()}
            dateFin={new Date()}
            deltas={{
              satisfaction: kpisPeriode?.delta_satisfaction_pts ?? 0,
              note: kpisPeriode?.delta_note_pts ?? 0,
              volume: kpisPeriode?.delta_volume_pct ?? 0,
            }}
            tempsTraitement={tempsTraitement?.prise_en_charge || null}
            ces={experience?.agregats?.ces ?? null}
          />
          )}
        </div>
        </PageShell>
      </AmbientBackground>
    </RequireAuth>
      </RequireEnterpriseRole>
  );
};

/** PERFORMANCE : hook « visible une fois » — déclenche le chargement d'une
 *  query lourde seulement quand sa section entre dans le viewport (mobile :
 *  l'utilisateur ne voit qu'un tiers du dashboard au premier écran). */
function useVisibleOnce<T extends HTMLElement>(): [(node: T | null) => void, boolean] {
  const [visible, setVisible] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const ref = useCallback((node: T | null) => {
    observerRef.current?.disconnect();
    if (!node || visible) return;
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          observerRef.current?.disconnect();
        }
      },
      { rootMargin: '200px' },
    );
    observerRef.current.observe(node);
  }, [visible]);
  return [ref, visible];
}
