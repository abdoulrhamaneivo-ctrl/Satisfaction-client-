// src/client/pages/GuichetsPage.tsx
import React, { useState, useRef, useEffect } from 'react';
import { useQuery, createGuichet, getGuichets, getServices, getAgences, updateGuichetServices, createService, archiverGuichet } from 'wasp/client/operations';
import { useAuth } from 'wasp/client/auth';
import { motion } from 'framer-motion';
import { useReactToPrint } from 'react-to-print';
import { Printer, Store, PlusCircle, AlertCircle, Inbox, Settings2, Check, X, Loader2, QrCode, Archive, Search } from 'lucide-react';
import { AmbientBackground } from '../components/AmbientBackground';
import { PageHeader } from '../components/PageHeader';
import { EmptyState } from '../components/EmptyState';
import { FormField } from '../components/FormField';
import { KitGuichet } from '../components/KitGuichet';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Checkbox } from '../components/ui/checkbox';
import { RequireAuth } from '../components/RequireAuth';
import { RequireEnterpriseRole } from "../components/RequireEnterpriseRole";
import { useToast } from '../hooks/use-toast';
import { Card, Eyebrow, Reveal } from '../components/ds';
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

const GuichetQrPreview = ({ guichet }: { guichet: any }) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        onClick={() => setOpen(true)}
        className="group h-auto shrink-0 items-center gap-3 rounded-2xl border border-dashed border-border/80 bg-muted/50 px-4 py-3 text-left font-normal hover:border-primary/50 hover:bg-muted/80 transition-all"
        aria-label={`Afficher le QR code du guichet ${guichet.nom_guichet}`}
      >
        <span className="flex size-11 items-center justify-center rounded-xl bg-muted text-muted-foreground grayscale transition-all group-hover:bg-primary/10 group-hover:text-primary group-hover:grayscale-0">
          <QrCode className="size-6" />
        </span>
        <span>
          <span className="block text-xs font-bold uppercase tracking-widest text-muted-foreground group-hover:text-primary">
            Voir le kit QR
          </span>
          <span className="block text-[11px] font-medium text-muted-foreground">
            QR Code, USSD & affiches
          </span>
        </span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto momentum-scroll sm:max-w-2xl rounded-3xl border-border/80">
          <DialogHeader>
            <DialogTitle className="font-satoshi text-xl font-bold">Kit de collecte — {guichet.nom_guichet}</DialogTitle>
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
  const [guichetAConfirmer, setGuichetAConfirmer] = useState<{ id: number; nom: string } | null>(null);
  const [guichetAArchiver, setGuichetAArchiver] = useState<{ id: number; nom: string } | null>(null);
  const [archivingId, setArchivingId] = useState<number | null>(null);
  const [recherche, setRecherche] = useState('');

  const userAgenceId = user?.id_agence;

  // FIX 05/09 : la Direction n'a PAS d'agence (compte entreprise, id_agence
  // null par construction) mais doit voir les guichets et kits QR — même
  // pattern que la page Avis : sélecteur d'agence pour la Direction, agence
  // propre pour les autres rôles. Sans ça, tout compte DIRECTION (dont
  // l'admin créé par le super admin) tombait sur « Compte non rattaché ».
  const isDirection = user?.role === 'DIRECTION';
  const { data: agences } = useQuery(getAgences, undefined, { enabled: !!user && isDirection });
  const [selectedAgenceId, setSelectedAgenceId] = useState<number | undefined>(undefined);
  useEffect(() => {
    if (isDirection && !selectedAgenceId && agences && agences.length > 0) {
      setSelectedAgenceId(agences[0].id);
    }
  }, [isDirection, selectedAgenceId, agences]);
  const effectiveAgenceId: number | undefined = isDirection ? selectedAgenceId : (userAgenceId || undefined);

  const {
    data: guichets,
    isLoading,
    error: queryError,
    refetch: refetchGuichets,
  } = useQuery(
    getGuichets,
    { id_agence: effectiveAgenceId || 0 },
    { enabled: !!effectiveAgenceId },
  );

  const { data: allServices } = useQuery(getServices);

  const componentRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: 'Kit-Evaluation-Yeba',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!effectiveAgenceId) return;
    setLoading(true);
    setError(null);

    try {
      await createGuichet({ 
        nomGuichet, 
        typeGuichet, 
        id_agence: effectiveAgenceId,
        serviceIds: selectedServiceIds
      });
      setNomGuichet('');
      setSelectedServiceIds([]);
      toast({
        variant: 'success',
        title: 'Guichet créé',
        description: `Le guichet « ${nomGuichet} » est prêt.`,
      });
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
        variant: 'success',
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
      toast({ variant: 'success', title: 'Opérations enregistrées' });
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

  // Seul vrai cas bloquant restant : un compte NON-Direction sans agence
  // (anomalie de rattachement). La Direction passe par le sélecteur
  // ci-dessus ; si l'entreprise n'a encore AUCUNE agence, on le dit
  // clairement avec l'action à faire au lieu d'une erreur générique.
  if (!effectiveAgenceId) {
    return (
      <RequireEnterpriseRole>
      <RequireAuth>
        <AmbientBackground className="flex items-center justify-center p-8">
          <Card className="max-w-md p-8 text-center border-destructive/30">
            <span className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive border border-destructive/20">
              <AlertCircle className="size-6" />
            </span>
            <p className="mb-2 text-lg font-bold text-foreground font-satoshi">
              {isDirection ? "Aucune agence dans votre réseau" : "Compte non rattaché à une agence"}
            </p>
            <p className="mb-6 text-sm text-muted-foreground font-medium">
              {isDirection
                ? "Créez d'abord une agence dans « Réseau Agences », puis revenez ici pour y ajouter des guichets."
                : "Votre compte n'est rattaché à aucune agence. Contactez votre Chef d'Agence ou l'administrateur technique de Yeba pour régulariser votre accès."}
            </p>
          </Card>
        </AmbientBackground>
      </RequireAuth>
      </RequireEnterpriseRole>
    );
  }

  const guichetCount = guichets?.length ?? 0;
  const rechercheNormalisee = recherche.trim().toLocaleLowerCase('fr-FR');
  const guichetsFiltres = (guichets ?? []).filter((guichet: any) => {
    if (!rechercheNormalisee) return true;
    const operations = (guichet.services ?? []).map((service: any) => service.libelle_service).join(' ');
    return [guichet.nom_guichet, guichet.type_guichet, operations]
      .filter(Boolean)
      .join(' ')
      .toLocaleLowerCase('fr-FR')
      .includes(rechercheNormalisee);
  });

  return (
    <RequireEnterpriseRole>
      <RequireAuth>
      <AmbientBackground>
        <div className="mx-auto max-w-[1440px] p-6 lg:p-10 space-y-8">
          {/* Fil d'Ariane & Onglets — Style Linear / Notion */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/70 pb-4">
            <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
              <span>Agences</span>
              <span>/</span>
              {isDirection ? (
                <Select
                  value={selectedAgenceId ? String(selectedAgenceId) : ''}
                  onValueChange={(v) => setSelectedAgenceId(Number(v))}
                >
                  <SelectTrigger className="h-8 w-auto min-w-[180px] border-border/70 text-foreground">
                    <SelectValue placeholder="Choisir une agence" />
                  </SelectTrigger>
                  <SelectContent>
                    {agences?.map((a: any) => (
                      <SelectItem key={a.id} value={String(a.id)}>{a.nom_agence} ({a.commune})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <span className="text-foreground">{(user as any)?.agence?.nom_agence || "Agence Principale"}</span>
              )}
              <span>/</span>
              <span className="text-primary font-bold">Guichets & Kits</span>
            </div>
            
            <div className="flex items-center gap-6 text-xs font-bold">
              <span className="text-muted-foreground hover:text-foreground pb-1 transition-colors cursor-pointer" onClick={() => window.location.href='/dashboard'}>Tableau synthétique</span>
              <span className="text-muted-foreground hover:text-foreground pb-1 transition-colors cursor-pointer" onClick={() => window.location.href='/alertes-taches'}>Kanban Incidents</span>
              <span className="text-primary border-b-2 border-primary pb-1 font-bold cursor-pointer">Guichets & Kits</span>
            </div>
          </div>

          <Reveal direction="down">
            <PageHeader
              icon={Store}
              eyebrow="Points de contact"
              title="Gestion des Guichets Physiques"
              description="Ajoutez vos caisses et téléchargez vos kits d'évaluation (QR Codes & USSD)."
              actions={
                guichetCount > 0 && (
                  <motion.div whileTap={{ scale: 0.97 }}>
                    <Button onClick={handlePrint} className="rounded-xl font-bold">
                      <Printer className="size-4" /> Imprimer le Kit complet
                    </Button>
                  </motion.div>
                )
              }
            />
          </Reveal>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            {/* Formulaire d'ajout rapide */}
            {user?.role === 'CHEF_AGENCE' ? (
              <Reveal delay={0.05}>
                <Card variant="feature" className="h-fit p-6 lg:sticky lg:top-8 rounded-3xl">
                  <div className="mb-5 flex items-center gap-2.5">
                    <span className="flex size-9 items-center justify-center rounded-xl bg-secondary/15 text-secondary border border-secondary/30">
                      <PlusCircle className="size-5" />
                    </span>
                    <h2 className="text-lg font-bold text-foreground font-satoshi">
                      Créer une Caisse
                    </h2>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-5">
                    {error && (
                      <div className="flex items-start gap-2.5 rounded-2xl border border-destructive/25 bg-destructive/10 p-3.5 text-xs font-bold text-destructive">
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
                        className="h-11 rounded-2xl border-border/80"
                      />
                    </FormField>

                    <FormField label="Type de guichet">
                      <Select value={typeGuichet} onValueChange={setTypeGuichet}>
                        <SelectTrigger className="h-11 rounded-2xl border-border/80">
                          <SelectValue placeholder="Sélectionner un type" />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl border-border/80">
                          {TYPES_GUICHET.map((t) => (
                            <SelectItem key={t.value} value={t.value}>
                              {t.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormField>

                    <FormField label="Opérations gérées par ce guichet">
                      <p className="mb-2 text-xs text-muted-foreground font-medium">
                        Une « opération » (ex. Retrait d'argent) détermine les questions posées aux clients.
                      </p>
                      <div className="space-y-2 rounded-2xl border border-border/70 p-3.5 bg-muted/30">
                        {allServices?.map((s: any) => (
                          <label key={s.id} className="flex items-center gap-2.5 text-xs font-bold text-foreground cursor-pointer">
                            <Checkbox
                              checked={selectedServiceIds.includes(s.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedServiceIds([...selectedServiceIds, s.id]);
                                } else {
                                  setSelectedServiceIds(selectedServiceIds.filter(id => id !== s.id));
                                }
                              }}
                            />
                            {s.libelle_service}
                          </label>
                        ))}
                        {(!allServices || allServices.length === 0) && (
                          <p className="text-xs text-muted-foreground">Aucune opération créée pour le moment.</p>
                        )}
                        <div className="flex gap-2 pt-2">
                          <Input
                            value={newServiceName}
                            onChange={(e) => setNewServiceName(e.target.value)}
                            placeholder="Nouvelle opération"
                            className="h-9 text-xs rounded-xl border-border/80"
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
                            className="h-9 shrink-0 px-3 text-xs rounded-xl font-bold border-border/80"
                          >
                            {creatingService ? '...' : '+ Ajouter'}
                          </Button>
                        </div>
                      </div>
                    </FormField>

                    <motion.div whileTap={{ scale: 0.98 }}>
                      <Button type="submit" disabled={loading} className="w-full py-6 rounded-2xl font-bold text-base btn-glow-gold">
                        {loading ? 'Création...' : 'Ajouter le guichet'}
                      </Button>
                    </motion.div>
                  </form>
                </Card>
              </Reveal>
            ) : (
              <Card className="h-fit p-6 lg:sticky lg:top-8 text-center rounded-3xl">
                <Store className="mx-auto mb-3 size-8 text-muted-foreground" />
                <p className="font-bold text-foreground font-satoshi">
                  {isDirection ? "Vue Direction — lecture seule" : "Gestion réservée au Chef d'Agence"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground font-medium">
                  {isDirection
                    ? "Vous voyez les guichets et kits QR de l'agence sélectionnée. La création des guichets se fait par le Chef d'Agence, agence par agence."
                    : "La création des guichets se fait désormais par le Chef d'Agence, agence par agence."}
                </p>
              </Card>
            )}

            {/* Liste des Guichets */}
            <div className="space-y-6 lg:col-span-2">
              <div className="flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
                <Eyebrow tone="amber">Points d'évaluation</Eyebrow>
                {guichetCount > 0 && (
                  <span className="rounded-full bg-primary/10 border border-primary/20 px-3 py-1 text-xs font-bold text-primary">
                    {guichetCount} guichet{guichetCount > 1 ? 's' : ''}
                  </span>
                )}
              </div>

              {guichetCount > 0 && (
                <div className="sticky top-16 lg:top-4 z-20 rounded-2xl border border-border/80 bg-card/90 p-1.5 shadow-sm ">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={recherche}
                      onChange={(event) => setRecherche(event.target.value)}
                      placeholder="Rechercher un guichet, type ou opération…"
                      className="h-10 pl-9 rounded-xl border-border/60"
                      aria-label="Rechercher un guichet"
                    />
                  </div>
                </div>
              )}

              {isLoading && (
                <div className="space-y-4">
                  {[0, 1].map((i) => (
                    <div
                      key={i}
                      className="h-40 animate-pulse rounded-3xl border border-border/70 bg-card/50"
                    />
                  ))}
                </div>
              )}

              {queryError && (
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-destructive/25 bg-destructive/10 p-4 text-sm font-bold text-destructive">
                  <span>Impossible de charger vos guichets. Vérifiez votre connexion.</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => refetchGuichets()}
                    className="shrink-0 border-destructive/30 text-destructive hover:bg-destructive/10 rounded-xl"
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

              {guichetCount > 0 && guichetsFiltres.length === 0 && (
                <EmptyState
                  icon={Search}
                  title="Aucun guichet ne correspond à votre recherche"
                  description="Essayez le nom du guichet, son type ou une opération associée."
                  action={<Button variant="outline" onClick={() => setRecherche('')} className="rounded-xl">Effacer la recherche</Button>}
                  className="py-10"
                />
              )}

              <div className="grid grid-cols-1 gap-5">
                {guichetsFiltres.map((g: any, i: number) => (
                  <Reveal key={g.id} delay={i * 0.05}>
                    <Card variant="feature" className="p-6 rounded-3xl">
                      <div className="flex flex-col items-start justify-between gap-6 md:flex-row border-b border-border/60 pb-5 mb-5">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="inline-block rounded-full bg-secondary/15 border border-secondary/30 px-2.5 py-0.5 text-[11px] font-bold text-secondary">
                              {g.type_guichet}
                            </span>
                            {g.services && g.services.length > 0 && (
                              <span className="inline-block rounded-full bg-primary/15 border border-primary/30 px-2.5 py-0.5 text-[11px] font-bold text-primary">
                                {g.services.length} opération{g.services.length > 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                          <h3 className="text-xl font-bold text-foreground font-satoshi">
                            {g.nom_guichet}
                          </h3>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <GuichetQrPreview guichet={g} />
                          {user?.role === 'CHEF_AGENCE' && (
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setGuichetAArchiver({ id: g.id, nom: g.nom_guichet })}
                              className="h-auto border-dashed border-border/80 rounded-2xl px-3.5 py-3 text-xs font-bold hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive transition-colors"
                              title="Fermer définitivement ce guichet"
                              aria-label={`Archiver le guichet ${g.nom_guichet}`}
                            >
                              <Archive className="size-4" />
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Operations Configuration Section */}
                      <div className="bg-muted/30 p-4 rounded-2xl border border-dashed border-border/60">
                        {editingGuichetId === g.id ? (
                          <div className="space-y-3">
                            <h4 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                              <Settings2 size={14} /> Configurer les opérations
                            </h4>
                            <div className="grid grid-cols-1 gap-2 py-1 sm:grid-cols-2">
                              {allServices?.map((s: any) => (
                                <label key={s.id} className="flex items-center gap-2 text-xs font-bold text-foreground cursor-pointer">
                                  <Checkbox
                                    checked={editServiceIds.includes(s.id)}
                                    onCheckedChange={(checked) => {
                                      if (checked) {
                                        setEditServiceIds([...editServiceIds, s.id]);
                                      } else {
                                        setEditServiceIds(editServiceIds.filter(id => id !== s.id));
                                      }
                                    }}
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
                                className="h-8 text-xs gap-1 rounded-xl"
                              >
                                <X className="size-3" /> Annuler
                              </Button>
                              <Button 
                                size="sm" 
                                onClick={() => setGuichetAConfirmer({ id: g.id, nom: g.nom_guichet })}
                                disabled={updatingServices}
                                className="h-8 text-xs gap-1 bg-success hover:bg-success/90 text-success-foreground font-bold rounded-xl"
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
                              <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                Opérations gérées
                              </h4>
                              <div className="flex flex-wrap gap-1.5 mt-1.5">
                                {g.services && g.services.length > 0 ? (
                                  g.services.map((s: any) => (
                                    <span key={s.id} className="bg-card border border-border/80 text-[11px] font-bold text-foreground px-2.5 py-0.5 rounded-lg">
                                      {s.libelle_service}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-xs text-muted-foreground italic font-medium">
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
                                className="h-8 text-xs font-bold shrink-0 gap-1 rounded-xl border-border/80 hover:border-primary/50 hover:text-primary transition-all"
                              >
                                <Settings2 size={12} /> Modifier
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </Card>
                  </Reveal>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Printable Area */}
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
        <AlertDialogContent className="rounded-3xl border-border/80">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-satoshi font-bold">Appliquer ces opérations ?</AlertDialogTitle>
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
            <AlertDialogCancel className="rounded-xl">Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl font-bold"
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
        <AlertDialogContent className="rounded-3xl border-border/80">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-satoshi font-bold text-destructive">Fermer définitivement ce guichet ?</AlertDialogTitle>
            <AlertDialogDescription>
              {guichetAArchiver && (
                <>
                  <strong className="text-foreground">{guichetAArchiver.nom}</strong> sera archivé :
                  il disparaîtra des listes actives et ne pourra plus recevoir d'avis. Tout son
                  historique reste intact et consultable depuis la page Archives.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleArchiverGuichet}
              disabled={archivingId !== null}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl font-bold"
            >
              {archivingId !== null ? 'Archivage...' : 'Archiver le guichet'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </RequireAuth>
      </RequireEnterpriseRole>
  );
};
