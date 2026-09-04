import { useState } from 'react';
import { RequirePlatformRole } from '../../components/RequirePlatformRole';
import { Link, useNavigate } from 'react-router';
import { useAction } from 'wasp/client/operations';
import { creerEntreprise } from 'wasp/client/operations';
import { ArrowLeft, ArrowRight, Building2, UserCog, Layers, CheckCircle2, Loader2, Plus, PartyPopper } from 'lucide-react';
const PLANS = [
    { id: 'STARTER', label: 'Starter', agences: 5, utilisateurs: 50, guichets: 25, features: ['Logo', 'Couleur primaire', 'Messages personnalisés'] },
    { id: 'BUSINESS', label: 'Business', agences: 50, utilisateurs: 500, guichets: 200, features: ['Charte complète', 'QR Designer', 'Surcharge par guichet'] },
    { id: 'ENTERPRISE', label: 'Enterprise', agences: 9999, utilisateurs: 9999, guichets: 9999, features: ['Illimité', 'Modèles QR avancés', 'Sans marque Yeba'] },
];
const ETAPES = ['Entreprise', 'Admin', 'Plan', 'Confirmation'];
const inputCls = 'mt-1.5 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40';
const labelCls = 'block text-xs font-black uppercase tracking-widest text-muted-foreground';
/** Wizard de création d'entreprise (Doc 12 §6) — 4 étapes, rien créé avant la fin. */
export default function CreateCompanyPage() {
    return (<RequirePlatformRole>
      <CreateCompanyInner />
    </RequirePlatformRole>);
}
function CreateCompanyInner() {
    const navigate = useNavigate();
    const creer = useAction(creerEntreprise);
    const [etape, setEtape] = useState(0);
    const [envoi, setEnvoi] = useState(false);
    const [erreur, setErreur] = useState(null);
    const [succes, setSucces] = useState(null);
    const [form, setForm] = useState({
        nom_entreprise: '',
        nom_court: '',
        email_administratif: '',
        telephone: '',
        pays: "Cote d'Ivoire",
        admin_prenom: '',
        admin_nom: '',
        admin_email: '',
        admin_telephone: '',
        plan: 'BUSINESS',
        limite_agences: PLANS[1].agences,
        limite_utilisateurs: PLANS[1].utilisateurs,
        limite_guichets: PLANS[1].guichets,
    });
    const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
    const emailValide = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.admin_email || form.email_administratif || '');
    const etape1Ok = form.nom_entreprise.trim().length >= 2 && emailValide;
    const etape2Ok = form.admin_prenom.trim() && form.admin_nom.trim() && emailValide;
    const planCourant = PLANS.find((p) => p.id === form.plan) ?? PLANS[1];
    async function soumettre() {
        setEnvoi(true);
        setErreur(null);
        try {
            const r = await creer({
                entreprise: {
                    nom_entreprise: form.nom_entreprise,
                    nom_court: form.nom_court || undefined,
                    email_administratif: form.email_administratif || form.admin_email,
                    telephone: form.telephone || undefined,
                    pays: form.pays,
                },
                admin: {
                    prenom: form.admin_prenom,
                    nom: form.admin_nom,
                    email: form.admin_email || form.email_administratif,
                    telephone: form.admin_telephone || undefined,
                },
                plan: form.plan,
                limite_agences: form.limite_agences,
                limite_utilisateurs: form.limite_utilisateurs,
                limite_guichets: form.limite_guichets,
            });
            setSucces({ id_entreprise: r.entreprise.id, email_envoye: r.email_envoye, message: r.message });
        }
        catch (e) {
            setErreur(e?.message ?? 'Erreur inconnue.');
        }
        finally {
            setEnvoi(false);
        }
    }
    // ── Écran de succès ──
    if (succes) {
        const checks = [
            'Entreprise créée (statut ACTIVE)',
            'Compte administrateur (DIRECTION)',
            'Invitation sécurisée générée (expire dans 24 h)',
            succes.email_envoye ? 'Email d’activation envoyé' : 'Email en échec — utilisez « Renvoyer l’invitation »',
            'Action journalisée (AuditLog)',
        ];
        return (<div className="mx-auto max-w-xl py-10 text-center">
        <PartyPopper className="mx-auto size-14 text-warning"/>
        <h1 className="mt-4 text-2xl font-black tracking-tight text-foreground">Entreprise créée 🎉</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {succes.message ?? `L'administrateur recevra un email pour activer son compte.`}
        </p>
        <div className="mt-8 space-y-3 rounded-2xl border border-border/80 bg-card p-6 text-left">
          {checks.map((c, i) => (<div key={i} className="flex items-center gap-3 text-sm font-semibold text-foreground">
              <CheckCircle2 className="size-5 shrink-0 text-success"/> {c}
            </div>))}
        </div>
        <div className="mt-8 flex justify-center gap-3">
          <Link to={`/platform/entreprises/${succes.id_entreprise}`} className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground hover:bg-primary/90">
            Voir l'entreprise <ArrowRight className="size-4"/>
          </Link>
          <button onClick={() => { setSucces(null); setEtape(0); setForm((f) => ({ ...f, nom_entreprise: '', nom_court: '', admin_prenom: '', admin_nom: '' })); }} className="inline-flex items-center gap-2 rounded-xl border border-border px-5 py-3 text-sm font-bold text-foreground hover:bg-muted">
            <Plus className="size-4"/> Créer une autre
          </button>
        </div>
      </div>);
    }
    return (<div className="mx-auto max-w-2xl space-y-6">
      <Link to="/platform/entreprises" className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4"/> Entreprises
      </Link>

      <header>
        <h1 className="text-2xl font-black tracking-tight text-foreground md:text-3xl">Nouvelle entreprise</h1>
        <p className="mt-1 text-sm text-muted-foreground">Créez le tenant et son administrateur principal.</p>
      </header>

      {/* Stepper */}
      <ol className="flex items-center gap-2" aria-label="Progression du wizard">
        {ETAPES.map((label, i) => (<li key={label} className="flex flex-1 items-center gap-2">
            <span className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-black ${i < etape ? 'bg-success text-white' : i === etape ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
              {i < etape ? '✓' : `0${i + 1}`}
            </span>
            <span className={`hidden text-xs font-bold uppercase tracking-widest sm:block ${i === etape ? 'text-foreground' : 'text-muted-foreground'}`}>{label}</span>
            {i < ETAPES.length - 1 && <span className={`h-0.5 flex-1 rounded ${i < etape ? 'bg-success' : 'bg-border'}`}/>}
          </li>))}
      </ol>

      {erreur && (<div className="flex items-center gap-2 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm font-bold text-destructive">
          <AlertIcon /> {erreur}
        </div>)}

      <div className="rounded-2xl border border-border/80 bg-card p-6 md:p-8">
        {/* ── ÉTAPE 1 : Entreprise ── */}
        {etape === 0 && (<section className="space-y-4">
            <div className="flex items-center gap-2">
              <Building2 className="size-5 text-primary"/>
              <h2 className="text-lg font-black text-foreground">L'entreprise</h2>
            </div>
            <div>
              <label className={labelCls} htmlFor="w-nom">Nom de l'entreprise *</label>
              <input id="w-nom" className={inputCls} value={form.nom_entreprise} onChange={(e) => set('nom_entreprise', e.target.value)} placeholder="La Poste de Côte d'Ivoire"/>
            </div>
            <div>
              <label className={labelCls} htmlFor="w-court">Nom court</label>
              <input id="w-court" className={inputCls} value={form.nom_court} onChange={(e) => set('nom_court', e.target.value)} placeholder="La Poste CI"/>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelCls} htmlFor="w-email">Email administratif</label>
                <input id="w-email" type="email" className={inputCls} value={form.email_administratif} onChange={(e) => set('email_administratif', e.target.value)} placeholder="contact@entreprise.ci"/>
              </div>
              <div>
                <label className={labelCls} htmlFor="w-tel">Téléphone</label>
                <input id="w-tel" type="tel" className={inputCls} value={form.telephone} onChange={(e) => set('telephone', e.target.value)} placeholder="+225 …"/>
              </div>
            </div>
          </section>)}

        {/* ── ÉTAPE 2 : Admin ── */}
        {etape === 1 && (<section className="space-y-4">
            <div className="flex items-center gap-2">
              <UserCog className="size-5 text-primary"/>
              <h2 className="text-lg font-black text-foreground">Administrateur principal</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelCls} htmlFor="w-prenom">Prénom *</label>
                <input id="w-prenom" className={inputCls} value={form.admin_prenom} onChange={(e) => set('admin_prenom', e.target.value)}/>
              </div>
              <div>
                <label className={labelCls} htmlFor="w-nom-admin">Nom *</label>
                <input id="w-nom-admin" className={inputCls} value={form.admin_nom} onChange={(e) => set('admin_nom', e.target.value)}/>
              </div>
            </div>
            <div>
              <label className={labelCls} htmlFor="w-email-admin">Email professionnel *</label>
              <input id="w-email-admin" type="email" className={inputCls} value={form.admin_email || form.email_administratif} onChange={(e) => { set('admin_email', e.target.value); set('email_administratif', e.target.value); }}/>
            </div>
            <div>
              <label className={labelCls} htmlFor="w-tel-admin">Téléphone</label>
              <input id="w-tel-admin" type="tel" className={inputCls} value={form.admin_telephone} onChange={(e) => set('admin_telephone', e.target.value)}/>
            </div>
            <div className="flex items-start gap-2 rounded-xl bg-info/10 p-3 text-xs font-semibold text-info">
              <MailCheckIcon />
              Un email d'activation sera envoyé automatiquement à cette adresse. Aucun mot de passe n'est transmis par email.
            </div>
          </section>)}

        {/* ── ÉTAPE 3 : Plan ── */}
        {etape === 2 && (<section className="space-y-4">
            <div className="flex items-center gap-2">
              <Layers className="size-5 text-primary"/>
              <h2 className="text-lg font-black text-foreground">Choisissez le plan</h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {PLANS.map((p) => {
                const actif = form.plan === p.id;
                return (<button key={p.id} type="button" onClick={() => setForm((f) => ({ ...f, plan: p.id, limite_agences: p.agences, limite_utilisateurs: p.utilisateurs, limite_guichets: p.guichets }))} className={`rounded-2xl border-2 p-4 text-left transition-colors ${actif ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-black uppercase tracking-widest text-foreground">{p.label}</span>
                      {actif && <CheckCircle2 className="size-4 text-primary"/>}
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {p.agences >= 9999 ? 'Illimité' : `${p.agences} agences`}
                      <br />
                      {p.utilisateurs >= 9999 ? 'Illimité' : `${p.utilisateurs} users`}
                    </p>
                    <ul className="mt-2 space-y-1">
                      {p.features.map((f) => (<li key={f} className="text-[11px] font-semibold text-muted-foreground">• {f}</li>))}
                    </ul>
                  </button>);
            })}
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className={labelCls} htmlFor="w-l-agences">Limite agences</label>
                <input id="w-l-agences" type="number" min={1} className={inputCls} value={form.limite_agences} onChange={(e) => set('limite_agences', Number(e.target.value))}/>
              </div>
              <div>
                <label className={labelCls} htmlFor="w-l-users">Limite utilisateurs</label>
                <input id="w-l-users" type="number" min={1} className={inputCls} value={form.limite_utilisateurs} onChange={(e) => set('limite_utilisateurs', Number(e.target.value))}/>
              </div>
              <div>
                <label className={labelCls} htmlFor="w-l-guichets">Limite guichets</label>
                <input id="w-l-guichets" type="number" min={1} className={inputCls} value={form.limite_guichets} onChange={(e) => set('limite_guichets', Number(e.target.value))}/>
              </div>
            </div>
          </section>)}

        {/* ── ÉTAPE 4 : Confirmation ── */}
        {etape === 3 && (<section className="space-y-4">
            <h2 className="text-lg font-black text-foreground">Vérification</h2>
            <dl className="space-y-2 rounded-2xl bg-muted/50 p-5 text-sm">
              <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Entreprise</dt><dd className="text-right font-bold text-foreground">{form.nom_entreprise}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Administrateur</dt><dd className="text-right font-bold text-foreground">{form.admin_prenom} {form.admin_nom}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Email</dt><dd className="text-right font-bold text-foreground">{form.admin_email || form.email_administratif}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Plan</dt><dd className="text-right font-bold text-foreground">{planCourant.label}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Limites</dt><dd className="text-right font-bold text-foreground">{form.limite_agences} agences · {form.limite_utilisateurs} users · {form.limite_guichets} guichets</dd></div>
            </dl>
            <p className="text-xs font-semibold text-muted-foreground">À la création :</p>
            <ul className="space-y-1.5 text-sm text-muted-foreground">
              {['Compte entreprise (statut ACTIVE)', 'Compte administrateur (DIRECTION)', 'Invitation sécurisée par email (24 h)', 'Action journalisée (AuditLog)'].map((x) => (<li key={x} className="flex items-center gap-2"><CheckCircle2 className="size-4 text-success"/> {x}</li>))}
            </ul>
          </section>)}

        {/* Navigation */}
        <div className="mt-8 flex items-center justify-between border-t border-border/60 pt-5">
          {etape > 0 ? (<button onClick={() => setEtape(etape - 1)} className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-muted-foreground hover:bg-muted">
              <ArrowLeft className="size-4"/> Retour
            </button>) : <span />}
          {etape < 3 ? (<button onClick={() => setEtape(etape + 1)} disabled={(etape === 0 && !etape1Ok) || (etape === 1 && !etape2Ok)} className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
              Continuer <ArrowRight className="size-4"/>
            </button>) : (<button onClick={soumettre} disabled={envoi} className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
              {envoi ? <><Loader2 className="size-4 animate-spin"/> Création…</> : <><CheckCircle2 className="size-4"/> Créer l'entreprise</>}
            </button>)}
        </div>
      </div>
    </div>);
}
function AlertIcon() {
    return <svg className="size-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}
function MailCheckIcon() {
    return <svg className="mt-0.5 size-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}
