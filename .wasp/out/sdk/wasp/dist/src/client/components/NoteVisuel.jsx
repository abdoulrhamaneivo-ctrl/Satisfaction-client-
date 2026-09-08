// src/client/components/NoteVisuel.tsx
// ============================================================================
// Langage visuel UNIQUE des notes 1-5 — partagé par la collecte publique et
// la lecture des avis. Un seul endroit à modifier si la charte évolue.
// ============================================================================
import React from 'react';
import { motion } from 'framer-motion';
export const NOTE_CONFIG = [
    { note: 1, icon: '😡', label: 'Très mécontent', couleur: 'destructive' },
    { note: 2, icon: '😟', label: 'Mécontent', couleur: 'orange' },
    { note: 3, icon: '😐', label: 'Neutre', couleur: 'amber' },
    { note: 4, icon: '🙂', label: 'Satisfait', couleur: 'lime' },
    { note: 5, icon: '🤩', label: 'Très satisfait', couleur: 'success' },
];
const borne = (n) => Math.min(5, Math.max(1, Math.round(n)));
export const visuelPourNote = (score) => NOTE_CONFIG[borne(score) - 1];
/** Pastille couleur associée à la note (badges, bordures). */
export const classeCouleurNote = (score) => {
    const n = borne(score);
    if (n <= 2)
        return 'bg-destructive/10 text-destructive border-destructive/25';
    if (n === 3)
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25';
    return 'bg-success/10 text-success border-success/25';
};
/** Barre de progression X/5 (lecture des avis, récapitulatifs). */
export const BarreNote = ({ score, max = 5 }) => {
    const pct = Math.min(100, Math.max(0, (score / max) * 100));
    return (<div className="h-2 w-full overflow-hidden rounded-full bg-muted/80" role="progressbar" aria-valuemin={0} aria-valuemax={max} aria-valuenow={score} aria-label={`Note ${score} sur ${max}`}>
      <motion.div className="h-full rounded-full bg-primary" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}/>
    </div>);
};
/** Grand visuel note : emoji + X/5 + libellé (cartes avis, récapitulatifs). */
export const GrandVisuelNote = ({ score, max = 5 }) => {
    const v = visuelPourNote(score);
    return (<div className="flex items-center gap-3">
      <motion.span key={score} initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 400, damping: 20 }} className="text-4xl leading-none" aria-hidden>
        {v.icon}
      </motion.span>
      <div className="leading-tight">
        <p className="text-2xl font-bold text-foreground font-satoshi">
          {score}<span className="text-sm font-semibold text-muted-foreground">/{max}</span>
        </p>
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{v.label}</p>
      </div>
    </div>);
};
//# sourceMappingURL=NoteVisuel.jsx.map