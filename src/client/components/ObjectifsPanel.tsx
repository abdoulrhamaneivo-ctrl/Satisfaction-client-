import React, { useState } from 'react';
import { useAuth } from 'wasp/client/auth';
import { useQuery, useAction } from 'wasp/client/operations';
import { getObjectifs, getCriteres, getAgenceCriteres, getAgences } from 'wasp/client/operations';
import { upsertObjectif, deleteObjectif } from 'wasp/client/operations';
import { motion } from 'framer-motion';
import { Target, TrendingUp, Save, Trash2 } from 'lucide-react';
import { MotionCard } from './MotionCard';
import { Button } from './ui/button';
import { Input } from './ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import { useToast } from '../hooks/use-toast';

type Props = {
  selectedAgenceId: number;
};

export const ObjectifsPanel = ({ selectedAgenceId }: Props) => {
  const { data: user } = useAuth();
  const { toast } = useToast();
  const { data: criteres } = useQuery(getCriteres);
  const { data: critereIdsActifs } = useQuery(getAgenceCriteres, { id_agence: selectedAgenceId });
  const { data: objectifs, refetch } = useQuery(getObjectifs, { id_agence: selectedAgenceId });
  const saveObjectif = useAction(upsertObjectif);
  const supprimerObjectif = useAction(deleteObjectif);

  const [editMap, setEditMap] = useState<Record<number, { valeur: string; debut: string; fin: string }>>({});
  const [saving, setSaving] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);
  // Remplace l'ancien window.confirm() natif (audit UX 2.2) par une
  // confirmation cohérente avec le reste du design system.
  const [objectifAConfirmer, setObjectifAConfirmer] = useState<{ idCritere: number; libelle: string } | null>(null);

  const activeIds: number[] = critereIdsActifs || [];
  const objectifsList: any[] = objectifs || [];
  const criteresList: any[] = criteres || [];

  const activeCriteres = criteresList.filter((c) => activeIds.includes(c.id));

  const getObjectifForCritere = (idCritere: number) =>
    objectifsList.find((o) => o.id_critere === idCritere);

  const getEdit = (idCritere: number) => {
    if (editMap[idCritere]) return editMap[idCritere];
    const obj = getObjectifForCritere(idCritere);
    const today = new Date().toISOString().split('T')[0];
    const inYear = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    return {
      valeur: obj ? String(Math.round(Number(obj.valeur_cible))) : '80',
      debut: obj ? new Date(obj.date_debut).toISOString().split('T')[0] : today,
      fin: obj ? new Date(obj.date_fin).toISOString().split('T')[0] : inYear,
    };
  };

  const handleSave = async (idCritere: number) => {
    const edit = getEdit(idCritere);
    const valeur = parseFloat(edit.valeur);
    if (isNaN(valeur) || valeur < 0 || valeur > 100) {
      toast({ variant: 'destructive', title: 'Valeur invalide', description: 'L\'objectif doit être entre 0 et 100%.' });
      return;
    }
    setSaving(idCritere);
    try {
      await saveObjectif({
        id_agence: selectedAgenceId,
        id_critere: idCritere,
        valeur_cible: valeur,
        date_debut: edit.debut,
        date_fin: edit.fin,
      });
      toast({ title: 'Objectif enregistré', description: `Objectif de ${valeur}% défini avec succès.` });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erreur', description: err.message });
    } finally {
      setSaving(null);
    }
  };

  const handleDelete = async (idCritere: number) => {
    const objectifActuel = getObjectifForCritere(idCritere);
    if (!objectifActuel) return;
    setDeleting(idCritere);
    try {
      await supprimerObjectif({ id: objectifActuel.id });
      toast({ title: 'Objectif supprimé', description: 'L\'objectif a été supprimé avec succès.' });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erreur', description: err.message });
    } finally {
      setDeleting(null);
      setObjectifAConfirmer(null);
    }
  };

  if (!user || (user.role !== 'DIRECTION' && user.role !== 'QUALITE')) return null;

  if (activeCriteres.length === 0) {
    return (
      <MotionCard className="p-6">
        <div className="flex items-center gap-2 mb-3">
          <Target className="size-5 text-primary" />
          <h3 className="text-lg font-bold text-foreground">Objectifs de satisfaction</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Activez d'abord des critères d'évaluation pour définir vos objectifs.
        </p>
      </MotionCard>
    );
  }

  return (
    <MotionCard className="p-6 space-y-5">
      <div className="flex items-center gap-2">
        <Target className="size-5 text-primary" />
        <h3 className="text-lg font-bold text-foreground">Objectifs de satisfaction</h3>
      </div>
      <p className="text-xs text-muted-foreground">
        Définissez un score cible (%) pour chaque axe d'évaluation actif.
      </p>

      <div className="space-y-4">
        {activeCriteres.map((critere: any, i: number) => {
          const edit = getEdit(critere.id);
          const objectifActuel = getObjectifForCritere(critere.id);
          const valeurNum = parseFloat(edit.valeur) || 0;

          return (
            <motion.div
              key={critere.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="rounded-xl border border-border/70 bg-background p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-foreground">{critere.libelle_critere}</span>
                {objectifActuel && (
                  <span className="rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-bold text-success uppercase">
                    Actif
                  </span>
                )}
              </div>

              {/* Barre de progression */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-muted-foreground">
                  <span>Objectif cible</span>
                  <span className="font-bold text-primary">{edit.valeur}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <motion.div
                    className="h-full rounded-full bg-primary"
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, valeurNum)}%` }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] font-semibold uppercase text-muted-foreground mb-0.5">Cible %</label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={edit.valeur}
                    onChange={(e) =>
                      setEditMap((prev) => ({ ...prev, [critere.id]: { ...getEdit(critere.id), valeur: e.target.value } }))
                    }
                    className="h-9"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold uppercase text-muted-foreground mb-0.5">Début</label>
                  <Input
                    type="date"
                    value={edit.debut}
                    onChange={(e) =>
                      setEditMap((prev) => ({ ...prev, [critere.id]: { ...getEdit(critere.id), debut: e.target.value } }))
                    }
                    className="h-9 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold uppercase text-muted-foreground mb-0.5">Fin</label>
                  <Input
                    type="date"
                    value={edit.fin}
                    onChange={(e) =>
                      setEditMap((prev) => ({ ...prev, [critere.id]: { ...getEdit(critere.id), fin: e.target.value } }))
                    }
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              <motion.div whileTap={{ scale: 0.97 }} className="flex gap-2">
                {objectifActuel && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-none border-destructive/40 text-destructive hover:bg-destructive/10"
                    disabled={deleting === critere.id}
                    onClick={() => setObjectifAConfirmer({ idCritere: critere.id, libelle: critere.libelle_critere })}
                    title="Supprimer l'objectif"
                    aria-label="Supprimer l'objectif"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                )}
                <Button
                  size="sm"
                  className="flex-1"
                  disabled={saving === critere.id}
                  onClick={() => handleSave(critere.id)}
                >
                  <Save className="size-3.5 mr-1.5" />
                  {saving === critere.id ? 'Enregistrement...' : 'Enregistrer l\'objectif'}
                </Button>
              </motion.div>
            </motion.div>
          );
        })}
      </div>

      <AlertDialog
        open={objectifAConfirmer !== null}
        onOpenChange={(open) => !open && setObjectifAConfirmer(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cet objectif ?</AlertDialogTitle>
            <AlertDialogDescription>
              L'objectif défini pour « {objectifAConfirmer?.libelle || 'ce critère'} » sera
              définitivement supprimé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => objectifAConfirmer && handleDelete(objectifAConfirmer.idCritere)}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MotionCard>
  );
};
