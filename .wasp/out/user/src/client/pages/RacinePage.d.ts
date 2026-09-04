/**
 * RacinePage — la landing marketing a été retirée (décision Ivo : le parcours
 * client passe uniquement par le scan du QR code /q/:guichetId).
 * La racine redirige donc selon l'état de connexion :
 *   - utilisateur connecté  → /dashboard
 *   - visiteur (équipes)    → /login
 */
export declare function RacinePage(): import("react").JSX.Element;
