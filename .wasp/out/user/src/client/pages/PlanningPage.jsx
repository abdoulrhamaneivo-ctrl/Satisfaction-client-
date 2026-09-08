import React, { useMemo, useState } from 'react';
import { useAuth } from 'wasp/client/auth';
import { useQuery, assignAgent, updateAffectationGuichet, deleteAffectationGuichet, getGuichets, getAgents, getAffectationsDuJour, getModelesHoraires, upsertModeleHoraire, deleteModeleHoraire, genererPlanning, reconduirePlanning, suggererPlanning, appliquerSuggestion, } from 'wasp/client/operations';
import { motion } from 'framer-motion';
import { CalendarClock, Store, UserCheck2, Clock, AlertTriangle, Pencil, Trash2, Search, ChevronLeft, ChevronRight, Copy, Sparkles, LayoutTemplate, CalendarDays, Check, } from 'lucide-react';
import { AmbientBackground } from '../components/AmbientBackground';
import { PageHeader } from '../components/PageHeader';
import { MotionCard } from '../components/MotionCard';
import { EmptyState } from '../components/EmptyState';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, } from '../components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, } from '../components/ui/alert-dialog';
import { useToast } from '../hooks/use-toast';
import { RequireAuth } from '../components/RequireAuth';
import { RequireEnterpriseRole } from "../components/RequireEnterpriseRole";
const JOURS_LABELS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
// Ordre d'affichage : Lun … Dim
const JOURS_ORDRE = [1, 2, 3, 4, 5, 6, 0];
const isoAujourdhui = () => new Date().toISOString().split('T')[0];
const decalerJour = (iso, n) => {
    const d = new Date(`${iso}T00:00:00.000Z`);
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
};
const libelleDate = (iso) => new Date(`${iso}T00:00:00.000Z`).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
});
export const PlanningPage = () => {
    const { data: user } = useAuth();
    const { toast } = useToast();
    const [onglet, setOnglet] = useState('jour');
    const [dateSelectionnee, setDateSelectionnee] = useState(isoAujourdhui());
    const [selectedAgent, setSelectedAgent] = useState({});
    const [heureDebut, setHeureDebut] = useState('08:00');
    const [heureFin, setHeureFin] = useState('13:00');
    const [assigningId, setAssigningId] = useState(null);
    // --- Édition / suppression d'une affectation déjà validée ---
    const [affectationAEditer, setAffectationAEditer] = useState(null);
    const [editAgentId, setEditAgentId] = useState('');
    const [editHeureDebut, setEditHeureDebut] = useState('08:00');
    const [editHeureFin, setEditHeureFin] = useState('13:00');
    const [savingEdit, setSavingEdit] = useState(false);
    const [affectationASupprimer, setAffectationASupprimer] = useState(null);
    const [deletingId, setDeletingId] = useState(null);
    const [recherche, setRecherche] = useState('');
    const [filtreCouverture, setFiltreCouverture] = useState('TOUS');
    // --- Reconduction / génération / suggestion ---
    const [dialogReconduire, setDialogReconduire] = useState(false);
    const [dateSource, setDateSource] = useState(decalerJour(isoAujourdhui(), -1));
    const [actionEnCours, setActionEnCours] = useState(null);
    const [suggestion, setSuggestion] = useState(null);
    // --- Semaine type ---
    const [jourType, setJourType] = useState(new Date().getUTCDay());
    const [typeGuichet, setTypeGuichet] = useState('');
    const [typeAgent, setTypeAgent] = useState('');
    const [typeDebut, setTypeDebut] = useState('08:00');
    const [typeFin, setTypeFin] = useState('13:00');
    const [savingType, setSavingType] = useState(false);
    const userAgenceId = user?.id_agence;
    const estAujourdhui = dateSelectionnee === isoAujourdhui();
    const { data: guichets, isLoading: loadingGuichets } = useQuery(getGuichets, { id_agence: userAgenceId || 0 });
    const { data: agents } = useQuery(getAgents, { id_agence: userAgenceId || 0 });
    const { data: affectationsDuJour, refetch: refetchAffectations } = useQuery(getAffectationsDuJour, { id_agence: userAgenceId || 0, date: dateSelectionnee }, { enabled: !!userAgenceId });
    const { data: modeles, refetch: refetchModeles } = useQuery(getModelesHoraires, { id_agence: userAgenceId || 0 }, { enabled: !!userAgenceId && onglet === 'semaine' });
    const getAffectationsForGuichet = (guichetId) => (affectationsDuJour || []).filter((a) => a.guichet?.id === guichetId);
    const guichetsFiltres = (guichets ?? []).filter((guichet) => {
        const aDesAffectations = getAffectationsForGuichet(guichet.id).length > 0;
        if (filtreCouverture === 'SANS_AGENT' && aDesAffectations)
            return false;
        if (filtreCouverture === 'AFFECTES' && !aDesAffectations)
            return false;
        const requete = recherche.trim().toLocaleLowerCase('fr-FR');
        return !requete || `${guichet.nom_guichet ?? ''} ${guichet.type_guichet ?? ''}`
            .toLocaleLowerCase('fr-FR')
            .includes(requete);
    });
    const couverture = useMemo(() => {
        const total = (guichets ?? []).length;
        const couverts = (guichets ?? []).filter((g) => getAffectationsForGuichet(g.id).length > 0).length;
        return { total, couverts, pct: total === 0 ? 0 : Math.round((couverts / total) * 100) };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [guichets, affectationsDuJour]);
    const toastResultat = (titre, res) => {
        const ignores = res?.ignores?.length ?? 0;
        toast({
            variant: ignores > 0 ? 'default' : 'success',
            title: titre,
            description: `${res?.crees ?? 0} créneau(x) enregistré(s)` +
                (ignores > 0 ? ` — ${ignores} ignoré(s) : ${(res.ignores[0]?.raison || '').slice(0, 120)}` : '.'),
        });
    };
    const handleAssign = async (guichetId) => {
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
                date: dateSelectionnee,
                heure_debut: heureDebut,
                heure_fin: heureFin,
            });
            const agentNom = agents?.find((a) => String(a.id) === agentId);
            toast({
                variant: 'success',
                title: 'Agent affecté',
                description: agentNom
                    ? `${agentNom.prenom} ${agentNom.nom} est planifié(e) de ${heureDebut} à ${heureFin}.`
                    : 'Affectation enregistrée avec succès.',
            });
        }
        catch (err) {
            toast({ variant: 'destructive', title: "Erreur lors de l'affectation", description: err.message || 'Erreur inconnue' });
        }
        finally {
            setAssigningId(null);
        }
    };
    const handleReconduire = async () => {
        if (!userAgenceId)
            return;
        setActionEnCours('reconduire');
        try {
            const res = await reconduirePlanning({
                id_agence: userAgenceId,
                date_source: dateSource,
                date_cible: dateSelectionnee,
            });
            toastResultat('Journée reconduite', res);
            setDialogReconduire(false);
            refetchAffectations();
        }
        catch (err) {
            toast({ variant: 'destructive', title: 'Reconduction impossible', description: err.message || 'Erreur inconnue' });
        }
        finally {
            setActionEnCours(null);
        }
    };
    const handleGenerer = async () => {
        if (!userAgenceId)
            return;
        setActionEnCours('generer');
        try {
            const res = await genererPlanning({
                id_agence: userAgenceId,
                date_debut: dateSelectionnee,
                date_fin: dateSelectionnee,
            });
            if ((res?.crees ?? 0) === 0 && (res?.ignores?.length ?? 0) === 0) {
                toast({ title: 'Rien à générer', description: 'La semaine type ne prévoit rien pour ce jour. Configurez-la dans l’onglet « Semaine type ».' });
            }
            else {
                toastResultat('Planning généré depuis la semaine type', res);
            }
            refetchAffectations();
        }
        catch (err) {
            toast({ variant: 'destructive', title: 'Génération impossible', description: err.message || 'Erreur inconnue' });
        }
        finally {
            setActionEnCours(null);
        }
    };
    const handleSuggerer = async () => {
        if (!userAgenceId)
            return;
        setActionEnCours('suggerer');
        try {
            const res = await suggererPlanning({ id_agence: userAgenceId, date: dateSelectionnee });
            setSuggestion(res);
            if (!res?.propositions?.length) {
                toast({ title: 'Aucune suggestion', description: 'Ni la semaine dernière, ni hier, ni la semaine type ne donnent de base pour ce jour.' });
            }
        }
        catch (err) {
            toast({ variant: 'destructive', title: 'Suggestion impossible', description: err.message || 'Erreur inconnue' });
        }
        finally {
            setActionEnCours(null);
        }
    };
    const handleAppliquerSuggestion = async () => {
        if (!userAgenceId || !suggestion?.propositions?.length)
            return;
        setActionEnCours('appliquer');
        try {
            const res = await appliquerSuggestion({
                id_agence: userAgenceId,
                date: dateSelectionnee,
                lignes: suggestion.propositions.map((p) => ({
                    id_guichet: p.id_guichet,
                    id_agent: p.id_agent,
                    heure_debut: p.heure_debut,
                    heure_fin: p.heure_fin,
                })),
            });
            toastResultat('Suggestion appliquée', res);
            setSuggestion(null);
            refetchAffectations();
        }
        catch (err) {
            toast({ variant: 'destructive', title: "Erreur lors de l'application", description: err.message || 'Erreur inconnue' });
        }
        finally {
            setActionEnCours(null);
        }
    };
    const handleSaveType = async () => {
        if (!userAgenceId)
            return;
        if (!typeGuichet || !typeAgent) {
            toast({ variant: 'destructive', title: 'Sélection incomplète', description: 'Choisissez un guichet et un agent.' });
            return;
        }
        if (typeFin <= typeDebut) {
            toast({ variant: 'destructive', title: 'Horaire invalide', description: "L'heure de fin doit être après l'heure de début." });
            return;
        }
        setSavingType(true);
        try {
            await upsertModeleHoraire({
                id_agence: userAgenceId,
                jour_semaine: jourType,
                heure_debut: typeDebut,
                heure_fin: typeFin,
                id_guichet: Number(typeGuichet),
                id_agent: typeAgent,
            });
            toast({ variant: 'success', title: 'Semaine type mise à jour', description: `${JOURS_LABELS[jourType]} : créneau ${typeDebut}–${typeFin} enregistré.` });
            setTypeGuichet('');
            setTypeAgent('');
            refetchModeles();
        }
        catch (err) {
            toast({ variant: 'destructive', title: "Erreur lors de l'enregistrement", description: err.message || 'Erreur inconnue' });
        }
        finally {
            setSavingType(false);
        }
    };
    const handleDeleteType = async (id) => {
        try {
            await deleteModeleHoraire({ id });
            toast({ variant: 'success', title: 'Ligne retirée', description: 'La semaine type a été mise à jour.' });
            refetchModeles();
        }
        catch (err) {
            toast({ variant: 'destructive', title: 'Erreur lors de la suppression', description: err.message || 'Erreur inconnue' });
        }
    };
    const ouvrirEdition = (aff) => {
        setAffectationAEditer(aff);
        setEditAgentId(String(aff.agent?.id ?? aff.id_agent ?? ''));
        setEditHeureDebut(aff.heure_debut);
        setEditHeureFin(aff.heure_fin);
    };
    const handleSaveEdit = async () => {
        if (!affectationAEditer)
            return;
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
                date: dateSelectionnee,
                heure_debut: editHeureDebut,
                heure_fin: editHeureFin,
            });
            toast({ variant: 'success', title: 'Affectation modifiée', description: 'Le planning a été mis à jour.' });
            setAffectationAEditer(null);
        }
        catch (err) {
            toast({ variant: 'destructive', title: 'Erreur lors de la modification', description: err.message || 'Erreur inconnue' });
        }
        finally {
            setSavingEdit(false);
        }
    };
    const handleDelete = async () => {
        if (!affectationASupprimer)
            return;
        setDeletingId(affectationASupprimer.id);
        try {
            await deleteAffectationGuichet({ id: affectationASupprimer.id });
            toast({ variant: 'success', title: 'Affectation retirée', description: 'Le créneau a été libéré.' });
        }
        catch (err) {
            toast({ variant: 'destructive', title: 'Erreur lors de la suppression', description: err.message || 'Erreur inconnue' });
        }
        finally {
            setDeletingId(null);
            setAffectationASupprimer(null);
        }
    };
    const modelesDuJour = (modeles ?? []).filter((m) => m.jour_semaine === jourType);
    return (<RequireEnterpriseRole>
      <RequireAuth>
      <AmbientBackground>
        <div className="mx-auto max-w-7xl p-6 lg:p-10 space-y-8">
          {/* Fil d'Ariane & Onglets — Style Linear / Notion */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/70 pb-4">
            <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
              <span>Exploitation</span>
              <span>/</span>
              <span className="text-foreground">{user?.agence?.nom_agence || "Agence Principale"}</span>
              <span>/</span>
              <span className="text-primary font-bold">Planning Guichets</span>
            </div>

            <div className="flex items-center gap-6 text-xs font-bold">
              <span className="text-muted-foreground hover:text-foreground pb-1 transition-colors cursor-pointer" onClick={() => window.location.href = '/dashboard'}>Tableau synthétique</span>
              <span className="text-muted-foreground hover:text-foreground pb-1 transition-colors cursor-pointer" onClick={() => window.location.href = '/guichets'}>Guichets</span>
              <span className="text-primary border-b-2 border-primary pb-1 font-bold cursor-pointer">Planning du jour</span>
            </div>
          </div>

          <PageHeader icon={CalendarClock} eyebrow={onglet === 'jour' ? 'Affectations' : 'Semaine type récurrente'} title="Planning des guichets" description={onglet === 'jour'
            ? `${libelleDate(dateSelectionnee)} — affectez chaque agent à son poste, ou réutilisez l'existant en un clic.`
            : 'Définissez une fois la grille hebdomadaire : le planning du jour se génère ensuite automatiquement.'}/>

          {/* Sélecteur d'onglet + navigation date */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-2">
              <Button size="sm" variant={onglet === 'jour' ? 'default' : 'outline'} onClick={() => setOnglet('jour')}>
                <CalendarDays className="mr-1.5 size-4"/> Jour
              </Button>
              <Button size="sm" variant={onglet === 'semaine' ? 'default' : 'outline'} onClick={() => setOnglet('semaine')}>
                <LayoutTemplate className="mr-1.5 size-4"/> Semaine type
              </Button>
            </div>
            {onglet === 'jour' && (<div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => setDateSelectionnee(decalerJour(dateSelectionnee, -1))} title="Jour précédent">
                  <ChevronLeft className="size-4"/>
                </Button>
                <Input type="date" value={dateSelectionnee} onChange={(e) => e.target.value && setDateSelectionnee(e.target.value)} className="h-9 w-auto font-semibold" aria-label="Date du planning"/>
                <Button size="sm" variant="outline" onClick={() => setDateSelectionnee(decalerJour(dateSelectionnee, 1))} title="Jour suivant">
                  <ChevronRight className="size-4"/>
                </Button>
                {!estAujourdhui && (<Button size="sm" variant="ghost" onClick={() => setDateSelectionnee(isoAujourdhui())}>
                    Aujourd'hui
                  </Button>)}
              </div>)}
          </div>

          {onglet === 'jour' ? (<>
              {/* Barre de couverture + actions rapides */}
              <MotionCard className="space-y-4 p-5">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm font-semibold">
                    Couverture : {couverture.couverts}/{couverture.total} guichets
                    {couverture.total > 0 && couverture.couverts < couverture.total && (<span className="ml-2 inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-bold text-destructive">
                        <AlertTriangle className="size-3"/> {couverture.total - couverture.couverts} sans agent — avis « sans attribution » possibles
                      </span>)}
                    {couverture.total > 0 && couverture.couverts === couverture.total && (<span className="ml-2 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">
                        <Check className="size-3"/> Complet
                      </span>)}
                  </p>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${couverture.pct}%` }}/>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => { setDateSource(decalerJour(dateSelectionnee, -1)); setDialogReconduire(true); }}>
                    <Copy className="mr-1.5 size-4"/> Reconduire une journée…
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleGenerer} disabled={actionEnCours !== null}>
                    <LayoutTemplate className="mr-1.5 size-4"/>
                    {actionEnCours === 'generer' ? 'Génération…' : 'Depuis la semaine type'}
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleSuggerer} disabled={actionEnCours !== null}>
                    <Sparkles className="mr-1.5 size-4"/>
                    {actionEnCours === 'suggerer' ? 'Analyse…' : 'Suggérer le planning'}
                  </Button>
                </div>
              </MotionCard>

              {/* Panneau suggestion */}
              {suggestion && (<MotionCard className="space-y-3 border-primary/30 p-5">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="flex items-center gap-2 text-sm font-bold">
                      <Sparkles className="size-4 text-primary"/>
                      Suggestion
                      {suggestion.source && (<span className="font-normal text-muted-foreground">— base : {suggestion.source}</span>)}
                    </p>
                    <div className="flex gap-2">
                      <Button size="sm" variant="ghost" onClick={() => setSuggestion(null)}>Ignorer</Button>
                      <Button size="sm" onClick={handleAppliquerSuggestion} disabled={actionEnCours !== null || suggestion.propositions.length === 0}>
                        {actionEnCours === 'appliquer' ? 'Application…' : `Tout appliquer (${suggestion.propositions.length})`}
                      </Button>
                    </div>
                  </div>
                  {suggestion.propositions.length === 0 ? (<p className="text-sm text-muted-foreground">Aucune proposition pour ce jour.</p>) : (<ul className="divide-y divide-border/60 rounded-xl border border-border/60">
                      {suggestion.propositions.map((p, i) => (<li key={i} className="flex flex-col gap-1 p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                          <span>
                            <strong>{p.nom_guichet}</strong> — {p.nom_agent}{' '}
                            <span className="text-muted-foreground">{p.heure_debut}–{p.heure_fin}</span>
                          </span>
                          <span className="text-xs text-muted-foreground">{p.raison}</span>
                        </li>))}
                    </ul>)}
                </MotionCard>)}

              {/* Créneau horaire par défaut */}
              <MotionCard className="flex flex-wrap items-end gap-4 p-5">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="heure-debut" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Heure de début
                  </label>
                  <Input id="heure-debut" type="time" value={heureDebut} onChange={(e) => setHeureDebut(e.target.value)} className="h-10 w-auto font-semibold"/>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="heure-fin" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Heure de fin
                  </label>
                  <Input id="heure-fin" type="time" value={heureFin} onChange={(e) => setHeureFin(e.target.value)} className="h-10 w-auto font-semibold"/>
                </div>
                <p className="text-xs text-muted-foreground">
                  Ce créneau s'appliquera à chaque validation ci-dessous. Modifiez-le avant de valider un guichet dont les
                  horaires diffèrent.
                </p>
              </MotionCard>
            </>) : (<>
              {/* Onglet Semaine type */}
              <MotionCard className="space-y-4 p-5">
                <div className="flex flex-wrap gap-2">
                  {JOURS_ORDRE.map((j) => (<Button key={j} size="sm" variant={jourType === j ? 'default' : 'outline'} onClick={() => setJourType(j)}>
                      {JOURS_LABELS[j]}
                    </Button>))}
                </div>
                {modelesDuJour.length === 0 ? (<EmptyState icon={LayoutTemplate} title={`Aucun créneau le ${JOURS_LABELS[jourType].toLowerCase()}`} description="Ajoutez ci-dessous les créneaux récurrents : ils serviront à générer le planning en un clic."/>) : (<ul className="divide-y divide-border/60 rounded-xl border border-border/60">
                    {modelesDuJour.map((m) => (<li key={m.id} className="flex items-center justify-between gap-2 p-3 text-sm">
                        <span>
                          <strong>{m.guichet?.nom_guichet}</strong> — {m.agent?.prenom} {m.agent?.nom}{' '}
                          <span className="text-muted-foreground">{m.heure_debut}–{m.heure_fin}</span>
                          {(!m.guichet?.actif || m.guichet?.archive || m.agent?.actif === false) && (<span className="ml-2 inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-bold text-destructive">
                              <AlertTriangle className="size-3"/> Inactif — ignoré à la génération
                            </span>)}
                        </span>
                        <Button type="button" variant="ghost" size="icon" onClick={() => handleDeleteType(m.id)} title="Retirer" className="size-7 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                          <Trash2 className="size-4"/>
                        </Button>
                      </li>))}
                  </ul>)}
                <div className="grid gap-3 rounded-xl bg-muted/40 p-4 sm:grid-cols-2 lg:grid-cols-5">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Guichet</label>
                    <Select value={typeGuichet} onValueChange={setTypeGuichet}>
                      <SelectTrigger className="h-10"><SelectValue placeholder="Guichet…"/></SelectTrigger>
                      <SelectContent>
                        {(guichets ?? []).map((g) => (<SelectItem key={g.id} value={String(g.id)}>{g.nom_guichet}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Agent</label>
                    <Select value={typeAgent} onValueChange={setTypeAgent}>
                      <SelectTrigger className="h-10"><SelectValue placeholder="Agent…"/></SelectTrigger>
                      <SelectContent>
                        {(agents ?? []).map((a) => (<SelectItem key={a.id} value={String(a.id)}>{a.prenom} {a.nom}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Début</label>
                    <Input type="time" value={typeDebut} onChange={(e) => setTypeDebut(e.target.value)} className="h-10"/>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Fin</label>
                    <Input type="time" value={typeFin} onChange={(e) => setTypeFin(e.target.value)} className="h-10"/>
                  </div>
                  <div className="flex items-end">
                    <Button onClick={handleSaveType} disabled={savingType} className="w-full">
                      {savingType ? 'Ajout…' : `Ajouter le ${JOURS_LABELS[jourType].toLowerCase()}`}
                    </Button>
                  </div>
                </div>
              </MotionCard>
            </>)}

          {onglet === 'jour' && (<>
          {!!guichets?.length && (<section className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-card/60 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative w-full sm:max-w-md">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"/>
                <Input value={recherche} onChange={(event) => setRecherche(event.target.value)} placeholder="Rechercher un guichet…" className="h-10 pl-9 font-semibold" aria-label="Rechercher un guichet dans le planning"/>
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                    ['TOUS', 'Tous'],
                    ['SANS_AGENT', 'Sans agent'],
                    ['AFFECTES', 'Affectés'],
                ].map(([valeur, libelle]) => (<Button key={valeur} size="sm" variant={filtreCouverture === valeur ? 'default' : 'outline'} onClick={() => setFiltreCouverture(valeur)}>
                    {libelle}
                  </Button>))}
              </div>
            </section>)}

          {/* Grille dynamique des guichets */}
          {loadingGuichets ? (<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {[0, 1, 2].map((i) => (<div key={i} className="h-40 animate-pulse rounded-2xl border border-border/70 bg-card-subtle/50"/>))}
            </div>) : !guichets?.length ? (<EmptyState icon={Store} title="Aucun guichet configuré" description="Créez d'abord vos guichets dans l'onglet « Guichets » pour pouvoir y affecter des agents."/>) : (guichetsFiltres.length === 0 ? (<EmptyState icon={Search} title="Aucun guichet ne correspond" description="Modifiez votre recherche ou le filtre de couverture pour afficher les guichets concernés." action={<Button variant="outline" onClick={() => { setRecherche(''); setFiltreCouverture('TOUS'); }}>Réinitialiser les filtres</Button>}/>) : (<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {guichetsFiltres.map((g, index) => {
                    const agentIdForGuichet = selectedAgent[g.id] ?? '';
                    const affectationsGuichet = getAffectationsForGuichet(g.id);
                    return (<motion.div key={g.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: index * 0.04 }}>
                    <MotionCard className="flex h-full flex-col gap-4 p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                              <Store className="size-4"/>
                            </span>
                            <div className="font-semibold text-foreground">{g.nom_guichet}</div>
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground">{g.type_guichet || 'Guichet'}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          {affectationsGuichet.length === 0 && (<span title="Aucun agent affecté pour ce jour" className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-bold text-destructive">
                              <AlertTriangle className="size-3"/> Sans agent
                            </span>)}
                          {agentIdForGuichet && (<span className="inline-flex items-center gap-1 rounded-full bg-secondary/15 px-2.5 py-1 text-xs font-semibold text-secondary-muted-foreground">
                              <UserCheck2 className="size-3.5"/> Prêt
                            </span>)}
                        </div>
                      </div>

                      {affectationsGuichet.length > 0 && (<div className="space-y-1.5 rounded-xl bg-muted/40 p-3">
                          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                            <Clock className="size-3"/> {estAujourdhui ? "Aujourd'hui" : libelleDate(dateSelectionnee)}
                          </p>
                          {affectationsGuichet.map((aff) => (<div key={aff.id} className="flex items-center justify-between gap-2 text-xs">
                              <span className="font-medium text-foreground">
                                {aff.agent?.prenom} {aff.agent?.nom}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="text-muted-foreground">
                                  {aff.heure_debut} – {aff.heure_fin}
                                </span>
                                <Button type="button" variant="ghost" size="icon" onClick={() => ouvrirEdition({ ...aff, guichet: g })} title="Modifier cette affectation" className="size-6 text-muted-foreground hover:bg-primary/10 hover:text-primary">
                                  <Pencil className="size-3.5"/>
                                </Button>
                                <Button type="button" variant="ghost" size="icon" onClick={() => setAffectationASupprimer({ ...aff, guichet: g })} title="Retirer cette affectation" className="size-6 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                                  <Trash2 className="size-3.5"/>
                                </Button>
                              </div>
                            </div>))}
                        </div>)}

                      <Select value={agentIdForGuichet} onValueChange={(value) => setSelectedAgent((prev) => ({ ...prev, [g.id]: value }))}>
                        <SelectTrigger className="h-10">
                          <SelectValue placeholder="Sélectionner un agent..."/>
                        </SelectTrigger>
                        <SelectContent>
                          {agents?.map((agent) => (<SelectItem key={agent.id} value={String(agent.id)}>
                              {agent.prenom} {agent.nom}
                            </SelectItem>))}
                        </SelectContent>
                      </Select>

                      <motion.div whileTap={{ scale: 0.97 }} className="mt-auto">
                        <Button onClick={() => handleAssign(g.id)} disabled={assigningId === g.id} className="w-full font-bold">
                          {assigningId === g.id ? 'Affectation...' : `Valider ${heureDebut} – ${heureFin}`}
                        </Button>
                      </motion.div>
                    </MotionCard>
                  </motion.div>);
                })}
            </div>))}
          </>)}
        </div>
      </AmbientBackground>

      {/* Reconduction d'une journée */}
      <Dialog open={dialogReconduire} onOpenChange={(open) => !open && setDialogReconduire(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reconduire une journée</DialogTitle>
            <DialogDescription>
              Copie les affectations vers le {libelleDate(dateSelectionnee)}. Les agents indisponibles et les
              chevauchements sont ignorés avec la raison — rien n'est créé en silence.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant={dateSource === decalerJour(dateSelectionnee, -1) ? 'default' : 'outline'} onClick={() => setDateSource(decalerJour(dateSelectionnee, -1))}>
              Hier
            </Button>
            <Button size="sm" variant={dateSource === decalerJour(dateSelectionnee, -7) ? 'default' : 'outline'} onClick={() => setDateSource(decalerJour(dateSelectionnee, -7))}>
              Même jour, semaine dernière
            </Button>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Date source</label>
            <Input type="date" value={dateSource} onChange={(e) => e.target.value && setDateSource(e.target.value)} className="h-10"/>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogReconduire(false)}>Annuler</Button>
            <Button onClick={handleReconduire} disabled={actionEnCours !== null}>
              {actionEnCours === 'reconduire' ? 'Reconduction…' : 'Reconduire'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Édition d'une affectation existante */}
      <Dialog open={affectationAEditer !== null} onOpenChange={(open) => !open && setAffectationAEditer(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier l'affectation</DialogTitle>
          </DialogHeader>
          {affectationAEditer && (<div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Guichet : <span className="font-medium text-foreground">{affectationAEditer.guichet?.nom_guichet}</span>
              </p>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Agent</label>
                <Select value={editAgentId} onValueChange={setEditAgentId}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Sélectionner un agent..."/>
                  </SelectTrigger>
                  <SelectContent>
                    {agents?.map((agent) => (<SelectItem key={agent.id} value={String(agent.id)}>
                        {agent.prenom} {agent.nom}
                      </SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-4">
                <div className="flex flex-1 flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Heure de début</label>
                  <Input type="time" value={editHeureDebut} onChange={(e) => setEditHeureDebut(e.target.value)} className="h-10"/>
                </div>
                <div className="flex flex-1 flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Heure de fin</label>
                  <Input type="time" value={editHeureFin} onChange={(e) => setEditHeureFin(e.target.value)} className="h-10"/>
                </div>
              </div>
            </div>)}
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
      <AlertDialog open={affectationASupprimer !== null} onOpenChange={(open) => !open && setAffectationASupprimer(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Retirer cette affectation ?</AlertDialogTitle>
            <AlertDialogDescription>
              {affectationASupprimer && (<>
                  <strong className="text-foreground">
                    {affectationASupprimer.agent?.prenom} {affectationASupprimer.agent?.nom}
                  </strong>{' '}
                  ne sera plus planifié(e) sur <strong className="text-foreground">{affectationASupprimer.guichet?.nom_guichet}</strong>{' '}
                  de {affectationASupprimer.heure_debut} à {affectationASupprimer.heure_fin}. Les avis déjà collectés sur ce
                  créneau restent inchangés.
                </>)}
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
      </RequireEnterpriseRole>);
};
