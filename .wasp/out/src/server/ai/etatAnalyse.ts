// src/server/ai/etatAnalyse.ts
// ============================================================================
// MACHINE À ÉTATS DE L'ANALYSE IA INDIVIDUELLE (Vague 1, P3).
//
// Constat d'audit : `PROCESSING` était écrit puis JAMAIS re-sélectionné. Un
// crash, un OOM, un redéploiement ou un worker PgBoss tué entre la prise en
// charge et l'écriture du résultat laissait la ligne définitivement
// coincée — et l'UI affichait « Analyse IA en cours… » pour toujours.
//
// Ce module est PUR (aucune base, aucun I/O) : il définit ce qui est
// sélectionnable, ce qui est périmé, et combien de tentatives restent. Le job
// s'y branche ; les tests le couvrent sans base de données.
// ============================================================================

export const MAX_ATTEMPTS_ANALYSE = 3;

/** Au-delà de ce délai sans mise à jour, un traitement est considéré mort. */
export const DELAI_OBSOLESCENCE_MINUTES = 10;

export type StatutAnalyse = 'PENDING' | 'PROCESSING' | 'DONE' | 'FAILED';

export type LigneAnalyse = {
  status: StatutAnalyse | string;
  attempts: number | null | undefined;
  updatedAt: Date | string | null | undefined;
};

/** Une analyse est-elle rejouable par le job ? */
export function estRejouable(ligne: LigneAnalyse): boolean {
  if (ligne.status === 'PENDING') return true;
  if (ligne.status === 'FAILED') return (ligne.attempts ?? 0) < MAX_ATTEMPTS_ANALYSE;
  return false;
}

/** Un traitement est-il resté bloqué trop longtemps ? (→ requeue) */
export function estObsolete(
  ligne: LigneAnalyse,
  maintenant: Date = new Date(),
  delaiMinutes: number = DELAI_OBSOLESCENCE_MINUTES,
): boolean {
  if (ligne.status !== 'PROCESSING') return false;
  if (!ligne.updatedAt) return true; // pas d'horodatage : traitement non traçable, on récupère
  const maj = new Date(ligne.updatedAt);
  if (Number.isNaN(maj.getTime())) return true;
  return maintenant.getTime() - maj.getTime() > delaiMinutes * 60_000;
}

/** Filtre de sélection : rejouables + traitements périmés à remettre en file. */
export function aRejouer(lignes: LigneAnalyse[], maintenant: Date = new Date()): LigneAnalyse[] {
  return lignes.filter((l) => estRejouable(l) || estObsolete(l, maintenant));
}

/** Raised pour le trigger manuel : une analyse échouée peut-elle repartir ? */
export function estRelancableManuellement(ligne: LigneAnalyse): boolean {
  return ligne.status === 'PENDING' || ligne.status === 'FAILED' || estObsolete(ligne);
}
