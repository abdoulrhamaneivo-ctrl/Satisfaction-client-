import React, { useState } from 'react';
import { useAuth } from 'wasp/client/auth';
import { useQuery, getCriteres, getAgenceCriteres, getAgences, toggleCritereAgence, createCritere } from 'wasp/client/operations';
import { motion } from 'framer-motion';
import { MotionCard } from '../components/MotionCard';
import { Button } from '../components/ui/button';
import { Switch } from '../components/ui/switch';
import { useToast } from '../hooks/use-toast';
import { AmbientBackground } from '../components/AmbientBackground';
import { PageHeader } from '../components/PageHeader';
import { Settings2 } from 'lucide-react';
import { ObjectifsPanel } from '../components/ObjectifsPanel';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';

export const ConfigurationCriteresPage = () => {
  const { data: user } = useAuth();
  const { toast } = useToast();
  const [selectedAgenceId, setSelectedAgenceId] = useState<number>(user?.id_agence ?? 1);

  const { data: criteres, isLoading: loadingCriteres } = useQuery(getCriteres);
  const { data: agenceCriteresIds, isLoading: loadingActive } = useQuery(getAgenceCriteres, { id_agence: selectedAgenceId });
  const { data: agences } = useQuery(getAgences);

  const [nouveauLibelle, setNomLibelle] = useState('');
  const [nouvelleDesc, setNouvelleDesc] = useState('');
  const [typeReponse, setTypeReponse] = useState('SMILEY');
  const [optionsReponse, setOptionsReponse] = useState('');
  const [loadingCreation, setLoadingCreation] = useState(false);

  const activeIds: number[] = agenceCriteresIds || [];

  const handleToggle = async (idCritere: number, checked: boolean) => {
    try {
      await toggleCritereAgence({ id_critere: idCritere, id_agence: selectedAgenceId, active: checked });
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erreur lors de la modification',
        description: err.message || 'Erreur inconnue',
      });
    }
  };

  const handleCreateCustom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nouveauLibelle.trim()) return;
    setLoadingCreation(true);
    try {
      await createCritere({
        libelle_critere: nouveauLibelle,
        description: nouvelleDesc,
        type_reponse: typeReponse,
        options_reponse: typeReponse === 'QCM' ? optionsReponse : undefined,
        id_agence: selectedAgenceId
      });
      setNomLibelle('');
      setNouvelleDesc('');
      setOptionsReponse('');
      setTypeReponse('SMILEY');
      toast({ title: 'Critère créé', description: `« ${nouveauLibelle} » a été ajouté avec succès.` });
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erreur de création',
        description: err.message || 'Erreur inconnue',
      });
    } finally {
      setLoadingCreation(false);
    }
  };

  return (
    <AmbientBackground>
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="max-w-6xl mx-auto p-6 lg:p-10 space-y-8"
      >
        <PageHeader
          icon={Settings2}
          eyebrow="Norme FD X50-167"
          title="Configuration des Critères"
          description="Activez les axes de qualité et définissez vos objectifs de satisfaction par agence."
          actions={
            user?.role === 'DIRECTION' && agences && agences.length > 0 ? (
              <Select
                value={String(selectedAgenceId)}
                onValueChange={(v) => setSelectedAgenceId(Number(v))}
              >
                <SelectTrigger className="h-10 min-w-56">
                  <SelectValue placeholder="Choisir l'agence" />
                </SelectTrigger>
                <SelectContent>
                  {agences.map((ag: any) => (
                    <SelectItem key={ag.id} value={String(ag.id)}>
                      {ag.nom_agence} ({ag.commune})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : undefined
          }
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Colonne principale : liste des critères */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-lg font-bold text-foreground">Axes d'évaluation nationaux et personnalisés</h2>

            {(loadingCriteres || loadingActive) && (
              <div className="space-y-3">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-16 animate-pulse rounded-2xl border border-border/70 bg-card-subtle/50" />
                ))}
              </div>
            )}

            <div className="grid gap-4">
              {criteres?.map((critere: any) => {
                const isActive = activeIds.includes(critere.id);
                return (
                  <MotionCard key={critere.id} className="p-5 flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground text-base">{critere.libelle_critere}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${isActive ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>
                          {isActive ? 'Actif' : 'Désactivé'}
                        </span>
                      </div>
                      {critere.description && (
                        <p className="text-xs text-muted-foreground">{critere.description}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <Switch
                        checked={isActive}
                        onCheckedChange={(checked) => handleToggle(critere.id, checked)}
                      />
                    </div>
                  </MotionCard>
                );
              })}
            </div>
          </div>

          {/* Colonne droite : création + objectifs */}
          <div className="space-y-6">
            <MotionCard className="h-fit p-6 space-y-5">
              <div>
                <h3 className="text-lg font-bold text-foreground">Créer un critère à la carte</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Vous avez un standard spécifique ? Ajoutez une nouvelle question à votre questionnaire.
                </p>
              </div>

              <form onSubmit={handleCreateCustom} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-foreground uppercase mb-1">Votre question / Critère</label>
                  <input
                    type="text"
                    required
                    value={nouveauLibelle}
                    onChange={(e) => setNomLibelle(e.target.value)}
                    placeholder="Ex: Comment évaluez-vous la propreté ?"
                    className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm text-foreground focus:ring-1 focus:ring-ring"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground uppercase mb-1">Description (optionnel)</label>
                  <input
                    type="text"
                    value={nouvelleDesc}
                    onChange={(e) => setNouvelleDesc(e.target.value)}
                    placeholder="S'affichera sous la question"
                    className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm text-foreground focus:ring-1 focus:ring-ring"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground uppercase mb-1">Type de réponse</label>
                  <select
                    value={typeReponse}
                    onChange={(e) => setTypeReponse(e.target.value)}
                    className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm text-foreground focus:ring-1 focus:ring-ring"
                  >
                    <option value="SMILEY">⭐ Note / Smileys (1 à 5)</option>
                    <option value="OUI_NON">👍 Oui / Non</option>
                    <option value="QCM">📝 Choix Multiples (QCM)</option>
                    <option value="TEXTE">✍️ Texte libre / Suggestion</option>
                  </select>
                </div>

                {typeReponse === 'QCM' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                  >
                    <label className="block text-xs font-semibold text-foreground uppercase mb-1">Choix possibles (séparés par des virgules)</label>
                    <input
                      type="text"
                      required
                      value={optionsReponse}
                      onChange={(e) => setOptionsReponse(e.target.value)}
                      placeholder="Ex: Trop d'attente, Personnel absent, Autre"
                      className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm text-foreground focus:ring-1 focus:ring-ring"
                    />
                  </motion.div>
                )}

                <motion.div whileTap={{ scale: 0.97 }}>
                  <Button type="submit" disabled={loadingCreation} className="w-full">
                    {loadingCreation ? "Création..." : "Ajouter la question"}
                  </Button>
                </motion.div>
              </form>
            </MotionCard>

            {/* Panneau Objectifs (Module 1 — visible pour DIRECTION et QUALITE) */}
            <ObjectifsPanel selectedAgenceId={selectedAgenceId} />
          </div>
        </div>
      </motion.div>
    </AmbientBackground>
  );
};
