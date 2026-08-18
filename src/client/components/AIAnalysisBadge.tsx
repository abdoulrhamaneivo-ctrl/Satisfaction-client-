import React from 'react';
import { Sparkles, AlertTriangle, CheckCircle2, Info, ArrowRight } from 'lucide-react';
import { cn } from '../utils';

export type AIAnalysisProps = {
  analyse?: {
    status?: string;
    sentiment?: string | null;
    sentimentScore?: number | null;
    themes?: string | null;
    problemePrincipal?: string | null;
    urgence?: string | null;
    resume?: string | null;
    actionRecommandee?: string | null;
  } | null;
  className?: string;
};

export const AIAnalysisBadge: React.FC<AIAnalysisProps> = ({ analyse, className }) => {
  if (!analyse) return null;

  if (analyse.status === 'PENDING' || analyse.status === 'PROCESSING') {
    return (
      <div className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-primary/10 text-primary border border-primary/20 animate-pulse", className)}>
        <Sparkles className="size-3.5 animate-spin" />
        <span>Analyse IA en cours…</span>
      </div>
    );
  }

  if (analyse.status === 'FAILED') {
    return (
      <div className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-muted text-muted-foreground border border-border/50", className)}>
        <Info className="size-3" />
        <span>IA indisponible</span>
      </div>
    );
  }

  if (analyse.status !== 'DONE') return null;

  // Sentiment formatting
  const sentiment = analyse.sentiment || 'NEUTRAL';
  const getSentimentConfig = (s: string) => {
    switch (s) {
      case 'POSITIVE':
        return { label: 'Positif', bg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' };
      case 'NEGATIVE':
        return { label: 'Négatif', bg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20' };
      case 'MIXED':
        return { label: 'Mitigé', bg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' };
      default:
        return { label: 'Neutre', bg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' };
    }
  };

  // Urgence formatting
  const urgence = analyse.urgence || 'LOW';
  const getUrgenceConfig = (u: string) => {
    switch (u) {
      case 'CRITICAL':
        return { label: 'Urgence Critique', bg: 'bg-red-600 text-white font-black animate-pulse' };
      case 'HIGH':
        return { label: 'Urgence Élevée', bg: 'bg-rose-500/20 text-rose-600 dark:text-rose-300 font-bold border border-rose-500/30' };
      case 'MEDIUM':
        return { label: 'Urgence Modérée', bg: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 font-semibold border border-amber-500/30' };
      default:
        return { label: 'Urgence Faible', bg: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 font-medium border border-slate-500/20' };
    }
  };

  // Thèmes parsing
  let themesList: string[] = [];
  try {
    if (analyse.themes) {
      themesList = typeof analyse.themes === 'string' ? JSON.parse(analyse.themes) : analyse.themes;
    }
  } catch {
    themesList = ['AUTRE'];
  }

  const sentimentCfg = getSentimentConfig(sentiment);
  const urgenceCfg = getUrgenceConfig(urgence);

  return (
    <div className={cn("space-y-2 mt-2 pt-2 border-t border-border/40", className)}>
      {/* Header Badges Row */}
      <div className="flex flex-wrap items-center gap-2">
        <span className={cn("inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border", sentimentCfg.bg)}>
          <Sparkles className="size-3 text-primary" />
          {sentimentCfg.label}
          {analyse.sentimentScore !== null && (
            <span className="opacity-70 text-[10px]">({Math.round((analyse.sentimentScore || 0) * 100)}%)</span>
          )}
        </span>

        {urgence !== 'LOW' && (
          <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-2xs", urgenceCfg.bg)}>
            <AlertTriangle className="size-3" />
            {urgenceCfg.label}
          </span>
        )}

        {/* Themes tags */}
        {themesList.map((theme, idx) => (
          <span
            key={idx}
            className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-card-subtle text-foreground/80 border border-border/60"
          >
            #{theme}
          </span>
        ))}
      </div>

      {/* Résumé sémantique & Action Recommandée */}
      {analyse.resume && (
        <div className="rounded-xl bg-card-subtle/80 border border-border/60 p-3 text-xs space-y-1.5">
          <div className="flex items-center justify-between text-muted-foreground font-bold text-[11px] uppercase tracking-wider">
            <span className="flex items-center gap-1.5 text-primary font-black">
              <Sparkles className="size-3" /> Synthèse IA
            </span>
            {analyse.problemePrincipal && (
              <span className="text-rose-500 font-semibold text-[10px]">
                Problème : {analyse.problemePrincipal}
              </span>
            )}
          </div>
          <p className="text-foreground/90 font-medium leading-relaxed italic">
            "{analyse.resume}"
          </p>

          {analyse.actionRecommandee && (
            <div className="pt-1.5 flex items-start gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
              <ArrowRight className="size-3.5 shrink-0 mt-0.5" />
              <span><strong className="font-bold">Action suggérée :</strong> {analyse.actionRecommandee}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
