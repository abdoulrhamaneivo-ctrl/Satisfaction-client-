import { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router';
import { useAction } from 'wasp/client/operations';
import { activerCompte } from 'wasp/client/operations';
import { Card } from '../../components/ds';
import { YebaLogo } from '../../components/YebaLogo';
import { CheckCircle2, Loader2, AlertTriangle, Eye, EyeOff } from 'lucide-react';
/**
 * Page publique d'activation de compte via le lien de l'email d'invitation
 * (Doc 12 §7.2). Le token en clair va dans l'URL ; le serveur vérifie le
 * hash, l'expiration et l'usage unique avant de poser le mot de passe.
 */
export default function ActivateAccountPage() {
    const { token } = useParams();
    const navigate = useNavigate();
    const activer = useAction(activerCompte);
    const [motDePasse, setMotDePasse] = useState('');
    const [confirmation, setConfirmation] = useState('');
    const [voirMdp, setVoirMdp] = useState(false);
    const [envoi, setEnvoi] = useState(false);
    const [erreur, setErreur] = useState(null);
    const [succes, setSucces] = useState(false);
    const valide = motDePasse.length >= 8 && motDePasse === confirmation && !!token;
    async function soumettre() {
        if (!valide || envoi)
            return;
        setEnvoi(true);
        setErreur(null);
        try {
            await activer({ token: token, motDePasse, confirmation });
            setSucces(true);
            setTimeout(() => navigate('/login'), 2500);
        }
        catch (e) {
            setErreur(e?.message ?? "Impossible d'activer ce compte.");
        }
        finally {
            setEnvoi(false);
        }
    }
    return (<div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center gap-3">
          <YebaLogo className="size-12"/>
          <h1 className="text-2xl font-black tracking-tight text-foreground">
            {succes ? 'Compte activé ✓' : 'Bienvenue sur Yeba'}
          </h1>
        </div>

        <Card className="p-6 sm:p-8">
          {succes ? (<div className="space-y-4 text-center">
              <CheckCircle2 className="mx-auto size-14 text-success"/>
              <p className="text-sm font-semibold text-foreground">
                Votre compte est activé et votre mot de passe défini.
              </p>
              <p className="text-xs text-muted-foreground">Redirection vers la page de connexion…</p>
              <Link to="/login" className="inline-flex w-full items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground hover:bg-primary/90">
                Se connecter maintenant
              </Link>
            </div>) : (<div className="space-y-5">
              <p className="text-sm text-muted-foreground">
                Votre espace entreprise est prêt. Définissez maintenant votre mot de passe.
              </p>

              {erreur && (<div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs font-bold text-destructive">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0"/> {erreur}
                </div>)}

              <div>
                <label htmlFor="act-mdp" className="block text-xs font-black uppercase tracking-widest text-muted-foreground">
                  Nouveau mot de passe
                </label>
                <div className="relative mt-1.5">
                  <input id="act-mdp" type={voirMdp ? 'text' : 'password'} value={motDePasse} onChange={(e) => setMotDePasse(e.target.value)} className="h-11 w-full rounded-xl border border-border bg-background px-3 pr-10 text-sm outline-none focus:ring-2 focus:ring-ring/40" placeholder="8 caractères minimum" autoComplete="new-password"/>
                  <button type="button" onClick={() => setVoirMdp((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label={voirMdp ? 'Masquer' : 'Afficher'}>
                    {voirMdp ? <EyeOff className="size-4"/> : <Eye className="size-4"/>}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="act-conf" className="block text-xs font-black uppercase tracking-widest text-muted-foreground">
                  Confirmer
                </label>
                <input id="act-conf" type={voirMdp ? 'text' : 'password'} value={confirmation} onChange={(e) => setConfirmation(e.target.value)} className="mt-1.5 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40" autoComplete="new-password"/>
              </div>

              <button onClick={soumettre} disabled={!valide || envoi} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                {envoi ? <><Loader2 className="size-4 animate-spin"/> Activation…</> : 'Activer mon compte'}
              </button>

              <p className="text-center text-[11px] text-muted-foreground">
                Ce lien est personnel et à usage unique. S'il a expiré, demandez un nouveau lien à votre contact Yeba.
              </p>
            </div>)}
        </Card>
      </div>
    </div>);
}
//# sourceMappingURL=ActivateAccountPage.jsx.map