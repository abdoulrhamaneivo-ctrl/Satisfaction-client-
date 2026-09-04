import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { useQuery } from 'wasp/client/operations';
import { getPlatformEntreprises } from 'wasp/client/operations';
import { Search, Plus, ChevronRight, Building2, Users, MapPin } from 'lucide-react';
import { StatusChip, PlanChip } from './PlatformOverviewPage';
/** Liste des entreprises clientes (Doc 12 §4). Cartes, pas de tableau Bootstrap. */
export default function CompaniesPage() {
    const [search, setSearch] = useState('');
    const [searchDebounced, setSearchDebounced] = useState('');
    const [status, setStatus] = useState('');
    const [plan, setPlan] = useState('');
    // Debounce recherche (300 ms) — pas de requête par frappe
    useEffect(() => {
        const t = setTimeout(() => setSearchDebounced(search), 300);
        return () => clearTimeout(t);
    }, [search]);
    const { data, isLoading, refetch } = useQuery(getPlatformEntreprises, {
        search: searchDebounced || undefined,
        status: status || undefined,
        plan: plan || undefined,
    });
    return (<div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground md:text-3xl">Entreprises</h1>
          <p className="mt-1 text-sm text-muted-foreground">Gérez les organisations utilisant Yeba.</p>
        </div>
        <Link to="/platform/entreprises/nouvelle" className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-sm hover:bg-primary/90">
          <Plus className="size-4"/> Nouvelle entreprise
        </Link>
      </header>

      {/* Barre d'outils */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border/80 bg-card p-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"/>
          <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher une entreprise…" className="h-10 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"/>
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-10 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40" aria-label="Filtrer par statut">
          <option value="">Tous statuts</option>
          <option value="ACTIVE">Active</option>
          <option value="TRIAL">Essai</option>
          <option value="SUSPENDED">Suspendue</option>
          <option value="CANCELLED">Résiliée</option>
        </select>
        <select value={plan} onChange={(e) => setPlan(e.target.value)} className="h-10 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40" aria-label="Filtrer par plan">
          <option value="">Tous plans</option>
          <option value="STARTER">Starter</option>
          <option value="BUSINESS">Business</option>
          <option value="ENTERPRISE">Enterprise</option>
        </select>
      </div>

      {/* Liste */}
      {isLoading ? (<div className="grid min-h-[40vh] place-items-center text-sm text-muted-foreground">Chargement…</div>) : !data || data.entreprises.length === 0 ? (<div className="rounded-2xl border border-dashed border-border p-12 text-center">
          <Building2 className="mx-auto size-10 text-muted-foreground/40"/>
          <p className="mt-3 text-sm text-muted-foreground">
            {searchDebounced || status || plan
                ? 'Aucune entreprise ne correspond aux filtres.'
                : 'Aucune entreprise cliente. Créez la première !'}
          </p>
        </div>) : (<div className="grid gap-3">
          {data.entreprises.map((e) => (<Link key={e.id} to={`/platform/entreprises/${e.id}`} className="hover-lift group flex items-center justify-between gap-4 rounded-2xl border border-border/80 bg-card p-5">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate text-base font-bold text-foreground">
                    {e.nom_court || e.nom_entreprise}
                  </span>
                  <StatusChip status={e.status}/>
                  <PlanChip plan={e.plan}/>
                </div>
                <p className="mt-1 truncate text-xs text-muted-foreground">{e.email_administratif || '—'}</p>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="size-3.5"/> {e._count.agences} agence{e._count.agences > 1 ? 's' : ''}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Users className="size-3.5"/> {e._count.utilisateurs} utilisateur{e._count.utilisateurs > 1 ? 's' : ''}
                  </span>
                </div>
              </div>
              <ChevronRight className="size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1"/>
            </Link>))}


        </div>)}
    </div>);
}
