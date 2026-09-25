// src/client/collecte/payload.ts
// ============================================================================
// Construction des payloads de réponse côté collecte (vague 1, Phase E).
// Pur et testé : le client envoie des IDENTIFIANTS stables (optionId /
// optionIds[]) ou des valeurs validées — jamais de position, jamais de
// score calculé pour QCM/CASES (le serveur résout).
// ============================================================================

export type ReponseCollecte = {
  critereId: number;
  score?: number;
  texte?: string;
  optionId?: string;
  optionIds?: string[];
  valeur?: number;
  valeurOui?: boolean;
};

/** Option telle qu'exposée par getFormDefinitionForGuichet (id stable). */
export type OptionAffichage = { id: string | null; libelle: string };

/**
 * Options à afficher pour un critère : table OptionCritere (ids stables)
 * en priorité, repli CSV legacy (sans id → le serveur apparie par libellé,
 * stampé MIGRATED).
 */
export function optionsAffichage(critere: any): OptionAffichage[] {
  const table: any[] = Array.isArray(critere?.options) ? critere.options : [];
  if (table.length > 0) {
    return table.map((o: any) => ({
      id: typeof o?.id === 'string' && o.id ? o.id : null,
      libelle: String(o?.libelle ?? '').trim(),
    })).filter((o) => o.libelle);
  }
  return String(critere?.options_reponse ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((libelle) => ({ id: null, libelle }));
}

/** Smiley 1-5 (échelle fixe, aucun biais de position possible). */
export function payloadSmiley(critereId: number, note: number): ReponseCollecte {
  return { critereId, score: note };
}

/** Oui/Non : booléen + orientation gérée serveur. */
export function payloadOuiNon(critereId: number, oui: boolean): ReponseCollecte {
  return { critereId, valeurOui: oui };
}

/** QCM : optionId si connu, sinon libellé (compat serveur MIGRATED). */
export function payloadQCM(critereId: number, choix: OptionAffichage): ReponseCollecte {
  if (choix.id) return { critereId, optionId: choix.id };
  return { critereId, texte: choix.libelle };
}

/** Texte libre : verbatim seul, jamais de note. */
export function payloadTexte(critereId: number, texte: string): ReponseCollecte {
  return { critereId, texte: texte.trim() };
}

/** Échelle / NPS : valeur brute (bornes validées serveur). */
export function payloadValeur(critereId: number, valeur: number): ReponseCollecte {
  return { critereId, valeur };
}

/** CASES : ids si connus, sinon libellés joints (compat serveur). */
export function payloadCases(critereId: number, choix: OptionAffichage[]): ReponseCollecte {
  const avecId = choix.filter((c) => c.id).map((c) => c.id as string);
  if (avecId.length === choix.length && choix.length > 0) {
    return { critereId, optionIds: avecId };
  }
  return { critereId, texte: choix.map((c) => c.libelle).join(' • ') };
}

/** Échelle : bornes depuis options_reponse (défaut 1-5, miroir serveur). */
export function bornesEchelle(critere: any): { min: number; max: number } {
  const [a, b] = String(critere?.options_reponse || '1,5').split(',');
  const min = Number(a);
  const max = Number(b);
  if (!Number.isInteger(min) || !Number.isInteger(max) || !(max > min)) {
    return { min: 1, max: 5 };
  }
  return { min, max };
}
