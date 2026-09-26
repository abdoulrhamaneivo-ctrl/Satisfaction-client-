import React from 'react';
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