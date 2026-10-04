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
  /** Verbatim de l'option « Autre (précisez) » (Task 2, nettoyé). */
  autreTexte?: string;
};

/** Option telle qu'exposée par getFormDefinitionForGuichet (id stable). */
export type OptionAffichage = { id: string | null; libelle: string; code_metier?: string | null };

/**
 * L'option est-elle un « Autre (précisez) » à saisie libre ?
 * Convention : code_metier AUTRE_LIBRE (jamais EXCLUSIF).
 */
export function estOptionAutreLibre(o: { code_metier?: string | null }): boolean {
  return (o?.code_metier ?? '').trim().toUpperCase() === 'AUTRE_LIBRE';
}

/**
 * Verbatim « Autre » : trim, 1000 max, séparateurs `•;|` interdits.
 * Ces trois caractères servent de séparateurs au chemin legacy serveur
 * (split « • ») : les laisser passer couperait le verbatim en morceaux
 * appariés à tort. Miroir serveur : normaliserEntree (resolutionSoumission).
 */
export function nettoyerAutreTexte(brut: unknown): string {
  if (typeof brut !== 'string') return '';
  return brut.replace(/[•;|]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 1000);
}

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
      // Task 2 : le client doit reconnaître l'option « Autre (précisez) »
      // pour afficher le champ de saisie (jamais de score exposé ici).
      code_metier: typeof o?.code_metier === 'string' && o.code_metier.trim()
        ? o.code_metier.trim()
        : null,
    })).filter((o) => o.libelle);
  }
  return String(critere?.options_reponse ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((libelle) => ({ id: null, libelle, code_metier: null }));
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
export function payloadQCM(critereId: number, choix: OptionAffichage, autreTexte?: string): ReponseCollecte {
  const base: ReponseCollecte = choix.id
    ? { critereId, optionId: choix.id }
    : { critereId, texte: choix.libelle };
  // Task 2 : « Autre (précisez) » → le verbatim voyage avec l'identifiant.
  // Vide → absent (le bouton Continuer reste désactivé côté collecte).
  if (estOptionAutreLibre(choix)) {
    const propre = nettoyerAutreTexte(autreTexte);
    if (propre) return { ...base, autreTexte: propre };
  }
  return base;
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
export function payloadCases(critereId: number, choix: OptionAffichage[], autreTexte?: string): ReponseCollecte {
  const avecId = choix.filter((c) => c.id).map((c) => c.id as string);
  const base: ReponseCollecte =
    avecId.length === choix.length && choix.length > 0
      ? { critereId, optionIds: avecId }
      : { critereId, texte: choix.map((c) => c.libelle).join(' • ') };
  // Task 2 : le verbatim n'est conservé que si « Autre » est coché.
  if (choix.some(estOptionAutreLibre)) {
    const propre = nettoyerAutreTexte(autreTexte);
    if (propre) return { ...base, autreTexte: propre };
  }
  return base;
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

// ---------- Phase L : libellés d'effort (CES) ----------

/** Un critère est-il une question d'effort ? (miroir de reconaîtreCES). */
export function estCritereCES(critere: any): boolean {
  return String(critere?.scoring_mode || '').toUpperCase() === 'CES';
}

/**
 * Libellés d'une échelle CES, du mieux (1 = très facile) au pire
 * (max = très difficile). LeMapping 1-7 double volontairement deux
 * intervalles neutres (2 et 3 « Très facile », 4 et 5 « Plutôt facile »,
 * 6 « Plutôt difficile ») : c'est la convention de mesure du CES, pas
 * une approximation. Sur 1-5, chaque niveau a son libellé.
 *
 * Un CES mal configuré (autre échelle) retombe sur les chiffres bruts :
 * on n'invente jamais un libellé.
 */
export function libellesCES(max: number): string[] {
  if (max === 5) {
    return ['Très facile', 'Plutôt facile', 'Ni facile ni difficile', 'Plutôt difficile', 'Très difficile'];
  }
  if (max === 7) {
    return [
      'Très facile',
      'Très facile',
      'Plutôt facile',
      'Plutôt facile',
      'Ni facile ni difficile',
      'Plutôt difficile',
      'Très difficile',
    ];
  }
  return [];
}

export type ChoixEchelle = {
  valeur: number;
  /** Texte affiché sur le bouton (libellé CES ou chiffre). */
  libelle: string;
  /** Libellé vocalisé (accessibilité) : « Effort : Très facile ». */
  aria: string;
};

/**
 * Boutons d'une question d'échelle : libellés d'effort pour un CES,
 * chiffres pour une note classique. La valeur TRANSMISE reste toujours la
 * note brute (le serveur, seul, décide du score).
 */
export function choixEchelle(critere: any): ChoixEchelle[] {
  const { min, max } = bornesEchelle(critere);
  const valeurs = Array.from({ length: max - min + 1 }, (_, i) => min + i);
  // Les libellés ne valent QUE pour 1..5 / 1..7 : un min≠1 ne doit jamais
  // faire afficher « Très facile » en face d'une valeur qui ne l'est pas.
  const libelles = estCritereCES(critere) && min === 1 ? libellesCES(max) : [];
  return valeurs.map((valeur, i) => ({
    valeur,
    libelle: libelles[i] ?? String(valeur),
    aria: libelles[i]
      ? `Effort : ${libelles[i]}`
      : `Note ${valeur} sur ${max}`,
  }));
}
