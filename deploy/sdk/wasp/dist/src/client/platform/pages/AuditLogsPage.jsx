import { useState, useEffect } from 'react';
import { useQuery } from 'wasp/client/operations';
import { getPlatformAudit } from 'wasp/client/operations';
import { ScrollText, Filter } from 'lucide-react';
const fmtDateTime = (d) => new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
const ACTION_LABELS = {
    'entreprise.create': 'Création entreprise',
    'entreprise.suspend': 'Suspension entreprise',
    'entreprise.reactivate': 'Réactivation entreprise',
    'entreprise.update_limits': 'Modification limites',
    'user.invite': 'Invitation utilisateur',
    'user.suspend': 'Désactivation compte',
    'superadmin.invite': 'Invitation SUPER_ADMIN',
    'invitation.create': 'Envoi invitation',
    'invitation.used': 'Invitation utilisée (compte activé)',
    'agence.create': 'Création agence',
    'guichet.create': 'Création guichet',
    'branding.update': 'Mise à jour branding',
};
const ACTIONS_FILTRE = [
    '', 'entreprise.create', 'entreprise.suspend', 'entreprise.reactivate',
    'entreprise.update_limits', 'invitation.create', 'invitation.used',
    'superadmin.invite', 'user.suspend',
];
/** Journal d'audit global (Doc 12 §1 — /platform/audit). */
export default function AuditLogsPage() {
    const [action, setAction] = useState('');
    const [actionDebounced, setActionDebounced] = useState('');
    useEffect(() => {
        const t = setTimeout(() => setActionDebounced(action), 300);
        return () => clearTimeout(t);
    }, [action]);
    const { data, isLoading } = useQuery(getPlatformAudit, {
        action: actionDebounced || undefined,
    });
    return (<div className="mx-auto max-w-5xl space-y-6">
      <header>
        <h1 className="text-2xl font-black tracking-tight text-foreground md:text-3xl">Audit</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Journal des actions sensibles — acteur, action, horodatage. Immuable.
        </p>
      </header>

      <div className="flex items-center gap-3 rounded-2xl border border-border/80 bg-card p-3">
        <Filter className="size-4 text-muted-foreground"/>
        <select value={action} onChange={(e) => setAction(e.target.value)} className="h-10 flex-1 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40" aria-label="Filtrer par action">
          {ACTIONS_FILTRE.map((a) => (<option key={a} value={a}>{a === '' ? 'Toutes les actions' : ACTION_LABELS[a] ?? a}</option>))}
        </select>
      </div>

      {isLoading ? (<div className="grid min-h-[40vh] place-items-center text-sm text-muted-foreground">Chargement…</div>) : !data || data.logs.length === 0 ? (<div className="rounded-2xl border border-dashed border-border p-12 text-center">
          <ScrollText className="mx-auto size-10 text-muted-foreground/40"/>
          <p className="mt-3 text-sm text-muted-foreground">Aucune entrée d'audit pour ce filtre.</p>
        </div>) : (<div className="overflow-hidden rounded-2xl border border-border/80 bg-card">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Date</th>
                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Acteur</th>
                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Action</th>
                <th className="hidden px-4 py-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground md:table-cell">Ressource</th>
                <th className="hidden px-4 py-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground lg:table-cell">IP</th>
              </tr>
            </thead>
            <tbody>
              {data.logs.map((l) => (<tr key={String(l.id)} className="border-b border-border/50 last:border-0">
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">{fmtDateTime(l.created_at)}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      {l.actor_role ?? '—'}
                    </span>
                    {l.acteur?.email && (<span className="ml-2 hidden text-xs text-muted-foreground lg:inline">{l.acteur.email}</span>)}
                  </td>
                  <td className="px-4 py-3 font-bold text-foreground">{ACTION_LABELS[l.action] ?? l.action}</td>
                  <td className="hidden px-4 py-3 text-xs text-muted-foreground md:table-cell">
                    {l.resource}{l.resource_id ? ` #${l.resource_id}` : ''}
                  </td>
                  <td className="hidden px-4 py-3 font-mono text-xs text-muted-foreground lg:table-cell">{l.ip ?? '—'}</td>
                </tr>))}
            </tbody>
          </table>
        </div>)}

      {data?.hasMore && (<p className="text-center text-xs text-muted-foreground">
          Entrées plus anciennes disponibles (pagination par curseur à venir).
        </p>)}
    </div>);
}
//# sourceMappingURL=AuditLogsPage.jsx.map