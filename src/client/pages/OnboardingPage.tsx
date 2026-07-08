import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { completeOnboarding } from 'wasp/client/operations';
import { useAuth } from 'wasp/client/auth';
import { motion } from 'framer-motion';
import { Building2, MapPin, Sparkles, ShieldCheck, AlertCircle } from 'lucide-react';
import { AmbientBackground } from '../components/AmbientBackground';
import { FormField } from '../components/FormField';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';

const COMMUNES = [
  'Marcory',
  'Cocody',
  'Plateau',
  'Adjamé',
  'Yopougon',
  'Treichville',
  'Koumassi',
  'Port-Bouët',
  'Abobo',
];

const HIGHLIGHTS = [
  'Collecte des avis par QR Code & USSD',
  'Tableau de bord temps réel',
  'Suivi des guichets et du personnel',
];

export const OnboardingPage = () => {
  const navigate = useNavigate();
  const { data: user, isLoading: loadingUser } = useAuth();
  const [nomEntreprise, setNomEntreprise] = useState('');
  const [commune, setCommune] = useState('Marcory');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Un utilisateur dont l'entreprise/agence est déjà configurée n'a plus
  // rien à faire ici : on l'envoie directement au tableau de bord pour
  // éviter qu'il ne recrée une seconde agence par erreur.
  useEffect(() => {
    if (!loadingUser && user && (user as any).id_agence) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, loadingUser, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await completeOnboarding({ nomEntreprise, commune });
      window.location.href = '/dashboard';
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue lors de la configuration.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AmbientBackground className="flex items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="grid w-full max-w-4xl overflow-hidden rounded-3xl border border-border/70 bg-card shadow-premium-lg lg:grid-cols-[1.05fr_1fr]"
      >
        {/* Brand panel */}
        <div className="relative hidden flex-col justify-between bg-primary p-10 text-primary-foreground lg:flex">
          <div
            aria-hidden
            className="animate-float-slower absolute -right-16 top-10 h-56 w-56 rounded-full bg-secondary/25 blur-3xl"
          />
          <div className="relative">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em]">
              <Sparkles className="size-3.5" /> Nouvel espace
            </span>
            <h2 className="mt-6 text-title-xl font-black leading-tight">
              Bienvenue sur <span className="text-gradient-primary">CXSAT</span> Abidjan
            </h2>
            <p className="mt-3 max-w-sm text-sm text-primary-foreground/70">
              Configurez votre espace de satisfaction client en une étape et
              commencez à collecter des avis dès aujourd'hui.
            </p>
          </div>

          <ul className="relative mt-8 space-y-3">
            {HIGHLIGHTS.map((item) => (
              <li key={item} className="flex items-center gap-3 text-sm">
                <span className="flex size-6 items-center justify-center rounded-full bg-secondary/20 text-secondary-muted">
                  <ShieldCheck className="size-3.5" />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Form panel */}
        <div className="p-8 sm:p-10">
          <div className="mb-8">
            <h1 className="text-title-md font-black tracking-tight text-foreground">
              Configuration de l'entreprise
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Ces informations personnalisent votre espace.
            </p>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-2.5 rounded-xl border border-destructive/20 bg-destructive/10 p-3.5 text-sm text-destructive"
              >
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}

            <FormField label="Nom de votre entreprise" htmlFor="nom-entreprise" required>
              <div className="relative">
                <Building2 className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="nom-entreprise"
                  name="nomEntreprise"
                  required
                  value={nomEntreprise}
                  onChange={(e) => setNomEntreprise(e.target.value)}
                  placeholder="Ex: Clinique Farah, Sotra..."
                  className="h-11 pl-9"
                />
              </div>
            </FormField>

            <FormField
              label="Commune d'Abidjan du Siège"
              hint="Choisissez la commune du siège principal."
            >
              <Select value={commune} onValueChange={setCommune}>
                <SelectTrigger className="h-11">
                  <span className="flex items-center gap-2">
                    <MapPin className="size-4 text-muted-foreground" />
                    <SelectValue placeholder="Sélectionner une commune" />
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {COMMUNES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <motion.div whileTap={{ scale: 0.98 }}>
              <Button type="submit" size="lg" disabled={loading} className="w-full">
                {loading ? 'Création de votre espace...' : 'Finaliser la configuration'}
              </Button>
            </motion.div>
          </form>
        </div>
      </motion.div>
    </AmbientBackground>
  );
};
