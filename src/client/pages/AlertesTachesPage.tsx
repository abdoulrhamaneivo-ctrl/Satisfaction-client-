import React, { useState, useEffect } from 'react';
import { useQuery, useAction } from 'wasp/client/operations';
import { useAuth } from 'wasp/client/auth';
import { getAlertes, getTachesCorrectives, getAgentsByAgence, getTacheHistorique } from 'wasp/client/operations';
import { createTacheCorrective, updateStatutTache, marquerAlerteTraitee } from 'wasp/client/operations';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  PlayCircle,
  PlusCircle,
  X,
  Bell,
  Inbox,
  ChevronRight,
  History,
  ArrowRight,
  Search,
} from 'lucide-react';
import { AmbientBackground } from '../components/AmbientBackground';
import { PageHeader } from '../components/PageHeader';
import { MotionCard } from '../components/MotionCard';
import { EmptyState } from '../components/EmptyState';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { useToast } from '../hooks/use-toast';
import { RequireAuth } from '../components/RequireAuth';

type Statut = 'A_FAIRE' | 'EN_COURS' | 'TERMINEE';
type FiltreTaches = 'TOUTES' | 'RETARD' | 'MES_TACHES';

const COLONNES: { statut: Statut; label: string; icon: React.ReactNode; color: string }[] = [
  {
    statut: 'A_FAIRE',
    label: 'À Faire',
    icon: <Clock className="size-4" />,
    color: 'bg-warning/10 text-warning border-warning/30',
  },
  {
    statut: 'EN_COURS',
    label: 'En cours',
    icon: <PlayCircle className="size-4" />,
    color: 'bg-primary/10 text-primary border-primary/30',
  },
  {
    statut: 'TERMINEE',
    label: 'Terminé',
    icon: <CheckCircle2 className="size-4" />,
    color: 'bg-success/10 text-success border-success/30',
  },
];

type ModalData = {
  id_alerte: number;
  titre: string;
  description: string;
  date_echeance: string;
  id_responsable: string;
};

export const AlertesTachesPage = () => {
  const { toast } = useToast();
  const { data: currentUser } = useAuth();
  const { data: alertes, isLoading: loadingAlertes } = useQuery(getAlertes);
  const { data: taches, isLoading: loadingTaches } = useQuery(getTachesCorrectives);
  const createTache = useAction(createTacheCorrective);
  const updateStatut = useAction(updateStatutTache);
  const marquerTraitee = useAction(marquerAlerteTraitee);

  const [modal, setModal] = useState<{ alerteId: number | null; idAgence: number | null }>({
    alerteId: null,
    idAgence: null,
  });
  const [formTache, setFormTache] = useState<ModalData>({
    id_alerte: 0,
    titre: '',
    description: '',
    date_echeance: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString().split('T')[0],
    id_responsable: '',
  });
  const [saving, setSaving] = useState(false);
  const [movingId, setMovingId] = useState<number | null>(null);
  // ID de la tâche dont on affiche le panneau historique (null = fermé)
  const [historiqueOpenId, setHistoriqueOpenId] = useState<number | null>(null);
  const [recherche, setRecherche] = useState('');
  const [filtreTaches, setFiltreTaches] = useState<FiltreTaches>('TOUTES');

  // Liste des responsables potentiels, scopée à l'agence de l'alerte
  // sélectionnée : corrige un vrai bug de logique — le formulaire exigeait
  // auparavant de connaître et taper à la main l'identifiant technique
  // (UUID) de l'agent, un champ que personne ne peut remplir de tête et qui
  // ne validait rien avant l'envoi au serveur.
  const { data: responsablesBruts } = useQuery(
    getAgentsByAgence,
    { id_agence: modal.idAgence ?? 0 },
    { enabled: modal.idAgence !== null }
  );
  // On ne propose que des agents actifs : assigner une tâche corrective à
  // un compte suspendu la rendrait de fait impossible à traiter.
  const responsablesPossibles = (responsablesBruts || []).filter((a: any) => a.actif !== false);

  const alertesList: any[] = alertes || [];
  const tachesList: any[] = taches || [];

  const rolesGestion = ['DIRECTION', 'QUALITE', 'CHEF_AGENCE'];
  const peutGererAlertes = !!currentUser && rolesGestion.includes((currentUser as any).role);
  // Un profil de gestion peut agir sur n'importe quelle tâche de son
  // périmètre ; un AGENT ne peut agir que sur les tâches qui lui sont
  // assignées (même règle que côté serveur dans updateStatutTache) — avant
  // ce correctif, les boutons étaient affichés à tout le monde et un AGENT
  // assigné à sa propre tâche recevait une erreur d'accès en tentant de la
  // clôturer, sans jamais pouvoir réellement la terminer.
  const peutAgirSurTache = (tache: any) =>
    !!currentUser && (rolesGestion.includes((currentUser as any).role) || tache.id_responsable === (currentUser as any).id);

  // Empêche le tableau de se remplacer par le squelette de chargement lors
  // d'un simple rafraîchissement en arrière-plan (après un déplacement de
  // tâche par ex.) : seul le tout premier chargement affiche le squelette,
  // ce qui évite un effet de "plateau qui se vide" pendant une fraction de
  // seconde à chaque mise à jour de statut.
  const [aDejaChargeUneFois, setADejaChargeUneFois] = useState(false);
  useEffect(() => {
    if (!loadingTaches && taches !== undefined) setADejaChargeUneFois(true);
  }, [loadingTaches, taches]);
  const afficherSquelette = loadingTaches && !aDejaChargeUneFois;

  const alertesNouvelles = alertesList.filter((a) => a.statut_alerte === 'NOUVELLE');
  const tachesEnRetardCount = tachesList.filter(
    (t) => t.statut_tache !== 'TERMINEE' && new Date(t.date_echeance) < new Date()
  ).length;
  const rechercheNormalisee = recherche.trim().toLocaleLowerCase('fr-FR');
  const correspondRecherche = (valeurs: unknown[]) =>
    !rechercheNormalisee || valeurs
      .filter((valeur) => valeur !== null && valeur !== undefined)
      .join(' ')
      .toLocaleLowerCase('fr-FR')
      .includes(rechercheNormalisee);
  const alertesNouvellesFiltrees = alertesNouvelles.filter((alerte: any) =>
    correspondRecherche([alerte.message, alerte.guichet?.nom_guichet, alerte.type_alerte])
  );
  const tachesFiltrees = tachesList.filter((tache: any) => {
    const estEnRetard = tache.statut_tache !== 'TERMINEE' && new Date(tache.date_echeance) < new Date();
    const estAMoi = tache.id_responsable === (currentUser as any)?.id;
    const passeFiltre = filtreTaches === 'TOUTES' || (filtreTaches === 'RETARD' && estEnRetard) || (filtreTaches === 'MES_TACHES' && estAMoi);
    return passeFiltre && correspondRecherche([
      tache.titre,
      tache.description,
      tache.responsable?.prenom,
      tache.responsable?.nom,
      tache.alerte?.guichet?.nom_guichet,
    ]);
  });

  const handleCreerTache = (alerte: any) => {
    // L'agence de l'alerte se déduit soit de son guichet, soit — pour une
    // alerte de type SILENCE_EVALUATION sans guichet précis — de la
    // réponse associée. Sans cette agence, impossible de proposer la bonne
    // liste de responsables (et le serveur rejetterait de toute façon un
    // responsable extérieur à cette agence).
    const idAgence = alerte.guichet?.id_agence ?? alerte.reponse?.id_agence ?? null;
    setFormTache({
      id_alerte: Number(alerte.id),
      titre: `Tâche — ${alerte.message?.slice(0, 50)}...`,
      description: alerte.message || '',
      date_echeance: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString().split('T')[0],
      id_responsable: '',
    });
    setModal({ alerteId: Number(alerte.id), idAgence });
  };

  const handleSoumettreCreation = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await createTache({
        id_alerte: formTache.id_alerte,
        titre: formTache.titre,
        description: formTache.description,
        date_echeance: formTache.date_echeance,
        id_responsable: formTache.id_responsable,
      });
      setModal({ alerteId: null, idAgence: null });
      toast({ title: 'Tâche créée', description: 'La tâche corrective a bien été enregistrée.' });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erreur', description: err.message || 'Erreur inconnue' });
    } finally {
      setSaving(false);
    }
  };

  const handleMoveStatut = async (tacheId: number, statut: Statut) => {
    setMovingId(tacheId);
    try {
      await updateStatut({ id: tacheId, statut });
      toast({ title: 'Statut mis à jour', description: `Tâche déplacée vers « ${COLONNES.find((c) => c.statut === statut)?.label} »` });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erreur', description: err.message });
    } finally {
      setMovingId(null);
    }
  };

  const handleMarquerTraitee = async (alerteId: number) => {
    try {
      await marquerTraitee({ id_alerte: alerteId });
      toast({ title: 'Alerte traitée', description: 'L\'alerte a été marquée comme traitée.' });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erreur', description: err.message });
    }
  };

  return (
    <RequireAuth>
    <AmbientBackground>
      <div className="mx-auto max-w-7xl p-6 lg:p-10 space-y-8">
        <PageHeader
          icon={AlertTriangle}
          eyebrow="Surveillance & Amélioration"
          title="Alertes & Tâches correctives"
          description="Suivez les alertes critiques et gérez les actions correctives associées en mode Kanban."
        />

        <section className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-card/60 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={recherche}
              onChange={(event) => setRecherche(event.target.value)}
              placeholder="Rechercher une alerte, tâche, responsable ou guichet…"
              className="h-10 pl-9"
              aria-label="Rechercher dans les alertes et tâches"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {([
              ['TOUTES', 'Toutes'],
              ['RETARD', `En retard (${tachesEnRetardCount})`],
              ['MES_TACHES', 'Mes tâches'],
            ] as [FiltreTaches, string][]).map(([valeur, libelle]) => (
              <Button
                key={valeur}
                size="sm"
                variant={filtreTaches === valeur ? 'default' : 'outline'}
                onClick={() => setFiltreTaches(valeur)}
              >
                {libelle}
              </Button>
            ))}
          </div>
        </section>

        {/* Alertes nouvelles */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-title-sm font-bold text-foreground flex items-center gap-2">
              <Bell className="size-5 text-destructive" />
              Alertes nouvelles
              {alertesNouvelles.length > 0 && (
                <span className="ml-1 rounded-full bg-destructive/10 px-2.5 py-0.5 text-xs font-bold text-destructive">
                  {alertesNouvelles.length}
                </span>
              )}
            </h2>
          </div>

          {loadingAlertes ? (
            <div className="space-y-3">
              {[0, 1].map((i) => (
                <div key={i} className="h-20 animate-pulse rounded-2xl border border-border/70 bg-card-subtle/50" />
              ))}
            </div>
          ) : alertesNouvelles.length === 0 ? (
            <EmptyState icon={Inbox} title="Aucune alerte nouvelle" description="Toutes les alertes ont été traitées." />
          ) : (
            <div className="space-y-3">
              {alertesNouvellesFiltrees.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border/70 px-4 py-6 text-center text-sm text-muted-foreground">
                  Aucune alerte ne correspond à votre recherche.
                </p>
              ) : alertesNouvellesFiltrees.map((alerte: any, i: number) => (
                <motion.div
                  key={alerte.id.toString()}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <MotionCard className="flex items-start justify-between gap-4 p-4 border-destructive/20">
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                        <AlertTriangle className="size-4" />
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{alerte.message}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {alerte.guichet?.nom_guichet} — {new Date(alerte.date_creation).toLocaleString('fr-FR')}
                        </p>
                      </div>
                    </div>
                    {peutGererAlertes && <div className="flex shrink-0 items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleCreerTache(alerte)}>
                        <PlusCircle className="size-3.5 mr-1" /> Créer tâche
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleMarquerTraitee(Number(alerte.id))}>
                        <CheckCircle2 className="size-3.5 mr-1" /> Traiter
                      </Button>
                    </div>}
                  </MotionCard>
                </motion.div>
              ))}
            </div>
          )}
        </section>

        {/* Kanban */}
        <section>
          <h2 className="mb-4 text-title-sm font-bold text-foreground flex items-center gap-2">
            Tableau Kanban des tâches correctives
            {tachesEnRetardCount > 0 && (
              <span className="rounded-full bg-destructive/10 px-2.5 py-0.5 text-xs font-bold text-destructive flex items-center gap-1">
                <AlertTriangle className="size-3" /> {tachesEnRetardCount} en retard
              </span>
            )}
          </h2>

          {afficherSquelette ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-64 animate-pulse rounded-2xl border border-border/70 bg-card-subtle/50" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
              {COLONNES.map((col) => {
                const tachesColonne = tachesFiltrees.filter((t) => t.statut_tache === col.statut);
                return (
                  <div key={col.statut} className="rounded-2xl border border-border/70 bg-card/50 p-4">
                    <div className={`mb-4 flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-bold ${col.color}`}>
                      {col.icon}
                      {col.label}
                      <span className="ml-auto rounded-full bg-current/20 px-2 py-0.5 text-xs">
                        {tachesColonne.length}
                      </span>
                    </div>

                    <div className="space-y-3">
                      <AnimatePresence>
                        {tachesColonne.map((tache: any) => {
                          const tacheIdNum = Number(tache.id);
                          return (
                            <motion.div
                              key={tache.id.toString()}
                              layout
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.9 }}
                            >
                              <MotionCard
                                className={`p-4 space-y-2.5 ${
                                  col.statut !== 'TERMINEE' && new Date(tache.date_echeance) < new Date()
                                    ? 'border-destructive/40 bg-destructive/5'
                                    : ''
                                }`}
                              >
                                <p className="text-sm font-semibold text-foreground leading-snug">{tache.titre}</p>
                                {tache.description && (
                                  <p className="text-xs text-muted-foreground line-clamp-2">{tache.description}</p>
                                )}
                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                  <span
                                    className={
                                      col.statut !== 'TERMINEE' && new Date(tache.date_echeance) < new Date()
                                        ? 'flex items-center gap-1 font-bold text-destructive'
                                        : ''
                                    }
                                  >
                                    {col.statut !== 'TERMINEE' && new Date(tache.date_echeance) < new Date() && (
                                      <AlertTriangle className="size-3" />
                                    )}
                                    Échéance: {new Date(tache.date_echeance).toLocaleDateString('fr-FR')}
                                    {col.statut !== 'TERMINEE' && new Date(tache.date_echeance) < new Date() && ' (dépassée)'}
                                  </span>
                                  {tache.responsable && (
                                    <span className="font-medium text-foreground">
                                      {tache.responsable.prenom} {tache.responsable.nom}
                                    </span>
                                  )}
                                </div>
                                {tache.alerte?.guichet && (
                                  <p className="text-[10px] text-muted-foreground italic">
                                    Guichet: {tache.alerte.guichet.nom_guichet}
                                  </p>
                                )}
                                {/* Boutons de transition + historique */}
                                <div className="flex gap-2 pt-1 flex-wrap">
                                  {col.statut !== 'A_FAIRE' && peutAgirSurTache(tache) && (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 px-2.5 text-[11px]"
                                      onClick={() => handleMoveStatut(tacheIdNum, col.statut === 'EN_COURS' ? 'A_FAIRE' : 'EN_COURS')}
                                      disabled={movingId === tacheIdNum}
                                    >
                                      ← Reculer
                                    </Button>
                                  )}
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-2.5 text-[11px]"
                                    onClick={() => setHistoriqueOpenId(historiqueOpenId === tacheIdNum ? null : tacheIdNum)}
                                    title="Voir l'historique d'audit"
                                  >
                                    <History className="size-3" /> Historique
                                  </Button>
                                  {col.statut !== 'TERMINEE' && peutAgirSurTache(tache) && (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="ml-auto h-7 px-2.5 text-[11px] text-primary hover:bg-primary/10 hover:text-primary"
                                      onClick={() => handleMoveStatut(tacheIdNum, col.statut === 'A_FAIRE' ? 'EN_COURS' : 'TERMINEE')}
                                      disabled={movingId === tacheIdNum}
                                    >
                                      Avancer <ChevronRight className="size-3" />
                                    </Button>
                                  )}
                                </div>

                                {/* Timeline d'audit — s'affiche sous la carte */}
                                <AnimatePresence>
                                  {historiqueOpenId === tacheIdNum && (
                                    <TacheHistoriquePanel idTache={tacheIdNum} />
                                  )}
                                </AnimatePresence>
                              </MotionCard>
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>
                      {tachesColonne.length === 0 && (
                        <p className="text-center text-xs text-muted-foreground py-6 italic">Aucune tâche</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Modal création de tâche */}
      <AnimatePresence>
        {modal.alerteId !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={(e) => e.target === e.currentTarget && setModal({ alerteId: null, idAgence: null })}
          >
            <motion.div
              initial={{ scale: 0.93, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.93, opacity: 0 }}
              className="w-full max-w-md rounded-2xl border border-border bg-background p-6 shadow-premium"
            >
              <div className="mb-5 flex items-center justify-between">
                <h3 className="text-lg font-bold text-foreground">Nouvelle tâche corrective</h3>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setModal({ alerteId: null, idAgence: null })}
                  aria-label="Fermer"
                >
                  <X className="size-5" />
                </Button>
              </div>

              <form onSubmit={handleSoumettreCreation} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1">Titre *</label>
                  <Input
                    required
                    value={formTache.titre}
                    onChange={(e) => setFormTache((p) => ({ ...p, titre: e.target.value }))}
                    placeholder="Décrire l'action corrective"
                    className="h-11"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1">Description</label>
                  <Textarea
                    value={formTache.description}
                    onChange={(e) => setFormTache((p) => ({ ...p, description: e.target.value }))}
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1">Date d'échéance *</label>
                  <Input
                    type="date"
                    required
                    value={formTache.date_echeance}
                    onChange={(e) => setFormTache((p) => ({ ...p, date_echeance: e.target.value }))}
                    className="h-11"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1">Responsable *</label>
                  <Select
                    value={formTache.id_responsable || undefined}
                    onValueChange={(value) => setFormTache((p) => ({ ...p, id_responsable: value }))}
                    disabled={responsablesPossibles.length === 0}
                  >
                    <SelectTrigger className="h-11 w-full">
                      <SelectValue
                        placeholder={
                          responsablesPossibles.length > 0
                            ? 'Sélectionner un responsable...'
                            : 'Aucun agent disponible dans cette agence'
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {responsablesPossibles.map((agent: any) => (
                        <SelectItem key={agent.id} value={String(agent.id)}>
                          {agent.prenom} {agent.nom} — {agent.role}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-3 pt-2">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setModal({ alerteId: null, idAgence: null })}>
                    Annuler
                  </Button>
                  <Button type="submit" className="flex-1" disabled={saving}>
                    {saving ? 'Création...' : 'Créer la tâche'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AmbientBackground>
    </RequireAuth>
  );
};

// ============================================================================
// SOUS-COMPOSANT — Timeline d'audit pour une tâche
// Chargé à la demande via useQuery (lazy via 'enabled' sur l'idTache)
// ============================================================================

const STATUT_LABEL: Record<string, string> = {
  CREATION: 'Création',
  A_FAIRE: 'À faire',
  EN_COURS: 'En cours',
  TERMINEE: 'Terminée',
};

const STATUT_COLOR: Record<string, string> = {
  CREATION: 'bg-muted text-muted-foreground',
  A_FAIRE: 'bg-warning/15 text-warning',
  EN_COURS: 'bg-primary/10 text-primary',
  TERMINEE: 'bg-success/15 text-success',
};

function TacheHistoriquePanel({ idTache }: { idTache: number }) {
  const { data: historique, isLoading } = useQuery(getTacheHistorique, { id_tache: idTache });

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.25 }}
      className="overflow-hidden"
    >
      <div className="mt-3 rounded-xl border border-border/60 bg-muted/30 p-3 space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
          <History className="size-3" /> Historique d'audit
        </p>

        {isLoading && (
          <p className="text-xs text-muted-foreground italic">Chargement...</p>
        )}

        {!isLoading && (!historique || historique.length === 0) && (
          <p className="text-xs text-muted-foreground italic">Aucun historique disponible.</p>
        )}

        {!isLoading && historique && historique.length > 0 && (
          <ol className="relative ml-2 border-l border-border/50 pl-4 space-y-2.5">
            {(historique as any[]).map((h, i) => (
              <li key={h.id} className="relative">
                <span className="absolute -left-[1.15rem] top-0.5 flex size-3 items-center justify-center">
                  <span className="size-2 rounded-full bg-primary/60" />
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${STATUT_COLOR[h.ancien_statut] || 'bg-muted text-muted-foreground'}`}>
                    {STATUT_LABEL[h.ancien_statut] || h.ancien_statut}
                  </span>
                  <ArrowRight className="size-2.5 text-muted-foreground" />
                  <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${STATUT_COLOR[h.nouveau_statut] || 'bg-muted text-muted-foreground'}`}>
                    {STATUT_LABEL[h.nouveau_statut] || h.nouveau_statut}
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {new Date(h.date_action).toLocaleString('fr-FR')} — {h.auteur?.prenom || ''} {h.auteur?.nom || h.auteur?.email || ''}
                </p>
                {h.commentaire && (
                  <p className="text-[10px] italic text-muted-foreground">{h.commentaire}</p>
                )}
              </li>
            ))}
          </ol>
        )}
      </div>
    </motion.div>
  );
}
