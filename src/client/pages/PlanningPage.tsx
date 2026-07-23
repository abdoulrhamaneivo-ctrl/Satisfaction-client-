import React, { useState } from 'react';
import { useAuth } from 'wasp/client/auth';
import {
  useQuery,
  assignAgent,
  updateAffectationGuichet,
  deleteAffectationGuichet,
  getGuichets,
  getAgents,
  getAffectationsDuJour,
} from 'wasp/client/operations';
import { motion } from 'framer-motion';
import { CalendarClock, Store, UserCheck2, Clock, AlertTriangle, Pencil, Trash2, Search } from 'lucide-react';
import { AmbientBackground } from '../components/AmbientBackground';
import { PageHeader } from '../components/PageHeader';
import { MotionCard } from '../components/MotionCard';
import { EmptyState } from '../components/EmptyState';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';
import { useToast } from '../hooks/use-toast';
import { RequireAuth } from '../components/RequireAuth';

export const PlanningPage = () => {
  const { data: user } = useAuth();
  const { toast } = useToast();
  const [selectedAgent, setSelectedAgent] = useState<Record<number, string>>({});
  const [heureDebut, setHeureDebut] = useState('08:00');
  const [heureFin, setHeureFin] = useState('13:00');
  const [assigningId, setAssigningId] = useState<number | null>(null);

  // --- Édition / suppression d'une affectation déjà validée ---
  const [affectationAEditer, setAffectationAEditer] = useState<any | null>(null);
  const [editAgentId, setEditAgentId] = useState('');
  const [editHeureDebut, setEditHeureDebut] = useState('08:00');
  const [editHeureFin, setEditHeureFin] = useState('13:00');
  const [savingEdit, setSavingEdit] = useState(false);
  const [affectationASupprimer, setAffectationASupprimer] = useState<any | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [recherche, setRecherche] = useState('');
  const [filtreCouverture, setFiltreCouverture] = useState<'TOUS' | 'SANS_AGENT' | 'AFFECTES'>('TOUS');

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
  const guichetsFiltres = (guichets ?? []).filter((guichet: any) => {
    const aDesAffectations = getAffectationsForGuichet(guichet.id).length > 0;
    if (filtreCouverture === 'SANS_AGENT' && aDesAffectations) return false;
    if (filtreCouverture === 'AFFECTES' && !aDesAffectations) return false;
    const requete = recherche.trim().toLocaleLowerCase('fr-FR');
    return !requete || `${guichet.nom_guichet ?? ''} ${guichet.type_guichet ?? ''}`
      .toLocaleLowerCase('fr-FR')
      .includes(requete);
  });

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

  const ouvrirEdition = (aff: any) => {
    setAffectationAEditer(aff);
    setEditAgentId(String(aff.agent?.id ?? aff.id_agent ?? ''));
    setEditHeureDebut(aff.heure_debut);
    setEditHeureFin(aff.heure_fin);
  };

  const handleSaveEdit = async () => {
    if (!affectationAEditer) return;
    if (!editAgentId) {
      toast({ variant: 'destructive', title: 'Agent manquant', description: 'Veuillez sélectionner un agent.' });
      return;
    }
    if (editHeureFin <= editHeureDebut) {
      toast({ variant: 'destructive', title: 'Horaire invalide', description: "L'heure de fin doit être après l'heure de début." });
      return;
    }

    setSavingEdit(true);
    try {
      await updateAffectationGuichet({
        id: affectationAEditer.id,
        id_guichet: affectationAEditer.guichet?.id,
        id_agent: editAgentId,
        date: today,
        heure_debut: editHeureDebut,
        heure_fin: editHeureFin,
      });
      toast({ title: 'Affectation modifiée', description: 'Le planning a été mis à jour.' });
      setAffectationAEditer(null);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erreur lors de la modification', description: err.message || 'Erreur inconnue' });
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async () => {
    if (!affectationASupprimer) return;
    setDeletingId(affectationASupprimer.id);
    try {
      await deleteAffectationGuichet({ id: affectationASupprimer.id });
      toast({ title: 'Affectation retirée', description: 'Le créneau a été libéré.' });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erreur lors de la suppression', description: err.message || 'Erreur inconnue' });
    } finally {
      setDeletingId(null);
      setAffectationASupprimer(null);
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
            <Input
              id="heure-debut"
              type="time"
              value={heureDebut}
              onChange={(e) => setHeureDebut(e.target.value)}
              className="h-10 w-auto"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="heure-fin" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Heure de fin
            </label>
            <Input
              id="heure-fin"
              type="time"
              value={heureFin}
              onChange={(e) => setHeureFin(e.target.value)}
              className="h-10 w-auto"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Ce créneau s'appliquera à chaque validation ci-dessous. Modifiez-le avant de valider un guichet dont les
            horaires diffèrent.
          </p>
        </MotionCard>

        {!!guichets?.length && (
          <section className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-card/60 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={recherche}
                onChange={(event) => setRecherche(event.target.value)}
                placeholder="Rechercher un guichet…"
                className="h-10 pl-9"
                aria-label="Rechercher un guichet dans le planning"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {([
                ['TOUS', 'Tous'],
                ['SANS_AGENT', 'Sans agent'],
                ['AFFECTES', 'Affectés'],
              ] as ['TOUS' | 'SANS_AGENT' | 'AFFECTES', string][]).map(([valeur, libelle]) => (
                <Button key={valeur} size="sm" variant={filtreCouverture === valeur ? 'default' : 'outline'} onClick={() => setFiltreCouverture(valeur)}>
                  {libelle}
                </Button>
              ))}
            </div>
          </section>
        )}

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
          guichetsFiltres.length === 0 ? (
            <EmptyState
              icon={Search}
              title="Aucun guichet ne correspond"
              description="Modifiez votre recherche ou le filtre de couverture pour afficher les guichets concernés."
              action={<Button variant="outline" onClick={() => { setRecherche(''); setFiltreCouverture('TOUS'); }}>Réinitialiser les filtres</Button>}
            />
          ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {guichetsFiltres.map((g: any, index: number) => {
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
                          <div key={aff.id} className="flex items-center justify-between gap-2 text-xs">
                            <span className="font-medium text-foreground">
                              {aff.agent?.prenom} {aff.agent?.nom}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground">
                                {aff.heure_debut} – {aff.heure_fin}
                              </span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => ouvrirEdition({ ...aff, guichet: g })}
                                title="Modifier cette affectation"
                                className="size-6 text-muted-foreground hover:bg-primary/10 hover:text-primary"
                              >
                                <Pencil className="size-3.5" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => setAffectationASupprimer({ ...aff, guichet: g })}
                                title="Retirer cette affectation"
                                className="size-6 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            </div>
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
          )
        )}
      </div>
    </AmbientBackground>

    {/* Édition d'une affectation existante */}
    <Dialog open={affectationAEditer !== null} onOpenChange={(open) => !open && setAffectationAEditer(null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Modifier l'affectation</DialogTitle>
        </DialogHeader>
        {affectationAEditer && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Guichet : <span className="font-medium text-foreground">{affectationAEditer.guichet?.nom_guichet}</span>
            </p>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Agent</label>
              <Select value={editAgentId} onValueChange={setEditAgentId}>
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
            </div>
            <div className="flex gap-4">
              <div className="flex flex-1 flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Heure de début</label>
                <Input
                  type="time"
                  value={editHeureDebut}
                  onChange={(e) => setEditHeureDebut(e.target.value)}
                  className="h-10"
                />
              </div>
              <div className="flex flex-1 flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Heure de fin</label>
                <Input
                  type="time"
                  value={editHeureFin}
                  onChange={(e) => setEditHeureFin(e.target.value)}
                  className="h-10"
                />
              </div>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => setAffectationAEditer(null)}>
            Annuler
          </Button>
          <Button onClick={handleSaveEdit} disabled={savingEdit}>
            {savingEdit ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Confirmation de suppression */}
    <AlertDialog
      open={affectationASupprimer !== null}
      onOpenChange={(open) => !open && setAffectationASupprimer(null)}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Retirer cette affectation ?</AlertDialogTitle>
          <AlertDialogDescription>
            {affectationASupprimer && (
              <>
                <strong className="text-foreground">
                  {affectationASupprimer.agent?.prenom} {affectationASupprimer.agent?.nom}
                </strong>{' '}
                ne sera plus planifié(e) sur <strong className="text-foreground">{affectationASupprimer.guichet?.nom_guichet}</strong>{' '}
                de {affectationASupprimer.heure_debut} à {affectationASupprimer.heure_fin}. Les avis déjà collectés sur ce
                créneau restent inchangés.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} disabled={deletingId !== null} variant="destructive">
            {deletingId !== null ? 'Suppression...' : 'Retirer'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </RequireAuth>
  );
};
