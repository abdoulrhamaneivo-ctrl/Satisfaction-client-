import React from 'react';
import { useQuery, getAIStatus } from 'wasp/client/operations';
import { motion } from 'framer-motion';
import { MotionCard } from '../components/MotionCard';
import { AmbientBackground } from '../components/AmbientBackground';
import { PageHeader } from '../components/PageHeader';
import { RequireAuth } from '../components/RequireAuth';
import { Cpu, CheckCircle2, AlertTriangle, Key, Server, Sparkles, Activity, RefreshCw } from 'lucide-react';
import { Button } from '../components/ui/button';

export const SettingsPage = () => {
  const { data: aiStatus, isLoading, refetch } = useQuery(getAIStatus);

  return (
    <RequireAuth>
      <AmbientBackground>
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="max-w-[1400px] mx-auto p-6 lg:p-10 space-y-8"
        >
          <PageHeader
            icon={Cpu}
            eyebrow="Paramètres & Intégrations"
            title="Moteur d'Intelligence Artificielle"
            description="Supervisez le microservice d'analyse sémantique et la clé API NVIDIA NIM de la plateforme YEBA."
            actions={
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                className="gap-2 border-border/80 bg-card/60 backdrop-blur-md"
              >
                <RefreshCw className="size-4" />
                Actualiser les statistiques
              </Button>
            }
          />

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-44 animate-pulse rounded-2xl border border-border/70 bg-card-subtle/50" />
              ))}
            </div>
          ) : (
            <>
              {/* Statut Global du Moteur IA */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <MotionCard className="p-6 space-y-3 relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Statut Clé API</span>
                    {aiStatus?.configured ? (
                      <span className="flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                        <CheckCircle2 className="size-3.5" /> Opérationnel
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
                        <AlertTriangle className="size-3.5" /> Clé manquante
                      </span>
                    )}
                  </div>
                  <h3 className="text-2xl font-bold text-foreground">
                    {aiStatus?.configured ? 'NVIDIA_API_KEY Détectée' : 'Non configurée'}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {aiStatus?.configured
                      ? 'Les avis soumis avec commentaires sont automatiquement analysés par le modèle IA.'
                      : 'Veuillez ajouter NVIDIA_API_KEY dans vos variables d’environnement Railway pour activer le traitement.'}
                  </p>
                </MotionCard>

                <MotionCard className="p-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Fournisseur & Modèle</span>
                    <Sparkles className="size-4 text-primary" />
                  </div>
                  <h3 className="text-2xl font-bold text-foreground">{aiStatus?.provider}</h3>
                  <p className="text-xs font-mono text-primary/90 bg-primary/10 p-2 rounded-lg truncate">
                    {aiStatus?.model}
                  </p>
                </MotionCard>

                <MotionCard className="p-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Volumétrie Analysée</span>
                    <Activity className="size-4 text-emerald-400" />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-foreground">{aiStatus?.stats?.done || 0}</span>
                    <span className="text-xs text-muted-foreground">/ {aiStatus?.stats?.total || 0} avis analysés</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1">
                    <span className="text-amber-400 font-medium">⌛ {aiStatus?.stats?.pending || 0} en attente</span>
                    <span className="text-rose-400 font-medium">❌ {aiStatus?.stats?.failed || 0} échecs</span>
                  </div>
                </MotionCard>
              </div>

              {/* Instructions de Configuration pour l'administrateur */}
              <MotionCard className="p-8 space-y-6">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                    <Key className="size-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-foreground">Guide de Déploiement Railway (NVIDIA NIM)</h3>
                    <p className="text-xs text-muted-foreground">
                      Configuration sécurisée des variables d’environnement du serveur.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                  <div className="space-y-3 p-4 rounded-xl bg-background/50 border border-border/70">
                    <span className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                      <Server className="size-3.5" /> Variables requises sur Railway
                    </span>
                    <div className="space-y-2 font-mono text-xs text-foreground">
                      <div className="p-2.5 rounded-lg bg-card border border-border/80">
                        <span className="text-muted-foreground"># Clé API NVIDIA NIM</span>
                        <br />
                        <span className="text-emerald-400 font-semibold">NVIDIA_API_KEY</span>=nvapi-xxxxxxxxxxxx
                      </div>
                      <div className="p-2.5 rounded-lg bg-card border border-border/80">
                        <span className="text-muted-foreground"># Endpoint (Optionnel, défaut integrate.api.nvidia.com)</span>
                        <br />
                        <span className="text-primary font-semibold">NVIDIA_BASE_URL</span>=https://integrate.api.nvidia.com/v1
                      </div>
                      <div className="p-2.5 rounded-lg bg-card border border-border/80">
                        <span className="text-muted-foreground"># Modèle LLM (Optionnel, ex. Qwen 80B)</span>
                        <br />
                        <span className="text-primary font-semibold">NVIDIA_MODEL</span>=qwen/qwen3-next-80b-a3b-instruct
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 p-4 rounded-xl bg-background/50 border border-border/70">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                      Fonctionnalités IA de YEBA
                    </span>
                    <ul className="space-y-2 text-xs text-muted-foreground leading-relaxed">
                      <li className="flex items-start gap-2">
                        <span className="text-emerald-400">✓</span>
                        <span><strong>Détection de sentiment</strong> : Positif, Neutre ou Négatif.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-emerald-400">✓</span>
                        <span><strong>Score d'urgence</strong> : Échelle de 1 (faible) à 5 (critique).</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-emerald-400">✓</span>
                        <span><strong>Extraction des thèmes</strong> : Temps d'attente, Propreté, Accueil, etc.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-emerald-400">✓</span>
                        <span><strong>Synthèse automatique</strong> : Résumé concis généré pour les équipes qualité.</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </MotionCard>
            </>
          )}
        </motion.div>
      </AmbientBackground>
    </RequireAuth>
  );
};
