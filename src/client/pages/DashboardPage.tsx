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
} from 'wasp/client/operations';
import { useAuth } from 'wasp/client/auth';
import { useReactToPrint } from 'react-to-print';
import { motion } from 'framer-motion';
import { LayoutDashboard, Printer, Smile, MessageSquare, Star, Inbox, AlertTriangle, TrendingUp, Users, Target, Store, FileSpreadsheet, Loader2 } from 'lucide-react';
import { HistogrammeSatisfaction, RadarQualite, TendanceMensuelle, ComparaisonAgents, ClassementGuichets } from '../components/DashboardCharts';
import { RapportMensuelPrint } from '../components/RapportMensuelPrint';
import { AmbientBackground } from '../components/AmbientBackground';
import { PageHeader } from '../components/PageHeader';
import { MotionCard } from '../components/MotionCard';
import { StatCard } from '../components/StatCard';
import { EmptyState } from '../components/EmptyState';
import { Button } from '../components/ui/button';
import { RequireAuth } from '../components/RequireAuth';
import { DataTable } from '../components/ui/DataTable';
import { ActionsPrioritaires } from '../components/ActionsPrioritaires';
import { ObjectifsProgress } from '../components/ObjectifsProgress';
import { regrouperAvisParSoumission } from '../utils';
import { exportToXLSX } from '../utils/exportData';

const formatDelta = (value: number, suffix: string) =>
  `${value > 0 ? '+' : ''}${value}${suffix}`;

export const DashboardPage = () => {
  const { data: user } = useAuth();

  const { data: reponses, isLoading: loadingReponses } = useQuery(getReponses);
  const { data: radarData, isLoading: loadingRadar } = useQuery(getRadarStats);
  const { data: alertes, isLoading: loadingAlertes } = useQuery(getAlertes);
  const { data: taches, isLoading: loadingTaches } = useQuery(getTachesCorrectives);
  const { data: tendance, isLoading: loadingTendance } = useQuery(getTendanceMensuelle);
  const { data: statsByAgent, isLoading: loadingAgents } = useQuery(getStatsByAgent);
  const { data: statsByGuichet, isLoading: loadingGuichets } = useQuery(getStatsByGuichet);
  const { data: actionsPrioritaires, isLoading: loadingActions } = useQuery(getActionsPrioritaires);
  const { data: kpisPeriode, isLoading: loadingKpis } = useQuery(getKPIsPeriode);
  const { data: objectifs, isLoading: loadingObjectifs } = useQuery(getObjectifs);

  const reponsesList: any[] = reponses || [];
  // "Derniers avis" / badges de comptage : un avis = une soumission, pas une
  // ligne Reponse (un formulaire à N critères ne doit pas compter N fois).
  const avisGroupes = regrouperAvisParSoumission(reponsesList);
  const alertesList: any[] = alertes || [];
  const tachesList: any[] = taches || [];
  const tendanceList: any[] = tendance || [];
  const agentsList: any[] = statsByAgent || [];
  const guichetsList: any[] = statsByGuichet || [];
  const objectifsList: any[] = objectifs || [];

  const isLoading = loadingReponses || loadingRadar || loadingAlertes || loadingTaches;

  // KPIs "30 derniers jours" : basés sur getKPIsPeriode (période glissante
  // cohérente avec les deltas affichés). reponsesList (toutes périodes)
  // sert uniquement au tableau "derniers avis" et à l'histogramme global.
  const periodeActuelle = kpisPeriode?.periode_actuelle;
  const satisfaction = periodeActuelle ? periodeActuelle.satisfaction.toFixed(0) : '0';
  const noteMoyenne = periodeActuelle ? periodeActuelle.moyenne.toFixed(1) : '0.0';
  const totalAvisPeriode = periodeActuelle ? periodeActuelle.nb : 0;

  const alertesNouvelles = alertesList.filter((a: any) => a.statut_alerte === 'NOUVELLE').length;

  const deltaSatisfaction = kpisPeriode?.delta_satisfaction_pts ?? 0;
  const deltaNote = kpisPeriode?.delta_note_pts ?? 0;
  const deltaVolume = kpisPeriode?.delta_volume_pct ?? 0;

  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Rapport-Mensuel-CXSAT-${user?.id_agence || 'Agence'}`,
  });

  const [exportingXLSX, setExportingXLSX] = useState(false);
  const handleExportXLSX = useCallback(async () => {
    setExportingXLSX(true);
    try {
      await exportToXLSX(
        [
          {
            name: 'Avis clients',
            data: avisGroupes.map((a) => ({
              Date: new Date(a.reponses[0]?.date_reponse).toLocaleString('fr-FR'),
              Guichet: a.reponses[0]?.guichet?.nom_guichet || '',
              'Note moyenne': a.score_moyen,
              Criteres: a.reponses.map((r: any) => `${r.critere?.libelle_critere}:${r.score_brut}`).join(' | '),
              Commentaire: a.reponses[0]?.commentaire_texte || '',
            })),
          },
          {
            name: 'Alertes',
            data: alertesList.map((a: any) => ({
              Date: new Date(a.date_creation).toLocaleString('fr-FR'),
              Type: a.type_alerte,
              Statut: a.statut_alerte,
              Guichet: a.guichet?.nom_guichet || '',
              'Date traitement': a.date_traitement ? new Date(a.date_traitement).toLocaleString('fr-FR') : '',
            })),
          },
          {
            name: 'Taches correctives',
            data: tachesList.map((t: any) => ({
              Titre: t.titre,
              Statut: t.statut_tache,
              'Date echéance': new Date(t.date_echeance).toLocaleString('fr-FR'),
              'Date clôture': t.date_cloture ? new Date(t.date_cloture).toLocaleString('fr-FR') : '',
              Responsable: t.responsable ? `${t.responsable.prenom || ''} ${t.responsable.nom || ''}`.trim() : '',
            })),
          },
          {
            name: 'KPIs 30j',
            data: kpisPeriode ? [{
              'Satisfaction (%)': periodeActuelle?.satisfaction ?? 0,
              'Note moyenne (/5)': periodeActuelle?.moyenne ?? 0,
              'Volume avis': periodeActuelle?.nb ?? 0,
              'Delta satisfaction (pts)': kpisPeriode.delta_satisfaction_pts ?? 0,
              'Delta note (pts)': kpisPeriode.delta_note_pts ?? 0,
              'Delta volume (%)': kpisPeriode.delta_volume_pct ?? 0,
            }] : [],
          },
        ],
        `CXSAT_Rapport_${new Date().toISOString().split('T')[0]}`
      );
    } catch (err: any) {
      console.error('Erreur export XLSX', err);
    } finally {
      setExportingXLSX(false);
    }
  }, [avisGroupes, alertesList, tachesList, kpisPeriode, periodeActuelle]);

  const totalActionsPrioritaires =
    (actionsPrioritaires?.alertesNouvelles?.length ?? 0) + (actionsPrioritaires?.tachesEnRetard?.length ?? 0);

  return (
    <RequireAuth>
    <AmbientBackground>
      <div className="mx-auto max-w-7xl p-6 lg:p-10 space-y-8">
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
              <motion.div whileTap={{ scale: 0.97 }}>
                <Button variant="outline" onClick={() => handlePrint()} disabled={isLoading}>
                  <Printer className="size-4" /> Exporter le rapport (PDF)
                </Button>
              </motion.div>
              <motion.div whileTap={{ scale: 0.97 }}>
                <Button variant="outline" onClick={handleExportXLSX} disabled={isLoading || exportingXLSX}>
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

        {user?.role === 'DIRECTION' && (
          <MotionCard interactive={false} className="border-primary/30 bg-primary/5 p-4 text-sm text-foreground">
            Vue Entreprise : vous voyez les chiffres cumulés de l'ensemble du réseau.
          </MotionCard>
        )}

        {user?.role !== 'DIRECTION' && (user as any)?.agence?.nom_agence && (
          <MotionCard interactive={false} className="border-border/70 bg-card-subtle/40 p-4 text-sm text-foreground">
            Vue Agence : {(user as any).agence.nom_agence} — Vous ne voyez que les données de votre agence.
          </MotionCard>
        )}

        {/* NIVEAU 1 — Quoi faire aujourd'hui (priorité absolue, avant tout le reste) */}
        <section>
          <ActionsPrioritaires
            alertesNouvelles={actionsPrioritaires?.alertesNouvelles ?? []}
            tachesEnRetard={actionsPrioritaires?.tachesEnRetard ?? []}
            isLoading={loadingActions}
          />
        </section>

        {/* NIVEAU 2 — Où j'en suis : KPIs avec tendance vs période précédente */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Satisfaction (30j)"
            value={`${satisfaction}%`}
            icon={Smile}
            accent="success"
            index={0}
            trend={!loadingKpis ? formatDelta(deltaSatisfaction, ' pts') : undefined}
            trendDirection={deltaSatisfaction >= 0 ? 'up' : 'down'}
          />
          <StatCard
            title="Total Avis (30j)"
            value={String(totalAvisPeriode)}
            icon={MessageSquare}
            accent="primary"
            index={1}
            trend={!loadingKpis ? formatDelta(deltaVolume, '%') : undefined}
            trendDirection={deltaVolume >= 0 ? 'up' : 'down'}
          />
          <StatCard
            title="Note Moyenne (30j)"
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

        {/* NIVEAU 2bis — Suis-je sur la trajectoire de mes objectifs ? */}
        <section>
          <div className="mb-4 flex items-center gap-2">
            <Target className="size-5 text-primary" />
            <h2 className="text-title-sm font-bold text-foreground">Objectifs de satisfaction</h2>
          </div>
          {loadingObjectifs ? (
            <div className="h-40 animate-pulse rounded-2xl border border-border/70 bg-card-subtle/50" />
          ) : (
            <ObjectifsProgress data={objectifsList} />
          )}
        </section>

        {/* NIVEAU 3 — Où est le problème : répartition globale + conformité + classement guichets */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {isLoading ? (
            <>
              <div className="h-72 animate-pulse rounded-2xl border border-border/70 bg-card-subtle/50" />
              <div className="h-72 animate-pulse rounded-2xl border border-border/70 bg-card-subtle/50" />
            </>
          ) : (
            <>
              <HistogrammeSatisfaction data={reponsesList} />
              <RadarQualite data={radarData || []} />
            </>
          )}
        </div>

        <section>
          <div className="mb-4 flex items-center gap-2">
            <Store className="size-5 text-secondary" />
            <h2 className="text-title-sm font-bold text-foreground">Où se situe le problème</h2>
          </div>
          {loadingGuichets ? (
            <div className="h-72 animate-pulse rounded-2xl border border-border/70 bg-card-subtle/50" />
          ) : (
            <ClassementGuichets data={guichetsList} />
          )}
        </section>

        {/* Tendance mensuelle */}
        <section>
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp className="size-5 text-primary" />
            <h2 className="text-title-sm font-bold text-foreground">Évolution mensuelle</h2>
          </div>
          {loadingTendance ? (
            <div className="h-72 animate-pulse rounded-2xl border border-border/70 bg-card-subtle/50" />
          ) : (
            <TendanceMensuelle data={tendanceList} />
          )}
        </section>

        {/* Comparaison par agent */}
        {agentsList.length > 0 && (
          <section>
            <div className="mb-4 flex items-center gap-2">
              <Users className="size-5 text-secondary" />
              <h2 className="text-title-sm font-bold text-foreground">Performance par agent</h2>
            </div>
            {loadingAgents ? (
              <div className="h-64 animate-pulse rounded-2xl border border-border/70 bg-card-subtle/50" />
            ) : (
              <ComparaisonAgents data={agentsList} />
            )}
          </section>
        )}

        {/* Derniers avis */}
        {!isLoading && (
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-title-sm font-bold text-foreground">Derniers avis</h2>
              {avisGroupes.length > 0 && (
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  {avisGroupes.length} avis
                </span>
              )}
            </div>

            {avisGroupes.length > 0 ? (
              <DataTable headers={['Note moyenne', 'Guichet', 'Critères', 'Date']}>
                {avisGroupes.slice(0, 5).map((avis) => {
                  const premiere = avis.reponses[0];
                  return (
                    <tr key={avis.id_soumission ?? premiere.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                      <td className="px-6 py-4">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                            avis.score_moyen <= 2
                              ? 'bg-destructive/10 text-destructive'
                              : 'bg-success/10 text-success'
                          }`}
                        >
                          {avis.score_moyen}/5
                        </span>
                      </td>
                      <td className="px-6 py-4 text-foreground">{premiere.guichet?.nom_guichet || 'Guichet inconnu'}</td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {avis.reponses.map((r: any) => r.critere?.libelle_critere).filter(Boolean).join(', ') || 'Critère inconnu'}
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">{new Date(premiere.date_reponse).toLocaleDateString()}</td>
                    </tr>
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
      </div>

      <div className="hidden">
        <RapportMensuelPrint
          ref={printRef}
          reponses={reponsesList}
          radarData={radarData || []}
          alertes={alertesList}
          taches={tachesList}
          agenceName={user?.id_agence ? `Agence #${user.id_agence}` : 'Mon Agence'}
          commune="Marcory"
        />
      </div>
    </AmbientBackground>
    </RequireAuth>
  );
};
