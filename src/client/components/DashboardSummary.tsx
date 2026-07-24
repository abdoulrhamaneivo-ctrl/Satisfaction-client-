import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, ShieldAlert, ShieldCheck, ShieldQuestion, ArrowRight } from 'lucide-react';
import { cn } from '../utils';

type Niveau = 'excellent' | 'bon' | 'attention' | 'critique';

interface DashboardSummaryProps {
  prenom?: string;
  satisfaction: number;
  totalAvis: number;
  alertesNouvelles: number;
  tachesEnRetard: number;
  labelPeriode: string;
  isLoading?: boolean;
}

const niveauFromSatisfaction = (satisfaction: number, alertesCritiques: number): Niveau => {
  if (alertesCritiques >= 3) return 'critique';
  if (satisfaction >= 85) return 'excellent';
  if (satisfaction >= 65) return 'bon';
  return 'attention';
};

const NIVEAU_CONFIG: Record<Niveau, { icon: typeof ShieldCheck; label: string; accent: string; bg: string }> = {
  excellent: {
    icon: ShieldCheck,
    label: 'Votre réseau est en excellente santé.',
    accent: 'text-success',
    bg: 'bg-success/10',
  },
  bon: {
    icon: ShieldCheck,
    label: 'Votre réseau se porte bien.',
    accent: 'text-primary',
    bg: 'bg-primary/10',
  },
  attention: {
    icon: ShieldQuestion,
    label: 'Quelques points méritent votre attention.',
    accent: 'text-warning',
    bg: 'bg-warning/10',
  },
  critique: {
    icon: ShieldAlert,
    label: 'Plusieurs alertes critiques demandent une action rapide.',
    accent: 'text-destructive',
    bg: 'bg-destructive/10',
  },
};

/**
 * Résumé narratif en tête de dashboard : au lieu de commencer directement
 * par une grille de chiffres, on répond d'abord aux trois questions qu'un
 * décideur se pose en ouvrant l'app — "Que se passe-t-il ? Y a-t-il un
 * problème ? Que dois-je faire ?" — avant de dérouler le détail plus bas.
 */
export const DashboardSummary = ({
  prenom,
  satisfaction,
  totalAvis,
  alertesNouvelles,
  tachesEnRetard,
  labelPeriode,
  isLoading,
}: DashboardSummaryProps) => {
  if (isLoading) {
    return <div className="h-40 animate-pulse rounded-3xl border border-border/70 bg-card-subtle/50" />;
  }

  const niveau = niveauFromSatisfaction(satisfaction, alertesNouvelles);
  const config = NIVEAU_CONFIG[niveau];
  const Icon = config.icon;
  const totalActions = alertesNouvelles + tachesEnRetard;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="relative overflow-hidden rounded-3xl border border-border/70 bg-card p-6 shadow-premium sm:p-8"
    >
      <div className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-primary/5 blur-3xl" />

      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-4">
          <span className={cn('flex size-12 shrink-0 items-center justify-center rounded-2xl', config.bg)}>
            <Icon className={cn('size-6', config.accent)} strokeWidth={2} />
          </span>
          <div>
            <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
              <Sparkles className="size-3" />
              Résumé du jour
            </p>
            <h2 className="mt-1 text-title-md2 font-bold leading-tight text-foreground">
              Bonjour{prenom ? ` ${prenom}` : ''}
            </h2>
            <p className={cn('mt-1 text-sm font-semibold', config.accent)}>{config.label}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 lg:shrink-0">
          <SummaryChip label={`Satisfaction (${labelPeriode})`} value={`${satisfaction}%`} />
          <SummaryChip label={`Avis reçus (${labelPeriode})`} value={String(totalAvis)} />
          {totalActions > 0 ? (
            <SummaryChip
              label="Actions à traiter"
              value={String(totalActions)}
              tone="warning"
            />
          ) : (
            <SummaryChip label="Actions à traiter" value="0" tone="success" />
          )}
        </div>
      </div>

      {totalActions > 0 && (
        <a
          href="#actions-prioritaires"
          className="relative mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
        >
          Voir les actions recommandées
          <ArrowRight className="size-3.5" />
        </a>
      )}
    </motion.div>
  );
};

const SummaryChip = ({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  tone?: 'neutral' | 'success' | 'warning';
}) => (
  <div
    className={cn(
      'flex flex-col rounded-2xl border px-4 py-2.5 min-w-[9rem]',
      tone === 'success' && 'border-success/20 bg-success/5',
      tone === 'warning' && 'border-warning/20 bg-warning/5',
      tone === 'neutral' && 'border-border/70 bg-card-subtle/40'
    )}
  >
    <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
    <span className="text-lg font-bold text-foreground">{value}</span>
  </div>
);
