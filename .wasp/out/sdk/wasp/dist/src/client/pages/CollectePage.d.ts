import React from 'react';
/**
 * Mode du questionnaire — rend EXPLICITE ce que le repli silencieux cachait.
 *
 * - 'operation' : une opération est sélectionnée ET a des questions → ses questions.
 * - 'operation-sans-questions' : une opération est sélectionnée mais n'en a
 *   aucune → message explicite, AUCUNE question (plus de repli sur le vivier).
 * - 'general' : le guichet n'a aucune opération → questionnaire plat sur le
 *   vivier, AVEC bandeau d'avertissement. Les réponses sont enregistrées sans
 *   opération, en connaissance de cause.
 */
export type ModeFormulaire = 'operation' | 'general' | 'operation-sans-questions';
export declare function modeFormulaire(servicesDuGuichet: Array<{
    criteres?: any[] | null;
}>, selectedService: {
    criteres?: any[] | null;
} | null | undefined): ModeFormulaire;
export declare function questionsPourMode(mode: ModeFormulaire, selectedService: {
    criteres?: any[] | null;
} | null | undefined, defaultCriteres: any[]): any[];
/**
 * Identifiant de soumission (idempotence côté serveur).
 * `crypto.randomUUID` n'existe qu'en contexte SÉCURISÉ : une borne servie en
 * HTTP sur réseau local — déploiement de référence — n'en a pas. On propose
 * donc un repli, jamais une exception : une soumission bloquée sans message
 * est le pire scénario pour un client qui a répondu à tout.
 */
export declare const genererIdSoumission: () => string;
export declare const CollectePage: () => React.JSX.Element;
//# sourceMappingURL=CollectePage.d.ts.map