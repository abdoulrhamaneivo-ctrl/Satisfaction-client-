import React, { useState, useEffect } from 'react';
import { useAuth } from 'wasp/client/auth';
import { useQuery, useAction, getAIStatus, getBranding, updateBranding } from 'wasp/client/operations';
import { motion } from 'framer-motion';
import { MotionCard } from '../components/MotionCard';
import { AmbientBackground } from '../components/AmbientBackground';
import { PageHeader } from '../components/PageHeader';
import { RequireAuth } from '../components/RequireAuth';
import { RequireEnterpriseRole } from "../components/RequireEnterpriseRole";
import { useToast } from '../hooks/use-toast';
import { Cpu, CheckCircle2, AlertTriangle, Key, Server, Sparkles, Activity, RefreshCw, Palette, Loader2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
export const SettingsPage = () => {
    const { data: aiStatus, isLoading, refetch } = useQuery(getAIStatus);
    return (<RequireEnterpriseRole>
      <RequireAuth>
      <AmbientBackground>
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="max-w-[1400px] mx-auto p-6 lg:p-10 space-y-8">
          <PageHeader icon={Cpu} eyebrow="Paramètres & Intégrations" title="Paramètres" description="Configurez le moteur d'analyse IA (DeepSeek) et sa clé API." actions={<Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2 border-border/80 bg-card/60 ">
                <RefreshCw className="size-4"/>
                Actualiser les statistiques
              </Button>}/>

          {isLoading ? (<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[0, 1, 2].map((i) => (<div key={i} className="h-44 animate-pulse rounded-2xl border border-border/70 bg-card-subtle/50"/>))}
            </div>) : (<>
              {/* Statut Global du Moteur IA */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <MotionCard className="p-6 space-y-3 relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Statut Clé API</span>
                    {aiStatus?.configured ? (<span className="flex items-center gap-1 text-xs font-bold text-success bg-success/10 px-2.5 py-1 rounded-full border border-success/20">
                        <CheckCircle2 className="size-3.5"/> Opérationnel
                      </span>) : (<span className="flex items-center gap-1 text-xs font-bold text-warning bg-warning/10 px-2.5 py-1 rounded-full border border-warning/20">
                        <AlertTriangle className="size-3.5"/> Clé manquante
                      </span>)}
                  </div>
                  <h3 className="text-2xl font-bold text-foreground">
                    {aiStatus?.configured ? `${aiStatus?.provider} connecté` : 'Non configurée'}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {aiStatus?.configured
                ? 'Les avis soumis avec commentaires sont automatiquement analysés par le modèle IA.'
                : 'Veuillez ajouter OPENROUTER_API_KEY dans vos variables d’environnement Railway pour activer le traitement.'}
                  </p>
                </MotionCard>

                <MotionCard className="p-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Fournisseur & Modèle</span>
                    <Sparkles className="size-4 text-primary"/>
                  </div>
                  <h3 className="text-2xl font-bold text-foreground">{aiStatus?.provider}</h3>
                  <p className="text-xs font-mono text-primary/90 bg-primary/10 p-2 rounded-lg truncate">
                    {aiStatus?.model}
                  </p>
                </MotionCard>

                <MotionCard className="p-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Volumétrie Analysée</span>
                    <Activity className="size-4 text-success"/>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-foreground">{aiStatus?.stats?.done || 0}</span>
                    <span className="text-xs text-muted-foreground">/ {aiStatus?.stats?.total || 0} avis analysés</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1">
                    <span className="text-warning font-medium">⌛ {aiStatus?.stats?.pending || 0} en attente</span>
                    <span className="text-destructive font-medium">❌ {aiStatus?.stats?.failed || 0} échecs</span>
                  </div>
                </MotionCard>
              </div>

              {/* Instructions de Configuration pour l'administrateur */}
              <MotionCard className="p-8 space-y-6">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                    <Key className="size-5"/>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-foreground">Guide de Déploiement Railway (OpenRouter)</h3>
                    <p className="text-xs text-muted-foreground">
                      Configuration sécurisée des variables d’environnement du serveur.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                  <div className="space-y-3 p-4 rounded-xl bg-background/50 border border-border/70">
                    <span className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                      <Server className="size-3.5"/> Variables requises sur Railway
                    </span>
                    <div className="space-y-2 font-mono text-xs text-foreground">
                      <div className="p-2.5 rounded-lg bg-card border border-border/80">
                        <span className="text-muted-foreground"># Clé API OpenRouter</span>
                        <br />
                        <span className="text-success font-semibold">OPENROUTER_API_KEY</span>=«redacted:sk-or-…»
                      </div>
                      <div className="p-2.5 rounded-lg bg-card border border-border/80">
                        <span className="text-muted-foreground"># Modèle (Optionnel, défaut DeepSeek V3 via OpenRouter)</span>
                        <br />
                        <span className="text-primary font-semibold">OPENROUTER_MODEL</span>=deepseek/deepseek-chat-v3-0324
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 p-4 rounded-xl bg-background/50 border border-border/70">
                    <span className="text-xs font-bold uppercase tracking-wider text-success">
                      Fonctionnalités IA de YEBA
                    </span>
                    <ul className="space-y-2 text-xs text-muted-foreground leading-relaxed">
                      <li className="flex items-start gap-2">
                        <span className="text-success">✓</span>
                        <span><strong>Détection de sentiment</strong> : Positif, Neutre ou Négatif.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-success">✓</span>
                        <span><strong>Score d'urgence</strong> : Faible, Modérée, Élevée ou Critique.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-success">✓</span>
                        <span><strong>Extraction des thèmes</strong> : Temps d'attente, Propreté, Accueil, etc.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-success">✓</span>
                        <span><strong>Synthèse automatique</strong> : Résumé concis généré pour les équipes qualité.</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </MotionCard>
              <SectionPersonnalisation />
            </>)}
        </motion.div>
      </AmbientBackground>
    </RequireAuth>
      </RequireEnterpriseRole>);
};
/**
 * Personnalisation de l'expérience client (FIX 05/09 — la table existait
 * mais sans écriture ni interface). DIRECTION uniquement : formulaires de
 * collecte, kits QR (slogan, style, couleurs) et identité. Les champs vides
 * retombent sur les défauts Yéba.
 */
function SectionPersonnalisation() {
    const { data: user } = useAuth();
    const { toast } = useToast();
    const { data: branding, isLoading, refetch } = useQuery(getBranding);
    const sauvegarder = useAction(updateBranding);
    const [form, setForm] = useState({});
    const [envoi, setEnvoi] = useState(false);
    const [initialise, setInitialise] = useState(false);
    useEffect(() => {
        if (branding && !initialise) {
            const f = {};
            for (const k of ['nom_affiche', 'logo_url', 'form_title', 'form_subtitle', 'form_thank_you', 'qr_slogan', 'qr_style', 'qr_frame', 'qr_color', 'qr_bg_color']) {
                f[k] = branding?.[k] ?? '';
            }
            f.hide = branding?.hide_yeba_branding ? '1' : '';
            setForm(f);
            setInitialise(true);
        }
    }, [branding, initialise]);
    if (user?.role !== 'DIRECTION')
        return null;
    const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
    async function soumettre(e) {
        e.preventDefault();
        if (envoi)
            return;
        setEnvoi(true);
        try {
            await sauvegarder({
                nom_affiche: form.nom_affiche || undefined,
                logo_url: form.logo_url || undefined,
                form_title: form.form_title || undefined,
                form_subtitle: form.form_subtitle || undefined,
                form_thank_you: form.form_thank_you || undefined,
                qr_slogan: form.qr_slogan || undefined,
                qr_style: form.qr_style || undefined,
                qr_frame: form.qr_frame || undefined,
                qr_color: form.qr_color || undefined,
                qr_bg_color: form.qr_bg_color || undefined,
                hide_yeba_branding: form.hide === '1',
            });
            await refetch();
            toast({ variant: 'success', title: 'Personnalisation enregistrée', description: 'Visible sur les formulaires et kits QR.' });
        }
        catch (err) {
            toast({ variant: 'destructive', title: 'Erreur', description: err?.message || 'Enregistrement impossible.' });
        }
        finally {
            setEnvoi(false);
        }
    }
    const champ = (id, label, placeholder, max) => (<div className="space-y-1.5">
      <Label htmlFor={`brand-${id}`}>{label}</Label>
      <Input id={`brand-${id}`} value={form[id] ?? ''} maxLength={max} onChange={(e) => set(id, e.target.value)} placeholder={placeholder} className="h-10 rounded-xl border-border/80"/>
    </div>);
    return (<MotionCard className="p-6 sm:p-8 space-y-6">
      <div className="flex items-center gap-3">
        <div className="size-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
          <Palette className="size-5"/>
        </div>
        <div>
          <h3 className="text-lg font-bold text-foreground">Personnalisation client</h3>
          <p className="text-xs text-muted-foreground">Formulaires de collecte, kits QR et slogan. Vide = défaut Yéba.</p>
        </div>
      </div>
      {isLoading ? (<div className="h-32 animate-pulse rounded-2xl border border-border/70 bg-card-subtle/50"/>) : (<form onSubmit={soumettre} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {champ('nom_affiche', "Nom affiché", 'Ex. La Poste CI', 80)}
          {champ('logo_url', 'Logo (URL)', 'https://…', 500)}
          {champ('form_title', 'Titre du formulaire', 'Ex. Votre avis compte', 120)}
          {champ('form_subtitle', 'Sous-titre', 'Ex. 1 minute pour nous aider', 200)}
          {champ('form_thank_you', 'Message de remerciement', 'Ex. Merci !', 120)}
          {champ('qr_slogan', 'Slogan sous le QR', 'Ex. Scannez et donnez votre avis', 80)}
          <div className="space-y-1.5">
            <Label htmlFor="brand-qr_style">Style du QR</Label>
            <select id="brand-qr_style" value={form.qr_style || 'CLASSIQUE'} onChange={(e) => set('qr_style', e.target.value)} className="h-10 w-full rounded-xl border border-border/80 bg-background px-3 text-sm">
              {['CLASSIQUE', 'MODERNE', 'PREMIUM'].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="brand-qr_frame">Cadre du QR</Label>
            <select id="brand-qr_frame" value={form.qr_frame || 'SIMPLE'} onChange={(e) => set('qr_frame', e.target.value)} className="h-10 w-full rounded-xl border border-border/80 bg-background px-3 text-sm">
              {['AUCUN', 'SIMPLE', 'PREMIUM'].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="brand-qr_color">Couleur du QR (#RRGGBB)</Label>
            <div className="flex gap-2">
              <input id="brand-qr_color" type="color" value={/^#[0-9a-fA-F]{6}$/.test(form.qr_color || '') ? form.qr_color : '#000000'} onChange={(e) => set('qr_color', e.target.value)} className="h-10 w-12 rounded-xl border border-border/80 bg-background p-1"/>
              <Input value={form.qr_color ?? ''} onChange={(e) => set('qr_color', e.target.value)} placeholder="#000000" className="h-10 rounded-xl border-border/80"/>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="brand-qr_bg_color">Fond du QR (#RRGGBB)</Label>
            <div className="flex gap-2">
              <input id="brand-qr_bg_color" type="color" value={/^#[0-9a-fA-F]{6}$/.test(form.qr_bg_color || '') ? form.qr_bg_color : '#ffffff'} onChange={(e) => set('qr_bg_color', e.target.value)} className="h-10 w-12 rounded-xl border border-border/80 bg-background p-1"/>
              <Input value={form.qr_bg_color ?? ''} onChange={(e) => set('qr_bg_color', e.target.value)} placeholder="#ffffff" className="h-10 rounded-xl border-border/80"/>
            </div>
          </div>
          <label className="flex items-center gap-2.5 text-xs font-bold text-foreground cursor-pointer md:col-span-2">
            <input type="checkbox" checked={form.hide === '1'} onChange={(e) => set('hide', e.target.checked ? '1' : '')} className="size-4 accent-primary"/>
            Masquer le branding Yéba (plan ENTERPRISE uniquement)
          </label>
          <div className="md:col-span-2 flex justify-end">
            <Button type="submit" disabled={envoi} className="rounded-xl font-bold">
              {envoi ? <><Loader2 className="size-4 animate-spin"/> Enregistrement…</> : <><CheckCircle2 className="size-4"/> Enregistrer</>}
            </Button>
          </div>
        </form>)}
    </MotionCard>);
}
export default SettingsPage;
