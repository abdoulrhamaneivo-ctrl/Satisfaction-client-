import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from 'wasp/client/auth';
import {
  useQuery,
  inviteAgent,
  updateAgent,
  deleteAgent,
  reactivateAgent,
  getAgentsByAgence,
  getAgences,
} from 'wasp/client/operations';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UserPlus,
  Trash2,
  RotateCcw,
  Mail,
  Phone,
  ShieldUser,
  ShieldAlert,
  Users,
  CheckCircle2,
  UsersRound,
  Search,
} from 'lucide-react';
import { AmbientBackground } from '../components/AmbientBackground';
import { PageHeader } from '../components/PageHeader';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { RequireAuth } from '../components/RequireAuth';
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

export const AdminPersonnelPage = () => {
  const { data: user } = useAuth();
  const { toast } = useToast();
  // Correctif : "?? 1" était un identifiant d'agence codé en dur. Pour une
  // DIRECTION dont l'utilisateur n'a pas d'id_agence propre, ça pointait
  // vers l'agence #1 — potentiellement une agence d'une AUTRE entreprise
  // sur la plateforme — avant même que la liste réelle des agences ne soit
  // chargée. On démarre désormais sans sélection tant qu'on ne connaît pas
  // une agence légitime, et on la déduit dès qu'elle est disponible.
  const [selectedAgenceId, setSelectedAgenceId] = useState<number | null>(
    user?.id_agence ?? null,
  );
  const { data: agences } = useQuery(getAgences, { enabled: user?.role === 'DIRECTION' });

  useEffect(() => {
    if (selectedAgenceId !== null) return;
    if (user?.id_agence) {
      setSelectedAgenceId(user.id_agence);
    } else if (agences && agences.length > 0) {
      setSelectedAgenceId(agences[0].id);
    }
  }, [user?.id_agence, agences, selectedAgenceId]);

  const { data: agents, isLoading: loadingAgents } = useQuery(
    getAgentsByAgence,
    { id_agence: selectedAgenceId ?? 0 },
    { enabled: selectedAgenceId !== null }
  );

  // Recherche + filtre statut : indispensable dès qu'une agence dépasse une
  // quinzaine d'agents — sans ça, retrouver un agent précis = scroller une
  // grille de cartes à l'œil.
  const [recherche, setRecherche] = useState('');
  const [filtreStatut, setFiltreStatut] = useState<'TOUS' | 'ACTIFS' | 'SUSPENDUS'>('TOUS');
  const formCardRef = useRef<HTMLDivElement>(null);
  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    email: '',
    telephone: '',
    role: 'AGENT',
  });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  // Agent en attente de confirmation de suspension (audit UX 2.1 : cette
  // action désactivait l'accès du compte au premier clic, sans aucune
  // confirmation, alors qu'elle est placée juste à côté du bouton "réactiver").
  const [agentAConfirmerSuppression, setAgentAConfirmerSuppression] = useState<
    { id: number; nom: string; prenom: string } | null
  >(null);

  // Règle métier : la direction constitue l'encadrement de tout le réseau
  // (Chef d'Agence, Auditeur Qualité) sur n'importe quelle agence de
  // l'entreprise. Chaque Chef d'Agence recrute ensuite l'équipe de sa
  // propre agence : ses agents de guichet, ainsi que son propre Auditeur
  // Qualité (inviteAgent l'autorise déjà côté serveur — ROLES_PAR_INVITEUR).
  // Le formulaire ne doit donc jamais proposer un rôle que le backend
  // refuserait de toute façon.
  const roleOptions = user?.role === 'DIRECTION'
    ? [
        { value: 'CHEF_AGENCE', label: "Chef d’Agence" },
        { value: 'QUALITE', label: 'Auditeur Qualité' },
      ]
    : user?.role === 'CHEF_AGENCE'
    ? [
        { value: 'AGENT', label: 'Agent de guichet' },
        { value: 'QUALITE', label: 'Auditeur Qualité' },
      ]
    : [{ value: 'AGENT', label: 'Agent de guichet' }];

  useEffect(() => {
    if (roleOptions.length > 0 && !roleOptions.some(r => r.value === formData.role)) {
      setFormData(prev => ({ ...prev, role: roleOptions[0].value }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.role]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAgenceId) {
      toast({ variant: 'destructive', title: 'Agence requise', description: "Sélectionnez d'abord une agence." });
      return;
    }
    try {
      if (editingId) {
        await updateAgent({ id: editingId, ...formData, id_agence: selectedAgenceId });
        toast({ title: 'Agent mis à jour', description: `${formData.prenom} ${formData.nom} a bien été modifié(e).` });
      } else {
        await inviteAgent({
          email: formData.email,
          nom: formData.nom,
          prenom: formData.prenom,
          id_agence: selectedAgenceId,
          role: formData.role,
          telephone: formData.telephone,
        });
        toast({
          title: formData.role === 'CHEF_AGENCE' ? 'Invitation envoyée' : 'Agent créé',
          description: `${formData.prenom} ${formData.nom} a bien été ajouté(e).`,
        });
      }
      setFormData({ nom: '', prenom: '', email: '', telephone: '', role: 'AGENT' });
      setEditingId(null);
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 3000);
    } catch (error: any) {
      // Correctif : cette erreur (ex. email déjà utilisé, champ requis
      // manquant, agence invalide) n'était auparavant visible que dans la
      // console développeur — l'utilisateur du formulaire ne voyait RIEN se
      // passer et pouvait légitimement croire que sa saisie avait été prise
      // en compte alors qu'elle avait échoué silencieusement.
      toast({
        variant: 'destructive',
        title: "Erreur",
        description: error?.message || "Une erreur est survenue lors de l'enregistrement de l'agent.",
      });
    }
  };

  const handleEdit = (agent: any) => {
    setEditingId(agent.id);
    setFormData({
      nom: agent.nom,
      prenom: agent.prenom,
      email: agent.email || '',
      telephone: agent.telephone || '',
      role: agent.role || 'AGENT',
    });
    // Le formulaire est sticky mais reste hors champ visuel quand on clique
    // "Modifier" sur une carte en bas de grille — sans ce scroll, l'agent
    // ne comprend pas que quelque chose s'est passé.
    formCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setFormData({ nom: '', prenom: '', email: '', telephone: '', role: 'AGENT' });
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteAgent({ id });
      toast({ title: 'Agent suspendu', description: "Le compte a été désactivé et ne peut plus se connecter. Il peut être réactivé à tout moment." });
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 3000);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erreur', description: error?.message || "Impossible de suspendre cet agent." });
    } finally {
      setAgentAConfirmerSuppression(null);
    }
  };

  const handleReactivate = async (id: number) => {
    try {
      await reactivateAgent({ id });
      toast({ title: 'Agent réactivé', description: 'Le compte peut à nouveau se connecter.' });
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 3000);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erreur', description: error?.message || "Impossible de réactiver cet agent." });
    }
  };

  const agentsFiltres = (agents ?? []).filter((agent: any) => {
    if (filtreStatut === 'ACTIFS' && agent.actif === false) return false;
    if (filtreStatut === 'SUSPENDUS' && agent.actif !== false) return false;
    if (recherche.trim()) {
      const q = recherche.trim().toLowerCase();
      const cible = `${agent.prenom ?? ''} ${agent.nom ?? ''} ${agent.email ?? ''}`.toLowerCase();
      if (!cible.includes(q)) return false;
    }
    return true;
  });
  const agentCount = agentsFiltres.length;
  const agentCountTotal = agents?.length ?? 0;

  // Défense en profondeur : les actions serveur (inviteAgent, updateAgent,
  // deleteAgent, reactivateAgent) refusent déjà AGENT/QUALITE, mais sans ce
  // garde ils voyaient quand même tout le formulaire de gestion d'équipe
  // avant que leur clic n'échoue côté serveur — cohérent avec le même
  // correctif déjà appliqué sur GestionAgencesPage.
  if (user && user.role !== 'DIRECTION' && user.role !== 'CHEF_AGENCE') {
    return (
      <RequireAuth>
        <AmbientBackground>
          <div className="flex min-h-screen items-center justify-center p-8">
            <div className="flex max-w-md flex-col items-center gap-3 rounded-3xl border border-border/70 bg-card p-10 text-center shadow-premium">
              <ShieldAlert className="size-10 text-warning" />
              <h1 className="text-lg font-bold">Accès réservé</h1>
              <p className="text-sm text-muted-foreground">
                Seuls le chef d'entreprise et le Chef d'Agence peuvent gérer le personnel.
              </p>
            </div>
          </div>
        </AmbientBackground>
      </RequireAuth>
    );
  }

  return (
    <RequireAuth>
    <AmbientBackground>
      <div className="min-h-screen p-8">
        <div className="mx-auto max-w-6xl">
          <PageHeader
            icon={Users}
            eyebrow="Équipe"
            title="Gestion du personnel"
            description="Ajoutez, modifiez et suivez les agents rattachés à votre agence."
            actions={
              user?.role === 'DIRECTION' && agences ? (
                <Select
                  value={selectedAgenceId !== null ? String(selectedAgenceId) : undefined}
                  onValueChange={(v) => setSelectedAgenceId(Number(v))}
                >
                  <SelectTrigger className="h-10 min-w-56">
                    <SelectValue placeholder="Choisir l'agence" />
                  </SelectTrigger>
                  <SelectContent>
                    {agences.map((agence: any) => (
                      <SelectItem key={agence.id} value={String(agence.id)}>
                        {agence.nom_agence} ({agence.commune})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : undefined
            }
          />

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            {/* CARTE FORMULAIRE (Bento Style) */}
            <motion.div
              ref={formCardRef}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="lg:col-span-1 rounded-3xl border border-border/70 bg-card p-6 shadow-premium ring-premium scroll-mt-8"
            >
              <h2 className="mb-6 flex items-center gap-2 text-lg font-bold">
                <UserPlus className="text-primary" /> {editingId ? 'Modifier un agent' : 'Nouvel Agent'}
              </h2>

              <AnimatePresence>
                {submitted && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mb-4 flex items-center gap-2 rounded-xl bg-success/10 p-3 text-sm font-medium text-success"
                  >
                    <CheckCircle2 className="size-4" /> Opération réussie !
                  </motion.div>
                )}
              </AnimatePresence>

              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  name="prenom"
                  placeholder="Prénom"
                  value={formData.prenom}
                  onChange={handleInputChange}
                  required
                  className="h-11"
                />
                <Input
                  name="nom"
                  placeholder="Nom"
                  value={formData.nom}
                  onChange={handleInputChange}
                  required
                  className="h-11"
                />

                <Select value={formData.role} onValueChange={(value) => setFormData(prev => ({ ...prev, role: value }))}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Rôle" />
                  </SelectTrigger>
                  <SelectContent>
                    {roleOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Email : requis uniquement pour Chef d’Agence */}
                <div className="space-y-1.5">
                  <Input
                    name="email"
                    type="email"
                    placeholder={formData.role === 'CHEF_AGENCE' ? 'Email professionnel *' : 'Email (optionnel)'}
                    value={formData.email}
                    onChange={handleInputChange}
                    required={formData.role === 'CHEF_AGENCE'}
                    className="h-11"
                  />
                  {formData.role === 'CHEF_AGENCE' ? (
                    <p className="text-xs text-primary font-medium flex items-center gap-1">
                      <Mail className="size-3" />
                      Un email d’accueil avec identifiants lui sera envoyé automatiquement.
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      Les agents simples ne reçoivent pas d’invitation — ils sont créés directement.
                    </p>
                  )}
                </div>

                <Input
                  name="telephone"
                  placeholder="Téléphone (optionnel)"
                  value={formData.telephone}
                  onChange={handleInputChange}
                  className="h-11"
                />

                <div className="flex gap-3 pt-2">
                  {editingId && (
                    <Button type="button" variant="outline" onClick={handleCancelEdit} className="flex-1">
                      Annuler
                    </Button>
                  )}
                  <Button type="submit" className="flex-1 rounded-xl font-bold">
                    {editingId
                      ? 'Enregistrer'
                      : formData.role === 'CHEF_AGENCE'
                      ? 'Inviter le Chef d’Agence'
                      : 'Créer l’agent'}
                  </Button>
                </div>
              </form>
            </motion.div>

            {/* GRILLE DES AGENTS (Bento Grid) */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={recherche}
                    onChange={(e) => setRecherche(e.target.value)}
                    placeholder="Rechercher un agent (nom, email)..."
                    className="h-10 pl-9"
                  />
                </div>
                <Select value={filtreStatut} onValueChange={(v: any) => setFiltreStatut(v)}>
                  <SelectTrigger className="h-10 sm:w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TOUS">Tous les statuts</SelectItem>
                    <SelectItem value="ACTIFS">Actifs uniquement</SelectItem>
                    <SelectItem value="SUSPENDUS">Suspendus uniquement</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {!loadingAgents && agentCountTotal > 0 && (
                <p className="text-xs text-muted-foreground">
                  {agentCount} agent{agentCount > 1 ? 's' : ''} affiché{agentCount > 1 ? 's' : ''}
                  {agentCount !== agentCountTotal ? ` sur ${agentCountTotal}` : ''}
                </p>
              )}

              {loadingAgents && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="h-32 animate-pulse rounded-3xl border border-border/70 bg-card-subtle/50" />
                  ))}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AnimatePresence>
                {!loadingAgents && agentsFiltres.map((agent: any) => (
                  <motion.div
                    key={agent.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="rounded-3xl border border-border/70 bg-card p-5 shadow-sm transition-all hover:shadow-premium hover:border-primary/20"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-100 text-orange-600 font-bold text-xl">
                          {agent.prenom?.[0]}{agent.nom?.[0]}
                        </div>
                        <div>
                          <h3 className="font-bold text-foreground">
                            {agent.prenom} {agent.nom}
                          </h3>
                          <p className="text-xs text-muted-foreground">
                            {agent.role}
                            {agent.actif === false && (
                              <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold uppercase text-red-600">
                                Suspendu
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(agent)}
                          aria-label="Modifier"
                          className="text-warning hover:bg-warning/10 hover:text-warning"
                        >
                          <ShieldUser className="size-4" />
                        </Button>
                        {agent.actif === false ? (
                          <button
                            type="button"
                            onClick={() => handleReactivate(agent.id)}
                            aria-label="Réactiver"
                            title="Réactiver ce compte"
                            className="text-muted-foreground hover:text-success"
                          >
                            <RotateCcw size={18} />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setAgentAConfirmerSuppression({ id: agent.id, nom: agent.nom, prenom: agent.prenom })}
                            aria-label="Suspendre"
                            title="Suspendre ce compte"
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="mt-6 flex flex-col gap-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Mail size={14} /> {agent.email}
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone size={14} /> {agent.telephone || 'Non renseigné'}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {!loadingAgents && agentCount === 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="md:col-span-2"
                >
                  <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-border/50 bg-card/50 p-10 text-center">
                    <UsersRound className="mb-3 size-10 text-muted-foreground" />
                    <p className="font-semibold text-foreground">
                      {agentCountTotal === 0 ? 'Aucun agent enregistré' : 'Aucun agent ne correspond à votre recherche'}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {agentCountTotal === 0
                        ? 'Ajoutez votre premier agent via le formulaire pour commencer à suivre votre équipe.'
                        : 'Essayez un autre nom, un autre email, ou réinitialisez le filtre de statut.'}
                    </p>
                  </div>
                </motion.div>
              )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <AlertDialog
        open={agentAConfirmerSuppression !== null}
        onOpenChange={(open) => !open && setAgentAConfirmerSuppression(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Suspendre ce compte ?</AlertDialogTitle>
            <AlertDialogDescription>
              {agentAConfirmerSuppression && (
                <>
                  <strong className="text-foreground">{agentAConfirmerSuppression.prenom} {agentAConfirmerSuppression.nom}</strong>{" "}
                  ne pourra plus se connecter. Ce compte pourra être réactivé à
                  tout moment depuis cette même page.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => agentAConfirmerSuppression && handleDelete(agentAConfirmerSuppression.id)}
            >
              Suspendre le compte
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AmbientBackground>
    </RequireAuth>
  );
};