import React, { useState } from 'react';
import { useAuth } from 'wasp/client/auth';
import {
  useQuery,
  getCriteres,
  getAgenceCriteres,
  getAgences,
  toggleCritereAgence,
  createCritere,
  updateCritere,
  getServices,
  createService,
  deleteCritere,
  duplicateCritere,
  archiverCritere,
  desarchiverCritere
} from 'wasp/client/operations';
import { EditeurOptions } from '../components/EditeurOptions';
import {
  optionVide,
  csvVersOptions,
  baseVersOptions,
  optionsVersPayload,
  type OptionForm,
} from '../criteres/optionsForm';
import { normaliserLibelle } from '../../shared/scoringQCM';
import { motion } from 'framer-motion';
import {
  Settings2,
  Search,
  RotateCcw,
  Archive,
  Copy,
  Trash2,
  Plus,
  HelpCircle,
  Sliders,
  Sparkles,
  Layers,
  Pencil
} from 'lucide-react';
import { AmbientBackground } from '../components/AmbientBackground';
import { PageHeader } from '../components/PageHeader';
import { MotionCard } from '../components/MotionCard';
import { EmptyState } from '../components/EmptyState';
import { QuestionsParOperation } from '../components/QuestionsParOperation';
import { ObjectifsPanel } from '../components/ObjectifsPanel';
import { RequireAuth } from '../components/RequireAuth';
import { RequireEnterpriseRole } from "../components/RequireEnterpriseRole";
import { useToast } from '../hooks/use-toast';

import { Button } from '../components/ui/button';
import { Switch } from '../components/ui/switch';
import { Checkbox } from '../components/ui/checkbox';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
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

const typeReponseLabel: Record<string, string> = {
  SMILEY: '⭐ Note',
  OUI_NON: '👍 Oui/Non',
  QCM: '📝 Choix unique',
  CASES: '☑️ Choix multiples',
  ECHELLE: '🔢 Échelle',
  NPS: '📊 NPS (0-10)',
  TEXTE: '✍️ Texte',
};

// 'AUTO' = champ vide côté serveur (comportement legacy/catégoriel par défaut).
const MODES_CASES = [
  { id: 'AUTO', label: 'Auto (catégoriel si non noté)' },
  { id: 'CASES_CATEGORICAL', label: 'Catégoriel (jamais noté, stats %)' },
  { id: 'CASES_WEIGHTED', label: 'Pondéré (poids ±, base 100)' },
];

export const ConfigurationCriteresPage = () => {
  const { data: user } = useAuth();
  const { toast } = useToast();
  const [selectedAgenceId, setSelectedAgenceId] = useState<number | undefined>(user?.id_agence || undefined);

  const { data: criteres, isLoading: loadingCriteres } = useQuery(getCriteres);
  const { data: agenceCriteresIds, isLoading: loadingActive } = useQuery(
    getAgenceCriteres,
    { id_agence: selectedAgenceId },
    { enabled: selectedAgenceId !== undefined }
  );
  const { data: agences } = useQuery(getAgences);
  const { data: services } = useQuery(getServices);

  React.useEffect(() => {
    if (agences && agences.length > 0) {
      const isValide = agences.some((ag: any) => ag.id === selectedAgenceId);
      if (!isValide) {
        setSelectedAgenceId(agences[0].id);
      }
    }
  }, [agences, selectedAgenceId]);

  // Filet de sécurité : si l'utilisateur connecté change (changement de
  // compte dans le même onglet, sans rechargement complet de la page), on
  // resynchronise l'agence sélectionnée sur celle du nouvel utilisateur.
  // Sans ça, un id_agence appartenant à l'ancien compte pouvait rester en
  // mémoire dans le state React et être envoyé au serveur pour le nouveau
  // compte, provoquant un rejet légitime mais déroutant ("cette ressource
  // appartient à une autre entreprise") côté RLS.
  const currentUserId = user?.id;
  React.useEffect(() => {
    setSelectedAgenceId(user?.id_agence || undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId]);

  const [nouveauLibelle, setNomLibelle] = useState('');
  const [nouvelleDesc, setNouvelleDesc] = useState('');
  const [typeReponse, setTypeReponse] = useState('SMILEY');
  // Vague 1 : éditeur de choix (remplace le CSV). Vide = formulaire vierge.
  const [optionsCreation, setOptionsCreation] = useState<OptionForm[]>([]);
  const [scoringModeCreation, setScoringModeCreation] = useState('AUTO');
  const [orientationCreation, setOrientationCreation] = useState('HIGHER_BETTER');
  const [echelleMin, setEchelleMin] = useState('1');
  const [echelleMax, setEchelleMax] = useState('10');
  const [obligatoire, setObligatoire] = useState(true);
  const [loadingCreation, setLoadingCreation] = useState(false);
  const [selectedServiceIds, setSelectedServiceIds] = useState<number[]>([]);
  const [newServiceName, setNewServiceName] = useState('');
  const [creatingService, setCreatingService] = useState(false);
  // Édition d'un critère existant (dialog). Les avis passés gardent
  // l'ancienne version du scoring (critere_version) — modifier ici ne
  // réécrit jamais l'historique.
  const [critereEnEdition, setCritereEnEdition] = useState<any | null>(null);
  const [editLibelle, setEditLibelle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editType, setEditType] = useState('SMILEY');
  const [editOptions, setEditOptions] = useState<OptionForm[]>([]);
  const [editMode, setEditMode] = useState('AUTO');
  const [editOrientation, setEditOrientation] = useState('HIGHER_BETTER');
  const [editObligatoire, setEditObligatoire] = useState(true);
  const [savingEdition, setSavingEdition] = useState(false);

  const ouvrirEdition = (critere: any) => {
    setCritereEnEdition(critere);
    setEditLibelle(critere.libelle_critere || '');
    setEditDesc(critere.description || '');
    setEditType(critere.type_reponse || 'SMILEY');
    setEditOptions(
      critere.options?.length
        ? baseVersOptions(critere.options)
        : csvVersOptions(critere.options_reponse || ''),
    );
    setEditMode(critere.scoring_mode || 'AUTO');
    setEditOrientation(critere.orientation || 'HIGHER_BETTER');
    setEditObligatoire(critere.obligatoire !== false);
  };

  const changerTypeEdition = (t: string) => {
    setEditType(t);
    if ((t === 'QCM' || t === 'CASES') && editOptions.length < 2) {
      setEditOptions([optionVide(), optionVide()]);
    }
  };

  const sauvegarderEdition = async () => {
    const original = critereEnEdition;
    if (!original || savingEdition) return;
    if (!editLibelle.trim()) {
      toast({ variant: 'destructive', title: 'Libellé requis', description: 'La question ne peut pas être vide.' });
      return;
    }
    const typeChange = editType !== original.type_reponse;
    const payloadOptions =
      (editType === 'QCM' || editType === 'CASES') ? optionsVersPayload(editOptions) : undefined;
    if ((editType === 'QCM' || editType === 'CASES') && (payloadOptions?.length ?? 0) < 2) {
      toast({ variant: 'destructive', title: 'Choix incomplets', description: 'Renseignez au moins 2 choix (libellé requis).' });
      return;
    }
    // Envoi des options seulement si réellement modifiées (évite un bump
    // de version de scoring pour une simple retouche de libellé).
    const signatureOptions = (liste: Array<{ libelle: string; score: number | null; poids: number | null; code_metier?: string }>) =>
      liste.map((o) => `${normaliserLibelle(o.libelle)}|${o.score ?? ''}|${o.poids ?? ''}|${(o.code_metier || '').toUpperCase()}`).join(';');
    const avantOptions = signatureOptions(
      (original.options?.length ? baseVersOptions(original.options) : csvVersOptions(original.options_reponse || ''))
        .map((o) => ({ libelle: o.libelle, score: o.score, poids: o.poids, code_metier: o.code_metier })),
    );
    const optionsModifiees = typeChange || (payloadOptions ? signatureOptions(payloadOptions) !== avantOptions : false);
    setSavingEdition(true);
    try {
      await updateCritere({
        id_critere: original.id,
        libelle_critere: editLibelle.trim(),
        description: editDesc.trim(),
        // Type/mode/orientation/options : envoyés seulement si modifiés
        // (évite de bumper la version de scoring pour une simple retouche).
        ...(typeChange ? { type_reponse: editType } : {}),
        ...(optionsModifiees && payloadOptions ? { options: payloadOptions } : {}),
        ...((editType === 'CASES' && (editMode !== (original.scoring_mode || 'AUTO'))) ? { scoring_mode: editMode === 'AUTO' ? null : editMode } : {}),
        ...(editOrientation !== (original.orientation || 'HIGHER_BETTER') ? { orientation: editOrientation } : {}),
        obligatoire: editObligatoire,
      } as any);
      setCritereEnEdition(null);
      toast({ variant: 'success', title: 'Question mise à jour', description: typeChange || optionsModifiees ? 'Nouvelle version de scoring : les avis passés gardent l’ancienne.' : 'Modifications enregistrées.' });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Mise à jour impossible', description: err.message || 'Erreur inconnue' });
    } finally {
      setSavingEdition(false);
    }
  };

  const choisirType = (t: string) => {
    setTypeReponse(t);
    // À l'ouverture de QCM/CASES : 2 lignes vierges (minimum serveur).
    if ((t === 'QCM' || t === 'CASES') && optionsCreation.length === 0) {
      setOptionsCreation([optionVide(), optionVide()]);
    }
  };

  const activeIds: number[] = agenceCriteresIds || [];

  const [deletingCritereId, setDeletingCritereId] = useState<number | null>(null);
  const [duplicatingCritereId, setDuplicatingCritereId] = useState<number | null>(null);
  const [critereASupprimer, setCritereASupprimer] = useState<any | null>(null);
  const [rechercheCritere, setRechercheCritere] = useState('');
  const criteresFiltres = (criteres ?? []).filter((critere: any) => {
    const recherche = rechercheCritere.trim().toLocaleLowerCase('fr-FR');
    if (!recherche) return true;
    return [critere.libelle_critere, critere.description, typeReponseLabel[critere.type_reponse]]
      .filter(Boolean)
      .join(' ')
      .toLocaleLowerCase('fr-FR')
      .includes(recherche);
  });

  const handleDeleteCritere = async (critere: any) => {
    if (deletingCritereId) return;
    setCritereASupprimer(critere);
  };

  const confirmerSuppressionCritere = async () => {
    const critere = critereASupprimer;
    if (!critere || deletingCritereId) return;
    setDeletingCritereId(critere.id);
    try {
      await deleteCritere({ id_critere: critere.id });
      toast({ variant: 'success', title: 'Critère supprimé', description: `« ${critere.libelle_critere} » a été supprimé.` });
      setCritereASupprimer(null);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Suppression impossible', description: err.message || 'Erreur inconnue' });
    } finally {
      setDeletingCritereId(null);
    }
  };

  const handleDuplicateCritere = async (critere: any) => {
    if (duplicatingCritereId) return;
    setDuplicatingCritereId(critere.id);
    try {
      await duplicateCritere({ id_critere: critere.id });
      toast({ variant: 'success', title: 'Critère dupliqué', description: `Une copie de « ${critere.libelle_critere} » a été créée, modifiable librement.` });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Duplication impossible', description: err.message || 'Erreur inconnue' });
    } finally {
      setDuplicatingCritereId(null);
    }
  };

  // Verrou anti-double-clic : sans lui, deux toggles rapides créaient deux
  // lignes AgenceCritere et la seconde explosait en 500 (contrainte unique).
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const handleToggle = async (idCritere: number, checked: boolean) => {
    if (selectedAgenceId === undefined || togglingId !== null) return;
    setTogglingId(idCritere);
    try {
      await toggleCritereAgence({ id_critere: idCritere, id_agence: selectedAgenceId, active: checked });
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erreur lors de la modification',
        description: err.message || 'Erreur inconnue',
      });
    } finally {
      setTogglingId(null);
    }
  };

  const handleCreateCustom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nouveauLibelle.trim() || selectedAgenceId === undefined) return;
    if (typeReponse === 'ECHELLE') {
      const min = Number(echelleMin);
      const max = Number(echelleMax);
      if (!Number.isInteger(min) || !Number.isInteger(max) || max <= min) {
        toast({ variant: 'destructive', title: 'Échelle invalide', description: 'Le maximum doit être un entier supérieur au minimum.' });
        return;
      }
    }
    // Vague 1 : jeu d'options explicite (notes = provenance EXPLICIT).
    const payloadOptions =
      typeReponse === 'QCM' || typeReponse === 'CASES'
        ? optionsVersPayload(optionsCreation)
        : undefined;
    if ((typeReponse === 'QCM' || typeReponse === 'CASES') && (payloadOptions?.length ?? 0) < 2) {
      toast({ variant: 'destructive', title: 'Choix incomplets', description: 'Renseignez au moins 2 choix (libellé requis).' });
      return;
    }
    setLoadingCreation(true);
    try {
      await createCritere({
        libelle_critere: nouveauLibelle,
        description: nouvelleDesc,
        type_reponse: typeReponse,
        ...(payloadOptions ? { options: payloadOptions } : {}),
        ...(typeReponse === 'CASES' && scoringModeCreation !== 'AUTO' ? { scoring_mode: scoringModeCreation } : {}),
        ...((typeReponse === 'OUI_NON' || typeReponse === 'ECHELLE') && orientationCreation !== 'HIGHER_BETTER'
          ? { orientation: orientationCreation }
          : {}),
        ...(typeReponse === 'ECHELLE' ? { options_reponse: `${echelleMin},${echelleMax}` } : {}),
        obligatoire,
        id_agence: selectedAgenceId,
        serviceIds: selectedServiceIds.length > 0 ? selectedServiceIds : undefined,
      } as any);
      setNomLibelle('');
      setNouvelleDesc('');
      setOptionsCreation([]);
      setScoringModeCreation('AUTO');
      setOrientationCreation('HIGHER_BETTER');
      setTypeReponse('SMILEY');
      setEchelleMin('1');
      setEchelleMax('10');
      setObligatoire(true);
      setSelectedServiceIds([]);
      toast({ variant: 'success', title: 'Critère créé', description: `« ${nouveauLibelle} » a été ajouté avec succès.` });
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erreur de création',
        description: err.message || 'Erreur inconnue',
      });
    } finally {
      setLoadingCreation(false);
    }
  };

  const handleCreateService = async () => {
    if (!newServiceName.trim()) return;
    setCreatingService(true);
    try {
      const created: any = await createService({ libelle_service: newServiceName.trim() });
      setNewServiceName('');
      setSelectedServiceIds((prev) => [...prev, created.id]);
      toast({ variant: 'success', title: 'Opération créée', description: `« ${created.libelle_service} » est disponible.` });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erreur', description: err.message || 'Erreur inconnue' });
    } finally {
      setCreatingService(false);
    }
  };

  return (
    <RequireEnterpriseRole>
      <RequireAuth>
    <AmbientBackground>
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mx-auto max-w-7xl p-6 lg:p-10 space-y-8"
      >
        <PageHeader
          icon={Settings2}
          eyebrow="Norme FD X50-167"
          title="Configuration des Critères"
          description="Activez les axes de qualité et définissez vos objectifs de satisfaction par agence."
          actions={
            user?.role === 'DIRECTION' && agences && agences.length > 0 ? (
              <Select
                value={String(selectedAgenceId)}
                onValueChange={(v) => setSelectedAgenceId(Number(v))}
              >
                <SelectTrigger className="h-10 min-w-56">
                  <SelectValue placeholder="Choisir l'agence" />
                </SelectTrigger>
                <SelectContent>
                  {agences.map((ag: any) => (
                    <SelectItem key={ag.id} value={String(ag.id)}>
                      {ag.nom_agence} ({ag.commune})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : undefined
          }
        />

        <section className="space-y-4 rounded-3xl border border-border/70 bg-card/70 p-4 shadow-sm sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Parcours de collecte</p>
              <h2 className="mt-1 text-xl font-bold tracking-tight text-foreground">Organiser les questions par opération</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              Glissez-déposez une question vers une opération (ex. Retrait, Dépôt...) pour l'y rattacher,
              réordonnez-les comme une liste de tâches, ou utilisez le bouton <strong>+</strong> de chaque
              colonne pour en ajouter une directement.
              </p>
              <p className="mt-2 max-w-3xl text-xs leading-5 text-muted-foreground">
                Catalogue partagé : questions et opérations sont communes à <strong>toute
                l'entreprise</strong> — chaque agence <strong>active</strong> ensuite ses propres
                questions via les interrupteurs ci-dessous. Organiser ici change le parcours
                de toutes les agences qui utilisent cette opération.
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2 self-start rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold text-muted-foreground">
              <span className="size-2 rounded-full bg-success" />
              Enregistrement automatique
            </div>
          </div>
          {selectedAgenceId !== undefined ? (
            <QuestionsParOperation selectedAgenceId={selectedAgenceId} />
          ) : (
            <div className="h-64 animate-pulse rounded-2xl border border-border/70 bg-card-subtle/50" />
          )}
          <p className="px-1 text-xs text-muted-foreground sm:hidden">
            Faites glisser horizontalement pour voir les autres opérations. Maintenez une poignée pour déplacer une question.
          </p>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Colonne principale : liste des critères */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              Axes d'évaluation nationaux et personnalisés
              {!loadingCriteres && !loadingActive && criteres && criteres.length > 0 && (
                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                  {activeIds.length} actif{activeIds.length > 1 ? 's' : ''} / {criteres.length}
                </span>
              )}
            </h2>

            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={rechercheCritere}
                onChange={(event) => setRechercheCritere(event.target.value)}
                placeholder="Rechercher une question ou un type de réponse…"
                className="h-10 pl-9"
                aria-label="Rechercher un critère"
              />
            </div>

            {(loadingCriteres || loadingActive) && (
              <div className="space-y-3">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-16 animate-pulse rounded-2xl border border-border/70 bg-card-subtle/50" />
                ))}
              </div>
            )}

            {!loadingCriteres && criteres && criteres.length > 0 && criteresFiltres.length === 0 && (
              <EmptyState
                icon={Search}
                title="Aucun critère ne correspond à votre recherche"
                description="Essayez un autre mot-clé ou réinitialisez la recherche."
                action={<Button variant="outline" onClick={() => setRechercheCritere('')} className="rounded-xl">Effacer la recherche</Button>}
                className="py-10"
              />
            )}

            <div className="grid gap-4">
              {criteresFiltres.map((critere: any) => {
                const isActive = activeIds.includes(critere.id);
                return (
                  <MotionCard key={critere.id} className={`p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border ${critere.archive ? 'opacity-60 bg-muted/20 border-warning/30' : ''}`}>
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-foreground text-base">{critere.libelle_critere}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${isActive ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>
                          {isActive ? 'Actif' : 'Désactivé'}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase bg-primary/10 text-primary">
                          {typeReponseLabel[critere.type_reponse] || critere.type_reponse}
                        </span>
                        {critere.obligatoire === false && (
                          <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase bg-secondary/15 text-secondary-muted-foreground">
                            Optionnelle
                          </span>
                        )}
                        {critere.archive && (
                          <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase bg-warning/20 text-warning">
                            Archivé
                          </span>
                        )}
                      </div>
                      {critere.description && (
                        <p className="text-xs text-muted-foreground">{critere.description}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={async () => {
                          try {
                            if (critere.archive) {
                              await desarchiverCritere({ id_critere: critere.id });
                              toast({ variant: 'success', title: 'Question désarchivée', description: `« ${critere.libelle_critere} » est réactivée.` });
                            } else {
                              await archiverCritere({ id_critere: critere.id });
                              toast({ variant: 'success', title: 'Question archivée', description: `« ${critere.libelle_critere} » a été archivée.` });
                            }
                          } catch (err: any) {
                            toast({ variant: 'destructive', title: 'Erreur', description: err.message || 'Erreur inconnue' });
                          }
                        }}
                        aria-label={critere.archive ? `Désarchiver « ${critere.libelle_critere} »` : `Archiver « ${critere.libelle_critere} »`}
                        title={critere.archive ? "Désarchiver cette question" : "Archiver cette question (ne s'affichera plus dans les formulaires)"}
                        className={`min-h-11 min-w-11 ${critere.archive ? "text-warning hover:bg-warning/10" : "hover:bg-accent/50"}`}
                      >
                        {critere.archive ? <RotateCcw className="size-4" /> : <Archive className="size-4" />}
                      </Button>
                      {critere.id_entreprise !== null && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => ouvrirEdition(critere)}
                          aria-label={`Modifier « ${critere.libelle_critere} »`}
                          title="Modifier la question (libellé, choix, notes, mode)"
                          className="min-h-11 min-w-11"
                        >
                          <Pencil className="size-4" />
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDuplicateCritere(critere)}
                        disabled={duplicatingCritereId === critere.id}
                        aria-label={`Dupliquer « ${critere.libelle_critere} »`}
                        title="Dupliquer ce critère"
                        className="min-h-11 min-w-11"
                      >
                        <Copy className="size-4" />
                      </Button>
                      {critere.id_entreprise !== null && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteCritere(critere)}
                          disabled={deletingCritereId === critere.id}
                          className="min-h-11 min-w-11 hover:bg-destructive/10 hover:text-destructive"
                          aria-label={`Supprimer « ${critere.libelle_critere} »`}
                          title="Supprimer ce critère"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      )}
                      <Switch
                        checked={isActive}
                        disabled={togglingId === critere.id}
                        onCheckedChange={(checked) => handleToggle(critere.id, checked)}
                        aria-label={`Activer « ${critere.libelle_critere} »`}
                      />
                    </div>
                  </MotionCard>
                );
              })}
            </div>
          </div>

          {/* Colonne droite : création + objectifs */}
          <div className="space-y-6">
            <MotionCard className="h-fit p-6 space-y-5">
              <div>
                <h3 className="text-lg font-bold text-foreground">Créer un critère à la carte</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Vous avez un standard spécifique ? Ajoutez une nouvelle question à votre questionnaire.
                </p>
              </div>

              <form onSubmit={handleCreateCustom} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-foreground uppercase mb-1">Votre question / Critère</label>
                  <Input
                    type="text"
                    required
                    value={nouveauLibelle}
                    onChange={(e) => setNomLibelle(e.target.value)}
                    placeholder="Ex: Comment évaluez-vous la propreté ?"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground uppercase mb-1">Description (optionnel)</label>
                  <Input
                    type="text"
                    value={nouvelleDesc}
                    onChange={(e) => setNouvelleDesc(e.target.value)}
                    placeholder="S'affichera sous la question"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground uppercase mb-1">Type de réponse</label>
                  <Select value={typeReponse} onValueChange={choisirType}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SMILEY">⭐ Note / Smileys (1 à 5)</SelectItem>
                      <SelectItem value="OUI_NON">👍 Oui / Non</SelectItem>
                      <SelectItem value="QCM">📝 Choix unique (QCM)</SelectItem>
                      <SelectItem value="CASES">☑️ Choix multiples (cases à cocher)</SelectItem>
                      <SelectItem value="ECHELLE">🔢 Échelle linéaire (ex. note sur 10)</SelectItem>
                      <SelectItem value="NPS">📊 NPS (0 à 10)</SelectItem>
                      <SelectItem value="TEXTE">✍️ Texte libre / Suggestion</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {(typeReponse === 'OUI_NON' || typeReponse === 'ECHELLE') && (
                  <div>
                    <label className="block text-xs font-semibold text-foreground uppercase mb-1">Orientation de la note</label>
                    <Select value={orientationCreation} onValueChange={setOrientationCreation}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="HIGHER_BETTER">
                          {typeReponse === 'OUI_NON' ? 'Oui = positif (ex. « Satisfait ? »)' : 'Croissante (plus = mieux)'}
                        </SelectItem>
                        <SelectItem value="LOWER_BETTER">
                          {typeReponse === 'OUI_NON' ? 'Oui = négatif (ex. « Problème ? »)' : 'Décroissante (moins = mieux)'}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {(typeReponse === 'QCM' || typeReponse === 'CASES') && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-3"
                  >
                    <div>
                      <label className="block text-xs font-semibold text-foreground uppercase mb-1">
                        {typeReponse === 'CASES' ? 'Cases proposées' : 'Choix possibles'}
                      </label>
                      <EditeurOptions
                        options={optionsCreation}
                        onChange={setOptionsCreation}
                        pondere={typeReponse === 'CASES' && scoringModeCreation === 'CASES_WEIGHTED'}
                      />
                      <p className="text-[11px] text-muted-foreground mt-1">
                        {typeReponse === 'CASES'
                          ? 'Le client pourra cocher plusieurs cases à la fois.'
                          : 'Le client ne pourra choisir qu\'une seule réponse.'}
                      </p>
                    </div>
                    {typeReponse === 'CASES' && (
                      <div>
                        <label className="block text-xs font-semibold text-foreground uppercase mb-1">Mode de scoring</label>
                        <Select value={scoringModeCreation} onValueChange={setScoringModeCreation}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Auto" />
                          </SelectTrigger>
                          <SelectContent>
                            {MODES_CASES.map((m) => (
                              <SelectItem key={m.id} value={m.id}>{m.label || 'Auto'}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </motion.div>
                )}

                {typeReponse === 'ECHELLE' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="flex gap-3"
                  >
                    <div className="flex-1">
                      <label className="block text-xs font-semibold text-foreground uppercase mb-1">Minimum</label>
                      <Input
                        type="number"
                        required
                        value={echelleMin}
                        onChange={(e) => setEchelleMin(e.target.value)}
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-semibold text-foreground uppercase mb-1">Maximum</label>
                      <Input
                        type="number"
                        required
                        value={echelleMax}
                        onChange={(e) => setEchelleMax(e.target.value)}
                      />
                    </div>
                  </motion.div>
                )}

                <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                  <Checkbox
                    checked={obligatoire}
                    onCheckedChange={(checked) => setObligatoire(checked === true)}
                  />
                  Question obligatoire
                  <span className="text-[11px] text-muted-foreground font-normal">
                    (sinon un bouton « Passer » sera proposé au client)
                  </span>
                </label>

                <div>
                  <label className="block text-xs font-semibold text-foreground uppercase mb-1">
                    Rattacher à une opération (optionnel)
                  </label>
                  <p className="text-[11px] text-muted-foreground mb-2">
                    Une question est organisée dans une seule opération. Sans rattachement, elle reste
                    disponible dans le vivier « Non assignées » et fait partie des critères par défaut.
                  </p>
                  <div className="space-y-2 rounded-md border border-input p-3 bg-background/50">
                    <RadioGroup
                      value={selectedServiceIds.length === 0 ? 'NONE' : String(selectedServiceIds[0])}
                      onValueChange={(v) => setSelectedServiceIds(v === 'NONE' ? [] : [Number(v)])}
                      className="space-y-2"
                    >
                      <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                        <RadioGroupItem value="NONE" />
                        Non assignée
                      </label>
                      {services?.map((s: any) => (
                        <label key={s.id} className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                          <RadioGroupItem value={String(s.id)} />
                          {s.libelle_service}
                        </label>
                      ))}
                    </RadioGroup>
                    {(!services || services.length === 0) && (
                      <p className="text-xs text-muted-foreground">Aucune opération créée pour le moment.</p>
                    )}
                    <div className="flex gap-2 pt-1">
                      <Input
                        value={newServiceName}
                        onChange={(e) => setNewServiceName(e.target.value)}
                        placeholder="Nouvelle opération"
                        className="h-8 flex-1 text-xs"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleCreateService();
                          }
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        disabled={creatingService || !newServiceName.trim()}
                        onClick={handleCreateService}
                        className="h-auto shrink-0 px-2 text-xs"
                      >
                        {creatingService ? '...' : '+ Ajouter'}
                      </Button>
                    </div>
                  </div>
                </div>

                <motion.div whileTap={{ scale: 0.97 }}>
                  <Button type="submit" disabled={loadingCreation} className="w-full">
                    {loadingCreation ? "Création..." : "Ajouter la question"}
                  </Button>
                </motion.div>
              </form>
            </MotionCard>

            {/* Panneau Objectifs (Module 1 — visible pour DIRECTION) */}
            {selectedAgenceId !== undefined && (
              <ObjectifsPanel selectedAgenceId={selectedAgenceId} />
            )}
          </div>
        </div>

        {/* Dialogue de modification (vague 1) : libellé, choix/notes, mode. */}
        {critereEnEdition !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Modifier la question">
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => !savingEdition && setCritereEnEdition(null)} />
            <div className="relative w-full max-w-lg max-h-[90dvh] overflow-y-auto rounded-3xl border border-border bg-card p-6 shadow-premium-lg space-y-4">
              <div>
                <h3 className="text-lg font-bold text-foreground">Modifier la question</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Version actuelle : {critereEnEdition.version ?? 1} · Modifier les choix ou le mode crée une
                  nouvelle version — les avis déjà collectés gardent l'ancienne.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground uppercase mb-1">Question</label>
                <Input value={editLibelle} onChange={(e) => setEditLibelle(e.target.value)} maxLength={300} />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground uppercase mb-1">Description (optionnel)</label>
                <Input value={editDesc} onChange={(e) => setEditDesc(e.target.value)} maxLength={1000} />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground uppercase mb-1">Type de réponse</label>
                <Select value={editType} onValueChange={changerTypeEdition}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SMILEY">⭐ Note / Smileys (1 à 5)</SelectItem>
                    <SelectItem value="OUI_NON">👍 Oui / Non</SelectItem>
                    <SelectItem value="QCM">📝 Choix unique (QCM)</SelectItem>
                    <SelectItem value="CASES">☑️ Choix multiples (cases à cocher)</SelectItem>
                    <SelectItem value="ECHELLE">🔢 Échelle linéaire</SelectItem>
                    <SelectItem value="NPS">📊 NPS (0 à 10)</SelectItem>
                    <SelectItem value="TEXTE">✍️ Texte libre / Suggestion</SelectItem>
                  </SelectContent>
                </Select>
                {editType !== critereEnEdition.type_reponse && (
                  <p className="text-[11px] font-bold text-warning mt-1">
                    Changer de type désactive les anciens choix (jamais supprimés : historique préservé).
                  </p>
                )}
              </div>

              {(editType === 'OUI_NON' || editType === 'ECHELLE') && (
                <div>
                  <label className="block text-xs font-semibold text-foreground uppercase mb-1">Orientation de la note</label>
                  <Select value={editOrientation} onValueChange={setEditOrientation}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="HIGHER_BETTER">Oui / haut = positif</SelectItem>
                      <SelectItem value="LOWER_BETTER">Oui / haut = négatif (ex. « Problème ? »)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {(editType === 'QCM' || editType === 'CASES') && (
                <div className="space-y-3">
                  <EditeurOptions
                    options={editOptions}
                    onChange={setEditOptions}
                    pondere={editType === 'CASES' && editMode === 'CASES_WEIGHTED'}
                  />
                  {editType === 'CASES' && (
                    <div>
                      <label className="block text-xs font-semibold text-foreground uppercase mb-1">Mode de scoring</label>
                      <Select value={editMode} onValueChange={setEditMode}>
                        <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {MODES_CASES.map((m) => (
                            <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              )}

              <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                <Checkbox checked={editObligatoire} onCheckedChange={(c) => setEditObligatoire(c === true)} />
                Question obligatoire
              </label>

              <div className="flex gap-2 pt-1">
                <Button type="button" variant="outline" disabled={savingEdition} onClick={() => setCritereEnEdition(null)} className="flex-1 rounded-2xl font-bold">
                  Annuler
                </Button>
                <Button type="button" disabled={savingEdition} onClick={sauvegarderEdition} className="flex-1 rounded-2xl font-bold">
                  {savingEdition ? 'Enregistrement…' : 'Enregistrer'}
                </Button>
              </div>
            </div>
          </div>
        )}

        <AlertDialog open={critereASupprimer !== null} onOpenChange={(open) => !open && setCritereASupprimer(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer ce critère ?</AlertDialogTitle>
              <AlertDialogDescription>
                Cette action est irréversible. Si des clients ont déjà répondu à « {critereASupprimer?.libelle_critere} », la suppression sera refusée ; désactivez-le plutôt avec l’interrupteur.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deletingCritereId !== null}>Annuler</AlertDialogCancel>
              <AlertDialogAction variant="destructive" onClick={confirmerSuppressionCritere} disabled={deletingCritereId !== null}>
                {deletingCritereId !== null ? 'Suppression…' : 'Supprimer'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </motion.div>
    </AmbientBackground>
    </RequireAuth>
      </RequireEnterpriseRole>
  );
};
