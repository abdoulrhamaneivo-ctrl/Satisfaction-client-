import React, { useState } from 'react';
import { useAuth } from 'wasp/client/auth';
import { useQuery, assignAgent, getGuichets, getAgents, getAffectationsDuJour } from 'wasp/client/operations';
import { motion } from 'framer-motion';
import { CalendarClock, Store, UserCheck2, Clock, AlertTriangle } from 'lucide-react';
import { AmbientBackground } from '../components/AmbientBackground';
import { PageHeader } from '../components/PageHeader';
import { MotionCard } from '../components/MotionCard';
import { EmptyState } from '../components/EmptyState';
import { Button } from '../components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { useToast } from '../hooks/use-toast';
import { RequireAuth } from '../components/RequireAuth';

export const PlanningPage = () => {
  const { data: user } = useAuth();
  const { toast } = useToast();
  const [selectedAgent, setSelectedAgent] = useState<Record<number, string>>({});
  const [heureDebut, setHeureDebut] = useState('08:00');
  const [heureFin, setHeureFin] = useState('13:00');
  const [assigningId, setAssigningId] = useState<number | null>(null);

  const userAgenceId = user?.id_agence;
  const today = new Date().toISOString().split('T')[0];

  const { data: guichets, isLoading: loadingGuichets } = useQuery(getGuichets, { id_agence: userAgenceId || 0 });
  const { data: agents } = useQuery(getAgents, { id_agence: userAgenceId || 0 });
  const { data: affectationsDuJour } = useQuery(
    getAffectationsDuJour,
    { id_agence: userAgenceId || 0, date: today },
    { enabled: !!userAgenceId }
  );

  const todayLabel = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const getAffectationsForGuichet = (guichetId: number) =>
    (affectationsDuJour || []).filter((a: any) => a.guichet?.id === guichetId);

  const handleAssign = async (guichetId: number) => {
    const agentId = selectedAgent[guichetId];
    if (!agentId) {
      toast({ variant: 'destructive', title: 'Agent manquant', description: 'Veuillez sélectionner un agent avant de valider.' });
      return;
    }
    if (heureFin <= heureDebut) {
      toast({ variant: 'destructive', title: 'Horaire invalide', description: "L'heure de fin doit être après l'heure de début." });
      return;
    }

    setAssigningId(guichetId);
    try {
      await assignAgent({
        id_guichet: guichetId,
        id_agent: agentId,
        date: today,
        heure_debut: heureDebut,
        heure_fin: heureFin,
      });
      const agentNom = agents?.find((a: any) => String(a.id) === agentId);
      toast({
        title: 'Agent affecté',
        description: agentNom
          ? `${agentNom.prenom} ${agentNom.nom} est planifié(e) de ${heureDebut} à ${heureFin}.`
          : 'Affectation enregistrée avec succès.',
      });
    } catch (err: any) {
      toast({ variant: 'destructive', title: "Erreur lors de l'affectation", description: err.message || 'Erreur inconnue' });
    } finally {
      setAssigningId(null);
    }
  };

  return (
    <RequireAuth>
    <AmbientBackground>
      <div className="mx-auto max-w-7xl p-6 lg:p-10 space-y-8">
        <PageHeader
          icon={CalendarClock}
          eyebrow="Affectations du jour"
          title="Planning des guichets"
          description={`Aujourd'hui, ${todayLabel} — affectez chaque agent à son poste et à son créneau horaire.`}
        />

        {/* Créneau horaire par défaut */}
        <MotionCard className="flex flex-wrap items-end gap-4 p-5">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="heure-debut" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Heure de début
            </label>
            <input
              id="heure-debut"
              type="time"
              value={heureDebut}
              onChange={(e) => setHeureDebut(e.target.value)}
              className="h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="heure-fin" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Heure de fin
            </label>
            <input
              id="heure-fin"
              type="time"
              value={heureFin}
              onChange={(e) => setHeureFin(e.target.value)}
              className="h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Ce créneau s'appliquera à chaque validation ci-dessous. Modifiez-le avant de valider un guichet dont les
            horaires diffèrent.
          </p>
        </MotionCard>

        {/* Grille dynamique des guichets */}
        {loadingGuichets ? (
          // Correctif : un skeleton qui reprend la même grille (mêmes
          // colonnes, même hauteur approx. de carte) que le vrai contenu,
          // au lieu d'un simple texte centré — évite le "saut" de mise en
          // page (layout shift) quand les données arrivent.
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-40 animate-pulse rounded-2xl border border-border/70 bg-card-subtle/50" />
            ))}
          </div>
        ) : !guichets?.length ? (
          <EmptyState
            icon={Store}
            title="Aucun guichet configuré"
            description="Créez d'abord vos guichets dans l'onglet « Guichets » pour pouvoir y affecter des agents."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {guichets.map((g: any, index: number) => {
              const agentIdForGuichet = selectedAgent[g.id] ?? '';
              const affectationsGuichet = getAffectationsForGuichet(g.id);

              return (
                <motion.div
                  key={g.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: index * 0.04 }}
                >
                  <MotionCard className="flex h-full flex-col gap-4 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                            <Store className="size-4" />
                          </span>
                          <div className="font-semibold text-foreground">{g.nom_guichet}</div>
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">{g.type_guichet || 'Guichet'}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        {affectationsGuichet.length === 0 && (
                          <span
                            title="Aucun agent affecté aujourd'hui"
                            className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-bold text-destructive"
                          >
                            <AlertTriangle className="size-3" /> Sans agent
                          </span>
                        )}
                        {agentIdForGuichet && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-secondary/15 px-2.5 py-1 text-xs font-semibold text-secondary-muted-foreground">
                            <UserCheck2 className="size-3.5" /> Prêt
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Affectations déjà enregistrées aujourd'hui */}
                    {affectationsGuichet.length > 0 && (
                      <div className="space-y-1.5 rounded-xl bg-muted/40 p-3">
                        <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                          <Clock className="size-3" /> Aujourd'hui
                        </p>
                        {affectationsGuichet.map((aff: any) => (
                          <div key={aff.id} className="flex items-center justify-between text-xs">
                            <span className="font-medium text-foreground">
                              {aff.agent?.prenom} {aff.agent?.nom}
                            </span>
                            <span className="text-muted-foreground">
                              {aff.heure_debut} – {aff.heure_fin}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    <Select
                      value={agentIdForGuichet}
                      onValueChange={(value) => setSelectedAgent((prev) => ({ ...prev, [g.id]: value }))}
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Sélectionner un agent..." />
                      </SelectTrigger>
                      <SelectContent>
                        {agents?.map((agent: any) => (
                          <SelectItem key={agent.id} value={String(agent.id)}>
                            {agent.prenom} {agent.nom}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <motion.div whileTap={{ scale: 0.97 }} className="mt-auto">
                      <Button
                        onClick={() => handleAssign(g.id)}
                        disabled={assigningId === g.id}
                        className="w-full"
                      >
                        {assigningId === g.id ? 'Affectation...' : `Valider ${heureDebut} – ${heureFin}`}
                      </Button>
                    </motion.div>
                  </MotionCard>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </AmbientBackground>
    </RequireAuth>
  );
};
