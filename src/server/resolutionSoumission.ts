// src/server/resolutionSoumission.ts
// ============================================================================
// RÉSOLUTION D'UNE RÉPONSE CLIENT → score officiel (vague 1, Phase D).
//
// Pur et testable DB-free : prend une ligne Critere (lue en base par
// l'appelant) + une entrée brute, rend un ItemResolu ou lève HttpError 400.
// Le SERVEUR est l'autorité : position visuelle et score client n'ont
// aucune valeur pour QCM/CASES (résolution par optionId, ou appariement
// par libellé normalisé sur le chemin legacy, stampé MIGRATED).
// ============================================================================

import { HttpError } from 'wasp/server';
import { normaliserLibelle } from '../shared/scoringQCM';
import {
  resoudreReponse,
  resoudreBinaire,
  resoudreNumerique,
  resoudreCES,
  resoudreNPS,
  resoudreCases,
  resoudreCasesMoyenne,
  estAutreLibre,
  type CritereMoteur,
  type ProvenanceScore,
  type ResolutionScoring,
} from '../shared/scoringEngine';

export type EntreeBrute = {
  critereId: number;
  score?: number;
  texte?: string;
  optionId?: string;
  optionIds?: string[];
  valeur?: number;
  valeurOui?: boolean;
  /** Verbatim de l'option « Autre (précisez) » (Task 2, déjà nettoyé). */
  autreTexte?: string;
};

/**
 * Task 2 — Marqueur du verbatim Autre dans ItemResolu.texte.
 * `construireLigne` (actions.ts) le convertit en `Autre — "verbatim"`
 * pour commentaire_texte ; le score reste NON_NOTABLE.
 */
export const PREFIXE_AUTRE = 'AUTRE::';

/** `Autre — "verbatim"` : forme stockée (commentaire_texte) et envoyée à l'IA. */
export function formaterAutreStockage(verbatim: string): string {
  return `Autre — "${verbatim}"`;
}

/**
 * Review r1 (F5) — combine un libellé chiffrable et un texte `AUTRE::…`
 * en réponse affichable (`base • Autre — "v"`), ou `null` sans verbatim.
 * Factorise `construireLigne` et `morceauxIA` (actions.ts) : un seul
 * endroit connaît le marqueur interne.
 */
export function formaterReponseAutre(
  libelleOption: string | null | undefined,
  texte: string | null | undefined,
): string | null {
  if (typeof texte !== 'string' || !texte.startsWith(PREFIXE_AUTRE)) return null;
  const formate = formaterAutreStockage(texte.slice(PREFIXE_AUTRE.length));
  const base = (libelleOption || '').trim();
  return base ? `${base} • ${formate}` : formate;
}

export type ItemResolu = {
  critereId: number;
  texte?: string;
  libelleOption?: string;
  score_brut: number | null;
  score_officiel: number | null;
  score_normalise: number | null;
  score_source: string | null;
  critere_version: number;
  optionsRetnues: string[];
};

/** Normalise une entrée brute (bornes anti-abus, trim, plafonds). */
export function normaliserEntree(r: any): EntreeBrute {
  const e: EntreeBrute = { critereId: Number(r?.critereId) };
  if (r?.score !== undefined && r?.score !== null && r?.score !== '') e.score = Number(r.score);
  if (typeof r?.texte === 'string' && r.texte.trim()) e.texte = r.texte.trim();
  if (typeof r?.optionId === 'string' && r.optionId.trim()) e.optionId = r.optionId.trim();
  if (Array.isArray(r?.optionIds)) {
    const ids = r.optionIds
      .filter((x: any) => typeof x === 'string' && x.trim())
      .map((x: string) => x.trim())
      .slice(0, 50);
    if (ids.length > 0) e.optionIds = ids;
  }
  if (r?.valeur !== undefined && r?.valeur !== null && r?.valeur !== '') e.valeur = Number(r.valeur);
  if (typeof r?.valeurOui === 'boolean') e.valeurOui = r.valeurOui;
  // Task 2 : le verbatim Autre voyage avec l'identifiant (jamais seul) —
  // même nettoyage que le client (miroir de nettoyerAutreTexte : le serveur
  // ne croit jamais le client sur parole). Vide → absent.
  if (typeof r?.autreTexte === 'string') {
    const propre = r.autreTexte.replace(/[•;|]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 1000);
    if (propre) e.autreTexte = propre;
  }
  return e;
}

export function messageAmbigu(raison: string | undefined, type: string): string {
  switch (raison) {
    case 'OPTION_INCONNUE':
    case 'OPTION_INACTIVE':
      return "Cette option n'est plus disponible (questionnaire modifié). Recommencez le questionnaire.";
    case 'SELECTION_VIDE':
      return 'Sélection vide : cochez au moins un choix.';
    case 'EXCLUSIVITE_VIOLEE':
      return '« Aucun problème » ne peut pas être coché avec d’autres choix.';
    case 'ECHELLE_HORS_BORNES':
      return "Valeur hors de l'échelle autorisée.";
    case 'NPS_HORS_BORNES':
      return 'La note doit être comprise entre 0 et 10.';
    case 'VALEUR_NON_ENTIERE':
      return 'La note doit être un nombre entier.';
    case 'ECHELLE_MAL_CONFIGUREE':
      return "Question mal configurée. Demandez à votre administrateur de vérifier l'échelle.";
    case 'POIDS_MANQUANTS':
      return 'Question à pondération incomplète. Demandez à votre administrateur de la configurer.';
    case 'AUTRE_VERBATIM_MANQUANT':
      return '« Autre » coché : précisez votre réponse en toutes lettres.';
    default:
      return `Réponse invalide pour cette question${type ? ` (${type})` : ''}.`;
  }
}

function critereMoteurDe(c: any): CritereMoteur {
  return {
    scoring_mode: c?.scoring_mode ?? null,
    type_reponse: c?.type_reponse ?? 'SMILEY',
    orientation: c?.orientation === 'LOWER_BETTER' ? 'LOWER_BETTER' : 'HIGHER_BETTER',
    echelle_min: null,
    echelle_max: null,
    options: (c?.options ?? []).map((o: any) => ({
      id: String(o.id),
      libelle: String(o.libelle ?? ''),
      score: typeof o.score === 'number' ? o.score : null,
      poids: typeof o.poids === 'number' ? o.poids : null,
      est_scorable: o.est_scorable !== false,
      actif: o.actif !== false,
      code_metier: o.code_metier ?? null,
    })),
  };
}

function provenanceDe(o: any): ProvenanceScore {
  return o?.score_provenance === 'EXPLICIT' ? 'EXPLICIT' : 'INFERRED';
}

function apparierParLibelle(c: any, texte: string): any | null {
  const vise = normaliserLibelle(texte);
  if (!vise) return null;
  const actives = (c?.options ?? []).filter((o: any) => o.actif !== false);
  return (
    actives.find((o: any) => normaliserLibelle(String(o.libelle ?? '')) === vise) ?? null
  );
}

/**
 * Résout UNE entrée contre sa ligne Critere (avec `options` et `version`).
 * Lève HttpError 400 si irrésolvable. Ne touche jamais à la base.
 */
export function resoudreEntree(critere: any, entree: EntreeBrute): ItemResolu {
  const type = String(critere?.type_reponse || 'SMILEY');
  const cm = critereMoteurDe(critere);
  const version = Number(critere?.version) || 1;
  let res: ResolutionScoring;
  let libelleOption: string | undefined;
  // Task 2 : verbatim Autre (`AUTRE::…`), jamais un score.
  let texteAutre: string | undefined;

  // Task 2 : l'option visée est-elle un « Autre (précisez) » ?
  const estAutre = (vise: any): boolean =>
    !!vise && estAutreLibre({ code_metier: vise?.code_metier ?? null });

  // Review r1 (F1, fail-closed) : un « Autre » coché SANS précision est
  // rejeté en 400 — le client bloque déjà Continuer, mais un appel API
  // direct ne doit jamais stocker un commentaire_texte vide.
  const exigerVerbatimAutre = (autrePresent: boolean): void => {
    if (autrePresent && !entree.autreTexte) {
      throw new HttpError(400, messageAmbigu('AUTRE_VERBATIM_MANQUANT', type));
    }
  };

  if (type === 'TEXTE') {
    // Un texte libre ne devient JAMAIS une note officielle (fini le 3).
    if (!entree.texte) {
      throw new HttpError(400, 'Le commentaire est vide.');
    }
    res = {
      statut: 'NON_NOTABLE', score_officiel: null, score_normalise: null,
      source: null, options_retenues: [],
    };
  } else if (type === 'QCM') {
    if (entree.optionId) {
      const vise = (critere.options ?? []).find((o: any) => String(o.id) === entree.optionId);
      if (estAutre(vise)) {
        // Task 2 : Autre libre — score sur l'id (NON_NOTABLE, jamais
        // EXCLUSIVITE_VIOLEE), verbatim conservé avec marqueur.
        exigerVerbatimAutre(true);
        res = {
          statut: 'NON_NOTABLE', score_officiel: null, score_normalise: null,
          source: null, options_retenues: [String(vise.id)], raison: 'AUTRE_LIBRE',
        };
        if (entree.autreTexte) texteAutre = `${PREFIXE_AUTRE}${entree.autreTexte}`;
      } else {
        res = resoudreReponse(cm, { type: 'option', optionId: entree.optionId },
          vise ? provenanceDe(vise) : 'INFERRED');
        if (res.statut === 'OK') libelleOption = vise?.libelle;
      }
    } else if (entree.texte) {
      // Compat pré-Phase E : appariement par libellé normalisé (jamais
      // par position), stampé MIGRATED.
      const vise = apparierParLibelle(critere, entree.texte);
      if (!vise) throw new HttpError(400, messageAmbigu('OPTION_INCONNUE', type));
      if (estAutre(vise)) {
        // Task 2 : legacy pointant sur l'option Autre — même traitement.
        exigerVerbatimAutre(true);
        res = {
          statut: 'NON_NOTABLE', score_officiel: null, score_normalise: null,
          source: 'MIGRATED', options_retenues: [String(vise.id)], raison: 'AUTRE_LIBRE',
        };
        if (entree.autreTexte) texteAutre = `${PREFIXE_AUTRE}${entree.autreTexte}`;
      } else {
        res = resoudreReponse(cm, { type: 'option', optionId: String(vise.id) },
          provenanceDe(vise));
        if (res.statut === 'OK') {
          libelleOption = vise.libelle;
          res = { ...res, source: 'MIGRATED' };
        } else if (res.statut === 'NON_NOTABLE') {
          libelleOption = vise.libelle;
        }
      }
    } else {
      throw new HttpError(400, 'Choix manquant pour cette question.');
    }
  } else if (type === 'CASES') {
    if (entree.optionIds && entree.optionIds.length > 0) {
      const vises = entree.optionIds.map((id) =>
        (critere.options ?? []).find((o: any) => String(o.id) === id));
      if (vises.some((v: any) => !v)) {
        throw new HttpError(400, messageAmbigu('OPTION_INCONNUE', type));
      }
      // Review r1 (F1) : Autre coché sans précision → 400, avant scoring.
      exigerVerbatimAutre(vises.some(estAutre));
      const prov: ProvenanceScore =
        vises.every((v: any) => v?.score_provenance === 'EXPLICIT') ? 'EXPLICIT' : 'INFERRED';
      res = resoudreCases(cm, entree.optionIds, prov, normaliserLibelle);
      if (res.statut === 'NON_NOTABLE' && !cm.scoring_mode) {
        // Nouveau client + CASES legacy sans mode : moyenne compat des
        // cochés scorés (provenance moteur), sinon NON_NOTABLE conservé.
        res = resoudreCasesMoyenne(cm, entree.optionIds, prov);
      }
      if (res.statut === 'OK' || res.statut === 'NON_NOTABLE') {
        // Task 2 : le libellé ne retient que les choix chiffrables — le
        // verbatim Autre part dans texteAutre (`AUTRE::…`), `construireLigne`
        // les concatène (`… • Autre — "verbatim"`).
        const chiffrables = vises.filter((v: any) => !estAutre(v));
        libelleOption = chiffrables.map((v: any) => v.libelle).join(' • ') || undefined;
        if (vises.some(estAutre) && entree.autreTexte) {
          texteAutre = `${PREFIXE_AUTRE}${entree.autreTexte}`;
        }
      }
    } else if (entree.texte) {
      // Compat pré-Phase E : texte joint « • » → appariement par libellés.
      const morceaux = entree.texte.split(/[•;|]/).map((s) => s.trim()).filter(Boolean);
      const vises = morceaux.map((m) => apparierParLibelle(critere, m));
      if (vises.some((v: any) => !v)) {
        throw new HttpError(400, messageAmbigu('OPTION_INCONNUE', type));
      }
      // Review r1 (F1) : idem sur le chemin legacy.
      exigerVerbatimAutre(vises.some(estAutre));
      const ids = vises.map((v: any) => String(v.id));
      const prov: ProvenanceScore =
        vises.every((v: any) => v?.score_provenance === 'EXPLICIT') ? 'EXPLICIT' : 'INFERRED';
      const directe = resoudreCases(cm, ids, prov, normaliserLibelle);
      if (directe.statut === 'OK') {
        res = { ...directe, source: 'MIGRATED' };
      } else if (directe.statut === 'NON_NOTABLE') {
        // CASES catégoriel legacy : jamais noté (fini le 3 fantôme).
        res = directe;
      } else {
        // Legacy sans mode + options scorées → moyenne compat MIGRATED.
        const moyenne = resoudreCasesMoyenne(cm, ids, prov);
        res = moyenne.statut === 'OK' ? { ...moyenne, source: 'MIGRATED' } : moyenne;
      }
      // Task 2 : même partition qu'au-dessus (libellés chiffrables seuls,
      // verbatim Autre dans texteAutre quand il est fourni).
      const chiffrablesLegacy = vises.filter((v: any) => !estAutre(v));
      libelleOption = chiffrablesLegacy.map((v: any) => v.libelle).join(' • ')
        || vises.map((v: any) => v.libelle).join(' • ');
      if (vises.some(estAutre) && entree.autreTexte) {
        texteAutre = `${PREFIXE_AUTRE}${entree.autreTexte}`;
        if (chiffrablesLegacy.length === 0) libelleOption = undefined;
      }
    } else {
      throw new HttpError(400, 'Sélection vide : cochez au moins un choix.');
    }
  } else if (type === 'OUI_NON') {
    if (typeof entree.valeurOui === 'boolean') {
      res = resoudreBinaire(cm, entree.valeurOui);
    } else if (entree.score === 5 || entree.score === 1) {
      // Compat pré-Phase E (Oui=5, Non=1) + orientation du critère.
      res = resoudreBinaire(cm, entree.score === 5);
    } else if (entree.texte) {
      const t = normaliserLibelle(entree.texte);
      if (t === 'oui') res = resoudreBinaire(cm, true);
      else if (t === 'non') res = resoudreBinaire(cm, false);
      else throw new HttpError(400, 'Réponse Oui/Non invalide.');
    } else {
      throw new HttpError(400, 'Réponse Oui/Non manquante.');
    }
  } else if (type === 'ECHELLE') {
    const brut = critere.options_reponse?.trim() || '1,5';
    const [minStr, maxStr] = brut.split(',').map((v: string) => v.trim());
    const min = Number(minStr);
    const max = Number(maxStr);
    const cfg = {
      ...cm,
      echelle_min: Number.isInteger(min) ? min : null,
      echelle_max: Number.isInteger(max) ? max : null,
    };
    const valeur = entree.valeur ?? entree.score;
    if (valeur === undefined || !Number.isFinite(valeur)) {
      throw new HttpError(400, 'Note manquante pour cette question.');
    }
    // Phase L : question d'effort (CES) — sens inversé imposé par le moteur.
    res = String(cm.scoring_mode || '').toUpperCase() === 'CES'
      ? resoudreCES(cfg, valeur)
      : resoudreNumerique(cfg, valeur);
  } else if (type === 'NPS') {
    const valeur = entree.valeur ?? entree.score;
    if (valeur === undefined || !Number.isFinite(valeur)) {
      throw new HttpError(400, 'Note manquante pour cette question.');
    }
    res = resoudreNPS(valeur);
  } else {
    // SMILEY (et défaut) : échelle fixe 1-5, aucune option ordonnable —
    // aucun biais de position possible. La validation stricte FAIT foi.
    const s = entree.score;
    if (!Number.isInteger(s) || (s as number) < 1 || (s as number) > 5) {
      throw new HttpError(400, 'Le score doit être un entier compris entre 1 et 5.');
    }
    res = {
      statut: 'OK', score_officiel: s as number,
      score_normalise: ((s as number) - 1) * 25, source: 'EXPLICIT',
      options_retenues: [],
    };
  }

  if (res.statut === 'AMBIGU') {
    throw new HttpError(400, messageAmbigu(res.raison, type));
  }
  return {
    critereId: entree.critereId,
    texte: texteAutre ?? entree.texte,
    libelleOption,
    score_brut: res.score_officiel,
    score_officiel: res.score_officiel,
    score_normalise: res.score_normalise,
    score_source: res.source,
    critere_version: version,
    optionsRetnues: res.options_retenues,
  };
}
