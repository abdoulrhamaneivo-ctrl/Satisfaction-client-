// src/client/pages/GuichetsPage.tsx
import React, { useState, useRef } from 'react';
import { useQuery, createGuichet, getGuichets, getServices, updateGuichetServices, createService, archiverGuichet } from 'wasp/client/operations';
import { useAuth } from 'wasp/client/auth';
import { motion, AnimatePresence } from 'framer-motion';
import { useReactToPrint } from 'react-to-print';
import { Printer, Store, PlusCircle, AlertCircle, Inbox, Settings2, Check, X, Loader2, QrCode, Archive } from 'lucide-react';
import { AmbientBackground } from '../components/AmbientBackground';
import { PageHeader } from '../components/PageHeader';
import { MotionCard } from '../components/MotionCard';
import { EmptyState } from '../components/EmptyState';
import { FormField } from '../components/FormField';
import { KitGuichet } from '../components/KitGuichet';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { RequireAuth } from '../components/RequireAuth';
import { useToast } from '../hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../components/ui/dialog';
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

// Aperçu compact et cliquable du kit QR/USSD d'un guichet.
// Avant ce correctif, le KitGuichet complet (jusqu'à 595x842px, format
// "affiche A4") était rendu directement dans la liste : sur desktop comme
// sur mobile, ça créait un énorme bloc à côté d'un simple titre, avec des
// zones vides très visibles autour. Le kit complet (QR + USSD + export)
// s'ouvre maintenant dans une fenêtre modale, au clic.
const GuichetQrPreview = ({ guichet }: { guichet: any }) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group flex shrink-0 items-center gap-3 rounded-2xl border border-dashed border-border/70 bg-muted px-4 py-3 text-left transition-all hover:border-primary/50 hover:bg-muted/70"
        aria-label={`Afficher le QR code du guichet ${guichet.nom_guichet}`}
      >
        <span className="flex size-11 items-center justify-center rounded-xl bg-muted text-muted-foreground grayscale transition-all group-hover:bg-primary/10 group-hover:text-primary group-hover:grayscale-0">
          <QrCode className="size-6" />
        </span>
        <span>
          <span className="block text-xs font-bold uppercase tracking-wide text-muted-foreground group-hover:text-primary">
            Voir le kit QR
          </span>
          <span className="block text-[11px] text-muted-foreground">
            QR Code, USSD & affiches
          </span>
        </span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto momentum-scroll sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Kit de collecte — {guichet.nom_guichet}</DialogTitle>
            <DialogDescription>
              QR Code, code USSD et affiches téléchargeables pour ce guichet.
            </DialogDescription>
          </DialogHeader>
          <KitGuichet guichet={guichet} />
        </DialogContent>
      </Dialog>
    </>
  );
};

const TYPES_GUICHET = [
  { value: 'Caisse', label: 'Caisse de paiement' },
  { value: 'Accueil', label: "Guichet d'accueil / Secrétariat" },
  { value: 'Conseil', label: 'Box Conseiller clientèle' },
  { value: 'Borne', label: 'Borne automatique' },
];

export const GuichetsPage = () => {
  const { data: user } = useAuth();
  const { toast } = useToast();

  const [nomGuichet, setNomGuichet] = useState('');
  const [typeGuichet, setTypeGuichet] = useState('Caisse');
  const [selectedServiceIds, setSelectedServiceIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editingGuichetId, setEditingGuichetId] = useState<number | null>(null);
  const [editServiceIds, setEditServiceIds] = useState<number[]>([]);
  const [updatingServices, setUpdatingServices] = useState(false);
  const [newServiceName, setNewServiceName] = useState('');
  const [creatingService, setCreatingService] = useState(false);
  // Ce réglage change immédiatement les questions posées aux clients sur ce
  // guichet (formulaire live) — un clic malencontreux sur "Enregistrer" ne
  // doit pas pouvoir l'appliquer sans un dernier geste de confirmation,
  // comme pour la suspension d'un agent.
  const [guichetAConfirmer, setGuichetAConfirmer] = useState<{ id: number; nom: string } | null>(null);
  // Confirmation dédiée à l'archivage (fermeture définitive) : action
  // différente du reste (pas juste un changement de config), donc dialogue
  // séparé avec son propre texte d'avertissement.
  const [guichetAArchiver, setGuichetAArchiver] = useState<{ id: number; nom: string } | null>(null);
  const [archivingId, setArchivingId] = useState<number | null>(null);

  const userAgenceId = user?.id_agence;

  const {
    data: guichets,
    isLoading,
    error: queryError,
    refetch: refetchGuichets,
  } = useQuery(
    getGuichets,
    { id_agence: userAgenceId || 0 },
    { enabled: !!userAgenceId },
  );

  const { data: allServices } = useQuery(getServices);

  const componentRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: 'Kit-Evaluation-Yeba',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userAgenceId) return;
    setLoading(true);
    setError(null);

    try {
      await createGuichet({ 
        nomGuichet, 
        typeGuichet, 
        id_agence: userAgenceId,
        serviceIds: selectedServiceIds
      });
      setNomGuichet('');
      setSelectedServiceIds([]);
    } catch (err: any) {
      setError(err.message || 'Erreur de création du guichet.');
    } finally {
      setLoading(false);
    }
  };

  const handleArchiverGuichet = async () => {
    if (!guichetAArchiver) return;
    setArchivingId(guichetAArchiver.id);
    try {
      await archiverGuichet({ id_guichet: guichetAArchiver.id });
      toast({
        title: 'Guichet archivé',
        description: `« ${guichetAArchiver.nom} » est fermé et déplacé dans les Archives. Son historique reste intact.`,
      });
      setGuichetAArchiver(null);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erreur', description: err?.message || 'Erreur inconnue' });
    } finally {
      setArchivingId(null);
    }
  };

  const handleCreateService = async () => {
    if (!newServiceName.trim()) return;
    setCreatingService(true);
    try {
      const created: any = await createService({ libelle_service: newServiceName.trim() });
      setNewServiceName('');
      // On coche directement la nouvelle opération pour le guichet en cours de création.
      setSelectedServiceIds((prev) => [...prev, created.id]);
    } catch (err: any) {
      setError(err.message || "Erreur lors de la création de l'opération.");
    } finally {
      setCreatingService(false);
    }
  };

  const startEditingServices = (g: any) => {
    setEditingGuichetId(g.id);
    setEditServiceIds(g.services?.map((s: any) => s.id) || []);
  };

  const handleSaveServices = async (guichetId: number) => {
    setUpdatingServices(true);
    try {
      await updateGuichetServices({ id_guichet: guichetId, serviceIds: editServiceIds });
      setEditingGuichetId(null);
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: "Erreur lors de la mise à jour des opérations : " + err.message,
      });
    } finally {
      setUpdatingServices(false);
    }
  };

  if (!userAgenceId) {
    return (
      <RequireAuth>
        <AmbientBackground className="flex items-center justify-center p-8">
          <MotionCard interactive={false} className="max-w-md p-8 text-center">
            <span className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive ring-1 ring-inset ring-destructive/15">
              <AlertCircle className="size-6" />
            </span>
            <p className="mb-2 text-title-xsm font-bold text-foreground">
              Compte non rattaché à une agence
            </p>
            <p className="mb-6 text-sm text-muted-foreground">
              Votre compte n'est rattaché à aucune agence. Contactez votre
              Chef d'Agence ou l'administrateur technique de Yeba pour
              régulariser votre accès.
            </p>
          </MotionCard>
        </AmbientBackground>
      </RequireAuth>
    );
  }

  const guichetCount = guichets?.length ?? 0;

  return (
    <RequireAuth>
      <AmbientBackground>
        <div className="mx-auto max-w-7xl p-6 lg:p-10">
          <PageHeader
            icon={Store}
            eyebrow="Points de contact"
            title="Gestion des Guichets Physiques"
            description="Ajoutez vos caisses et téléchargez vos kits d'évaluation (QR Codes & USSD)."
            actions={
              guichetCount > 0 && (
                <motion.div whileTap={{ scale: 0.97 }}>
                  <Button onClick={handlePrint}>
                    <Printer className="size-4" /> Imprimer le Kit complet
                  </Button>
                </motion.div>
              )
            }
          />

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            {/* Formulaire d'ajout rapide — réservé au Chef d'Agence : c'est lui
                qui met en place les guichets de son agence (règle métier). */}
            {user?.role === 'CHEF_AGENCE' ? (
            <MotionCard interactive={false} className="h-fit p-6 lg:sticky lg:top-8">
              <div className="mb-5 flex items-center gap-2.5">
                <span className="flex size-9 items-center justify-center rounded-xl bg-secondary/10 text-secondary ring-1 ring-inset ring-secondary/15">
                  <PlusCircle className="size-5" />
                </span>
                <h2 className="text-title-xsm font-bold text-foreground">
                  Créer une Caisse
                </h2>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <div className="flex items-start gap-2.5 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                    <AlertCircle className="mt-0.5 size-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <FormField label="Nom du Guichet / Caisse" htmlFor="nom-guichet" required>
                  <Input
                    id="nom-guichet"
                    required
                    value={nomGuichet}
                    onChange={(e) => setNomGuichet(e.target.value)}
                    placeholder="Ex: Caisse 1, Guichet Accueil..."
                    className="h-11"
                  />
                </FormField>

                <FormField label="Type de guichet">
                  <Select value={typeGuichet} onValueChange={setTypeGuichet}>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Sélectionner un type" />
                    </SelectTrigger>
                    <SelectContent>
                      {TYPES_GUICHET.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>

                <FormField label="Opérations gérées par ce guichet">
                  <p className="mb-2 text-xs text-muted-foreground">
                    Une « opération » (ex. Retrait d'argent, Envoi de colis) détermine la liste de
                    questions posée au client : s'il choisit une opération précise, seules les questions
                    liées à cette opération s'affichent. Sans opération sélectionnée, ce sont les
                    critères par défaut de l'agence qui s'appliquent.
                  </p>
                  <div className="space-y-2 rounded-xl border border-border/70 p-3 bg-muted/40">
                    {allServices?.map((s: any) => (
                      <label key={s.id} className="flex items-center gap-2.5 text-sm font-semibold text-foreground cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedServiceIds.includes(s.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedServiceIds([...selectedServiceIds, s.id]);
                            } else {
                              setSelectedServiceIds(selectedServiceIds.filter(id => id !== s.id));
                            }
                          }}
                          className="rounded border-input text-primary focus:ring-primary h-4 w-4"
                        />
                        {s.libelle_service}
                      </label>
                    ))}
                    {(!allServices || allServices.length === 0) && (
                      <p className="text-xs text-muted-foreground">Aucune opération créée pour le moment.</p>
                    )}
                    <div className="flex gap-2 pt-1">
                      <Input
                        value={newServiceName}
                        onChange={(e) => setNewServiceName(e.target.value)}
                        placeholder="Nouvelle opération (ex: Retrait d'argent)"
                        className="h-9 text-sm"
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
                        className="h-9 shrink-0 px-3 text-sm"
                      >
                        {creatingService ? '...' : '+ Ajouter'}
                      </Button>
                    </div>
                  </div>
                </FormField>

                <motion.div whileTap={{ scale: 0.98 }}>
                  <Button type="submit" disabled={loading} className="w-full">
                    {loading ? 'Création...' : 'Ajouter le guichet'}
                  </Button>
                </motion.div>
              </form>
            </MotionCard>
            ) : (
              <MotionCard interactive={false} className="h-fit p-6 lg:sticky lg:top-8 text-center">
                <Store className="mx-auto mb-3 size-8 text-muted-foreground" />
                <p className="font-semibold text-foreground">Gestion réservée au Chef d'Agence</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  La création des guichets se fait désormais par le Chef d'Agence, agence par agence.
                  Invitez un Chef d'Agence depuis la page Personnel pour qu'il puisse configurer ses guichets.
                </p>
              </MotionCard>
            )}

            {/* Liste des Guichets */}
            <div className="space-y-6 lg:col-span-2">
              <div className="flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
                <h2 className="text-title-sm font-bold text-foreground">
                  Vos Kits de Collecte
                </h2>
                {guichetCount > 0 && (
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                    {guichetCount} guichet{guichetCount > 1 ? 's' : ''}
                  </span>
                )}
              </div>

              {isLoading && (
                <div className="space-y-4">
                  {[0, 1].map((i) => (
                    <div
                      key={i}
                      className="h-40 animate-pulse rounded-2xl border border-border/70 bg-card-subtle/50"
                    />
                  ))}
                </div>
              )}
              {queryError && (
                <div className="flex items-center justify-between gap-3 rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
                  <span>Impossible de charger vos guichets. Vérifiez votre connexion.</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => refetchGuichets()}
                    className="shrink-0 border-destructive/30 text-destructive hover:bg-destructive/10"
                  >
                    Réessayer
                  </Button>
                </div>
              )}

              {!isLoading && guichetCount === 0 && (
                <EmptyState
                  icon={Inbox}
                  title="Aucun guichet créé pour le moment"
                  description="Créez votre première caisse à gauche pour générer son kit de collecte (QR Code + USSD)."
                />
              )}

              <div className="grid grid-cols-1 gap-6">
                {guichets?.map((g: any, i: number) => (
                  <motion.div
                    key={g.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: i * 0.05 }}
                  >
                    <MotionCard interactive={false} className="p-6">
                      <div className="flex flex-col items-start justify-between gap-6 md:flex-row border-b border-border/50 pb-5 mb-5">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="inline-block rounded-full bg-secondary/10 px-2.5 py-0.5 text-xs font-semibold text-secondary">
                              {g.type_guichet}
                            </span>
                            {g.services && g.services.length > 0 && (
                              <span className="inline-block rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                                {g.services.length} opération{g.services.length > 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                          <h3 className="text-title-sm font-bold text-foreground">
                            {g.nom_guichet}
                          </h3>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <GuichetQrPreview guichet={g} />
                          <button
                            type="button"
                            onClick={() => setGuichetAArchiver({ id: g.id, nom: g.nom_guichet })}
                            className="flex items-center gap-1.5 rounded-xl border border-dashed border-border/70 px-3 py-3 text-xs font-semibold text-muted-foreground transition-colors hover:border-destructive/40 hover:bg-destructive/5 hover:text-destructive"
                            title="Fermer définitivement ce guichet (archivage, aucune perte de données)"
                          >
                            <Archive className="size-4" />
                          </button>
                        </div>
                      </div>

                      {/* Operations Configuration Section */}
                      <div className="bg-muted/40 p-4 rounded-xl border border-dashed border-border/60">
                        {editingGuichetId === g.id ? (
                          <div className="space-y-3">
                            <h4 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                              <Settings2 size={14} /> Configurer les opérations du guichet
                            </h4>
                            <div className="grid grid-cols-1 gap-2 py-1 sm:grid-cols-2">
                              {allServices?.map((s: any) => (
                                <label key={s.id} className="flex items-center gap-2 text-sm font-semibold text-foreground cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={editServiceIds.includes(s.id)}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setEditServiceIds([...editServiceIds, s.id]);
                                      } else {
                                        setEditServiceIds(editServiceIds.filter(id => id !== s.id));
                                      }
                                    }}
                                    className="rounded border-input text-primary focus:ring-primary h-3.5 w-3.5"
                                  />
                                  {s.libelle_service}
                                </label>
                              ))}
                            </div>
                            <div className="flex gap-2 justify-end pt-2 border-t border-border/40">
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => setEditingGuichetId(null)}
                                className="h-8 text-xs gap-1"
                              >
                                <X size={12} /> Annuler
                              </Button>
                              <Button 
                                size="sm" 
                                onClick={() => setGuichetAConfirmer({ id: g.id, nom: g.nom_guichet })}
                                disabled={updatingServices}
                                className="h-8 text-xs gap-1 bg-success hover:bg-success/90 text-success-foreground"
                              >
                                {updatingServices ? (
                                  <Loader2 size={12} className="animate-spin" />
                                ) : (
                                  <Check size={12} />
                                )}
                                Enregistrer
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between gap-4">
                            <div>
                              <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">
                                Opérations gérées
                              </h4>
                              <div className="flex flex-wrap gap-1 mt-1.5">
                                {g.services && g.services.length > 0 ? (
                                  g.services.map((s: any) => (
                                    <span key={s.id} className="bg-card border border-border text-[11px] font-bold text-foreground px-2 py-0.5 rounded-md">
                                      {s.libelle_service}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-xs text-muted-foreground italic">
                                    Aucune opération (Par défaut : critères de l'agence)
                                  </span>
                                )}
                              </div>
                            </div>
                            {user?.role === 'CHEF_AGENCE' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => startEditingServices(g)}
                                className="h-8 text-xs font-semibold shrink-0 gap-1 hover:border-primary/40 hover:text-primary transition-all"
                              >
                                <Settings2 size={12} /> Modifier
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </MotionCard>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Zone d'impression masquée : une affiche A5 par page, prête à découper et à coller */}
        <div className="hidden">
          <div ref={componentRef}>
            {guichets?.map((g: any) => (
              <div
                key={g.id}
                className="flex min-h-screen items-center justify-center p-10"
                style={{ pageBreakAfter: 'always', breakAfter: 'page' }}
              >
                <KitGuichet guichet={g} />
              </div>
            ))}
          </div>
        </div>
      </AmbientBackground>

      <AlertDialog
        open={guichetAConfirmer !== null}
        onOpenChange={(open) => !open && setGuichetAConfirmer(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Appliquer ces opérations ?</AlertDialogTitle>
            <AlertDialogDescription>
              {guichetAConfirmer && (
                <>
                  Les questions posées aux clients sur{' '}
                  <strong className="text-foreground">{guichetAConfirmer.nom}</strong> changeront
                  immédiatement, y compris pour les évaluations en cours de saisie.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (guichetAConfirmer) handleSaveServices(guichetAConfirmer.id);
                setGuichetAConfirmer(null);
              }}
            >
              Appliquer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={guichetAArchiver !== null}
        onOpenChange={(open) => !open && setGuichetAArchiver(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Fermer définitivement ce guichet ?</AlertDialogTitle>
            <AlertDialogDescription>
              {guichetAArchiver && (
                <>
                  <strong className="text-foreground">{guichetAArchiver.nom}</strong> sera archivé :
                  il disparaîtra des listes actives et ne pourra plus recevoir d'avis. Tout son
                  historique reste intact et consultable depuis la page Archives — vous pourrez le
                  réactiver à tout moment.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleArchiverGuichet}
              disabled={archivingId !== null}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {archivingId !== null ? 'Archivage...' : 'Archiver le guichet'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </RequireAuth>
  );
};
