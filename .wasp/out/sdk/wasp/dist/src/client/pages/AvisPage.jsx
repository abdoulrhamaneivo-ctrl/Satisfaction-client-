import React, { useState, useCallback } from 'react';
import { Navigate } from 'react-router';
import { useQuery, getAvisGroupes, getAgences, getGuichets, getServices, exportAvisGroupes } from 'wasp/client/operations';
import { useAuth } from 'wasp/client/auth';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquareQuote, Inbox, Filter, RotateCcw, Calendar, User as UserIcon, HelpCircle, Layers, Building, Store, Download, Loader2, ChevronDown, FileSpreadsheet, } from 'lucide-react';
import { AmbientBackground } from '../components/AmbientBackground';
import { PageHeader } from '../components/PageHeader';
import { MotionCard } from '../components/MotionCard';
import { EmptyState } from '../components/EmptyState';
import { RequireAuth } from '../components/RequireAuth';
import { RequireEnterpriseRole } from "../components/RequireEnterpriseRole";
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from '../components/ui/select';
import { exportToCSV, exportToXLSX, formaterAvisPourCSV } from '../utils/exportData';
import { useBrand } from '../context/BrandContext';
import { useToast } from '../hooks/use-toast';
import { AIAnalysisBadge } from '../components/AIAnalysisBadge';
import { GrandVisuelNote } from '../components/NoteVisuel';
import { LigneReponse } from '../components/LigneReponse';
import { THEMES_LABELS } from '../components/AIAnalysisBadge';
import { PageShell, PageTopNav } from '../components/PageShell';
export const AvisPage = () => {
    const { data: user } = useAuth();
    const { toast } = useToast();
    // FIX 05/09 : la Direction ne voit jamais les verbatims — au lieu d'une
    // page vide avec message, redirection directe vers le tableau de bord
    // (les chiffres). L'entrée menu est également retirée pour ce rôle.
    if (user && user.role === 'DIRECTION') {
        return <Navigate to="/dashboard" replace/>;
    }
    // Filter States
    const [selectedAgenceId, setSelectedAgenceId] = useState(undefined);
    const [selectedGuichetId, setSelectedGuichetId] = useState(undefined);
    const [selectedServiceId, setSelectedServiceId] = useState(undefined);
    const [selectedScore, setSelectedScore] = useState(undefined);
    const [selectedTheme, setSelectedTheme] = useState(undefined);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    // Nom de l'entreprise + période pour l'en-tête des documents exportés.
    const { brandConfig } = useBrand();
    const metaDocs = {
        entreprise: brandConfig?.platform_name || 'Yeba',
        periode: startDate || endDate ? `Du ${startDate || '…'} au ${endDate || '…'}` : 'Toute période',
    };
    // Pagination state
    const [page, setPage] = useState(1);
    const PAGE_SIZE = 20;
    const isDirection = user?.role === 'DIRECTION';
    const effectiveAgenceId = isDirection
        ? selectedAgenceId
        : (user?.id_agence || undefined);
    // Queries for filters
    const { data: agences } = useQuery(getAgences, undefined, { enabled: isDirection });
    const { data: guichets } = useQuery(getGuichets, { id_agence: effectiveAgenceId || 0 }, { enabled: !!effectiveAgenceId });
    const { data: services } = useQuery(getServices);
    // Main avis query — paginée
    const queryArgs = {
        id_agence: effectiveAgenceId,
        id_guichet: selectedGuichetId,
        id_service: selectedServiceId,
        score: selectedScore,
        theme: selectedTheme,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        page,
        pageSize: PAGE_SIZE,
    };
    // CONFIDENTIALITÉ (RG16/RG17) : l'API renvoie 403 à getAvisGroupes pour la
    // DIRECTION — on ne lance même pas la query pour ce rôle (sinon react-query
    // marque la page en erreur). La page reste accessible à la Direction pour
    // les filtres/agences mais la liste d'avis n'est jamais chargée.
    const { data: avisData, isLoading } = useQuery(getAvisGroupes, queryArgs, { enabled: !isDirection });
    // Pages accumulées (on ajoute les nouvelles au fur et à mesure)
    const [allAvis, setAllAvis] = useState([]);
    const [lastQueryKey, setLastQueryKey] = useState('');
    // Clé de filtre pour détecter un changement de filtres → réinitialiser la liste
    const filterKey = JSON.stringify({
        effectiveAgenceId, selectedGuichetId, selectedServiceId, selectedScore, selectedTheme, startDate, endDate,
    });
    React.useEffect(() => {
        if (filterKey !== lastQueryKey) {
            // Les filtres ont changé : on réinitialise
            setPage(1);
            setAllAvis([]);
            setLastQueryKey(filterKey);
        }
    }, [filterKey, lastQueryKey]);
    React.useEffect(() => {
        if (avisData?.avis && avisData.avis.length > 0) {
            if (page === 1) {
                setAllAvis(avisData.avis);
            }
            else {
                setAllAvis((prev) => [...prev, ...avisData.avis]);
            }
        }
    }, [avisData?.avis, page]);
    const hasMore = avisData?.hasMore ?? false;
    const handleLoadMore = () => {
        setPage((p) => p + 1);
    };
    const handleResetFilters = () => {
        if (isDirection)
            setSelectedAgenceId(undefined);
        setSelectedGuichetId(undefined);
        setSelectedServiceId(undefined);
        setSelectedScore(undefined);
        setSelectedTheme(undefined);
        setStartDate('');
        setEndDate('');
        setPage(1);
        setAllAvis([]);
    };
    // Export CSV & XLSX — charge TOUS les avis filtrés (sans pagination)
    const [exporting, setExporting] = useState(false);
    const [exportingXLSX, setExportingXLSX] = useState(false);
    const handleExportCSV = useCallback(async () => {
        setExporting(true);
        try {
            const exportArgs = {
                id_agence: effectiveAgenceId,
                id_guichet: selectedGuichetId,
                id_service: selectedServiceId,
                startDate: startDate || undefined,
                endDate: endDate || undefined,
            };
            const raw = await exportAvisGroupes(exportArgs);
            const formatted = formaterAvisPourCSV(raw);
            const date = new Date().toISOString().split('T')[0];
            exportToCSV(formatted, `Yeba_Avis_${date}`, metaDocs);
            toast({ variant: 'success', title: 'Export CSV réussi', description: `${formatted.length} avis exportés.` });
        }
        catch (err) {
            toast({ variant: 'destructive', title: 'Erreur export', description: err.message });
        }
        finally {
            setExporting(false);
        }
    }, [effectiveAgenceId, selectedGuichetId, selectedServiceId, startDate, endDate, toast]);
    const handleExportXLSX = useCallback(async () => {
        setExportingXLSX(true);
        try {
            const exportArgs = {
                id_agence: effectiveAgenceId,
                id_guichet: selectedGuichetId,
                id_service: selectedServiceId,
                startDate: startDate || undefined,
                endDate: endDate || undefined,
            };
            const raw = await exportAvisGroupes(exportArgs);
            const formatted = formaterAvisPourCSV(raw);
            const date = new Date().toISOString().split('T')[0];
            await exportToXLSX([{ name: 'Avis Clients Yéba', data: formatted }], `Yeba_Avis_Complet_${date}`, metaDocs);
            toast({ variant: 'success', title: 'Export Excel réussi', description: `${formatted.length} avis exportés sous format XLSX.` });
        }
        catch (err) {
            toast({ variant: 'destructive', title: 'Erreur export Excel', description: err.message });
        }
        finally {
            setExportingXLSX(false);
        }
    }, [effectiveAgenceId, selectedGuichetId, selectedServiceId, startDate, endDate, toast]);
    // (Note visuelle unique importée de NoteVisuel.tsx : même emoji/libellé/
    // couleur que la collecte publique — voir GrandVisuelNote utilisé dans
    // les cartes ci-dessous et LigneReponse pour le détail par question.)
    return (<RequireEnterpriseRole>
      <RequireAuth>
      <AmbientBackground>
        <PageShell>
          <PageTopNav racine="Écoute Client" agence={user?.agence?.nom_agence || "Agence Principale"} actuel="Avis & Retours" onglets={[
            { label: 'Tableau synthétique', to: '/dashboard' },
            { label: 'Avis & Retours', to: '/avis' },
            { label: 'Kanban Incidents', to: '/alertes-taches' },
        ]}/>

          <PageHeader icon={MessageSquareQuote} eyebrow="Écoute client" title="Derniers retours clients" description="Consultez et filtrez les avis collectés en temps réel sur l'ensemble de vos points de contact." actions={<div className="flex items-center gap-3">
                {allAvis.length > 0 && (<span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                    {allAvis.length}{hasMore ? '+' : ''} retour{allAvis.length > 1 ? 's' : ''}
                  </span>)}
                <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={exporting || allAvis.length === 0} id="btn-export-csv" className="rounded-xl font-bold">
                  {exporting ? (<Loader2 className="size-4 animate-spin"/>) : (<Download className="size-4"/>)}
                  <span className="ml-1.5">CSV</span>
                </Button>
                <Button variant="outline" size="sm" onClick={handleExportXLSX} disabled={exportingXLSX || allAvis.length === 0} id="btn-export-xlsx" className="rounded-xl font-bold">
                  {exportingXLSX ? (<Loader2 className="size-4 animate-spin"/>) : (<FileSpreadsheet className="size-4"/>)}
                  <span className="ml-1.5">Excel (XLSX)</span>
                </Button>
              </div>}/>

          {/* Filters Dashboard Panel — flottant : reste accessible en scrollant
            la liste, potentiellement longue, des avis en dessous. */}
          <MotionCard interactive={false} className="sticky top-16 lg:top-4 z-30 p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-border pb-4 mb-5">
              <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Filter size={16}/> Filtres de recherche
              </h2>
              <Button type="button" variant="ghost" size="sm" onClick={handleResetFilters} className="text-xs text-muted-foreground hover:text-primary">
                <RotateCcw size={12}/> Réinitialiser
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {/* Agency Filter (DIRECTION only) */}
              {isDirection && (<div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                    <Building size={12}/> Agence
                  </label>
                  <Select value={selectedAgenceId ? String(selectedAgenceId) : 'ALL'} onValueChange={(v) => {
                setSelectedAgenceId(v !== 'ALL' ? Number(v) : undefined);
                setSelectedGuichetId(undefined);
            }}>
                    <SelectTrigger className="h-11 w-full font-semibold">
                      <SelectValue placeholder="Toutes les agences"/>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">Toutes les agences</SelectItem>
                      {agences?.map((a) => (<SelectItem key={a.id} value={String(a.id)}>{a.nom_agence} ({a.commune})</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>)}

              {/* Guichet Filter */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <Store size={12}/> Guichet / Caisse
                </label>
                <Select value={selectedGuichetId ? String(selectedGuichetId) : 'ALL'} onValueChange={(v) => setSelectedGuichetId(v !== 'ALL' ? Number(v) : undefined)} disabled={isDirection && !selectedAgenceId}>
                  <SelectTrigger className="h-11 w-full font-semibold">
                    <SelectValue placeholder={isDirection && !selectedAgenceId ? "Sélectionnez une agence d'abord" : 'Tous les guichets'}/>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">{isDirection && !selectedAgenceId ? "Sélectionnez une agence d'abord" : 'Tous les guichets'}</SelectItem>
                    {guichets?.map((g) => (<SelectItem key={g.id} value={String(g.id)}>{g.nom_guichet} ({g.type_guichet})</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>

              {/* Service Filter */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <Layers size={12}/> Opération / Service
                </label>
                <Select value={selectedServiceId ? String(selectedServiceId) : 'ALL'} onValueChange={(v) => setSelectedServiceId(v !== 'ALL' ? Number(v) : undefined)}>
                  <SelectTrigger className="h-11 w-full font-semibold">
                    <SelectValue placeholder="Toutes les opérations"/>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Toutes les opérations</SelectItem>
                    {services?.map((s) => (<SelectItem key={s.id} value={String(s.id)}>{s.libelle_service}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>

              {/* Score Filter */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <HelpCircle size={12}/> Évaluation (Note)
                </label>
                <Select value={selectedScore ? String(selectedScore) : 'ALL'} onValueChange={(v) => setSelectedScore(v !== 'ALL' ? Number(v) : undefined)}>
                  <SelectTrigger className="h-11 w-full font-semibold">
                    <SelectValue placeholder="Tous les scores"/>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Tous les scores</SelectItem>
                    <SelectItem value="5">🤩 Très satisfait (5/5)</SelectItem>
                    <SelectItem value="4">🙂 Satisfait (4/5)</SelectItem>
                    <SelectItem value="3">😐 Neutre (3/5)</SelectItem>
                    <SelectItem value="2">😟 Mécontent (2/5)</SelectItem>
                    <SelectItem value="1">😡 Très mécontent (1/5)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Theme Filter (étiquetage IA) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <Layers size={12}/> Étiquette IA
                </label>
                <Select value={selectedTheme ?? 'ALL'} onValueChange={(v) => setSelectedTheme(v !== 'ALL' ? v : undefined)}>
                  <SelectTrigger className="h-11 w-full font-semibold">
                    <SelectValue placeholder="Toutes les étiquettes"/>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Toutes les étiquettes</SelectItem>
                    {Object.entries(THEMES_LABELS).map(([code, label]) => (<SelectItem key={code} value={code}>{label}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>

              {/* Start Date Filter */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <Calendar size={12}/> Date Début
                </label>                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-11 font-semibold"/>
              </div>

              {/* End Date Filter */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <Calendar size={12}/> Date Fin
                </label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-11 font-semibold"/>
              </div>
            </div>
          </MotionCard>

          {/* Responses List or states */}
          {isLoading && page === 1 ? (<div className="space-y-4">
              {[0, 1, 2].map((i) => (<div key={i} className="h-28 animate-pulse rounded-2xl border border-border/70 bg-card-subtle/50"/>))}
            </div>) : allAvis.length === 0 ? (<EmptyState icon={Inbox} title="Aucun retour ne correspond à vos filtres" description="Essayez de modifier vos critères de filtrage ou de réinitialiser le panneau de recherche."/>) : (<>
              <div className="grid gap-5">
                <AnimatePresence initial={false}>
                  {allAvis.map((rep, i) => (<motion.div key={rep.id_soumission?.toString() ?? i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: Math.min(i * 0.02, 0.2) }}>
                      <MotionCard interactive={false} className="p-5 flex flex-col md:flex-row gap-5 shadow-sm border-border/70">
                        <div className="space-y-3 flex-1">
                          {/* Note globale — ou mention « avis textuel » quand
                    l'avis ne contient aucune question notée
                    (texte libre uniquement : pas de fausse note). */}
                          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/60 bg-muted/40 p-4">
                            {rep.score_moyen !== null && rep.score_moyen !== undefined ? (<GrandVisuelNote score={Math.round(rep.score_moyen)}/>) : (<span className="flex items-center gap-2 text-sm font-bold text-primary">
                                <MessageSquareQuote className="size-5"/>
                                Avis textuel — sans note chiffrée
                              </span>)}
                            {rep.service && (<span className="bg-primary/5 dark:bg-primary/10 border border-primary/10 text-primary text-[10px] font-semibold uppercase tracking-widest px-2.5 py-1 rounded-md">
                                {rep.service.libelle_service}
                              </span>)}
                          </div>

                          {/* Détail par question — chaque réponse affichée selon
                    SON type (note, Oui/Non, choix, texte verbatim),
                    jamais en fausse note sur 5. */}
                          {rep.reponses?.length > 0 && (<ul className="space-y-2">
                              {rep.reponses.map((r) => (<LigneReponse key={r.id.toString()} r={r} texteGroupe={rep.commentaire_texte}/>))}
                            </ul>)}

                          {/* Comment text */}
                          <p className="text-sm md:text-base font-medium text-foreground pl-1 leading-relaxed">
                            {rep.commentaire_texte ? (<span>"{rep.commentaire_texte}"</span>) : (<span className="text-muted-foreground italic text-xs font-normal">Aucun commentaire écrit</span>)}
                          </p>

                          {/* Analyse Sémantique IA (DeepSeek) */}
                          <AIAnalysisBadge analyse={rep.analyseIA}/>

                          {rep.agent && (<div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted w-fit px-2.5 py-1 rounded-lg border border-border/40">
                              <UserIcon size={12} className="text-primary"/>
                              <span className="font-semibold text-muted-foreground">Agent en service :</span>
                              <span className="font-bold text-foreground">
                                {[rep.agent.prenom, rep.agent.nom].filter(Boolean).join(' ') || rep.agent.username}
                              </span>
                            </div>)}
                        </div>

                        {/* Metadata column */}
                        <div className="shrink-0 flex md:flex-col justify-between items-center md:items-end text-xs text-muted-foreground border-t md:border-t-0 border-border/50 pt-3 md:pt-0">
                          <div className="text-left md:text-right">
                            <p className="font-bold text-foreground flex items-center md:justify-end gap-1">
                              <Store size={12}/> {rep.guichet?.nom_guichet || 'Guichet'}
                            </p>
                            {isDirection && rep.agence && (<p className="text-[10px] font-semibold text-muted-foreground">
                                {rep.agence.nom_agence}
                              </p>)}
                          </div>
                          <p className="mt-1 font-medium">{new Date(rep.date_reponse).toLocaleString()}</p>
                        </div>
                      </MotionCard>
                    </motion.div>))}
                </AnimatePresence>
              </div>

              {/* Bouton "Charger plus" */}
              {(hasMore || isLoading) && (<div className="flex justify-center pt-2">
                  <Button variant="outline" onClick={handleLoadMore} disabled={isLoading} id="btn-charger-plus" className="gap-2">
                    {isLoading ? (<Loader2 className="size-4 animate-spin"/>) : (<ChevronDown className="size-4"/>)}
                    {isLoading ? 'Chargement...' : `Charger plus d'avis`}
                  </Button>
                </div>)}

              {!hasMore && allAvis.length > 0 && (<p className="text-center text-xs text-muted-foreground py-2">
                  — {allAvis.length} avis affichés — fin de la liste —
                </p>)}
            </>)}
        </PageShell>
      </AmbientBackground>
    </RequireAuth>
      </RequireEnterpriseRole>);
};
//# sourceMappingURL=AvisPage.jsx.map