import React, { useRef } from 'react';
import { useQuery, getReponses, getRadarStats, getAlertes, getTasks, getTendanceMensuelle, getStatsByAgent } from 'wasp/client/operations';
import { useAuth } from 'wasp/client/auth';
import { useReactToPrint } from 'react-to-print';
import { motion } from 'framer-motion';
import { LayoutDashboard, Printer, Smile, MessageSquare, Star, Inbox, AlertTriangle, TrendingUp, Users } from 'lucide-react';
import { HistogrammeSatisfaction, RadarQualite, TendanceMensuelle, ComparaisonAgents } from '../components/DashboardCharts';
import { RapportMensuelPrint } from '../components/RapportMensuelPrint';
import { AmbientBackground } from '../components/AmbientBackground';
import { PageHeader } from '../components/PageHeader';
import { MotionCard } from '../components/MotionCard';
import { StatCard } from '../components/StatCard';
import { EmptyState } from '../components/EmptyState';
import { Button } from '../components/ui/button';
import { DataTable } from '../components/ui/DataTable';

export const DashboardPage = () => {
  const { data: user } = useAuth();

  const { data: reponses, isLoading: loadingReponses } = useQuery(getReponses);
  const { data: radarData, isLoading: loadingRadar } = useQuery(getRadarStats);
  const { data: alertes, isLoading: loadingAlertes } = useQuery(getAlertes);
  const { data: tasks, isLoading: loadingTasks } = useQuery(getTasks);
  const { data: tendance, isLoading: loadingTendance } = useQuery(getTendanceMensuelle);
  const { data: statsByAgent, isLoading: loadingAgents } = useQuery(getStatsByAgent);

  const reponsesList: any[] = reponses || [];
  const alertesList: any[] = alertes || [];
  const tasksList: any[] = tasks || [];
  const tendanceList: any[] = tendance || [];
  const agentsList: any[] = statsByAgent || [];

  const isLoading = loadingReponses || loadingRadar || loadingAlertes || loadingTasks;

  const satisfaction = reponsesList.length
    ? ((reponsesList.filter((r: any) => r.score_brut >= 4).length / reponsesList.length) * 100).toFixed(0)
    : '0';
  const noteMoyenne = (
    reponsesList.reduce<number>((acc, curr) => acc + curr.score_brut, 0) /
    (reponsesList.length || 1)
  ).toFixed(1);

  const alertesNouvelles = alertesList.filter((a: any) => a.statut_alerte === 'NOUVELLE').length;

  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Rapport-Mensuel-CXSAT-${user?.id_agence || 'Agence'}`,
  });

  return (
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
            <motion.div whileTap={{ scale: 0.97 }}>
              <Button variant="outline" onClick={() => handlePrint()} disabled={isLoading}>
                <Printer className="size-4" /> Exporter le rapport (PDF)
              </Button>
            </motion.div>
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

        {/* KPIs */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Satisfaction Globale"
            value={`${satisfaction}%`}
            icon={Smile}
            accent="success"
            index={0}
          />
          <StatCard
            title="Total Avis"
            value={String(reponsesList.length)}
            icon={MessageSquare}
            accent="primary"
            index={1}
          />
          <StatCard
            title="Note Moyenne"
            value={`${noteMoyenne} / 5`}
            icon={Star}
            accent="secondary"
            index={2}
          />
          <StatCard
            title="Alertes nouvelles"
            value={String(alertesNouvelles)}
            icon={AlertTriangle}
            accent={alertesNouvelles > 0 ? 'destructive' : 'success'}
            index={3}
          />
        </div>

        {/* Graphiques principaux */}
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
              {reponsesList.length > 0 && (
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  {reponsesList.length} avis
                </span>
              )}
            </div>

            {reponsesList.length > 0 ? (
              <DataTable headers={['Note', 'Guichet', 'Critère', 'Date']}>
                {reponsesList.slice(0, 5).map((rep: any) => (
                  <tr key={rep.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                    <td className="px-6 py-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                          rep.score_brut <= 2
                            ? 'bg-destructive/10 text-destructive'
                            : 'bg-success/10 text-success'
                        }`}
                      >
                        {rep.score_brut}/5
                      </span>
                    </td>
                    <td className="px-6 py-4 text-foreground">{rep.guichet?.nom_guichet || 'Guichet inconnu'}</td>
                    <td className="px-6 py-4 text-muted-foreground">{rep.critere?.libelle_critere || 'Critère inconnu'}</td>
                    <td className="px-6 py-4 text-muted-foreground">{new Date(rep.date_reponse).toLocaleDateString()}</td>
                  </tr>
                ))}
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
          tasks={tasksList}
          agenceName={user?.id_agence ? `Agence #${user.id_agence}` : 'Mon Agence'}
          commune="Marcory"
        />
      </div>
    </AmbientBackground>
  );
};
