import React, { useState } from 'react';
import { useQuery, useAction } from 'wasp/client/operations';
import { getAlertes, getTachesCorrectives } from 'wasp/client/operations';
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
} from 'lucide-react';
import { AmbientBackground } from '../components/AmbientBackground';
import { PageHeader } from '../components/PageHeader';
import { MotionCard } from '../components/MotionCard';
import { EmptyState } from '../components/EmptyState';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { useToast } from '../hooks/use-toast';

type Statut = 'A_FAIRE' | 'EN_COURS' | 'TERMINEE';

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
  const { data: alertes, isLoading: loadingAlertes } = useQuery(getAlertes);
  const { data: taches, isLoading: loadingTaches } = useQuery(getTachesCorrectives);
  const createTache = useAction(createTacheCorrective);
  const updateStatut = useAction(updateStatutTache);
  const marquerTraitee = useAction(marquerAlerteTraitee);

  const [modal, setModal] = useState<{ alerteId: number | null }>({ alerteId: null });
  const [formTache, setFormTache] = useState<ModalData>({
    id_alerte: 0,
    titre: '',
    description: '',
    date_echeance: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString().split('T')[0],
    id_responsable: '',
  });
  const [saving, setSaving] = useState(false);
  const [movingId, setMovingId] = useState<number | null>(null);

  const alertesList: any[] = alertes || [];
  const tachesList: any[] = taches || [];

  const alertesNouvelles = alertesList.filter((a) => a.statut_alerte === 'NOUVELLE');

  const handleCreerTache = (alerte: any) => {
    setFormTache({
      id_alerte: Number(alerte.id),
      titre: `Tâche — ${alerte.message?.slice(0, 50)}...`,
      description: alerte.message || '',
      date_echeance: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString().split('T')[0],
      id_responsable: '',
    });
    setModal({ alerteId: Number(alerte.id) });
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
      setModal({ alerteId: null });
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
    <AmbientBackground>
      <div className="mx-auto max-w-7xl p-6 lg:p-10 space-y-8">
        <PageHeader
          icon={AlertTriangle}
          eyebrow="Surveillance & Amélioration"
          title="Alertes & Tâches correctives"
          description="Suivez les alertes critiques et gérez les actions correctives associées en mode Kanban."
        />

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
              {alertesNouvelles.map((alerte: any, i: number) => (
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
                    <div className="flex shrink-0 items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleCreerTache(alerte)}>
                        <PlusCircle className="size-3.5 mr-1" /> Créer tâche
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleMarquerTraitee(Number(alerte.id))}>
                        <CheckCircle2 className="size-3.5 mr-1" /> Traiter
                      </Button>
                    </div>
                  </MotionCard>
                </motion.div>
              ))}
            </div>
          )}
        </section>

        {/* Kanban */}
        <section>
          <h2 className="mb-4 text-title-sm font-bold text-foreground">Tableau Kanban des tâches correctives</h2>

          {loadingTaches ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-64 animate-pulse rounded-2xl border border-border/70 bg-card-subtle/50" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
              {COLONNES.map((col) => {
                const tachesColonne = tachesList.filter((t) => t.statut_tache === col.statut);
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
                              <MotionCard className="p-4 space-y-2.5">
                                <p className="text-sm font-semibold text-foreground leading-snug">{tache.titre}</p>
                                {tache.description && (
                                  <p className="text-xs text-muted-foreground line-clamp-2">{tache.description}</p>
                                )}
                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                  <span>
                                    Échéance: {new Date(tache.date_echeance).toLocaleDateString('fr-FR')}
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
                                {/* Boutons de transition */}
                                <div className="flex gap-2 pt-1">
                                  {col.statut !== 'A_FAIRE' && (
                                    <button
                                      onClick={() => handleMoveStatut(tacheIdNum, col.statut === 'EN_COURS' ? 'A_FAIRE' : 'EN_COURS')}
                                      disabled={movingId === tacheIdNum}
                                      className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-semibold text-muted-foreground hover:bg-muted/60 transition-colors disabled:opacity-40"
                                    >
                                      ← Reculer
                                    </button>
                                  )}
                                  {col.statut !== 'TERMINEE' && (
                                    <button
                                      onClick={() => handleMoveStatut(tacheIdNum, col.statut === 'A_FAIRE' ? 'EN_COURS' : 'TERMINEE')}
                                      disabled={movingId === tacheIdNum}
                                      className="ml-auto flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-semibold text-primary hover:bg-primary/10 transition-colors disabled:opacity-40"
                                    >
                                      Avancer <ChevronRight className="size-3" />
                                    </button>
                                  )}
                                </div>
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
            onClick={(e) => e.target === e.currentTarget && setModal({ alerteId: null })}
          >
            <motion.div
              initial={{ scale: 0.93, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.93, opacity: 0 }}
              className="w-full max-w-md rounded-2xl border border-border bg-background p-6 shadow-premium"
            >
              <div className="mb-5 flex items-center justify-between">
                <h3 className="text-lg font-bold text-foreground">Nouvelle tâche corrective</h3>
                <button onClick={() => setModal({ alerteId: null })} className="text-muted-foreground hover:text-foreground">
                  <X className="size-5" />
                </button>
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
                  <textarea
                    value={formTache.description}
                    onChange={(e) => setFormTache((p) => ({ ...p, description: e.target.value }))}
                    rows={3}
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground focus:ring-1 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1">Date d'échéance *</label>
                  <input
                    type="date"
                    required
                    value={formTache.date_echeance}
                    onChange={(e) => setFormTache((p) => ({ ...p, date_echeance: e.target.value }))}
                    className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground focus:ring-1 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1">ID Responsable *</label>
                  <Input
                    required
                    value={formTache.id_responsable}
                    onChange={(e) => setFormTache((p) => ({ ...p, id_responsable: e.target.value }))}
                    placeholder="ID de l'agent responsable"
                    className="h-11"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setModal({ alerteId: null })}>
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
  );
};
