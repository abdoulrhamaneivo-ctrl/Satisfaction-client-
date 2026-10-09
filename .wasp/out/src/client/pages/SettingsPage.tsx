import { useState } from 'react';
import { useAction, useQuery, getAIStatus, testerConnexionIA } from 'wasp/client/operations';
import { motion } from 'framer-motion';
import { Activity, AlertTriangle, CheckCircle2, Cpu, Loader2, RefreshCw, ShieldCheck, Sparkles } from 'lucide-react';
import { MotionCard } from '../components/MotionCard';
import { AmbientBackground } from '../components/AmbientBackground';
import { PageHeader } from '../components/PageHeader';
import { RequireAuth } from '../components/RequireAuth';
import { RequireEnterpriseRole } from '../components/RequireEnterpriseRole';
import { useToast } from '../hooks/use-toast';
import { Button } from '../components/ui/button';

export const SettingsPage = () => {
  const { data: aiStatus, isLoading, refetch } = useQuery(getAIStatus);
  const tester = useAction(testerConnexionIA);
  const { toast } = useToast();
  const [probeEnCours, setProbeEnCours] = useState(false);
  const verifie = Boolean(aiStatus?.configured && aiStatus?.lastProbeStatus === 'success');
  const probeEchec = aiStatus?.lastProbeStatus === 'failed';
  const pret = Boolean(aiStatus?.configured && aiStatus?.modelIsFree);

  async function verifierConnexion() {
    if (probeEnCours) return;
    setProbeEnCours(true);
    try {
      await tester({});
      await refetch();
      toast({ variant: 'success', title: 'Connexion vérifiée', description: 'Le modèle gratuit répond sous les règles de confidentialité configurées.' });
    } catch (error: any) {
      await refetch();
      toast({ variant: 'destructive', title: 'IA indisponible', description: error?.message || 'Aucun modèle compatible ne répond.' });
    } finally {
      setProbeEnCours(false);
    }
  }

  return (
    <RequireEnterpriseRole>
      <RequireAuth>
        <AmbientBackground>
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="mx-auto max-w-7xl space-y-8 p-6 lg:p-10"
          >
            <PageHeader
              icon={Cpu}
              eyebrow="Paramètres & intégrations"
              title="Paramètres"
              description="Vérifiez l’analyse IA gratuite et ses règles de confidentialité."
              actions={
                <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2 border-border/80 bg-card/60">
                  <RefreshCw className="size-4" aria-hidden /> Actualiser
                </Button>
              }
            />

            {isLoading ? (
              <div className="grid gap-6 md:grid-cols-3" aria-label="Chargement du statut IA">
                {[0, 1, 2].map((item) => <div key={item} className="h-44 animate-pulse rounded-2xl border border-border/70 bg-card-subtle/50" />)}
              </div>
            ) : (
              <>
                <div className="grid gap-6 md:grid-cols-3">
                  <MotionCard className="space-y-4 p-6">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">État du service</span>
                      {verifie ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-success/20 bg-success/10 px-2.5 py-1 text-xs font-bold text-success-strong">
                          <CheckCircle2 className="size-3.5" aria-hidden /> Vérifié
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full border border-warning/30 bg-warning/10 px-2.5 py-1 text-xs font-bold text-warning-strong">
                          <AlertTriangle className="size-3.5" aria-hidden /> {probeEchec ? 'Échec du test' : pret ? 'À vérifier' : 'Indisponible'}
                        </span>
                      )}
                    </div>
                    <h2 className="text-2xl font-bold text-foreground">{verifie ? 'Opérationnel' : probeEchec ? 'Endpoint indisponible' : pret ? 'Non vérifié' : 'Non configuré'}</h2>
                    <p className="text-sm leading-6 text-muted-foreground">
                      {verifie
                        ? aiStatus?.verifiedAt ? `Dernière vérification réussie : ${new Date(aiStatus.verifiedAt).toLocaleString('fr-FR')}.` : 'La vérification synthétique a réussi.'
                        : probeEchec ? 'Le fournisseur a refusé ou ne peut pas respecter les contraintes gratuites et de confidentialité.'
                          : 'Une clé présente ne suffit pas : lancez une vérification synthétique avant de considérer l’IA disponible.'}
                    </p>
                  </MotionCard>

                  <MotionCard className="space-y-4 p-6">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Fournisseur et modèle</span>
                      <Sparkles className="size-4 text-primary" aria-hidden />
                    </div>
                    <h2 className="text-2xl font-bold text-foreground">{aiStatus?.provider || 'OpenRouter'}</h2>
                    <code className="block break-all rounded-xl bg-primary/10 p-3 text-sm text-primary-strong">{aiStatus?.model || 'nvidia/nemotron-3.5-lightning:free'}</code>
                    <p className="text-xs leading-5 text-muted-foreground">
                      {aiStatus?.modelIsFree ? 'Modèle déclaré gratuit (:free).' : 'Le modèle configuré n’a pas de suffixe :free et sera refusé.'}
                    </p>
                  </MotionCard>

                  <MotionCard className="space-y-4 p-6">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Analyses de l’agence</span>
                      <Activity className="size-4 text-success-strong" aria-hidden />
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-foreground">{aiStatus?.stats?.done ?? 0}</span>
                      <span className="text-xs text-muted-foreground">/ {aiStatus?.stats?.total ?? 0} traitées</span>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>{aiStatus?.stats?.pending ?? 0} en attente</span>
                      <span>{aiStatus?.stats?.failed ?? 0} en échec</span>
                    </div>
                  </MotionCard>
                </div>

                <MotionCard className="space-y-5 p-6 sm:p-8">
                  <div className="flex items-start gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                      <ShieldCheck className="size-5" aria-hidden />
                    </div>
                    <div className="space-y-1">
                      <h2 className="text-lg font-bold text-foreground">Règles appliquées à chaque requête</h2>
                      <p className="text-sm leading-6 text-muted-foreground">Le test utilise uniquement un texte synthétique. Les réponses réelles restent soumises aux mêmes limites.</p>
                    </div>
                  </div>
                  <ul className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
                    <li>• Modèles gratuits uniquement, coût maximal demandé : 0.</li>
                    <li>• Refus de collecte, demande de traitement sans conservation et aucune bascule fournisseur.</li>
                    <li>• Noms d’agents, d’agences et de guichets exclus des prompts.</li>
                    <li>• Téléphones, courriels et URL usuels masqués avant envoi.</li>
                  </ul>
                  <div className="flex flex-col gap-3 border-t border-border/70 pt-5 sm:flex-row sm:items-center sm:justify-between">
                    <p className="max-w-2xl text-xs leading-5 text-muted-foreground">
                      Si le fournisseur refuse ces contraintes ou ne propose aucun modèle gratuit compatible, l’IA reste indisponible et aucun modèle payant n’est essayé.
                    </p>
                    <Button type="button" onClick={verifierConnexion} disabled={!pret || probeEnCours} className="min-h-11 shrink-0 gap-2">
                      {probeEnCours ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <ShieldCheck className="size-4" aria-hidden />}
                      {probeEnCours ? 'Vérification…' : 'Vérifier gratuitement'}
                    </Button>
                  </div>
                </MotionCard>
              </>
            )}
          </motion.div>
        </AmbientBackground>
      </RequireAuth>
    </RequireEnterpriseRole>
  );
};
