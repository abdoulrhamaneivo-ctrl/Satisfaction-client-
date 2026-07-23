import React, { useState } from 'react';
import { useAuth } from 'wasp/client/auth';
import { useQuery, getCriteres, getAgenceCriteres, getAgences, toggleCritereAgence, createCritere, getServices, createService, deleteCritere, duplicateCritere } from 'wasp/client/operations';
import { motion } from 'framer-motion';
import { MotionCard } from '../components/MotionCard';
import { Button } from '../components/ui/button';
import { Switch } from '../components/ui/switch';
import { useToast } from '../hooks/use-toast';
import { AmbientBackground } from '../components/AmbientBackground';
import { PageHeader } from '../components/PageHeader';
import { Settings2, Copy, Trash2, Search } from 'lucide-react';
import { ObjectifsPanel } from '../components/ObjectifsPanel';
import { QuestionsParOperation } from '../components/QuestionsParOperation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { RequireAuth } from '../components/RequireAuth';
import { Input } from '../components/ui/input';
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
  TEXTE: '✍️ Texte',
};

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
  const [optionsReponse, setOptionsReponse] = useState('');
  const [echelleMin, setEchelleMin] = useState('1');
  const [echelleMax, setEchelleMax] = useState('10');
  const [obligatoire, setObligatoire] = useState(true);
  const [loadingCreation, setLoadingCreation] = useState(false);
  const [selectedServiceIds, setSelectedServiceIds] = useState<number[]>([]);
  const [newServiceName, setNewServiceName] = useState('');
  const [creatingService, setCreatingService] = useState(false);

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
      toast({ title: 'Critère supprimé', description: `« ${critere.libelle_critere} » a été supprimé.` });
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
      toast({ title: 'Critère dupliqué', description: `Une copie de « ${critere.libelle_critere} » a été créée, modifiable librement.` });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Duplication impossible', description: err.message || 'Erreur inconnue' });
    } finally {
      setDuplicatingCritereId(null);
    }
  };

  const handleToggle = async (idCritere: number, checked: boolean) => {
    if (selectedAgenceId === undefined) return;
    try {
      await toggleCritereAgence({ id_critere: idCritere, id_agence: selectedAgenceId, active: checked });
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erreur lors de la modification',
        description: err.message || 'Erreur inconnue',
      });
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
    setLoadingCreation(true);
    try {
      await createCritere({
        libelle_critere: nouveauLibelle,
        description: nouvelleDesc,
        type_reponse: typeReponse,
        options_reponse:
          typeReponse === 'QCM' || typeReponse === 'CASES'
            ? optionsReponse
            : typeReponse === 'ECHELLE'
            ? `${echelleMin},${echelleMax}`
            : undefined,
        obligatoire,
        id_agence: selectedAgenceId,
        serviceIds: selectedServiceIds.length > 0 ? selectedServiceIds : undefined,
      });
      setNomLibelle('');
      setNouvelleDesc('');
      setOptionsReponse('');
      setTypeReponse('SMILEY');
      setEchelleMin('1');
      setEchelleMax('10');
      setObligatoire(true);
      setSelectedServiceIds([]);
      toast({ title: 'Critère créé', description: `« ${nouveauLibelle} » a été ajouté avec succès.` });
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
      toast({ title: 'Opération créée', description: `« ${created.libelle_service} » est disponible.` });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erreur', description: err.message || 'Erreur inconnue' });
    } finally {
      setCreatingService(false);
    }
  };

  return (
    <RequireAuth>
    <AmbientBackground>
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="max-w-[1680px] mx-auto p-6 lg:p-10 space-y-8"
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
              <div className="rounded-2xl border border-dashed border-border/70 bg-card-subtle/40 px-5 py-8 text-center text-sm text-muted-foreground">
                Aucun critère ne correspond à votre recherche.
              </div>
            )}

            <div className="grid gap-4">
              {criteresFiltres.map((critere: any) => {
                const isActive = activeIds.includes(critere.id);
                return (
                  <MotionCard key={critere.id} className="p-5 flex items-center justify-between gap-4">
                    <div className="space-y-1">
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
                      </div>
                      {critere.description && (
                        <p className="text-xs text-muted-foreground">{critere.description}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleDuplicateCritere(critere)}
                        disabled={duplicatingCritereId === critere.id}
                        className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
                        aria-label={`Dupliquer « ${critere.libelle_critere} »`}
                        title="Dupliquer ce critère"
                      >
                        <Copy className="size-4" />
                      </button>
                      {/* Seuls les critères propres à l'entreprise (id_entreprise non nul)
                          sont supprimables ; les critères socle communs à toutes les
                          entreprises ne le sont jamais (voir deleteCritere côté serveur). */}
                      {critere.id_entreprise !== null && (
                        <button
                          type="button"
                          onClick={() => handleDeleteCritere(critere)}
                          disabled={deletingCritereId === critere.id}
                          className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                          aria-label={`Supprimer « ${critere.libelle_critere} »`}
                          title="Supprimer ce critère"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      )}
                      <Switch
                        checked={isActive}
                        onCheckedChange={(checked) => handleToggle(critere.id, checked)}
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
                  <input
                    type="text"
                    required
                    value={nouveauLibelle}
                    onChange={(e) => setNomLibelle(e.target.value)}
                    placeholder="Ex: Comment évaluez-vous la propreté ?"
                    className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm text-foreground focus:ring-1 focus:ring-ring"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground uppercase mb-1">Description (optionnel)</label>
                  <input
                    type="text"
                    value={nouvelleDesc}
                    onChange={(e) => setNouvelleDesc(e.target.value)}
                    placeholder="S'affichera sous la question"
                    className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm text-foreground focus:ring-1 focus:ring-ring"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground uppercase mb-1">Type de réponse</label>
                  <select
                    value={typeReponse}
                    onChange={(e) => setTypeReponse(e.target.value)}
                    className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm text-foreground focus:ring-1 focus:ring-ring"
                  >
                    <option value="SMILEY">⭐ Note / Smileys (1 à 5)</option>
                    <option value="OUI_NON">👍 Oui / Non</option>
                    <option value="QCM">📝 Choix unique (QCM)</option>
                    <option value="CASES">☑️ Choix multiples (cases à cocher)</option>
                    <option value="ECHELLE">🔢 Échelle linéaire (ex. note sur 10)</option>
                    <option value="TEXTE">✍️ Texte libre / Suggestion</option>
                  </select>
                </div>

                {(typeReponse === 'QCM' || typeReponse === 'CASES') && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                  >
                    <label className="block text-xs font-semibold text-foreground uppercase mb-1">
                      {typeReponse === 'CASES' ? 'Cases proposées (séparées par des virgules)' : 'Choix possibles (séparés par des virgules)'}
                    </label>
                    <input
                      type="text"
                      required
                      value={optionsReponse}
                      onChange={(e) => setOptionsReponse(e.target.value)}
                      placeholder="Ex: Trop d'attente, Personnel absent, Autre"
                      className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm text-foreground focus:ring-1 focus:ring-ring"
                    />
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {typeReponse === 'CASES'
                        ? 'Le client pourra cocher plusieurs cases à la fois.'
                        : 'Le client ne pourra choisir qu\'une seule réponse.'}
                    </p>
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
                      <input
                        type="number"
                        required
                        value={echelleMin}
                        onChange={(e) => setEchelleMin(e.target.value)}
                        className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm text-foreground focus:ring-1 focus:ring-ring"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-semibold text-foreground uppercase mb-1">Maximum</label>
                      <input
                        type="number"
                        required
                        value={echelleMax}
                        onChange={(e) => setEchelleMax(e.target.value)}
                        className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm text-foreground focus:ring-1 focus:ring-ring"
                      />
                    </div>
                  </motion.div>
                )}

                <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={obligatoire}
                    onChange={(e) => setObligatoire(e.target.checked)}
                    className="rounded border-input text-primary focus:ring-primary h-4 w-4"
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
                    <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                      <input
                        type="radio"
                        name="operation-critere"
                        checked={selectedServiceIds.length === 0}
                        onChange={() => setSelectedServiceIds([])}
                        className="border-input text-primary focus:ring-primary h-4 w-4"
                      />
                      Non assignée
                    </label>
                    {services?.map((s: any) => (
                      <label key={s.id} className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                        <input
                          type="radio"
                          name="operation-critere"
                          checked={selectedServiceIds[0] === s.id}
                          onChange={() => setSelectedServiceIds([s.id])}
                          className="border-input text-primary focus:ring-primary h-4 w-4"
                        />
                        {s.libelle_service}
                      </label>
                    ))}
                    {(!services || services.length === 0) && (
                      <p className="text-xs text-muted-foreground">Aucune opération créée pour le moment.</p>
                    )}
                    <div className="flex gap-2 pt-1">
                      <input
                        value={newServiceName}
                        onChange={(e) => setNewServiceName(e.target.value)}
                        placeholder="Nouvelle opération"
                        className="flex-1 px-2 py-1.5 border border-input bg-background rounded-md text-xs text-foreground focus:ring-1 focus:ring-ring"
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

            {/* Panneau Objectifs (Module 1 — visible pour DIRECTION et QUALITE) */}
            {selectedAgenceId !== undefined && (
              <ObjectifsPanel selectedAgenceId={selectedAgenceId} />
            )}
          </div>
        </div>

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
  );
};
