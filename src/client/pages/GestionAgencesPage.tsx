import React, { useState } from 'react';
import { useAuth } from 'wasp/client/auth';
import { useQuery, getAgences, createAgence } from 'wasp/client/operations';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, MapPin, PlusCircle, ShieldAlert } from 'lucide-react';
import { AmbientBackground } from '../components/AmbientBackground';
import { PageHeader } from '../components/PageHeader';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { RequireAuth } from '../components/RequireAuth';
import { useToast } from '../hooks/use-toast';

export const GestionAgencesPage = () => {
  const { data: user } = useAuth();
  const { data: agences, isLoading } = useQuery(getAgences);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    nom_agence: '',
    commune: '',
    adresse: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      await createAgence({
        nom_agence: formData.nom_agence,
        commune: formData.commune,
        adresse: formData.adresse || undefined,
      });
      toast({
        title: 'Agence créée',
        description: `"${formData.nom_agence}" a été ajoutée à votre réseau.`,
      });
      setFormData({ nom_agence: '', commune: '', adresse: '' });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: "Erreur lors de la création de l'agence",
        description: error?.message || 'Erreur inconnue',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Cette page ne concerne que le chef d'entreprise : c'est lui qui
  // structure son réseau d'agences avant d'y rattacher des chefs d'agence
  // (via la page Personnel) et des guichets.
  if (user && user.role !== 'DIRECTION') {
    return (
      <RequireAuth>
        <AmbientBackground>
          <div className="flex min-h-screen items-center justify-center p-8">
            <div className="flex max-w-md flex-col items-center gap-3 rounded-3xl border border-border/70 bg-card p-10 text-center shadow-premium">
              <ShieldAlert className="size-10 text-warning" />
              <h1 className="text-lg font-bold">Accès réservé à la direction</h1>
              <p className="text-sm text-muted-foreground">
                Seul le chef d'entreprise peut créer ou gérer les agences du réseau.
              </p>
            </div>
          </div>
        </AmbientBackground>
      </RequireAuth>
    );
  }

  const agenceCount = agences?.length ?? 0;

  return (
    <RequireAuth>
      <AmbientBackground>
        <div className="min-h-screen p-8">
          <div className="mx-auto max-w-6xl">
            <PageHeader
              icon={Building2}
              eyebrow="Réseau"
              title="Gestion des agences"
              description="Créez les agences de votre réseau. Vous pourrez ensuite y rattacher un Chef d'Agence et des guichets."
            />

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
              {/* CARTE FORMULAIRE */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="lg:col-span-1 rounded-3xl border border-border/70 bg-card p-6 shadow-premium ring-premium"
              >
                <h2 className="mb-6 flex items-center gap-2 text-lg font-bold">
                  <PlusCircle className="text-primary" /> Nouvelle agence
                </h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <Input
                    name="nom_agence"
                    placeholder="Nom de l'agence (ex : Agence Plateau)"
                    value={formData.nom_agence}
                    onChange={handleInputChange}
                    required
                    className="h-11"
                  />
                  <Input
                    name="commune"
                    placeholder="Commune (ex : Abidjan - Plateau)"
                    value={formData.commune}
                    onChange={handleInputChange}
                    required
                    className="h-11"
                  />
                  <Input
                    name="adresse"
                    placeholder="Adresse précise (optionnel)"
                    value={formData.adresse}
                    onChange={handleInputChange}
                    className="h-11"
                  />

                  <Button type="submit" disabled={submitting} className="w-full rounded-xl font-bold">
                    {submitting ? 'Création…' : "Créer l'agence"}
                  </Button>
                </form>

                <p className="mt-4 text-xs text-muted-foreground">
                  Une fois l'agence créée, allez sur la page{' '}
                  <span className="font-medium text-foreground">Personnel</span> pour lui
                  rattacher un Chef d'Agence.
                </p>
              </motion.div>

              {/* LISTE DES AGENCES */}
              <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                {isLoading && (
                  <>
                    {[0, 1].map((i) => (
                      <div
                        key={i}
                        className="h-[88px] animate-pulse rounded-3xl border border-border/70 bg-card-subtle/50"
                      />
                    ))}
                  </>
                )}

                <AnimatePresence>
                  {agences?.map((agence: any) => (
                    <motion.div
                      key={agence.id}
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="rounded-3xl border border-border/70 bg-card p-5 shadow-sm transition-all hover:shadow-premium hover:border-primary/20"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                          <Building2 className="size-5" />
                        </div>
                        <div>
                          <h3 className="font-bold text-foreground">
                            {agence.nom_agence}
                          </h3>
                          <p className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="size-3" /> {agence.commune}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {!isLoading && agenceCount === 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="md:col-span-2"
                  >
                    <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-border/50 bg-card/50 p-10 text-center">
                      <Building2 className="mb-3 size-10 text-muted-foreground" />
                      <p className="font-semibold text-foreground">
                        Aucune agence pour l'instant
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Créez votre première agence via le formulaire pour commencer à structurer votre réseau.
                      </p>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          </div>
        </div>
      </AmbientBackground>
    </RequireAuth>
  );
};
