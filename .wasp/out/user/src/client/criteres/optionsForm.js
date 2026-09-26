// src/client/criteres/optionsForm.ts
// ============================================================================
// Helpers purs du formulaire d'options (vague 1, écran d'administration).
// Une option = libellé + score explicite (1-5, null = Auto/inféré) +
// poids (CASES pondéré) + code métier (ex. EXCLUSIF pour « Aucun »).
// ============================================================================
let compteurCles = 0;
export function nouvelleCleOption() {
    compteurCles += 1;
    return `opt-${Date.now().toString(36)}-${compteurCles}`;
}
export function optionVide() {
    return { cle: nouvelleCleOption(), libelle: '', score: null, poids: null, code_metier: '' };
}
/** CSV legacy → lignes éditables (migration douce vers l'éditeur). */
export function csvVersOptions(csv) {
    return String(csv || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .map((libelle) => ({ ...optionVide(), libelle }));
}
/** Lignes existantes (base) → lignes éditables. */
export function baseVersOptions(lignes) {
    return (lignes ?? []).map((o) => ({
        cle: String(o?.id ?? nouvelleCleOption()),
        libelle: String(o?.libelle ?? ''),
        score: typeof o?.score === 'number' ? o.score : null,
        poids: typeof o?.poids === 'number' ? o.poids : null,
        code_metier: String(o?.code_metier ?? ''),
    }));
}
/** Lignes → payload createCritere/updateCritere (vides filtrées). */
export function optionsVersPayload(options) {
    return options
        .map((o) => ({
        libelle: o.libelle.trim(),
        score: o.score,
        poids: o.poids,
        ...(o.code_metier.trim() ? { code_metier: o.code_metier.trim().toUpperCase() } : {}),
    }))
        .filter((o) => o.libelle.length > 0);
}
