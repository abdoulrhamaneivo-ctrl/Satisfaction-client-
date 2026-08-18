import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ArrowRight, ArrowLeft, X, CheckCircle2, HelpCircle } from 'lucide-react';
import { Button } from './ds';
import { YebaLogo } from './YebaLogo';

export type TourStep = {
  targetSelector?: string;
  title: string;
  description: string;
  badge?: string;
  position?: 'bottom' | 'top' | 'left' | 'right' | 'center';
};

const DEFAULT_STEPS: TourStep[] = [
  {
    position: 'center',
    badge: 'Bienvenue sur Yéba',
    title: 'Bienvenue sur la plateforme Yéba !',
    description: 'Ce guide interactif rapide vous présente les fonctionnalités clés pour piloter la satisfaction usager et gérer vos guichets en temps réel.',
  },
  {
    targetSelector: '[data-tour="sidebar-kanban"]',
    position: 'right',
    badge: 'Alertes & Incidents',
    title: 'Le Tableau Kanban des Incidents',
    description: 'Chaque insatisfaction usager remonte instantanément sous forme de carte à traiter. Suivez la résolution de "À traiter" à "Résolu".',
  },
  {
    targetSelector: '[data-tour="sidebar-guichets"]',
    position: 'right',
    badge: 'Points de Contact',
    title: 'Gestion des Guichets & Kits QR',
    description: 'Générez les kits d\'affichage avec les QR Codes et codes USSD spécifiques à chaque guichet physique de votre agence.',
  },
  {
    targetSelector: '[data-tour="sidebar-personnel"]',
    position: 'right',
    badge: 'Équipe Agence',
    title: 'Gestion des Agents & Rôles',
    description: 'Invitez les agents de guichet et attribuez les permissions d\'accès selon votre organisation interne.',
  },
  {
    position: 'center',
    badge: 'Prêt à démarrer',
    title: 'Vous êtes prêt !',
    description: 'Vous pouvez relancer ce tutoriel à tout moment en cliquant sur le bouton d\'aide "?" dans la barre latérale.',
  },
];

export function OnboardingTour() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  useEffect(() => {
    // Vérifie si c'est la 1ère connexion
    const hasSeenTour = localStorage.getItem('yeba_onboarding_completed');
    if (!hasSeenTour) {
      // Ouvre après un petit délai pour laisser l'interface charger
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    const handleStartTour = () => {
      setCurrentStepIndex(0);
      setIsOpen(true);
    };

    window.addEventListener('yeba:start-tour', handleStartTour);
    return () => window.removeEventListener('yeba:start-tour', handleStartTour);
  }, []);

  if (!isOpen) return null;

  const currentStep = DEFAULT_STEPS[currentStepIndex];
  const isFirst = currentStepIndex === 0;
  const isLast = currentStepIndex === DEFAULT_STEPS.length - 1;

  const handleNext = () => {
    if (isLast) {
      handleComplete();
    } else {
      setCurrentStepIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirst) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem('yeba_onboarding_completed', 'true');
    setIsOpen(false);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        {/* Overlay d'arrière-plan avec flou */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/75 backdrop-blur-sm"
          onClick={handleComplete}
        />

        {/* Modal / Bulle du tutoriel pas-à-pas */}
        <motion.div
          key={currentStepIndex}
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="relative z-10 w-full max-w-lg rounded-3xl border border-primary/40 bg-card p-6 sm:p-8 shadow-2xl ring-1 ring-white/10"
        >
          {/* Bouton Fermer */}
          <button
            onClick={handleComplete}
            className="absolute right-5 top-5 rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            title="Passer le tutoriel"
          >
            <X className="size-4" />
          </button>

          {/* En-tête de la bulle */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-primary/20 text-primary border border-primary/30 shadow-sm">
              <YebaLogo className="size-6" />
            </div>
            <div>
              <span className="inline-flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-widest text-primary">
                <Sparkles className="size-3" />
                {currentStep.badge || 'Tutoriel interactif'}
              </span>
              <span className="block text-xs font-bold text-muted-foreground">
                Étape {currentStepIndex + 1} sur {DEFAULT_STEPS.length}
              </span>
            </div>
          </div>

          {/* Titre & Description */}
          <div className="space-y-2 mb-6">
            <h3 className="text-xl font-black font-satoshi text-foreground leading-snug">
              {currentStep.title}
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed font-medium">
              {currentStep.description}
            </p>
          </div>

          {/* Indicateur de progression par points */}
          <div className="flex items-center justify-between border-t border-border/80 pt-5">
            <div className="flex items-center gap-1.5">
              {DEFAULT_STEPS.map((_, idx) => (
                <span
                  key={idx}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    idx === currentStepIndex
                      ? 'w-6 bg-primary'
                      : idx < currentStepIndex
                      ? 'w-2 bg-secondary'
                      : 'w-2 bg-muted'
                  }`}
                />
              ))}
            </div>

            {/* Actions Suivant / Précédent */}
            <div className="flex items-center gap-2">
              {!isFirst && (
                <Button
                  size="sm"
                  intent="outline"
                  onClick={handlePrev}
                  className="rounded-xl font-bold gap-1 text-xs"
                >
                  <ArrowLeft className="size-3.5" /> Précédent
                </Button>
              )}
              <Button
                size="sm"
                intent="primary"
                onClick={handleNext}
                className="rounded-xl font-bold gap-1 text-xs bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
              >
                {isLast ? (
                  <>
                    <CheckCircle2 className="size-3.5" /> Terminer
                  </>
                ) : (
                  <>
                    Suivant <ArrowRight className="size-3.5" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

export function TriggerOnboardingButton() {
  return (
    <button
      onClick={() => window.dispatchEvent(new Event('yeba:start-tour'))}
      className="flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-primary transition-colors p-2 rounded-xl hover:bg-muted/50 w-full"
      title="Lancer le tutoriel guidé"
    >
      <HelpCircle className="size-4 text-primary" />
      <span>Tutoriel guidé</span>
    </button>
  );
}
