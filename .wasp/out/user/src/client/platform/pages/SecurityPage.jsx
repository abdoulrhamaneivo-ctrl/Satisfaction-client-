import { useEffect, useRef, useState } from 'react';
import { RequirePlatformRole } from '../../components/RequirePlatformRole';
import { useQuery, useAction } from 'wasp/client/operations';
import { getPlatformMe, inviterSuperAdmin, setup2fa, activer2fa } from 'wasp/client/operations';
import { ShieldCheck, UserPlus, Loader2, CheckCircle2, AlertTriangle, Lock, KeyRound, Timer } from 'lucide-react';
/**
 * Page Sécurité de la console (Doc 12 §1 — /platform/securite).
 * P1 : invitation d'un autre SUPER_ADMIN + rappel des mesures actives.
 * P3 (futur) : 2FA, gestion des sessions, rate limiting.
 */
export default function SecurityPage() {
    return (<RequirePlatformRole>
      <SecurityInner />
    </RequirePlatformRole>);
}
function SecurityInner() {
    const { data: me } = useQuery(getPlatformMe);
    const inviter = useAction(inviterSuperAdmin);
    const setup = useAction(setup2fa);
    const activer = useAction(activer2fa);
    const [email, setEmail] = useState('');
    const [prenom, setPrenom] = useState('');
    const [nom, setNom] = useState('');
    const [totpCode, setTotpCode] = useState('');
    const [codeActivation, setCodeActivation] = useState('');
    const [secretTotp, setSecretTotp] = useState(null);
    const [mfaErreur, setMfaErreur] = useState(null);
    const [mfaMessage, setMfaMessage] = useState(null);
    const [mfaActive, setMfaActive] = useState(false);
    const setupLance = useRef(false);
    const [envoi, setEnvoi] = useState(false);
    const [message, setMessage] = useState(null);
    const [erreur, setErreur] = useState(null);
    const emailValide = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const codeValide = /^\d{6}$/.test(totpCode);
    const codeActivationValide = /^\d{6}$/.test(codeActivation);
    const totpActif = me?.totp_actif || mfaActive;
    useEffect(() => {
        if (me?.totp_actif)
            setMfaActive(true);
    }, [me?.totp_actif]);
    useEffect(() => {
        if (!me || totpActif || setupLance.current)
            return;
        setupLance.current = true;
        setup(undefined)
            .then((r) => setSecretTotp(r.secret_pour_qr))
            .catch((e) => setMfaErreur(e?.message ?? 'Impossible de préparer la 2FA.'));
    }, [me?.totp_actif, totpActif]);
    async function activerMfa() {
        setMfaErreur(null);
        setMfaMessage(null);
        try {
            const r = await activer({ code: codeActivation });
            setMfaMessage(r.message);
            setMfaActive(true);
            setCodeActivation('');
        }
        catch (e) {
            setMfaErreur(e?.message ?? 'Code 2FA invalide.');
        }
    }
    async function soumettre() {
        setEnvoi(true);
        setErreur(null);
        setMessage(null);
        try {
            const r = await inviter({ email, prenom, nom, totpCode });
            setMessage(r.message);
            setEmail('');
            setPrenom('');
            setNom('');
            setTotpCode('');
        }
        catch (e) {
            setErreur(e?.message ?? "Échec de l'invitation.");
        }
        finally {
            setEnvoi(false);
        }
    }
    const inputCls = 'mt-1.5 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40';
    const labelCls = 'block text-xs font-black uppercase tracking-widest text-muted-foreground';
    const mesures = [
        { icon: Lock, label: 'Isolation multi-tenant (RLS serveur)', ok: true },
        { icon: KeyRound, label: 'Invitations à usage unique (SHA-256, 24 h)', ok: true },
        { icon: ShieldCheck, label: 'Aucun mot de passe transmis par email', ok: true },
        { icon: ShieldCheck, label: 'Garde dernier SUPER_ADMIN', ok: true },
        { icon: Timer, label: 'Sessions signées (Wasp)', ok: true },
        { icon: Lock, label: '2FA sur comptes SUPER_ADMIN', ok: !!totpActif },
        { icon: Timer, label: 'Rate limiting login/reset', ok: false },
    ];
    return (<div className="mx-auto max-w-4xl space-y-6">
      <header>
        <h1 className="text-2xl font-black tracking-tight text-foreground md:text-3xl">Sécurité</h1>
        <p className="mt-1 text-sm text-muted-foreground">Comptes plateforme et mesures de protection.</p>
      </header>

      {/* Enrôlement TOTP obligatoire */}
      <section className="rounded-2xl border border-warning/40 bg-warning/5 p-6">
        <h2 className="flex items-center gap-2 text-lg font-black text-foreground">
          <ShieldCheck className="size-5 text-warning"/> Authentification à deux facteurs (obligatoire)
        </h2>
        {totpActif ? (<p className="mt-2 text-sm font-semibold text-success">La 2FA est activée pour votre compte.</p>) : (<>
            <p className="mt-2 text-sm text-muted-foreground">
              Ajoutez ce compte à votre application d’authentification, puis confirmez avec le code affiché.
            </p>
            {secretTotp && <p className="mt-3 rounded-xl bg-background p-3 font-mono text-sm font-bold tracking-widest">Secret : {secretTotp}</p>}
            <div className="mt-4 flex flex-wrap items-end gap-3">
              <div>
                <label className={labelCls} htmlFor="sec-mfa-activation">Code à 6 chiffres *</label>
                <input id="sec-mfa-activation" inputMode="numeric" maxLength={6} className={inputCls} value={codeActivation} onChange={(e) => setCodeActivation(e.target.value.replace(/\D/g, ''))}/>
              </div>
              <button onClick={activerMfa} disabled={!codeActivationValide} className="inline-flex items-center gap-2 rounded-xl bg-warning px-5 py-3 text-sm font-bold text-warning-foreground disabled:opacity-50">Activer la 2FA</button>
            </div>
            {mfaMessage && <p className="mt-3 text-sm font-bold text-success">{mfaMessage}</p>}
            {mfaErreur && <p className="mt-3 text-sm font-bold text-destructive">{mfaErreur}</p>}
          </>)}
      </section>

      {/* Inviter un SUPER_ADMIN */}
      <section className="rounded-2xl border border-border/80 bg-card p-6">
        <h2 className="flex items-center gap-2 text-lg font-black text-foreground">
          <UserPlus className="size-5 text-primary"/> Inviter un administrateur plateforme
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Le nouveau SUPER_ADMIN recevra un email d'activation (usage unique, 24 h).
        </p>

        {message && (<div className="mt-4 flex items-center gap-2 rounded-xl border border-success/30 bg-success/10 p-3 text-sm font-bold text-success">
            <CheckCircle2 className="size-4"/> {message}
          </div>)}
        {erreur && (<div className="mt-4 flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm font-bold text-destructive">
            <AlertTriangle className="size-4"/> {erreur}
          </div>)}

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <label className={labelCls} htmlFor="sec-prenom">Prénom</label>
            <input id="sec-prenom" className={inputCls} value={prenom} onChange={(e) => setPrenom(e.target.value)}/>
          </div>
          <div>
            <label className={labelCls} htmlFor="sec-nom">Nom</label>
            <input id="sec-nom" className={inputCls} value={nom} onChange={(e) => setNom(e.target.value)}/>
          </div>
          <div>
            <label className={labelCls} htmlFor="sec-email">Email professionnel *</label>
            <input id="sec-email" type="email" className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)}/>
          </div>
        </div>
        <div className="mt-4 max-w-xs">
          <label className={labelCls} htmlFor="sec-totp">Code 2FA (6 chiffres) *</label>
          <input id="sec-totp" inputMode="numeric" maxLength={6} className={inputCls} value={totpCode} onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}/>
        </div>
        <button onClick={soumettre} disabled={!emailValide || !prenom.trim() || !nom.trim() || !codeValide || !totpActif || envoi} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
          {envoi ? <><Loader2 className="size-4 animate-spin"/> Envoi…</> : <>Envoyer l'invitation</>}
        </button>
      </section>

      {/* Mesures */}
      <section className="rounded-2xl border border-border/80 bg-card p-6">
        <h2 className="flex items-center gap-2 text-lg font-black text-foreground">
          <ShieldCheck className="size-5 text-primary"/> Mesures actives
        </h2>
        <ul className="mt-4 space-y-3">
          {mesures.map(({ icon: Icon, label, ok }) => (<li key={label} className="flex items-center gap-3 text-sm">
              <Icon className={`size-4 ${ok ? 'text-success' : 'text-muted-foreground/50'}`}/>
              <span className={ok ? 'font-semibold text-foreground' : 'text-muted-foreground'}>{label}</span>
              <span className={`ml-auto text-[10px] font-black uppercase tracking-widest ${ok ? 'text-success' : 'text-muted-foreground/50'}`}>
                {ok ? 'Actif' : 'Phase 3'}
              </span>
            </li>))}
        </ul>
      </section>

      {/* Identité */}
      {me && (<p className="text-center text-xs text-muted-foreground">
          Connecté en tant que <strong>{me.prenom} {me.nom}</strong> ({me.platformRole}) — {me.email}
        </p>)}
    </div>);
}
