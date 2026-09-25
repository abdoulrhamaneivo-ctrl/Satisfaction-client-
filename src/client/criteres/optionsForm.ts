// src/client/criteres/optionsForm.ts
// ============================================================================
// Helpers purs du formulaire d'options (vague 1, écran d'administration).
// Une option = libellé + score explicite (1-5, null = Auto/inféré) +
// poids (CASES pondéré) + code métier (ex. EXCLUSIF pour « Aucun »).
// ============================================================================

export type OptionForm = {
  /** Clé locale stable (jamais l'id base : les nouvelles n'en ont pas). */
  cle: string;
  libelle: string;
  /** null = Auto (inférence lexicale, provenance INFERRED). */
  score: number | null;
  /** null = pas de pondération. */
  poids: number | null;
  code_metier: string;
};

let compteurCles = 0;
export function nouvelleCleOption(): string {
  compteurCles += 1;
  return `opt-${Date.now().toString(36)}-${compteurCles}`;
}

export function optionVide(): OptionForm {
  return { cle: nouvelleCleOption(), libelle: '', score: null, poids: null, code_metier: '' };
}

/** CSV legacy → lignes éditables (migration douce vers l'éditeur). */
export function csvVersOptions(csv: string): OptionForm[] {
  return String(csv || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((libelle) => ({ ...optionVide(), libelle }));
}

/** Lignes existantes (base) → lignes éditables. */
export function baseVersOptions(lignes: any[]): OptionForm[] {
  return (lignes ?? []).map((o: any) => ({
    cle: String(o?.id ?? nouvelleCleOption()),
    libelle: String(o?.libelle ?? ''),
    score: typeof o?.score === 'number' ? o.score : null,
    poids: typeof o?.poids === 'number' ? o.poids : null,
    code_metier: String(o?.code_metier ?? ''),
  }));
}

/** Lignes → payload createCritere/updateCritere (vides filtrées). */
export function optionsVersPayload(options: OptionForm[]): Array<{
  libelle: string;
  score: number | null;
  poids: number | null;
  code_metier?: string;
}> {
  return options
    .map((o) => ({
      libelle: o.libelle.trim(),
      score: o.score,
      poids: o.poids,
      ...(o.code_metier.trim() ? { code_metier: o.code_metier.trim().toUpperCase() } : {}),
    }))
    .filter((o) => o.libelle.length > 0);
}
