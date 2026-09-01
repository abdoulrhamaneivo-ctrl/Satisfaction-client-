import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useQuery, useAction } from 'wasp/client/operations';
import { getPlatformEntreprise, suspendreEntreprise, reactiverEntreprise, renvoyerInvitation, changerLimitesEntreprise, } from 'wasp/client/operations';
import { ArrowLeft, Building2, Users, MapPin, MessageSquare, AlertTriangle, MailCheck, Clock, PauseCircle, PlayCircle, Pencil, Mail, Activity, X, Check, } from 'lucide-react';
import { StatusChip, PlanChip } from './PlatformOverviewPage';
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';
const fmtDateTime = (d) => d ? new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';
const ACTION_LABELS = {
    'entreprise.create': 'a créé l’entreprise',
    'entreprise.suspend': 'a suspendu l’entreprise',
    'entreprise.reactivate': 'a réactivé l’entreprise',
    'entreprise.update_limits': 'a modifié les limites',
    'user.invite': 'a invité un utilisateur',
    'agence.create': 'a créé une agence',
    'guichet.create': 'a créé un guichet',
    'branding.update': 'a mis à jour le branding',
    'invitation.used': 'a activé son compte',
    'invitation.create': 'a envoyé une invitation',
};
/** Détail d'une entreprise cliente (Doc 12 §5). */
export default function CompanyDetailsPage({ id }) {
    const navigate = useNavigate();
    const { data: e, isLoading, error } = useQuery(getPlatformEntreprise, { id });
    const suspendre = useAction(suspendreEntreprise);
    const reactiver = useAction(reactiverEntreprise);
    const renvoyerInvitationFn = useAction(renvoyerInvitation);
    const changerLimites = useAction(changerLimitesEntreprise);
    const [modalSuspendre, setModalSuspendre] = useState(false);
    const [motif, setMotif] = useState('');
    const [modalLimites, setModalLimites] = useState(false);
    const [limites, setLimites] = useState({ agences: 0, utilisateurs: 0, guichets: 0 });
    const [message, setMessage] = useState(null);
    const [erreurAction, setErreurAction] = useState(null);
    if (isLoading)
        return <div className="grid min-h-[50vh] place-items-center text-sm text-muted-foreground">Chargement…</div>;
    if (error || !e) {
        return (<div className="mx-auto max-w-2xl rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center">
        <p className="font-bold text-destructive">Entreprise introuvable.</p>
        <Link to="/platform/entreprises" className="mt-3 inline-block text-sm font-bold text-primary hover:underline">← Retour à la liste</Link>
      </div>);
    }
    const tiles = [
        { label: 'Agences', value: e._count.agences, limite: e.limite_agences, icon: MapPin },
        { label: 'Utilisateurs', value: e._count.utilisateurs, limite: e.limite_utilisateurs, icon: Users },
        { label: 'Guichets', value: e.total_guichets, limite: e.limite_guichets, icon: Building2 },
    ];
    const ouvrirSuspendre = () => { setMotif(''); setErreurAction(null); setModalSuspendre(true); };
    const ouvrirLimites = () => {
        setLimites({ agences: e.limite_agences, utilisateurs: e.limite_utilisateurs, guichets: e.limite_guichets });
        setErreurAction(null);
        setModalLimites(true);
    };
    return (<div className="mx-auto max-w-5xl space-y-6">
      <Link to="/platform/entreprises" className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4"/> Entreprises
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-foreground md:text-3xl">{e.nom_entreprise}</h1>
            <StatusChip status={e.status}/>
            <PlanChip plan={e.plan}/>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Créée le {fmtDate(e.date_creation_compte)}
            {e.status === 'SUSPENDED' && e.motif_suspension ? ` · Suspendue : ${e.motif_suspension}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {e.status === 'SUSPENDED' ? (<button onClick={async () => {
                try {
                    const r = await reactiver({ id_entreprise: e.id });
                    setMessage(r.message);
                }
                catch (err) {
                    setErreurAction(err?.message);
                }
            }} className="inline-flex items-center gap-2 rounded-xl bg-success px-4 py-2.5 text-sm font-bold text-white hover:bg-success/90">
              <PlayCircle className="size-4"/> Réactiver
            </button>) : (<button onClick={ouvrirSuspendre} className="inline-flex items-center gap-2 rounded-xl border border-destructive/40 px-4 py-2.5 text-sm font-bold text-destructive hover:bg-destructive/10">
              <PauseCircle className="size-4"/> Suspendre
            </button>)}
          <button onClick={ouvrirLimites} className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-bold text-foreground hover:bg-muted">
            <Pencil className="size-4"/> Limites & plan
          </button>
          {e.invitation_active && (<button onClick={async () => {
                try {
                    const r = await renvoyerInvitationFn({ id_entreprise: e.id });
                    setMessage(r.message);
                }
                catch (err) {
                    setErreurAction(err?.message);
                }
            }} className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-bold text-foreground hover:bg-muted">
              <Mail className="size-4"/> Renvoyer l'invitation
            </button>)}
        </div>
      </header>

      {message && (<div className="flex items-center gap-2 rounded-2xl border border-success/30 bg-success/10 p-4 text-sm font-bold text-success">
          <Check className="size-4"/> {message}
          <button onClick={() => setMessage(null)} className="ml-auto"><X className="size-4"/></button>
        </div>)}
      {erreurAction && (<div className="flex items-center gap-2 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm font-bold text-destructive">
          <AlertTriangle className="size-4"/> {erreurAction}
          <button onClick={() => setErreurAction(null)} className="ml-auto"><X className="size-4"/></button>
        </div>)}

      {/* Tiles */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {tiles.map(({ label, value, limite, icon: Icon }) => {
            const sature = value >= limite;
            return (<div key={label} className="rounded-2xl border border-border/80 bg-card p-5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{label}</span>
                <Icon className={`size-4 ${sature ? 'text-destructive' : 'text-primary'}`}/>
              </div>
              <p className="mt-2 text-3xl font-black tracking-tight text-foreground">
                {value} <span className="text-base font-bold text-muted-foreground">/ {limite}</span>
              </p>
              {sature && (<p className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold text-destructive">
                  <AlertTriangle className="size-3"/> Limite du plan atteinte
                </p>)}
            </div>);
        })}
      </div>

      {/* Volume avis + admin */}
      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-2xl border border-border/80 bg-card p-6">
          <h2 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Informations</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted-foreground">Administrateur</dt>
              <dd className="text-right font-bold text-foreground">
                {e.admin ? `${e.admin.prenom} ${e.admin.nom}` : '—'}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted-foreground">Email</dt>
              <dd className="text-right font-bold text-foreground">{e.admin?.email || '—'}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted-foreground">Avis collectés</dt>
              <dd className="inline-flex items-center gap-1 font-bold text-foreground">
                <MessageSquare className="size-3.5"/> {new Intl.NumberFormat('fr-FR').format(e.total_avis)}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted-foreground">Date d'abonnement</dt>
              <dd className="font-bold text-foreground">{fmtDate(e.date_debut_abonnement)}</dd>
            </div>
            {e.invitation_active && (<div className="flex items-center gap-2 rounded-xl bg-info/10 p-3 text-xs font-bold text-info">
                <MailCheck className="size-4 shrink-0"/>
                Invitation en attente d'activation (expire sous 24 h).
              </div>)}
          </dl>
        </section>

        <section className="rounded-2xl border border-border/80 bg-card p-6">
          <h2 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Activité récente</h2>
          {e.activite.length === 0 ? (<p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="size-4"/> Aucune activité journalisée.
            </p>) : (<ul className="mt-4 space-y-3">
              {e.activite.map((a) => (<li key={String(a.id)} className="flex items-start gap-3 text-sm">
                  <Activity className="mt-0.5 size-4 shrink-0 text-muted-foreground"/>
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground">
                      {a.actor_role ?? 'SYSTEM'} {ACTION_LABELS[a.action] ?? a.action}
                    </p>
                    <p className="text-xs text-muted-foreground">{fmtDateTime(a.created_at)}</p>
                  </div>
                </li>))}
            </ul>)}
        </section>
      </div>

      {/* Modal Suspendre */}
      {modalSuspendre && (<div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-xl">
            <h3 className="flex items-center gap-2 text-lg font-black text-foreground">
              <PauseCircle className="size-5 text-destructive"/> Suspendre l'entreprise
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Tous les comptes de <strong>{e.nom_entreprise}</strong> perdront l'accès immédiatement.
              Les données sont conservées.
            </p>
            <label className="mt-4 block text-xs font-black uppercase tracking-widest text-muted-foreground">
              Motif (obligatoire)
            </label>
            <textarea value={motif} onChange={(ev) => setMotif(ev.target.value)} rows={3} placeholder="Ex. impayé de facture, demande du client…" className="mt-1.5 w-full rounded-xl border border-border bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"/>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setModalSuspendre(false)} className="rounded-xl px-4 py-2.5 text-sm font-bold text-muted-foreground hover:bg-muted">
                Annuler
              </button>
              <button onClick={async () => {
                try {
                    const r = await suspendre({ id_entreprise: e.id, motif });
                    setModalSuspendre(false);
                    setMessage(r.message);
                    navigate(0);
                }
                catch (err) {
                    setErreurAction(err?.message);
                }
            }} disabled={motif.trim().length < 5} className="rounded-xl bg-destructive px-4 py-2.5 text-sm font-bold text-white hover:bg-destructive/90 disabled:opacity-50">
                Confirmer la suspension
              </button>
            </div>
          </div>
        </div>)}

      {/* Modal Limites */}
      {modalLimites && (<div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-xl">
            <h3 className="text-lg font-black text-foreground">Limites & plan</h3>
            <div className="mt-4 space-y-3">
              <label className="block text-xs font-black uppercase tracking-widest text-muted-foreground">Plan</label>
              <select value={e.plan} onChange={(ev) => { /* plan modifiable via changerLimites plan */ window.__newPlan = ev.target.value; }} className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm" id="select-plan" defaultValue={e.plan}>
                <option value="STARTER">Starter</option>
                <option value="BUSINESS">Business</option>
                <option value="ENTERPRISE">Enterprise</option>
              </select>
              {[['agences', 'Agences'], ['utilisateurs', 'Utilisateurs'], ['guichets', 'Guichets']].map(([key, label]) => (<div key={key}>
                  <label className="block text-xs font-black uppercase tracking-widest text-muted-foreground">{label}</label>
                  <input type="number" min={1} value={limites[key]} onChange={(ev) => setLimites((l) => ({ ...l, [key]: Number(ev.target.value) }))} className="mt-1 h-10 w-full rounded-xl border border-border bg-background px-3 text-sm"/>
                </div>))}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setModalLimites(false)} className="rounded-xl px-4 py-2.5 text-sm font-bold text-muted-foreground hover:bg-muted">
                Annuler
              </button>
              <button onClick={async () => {
                try {
                    const planEl = document.getElementById('select-plan');
                    const r = await changerLimites({
                        id_entreprise: e.id,
                        limite_agences: limites.agences,
                        limite_utilisateurs: limites.utilisateurs,
                        limite_guichets: limites.guichets,
                        plan: planEl?.value || undefined,
                    });
                    setModalLimites(false);
                    setMessage(r.message);
                    navigate(0);
                }
                catch (err) {
                    setErreurAction(err?.message);
                }
            }} className="rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary/90">
                Enregistrer
              </button>
            </div>
          </div>
        </div>)}
    </div>);
}
//# sourceMappingURL=CompanyDetailsPage.jsx.map