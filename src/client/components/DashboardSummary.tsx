import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, ShieldAlert, ShieldCheck, ShieldQuestion, ArrowRight } from 'lucide-react';
import { cn } from '../utils';
import { Eyebrow } from './ds/Badge';

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

const NIVEAU_CONFIG: Record<Niveau, { icon: typeof ShieldCheck; label: string; accent: string; bg: string; border: string }> = {
  excellent: {
    icon: ShieldCheck,
    label: 'Votre réseau est en excellente santé.',
    accent: 'text-success',
    bg: 'bg-success/10',
    border: 'border-success/25',
  },
  bon: {
    icon: ShieldCheck,
    label: 'Votre réseau se porte bien.',
    accent: 'text-primary',
    bg: 'bg-primary/10',
    border: 'border-primary/25',
  },
  attention: {
    icon: ShieldQuestion,
    label: 'Quelques points méritent votre attention.',
    accent: 'text-warning',
    bg: 'bg-warning/10',
    border: 'border-warning/25',
  },
  critique: {
    icon: ShieldAlert,
    label: 'Plusieurs alertes critiques demandent une action rapide.',
    accent: 'text-destructive',
    bg: 'bg-destructive/10',
    border: 'border-destructive/25',
  },
};

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
    return <div className="h-44 animate-pulse rounded-3xl border border-border/70 bg-card/50" />;
  }

  const niveau = niveauFromSatisfaction(satisfaction, alertesNouvelles);
  const config = NIVEAU_CONFIG[niveau];
  const Icon = config.icon;
  const totalActions = alertesNouvelles + tachesEnRetard;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="ds-hero-glow relative overflow-hidden rounded-3xl border border-border/80 bg-card/95 p-6 shadow-premium sm:p-8 backdrop-blur-md"
    >
      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-4">
          <span className={cn('flex size-12 shrink-0 items-center justify-center rounded-2xl border', config.bg, config.border)}>
            <Icon className={cn('size-6', config.accent)} strokeWidth={2} />
          </span>
          <div>
            <Eyebrow tone="amber">
              <Sparkles className="size-3" />
              Résumé du jour
            </Eyebrow>
            <h2 className="mt-1 text-2xl font-black leading-tight text-foreground font-satoshi sm:text-3xl">
              Bonjour{prenom ? ` ${prenom}` : ''}
            </h2>
            <p className={cn('mt-1 text-sm font-bold', config.accent)}>{config.label}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2.5 lg:shrink-0">
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
          className="relative mt-5 inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-widest text-primary hover:underline"
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
      'flex flex-col rounded-2xl border px-4 py-3 min-w-[9.5rem] transition-all duration-200 hover:-translate-y-0.5',
      tone === 'success' && 'border-success/30 bg-success/10 text-success',
      tone === 'warning' && 'border-warning/30 bg-warning/10 text-warning',
      tone === 'neutral' && 'border-border/70 bg-muted/40 text-foreground'
    )}
  >
    <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">{label}</span>
    <span className="text-xl font-black text-foreground font-satoshi tabular-nums">{value}</span>
  </div>
);
