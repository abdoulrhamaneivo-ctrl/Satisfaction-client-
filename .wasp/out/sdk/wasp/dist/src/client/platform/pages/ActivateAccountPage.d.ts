/**
 * Page publique d'activation de compte via le lien de l'email d'invitation
 * (Doc 12 §7.2). Le token en clair va dans l'URL ; le serveur vérifie le
 * hash, l'expiration et l'usage unique avant de poser le mot de passe.
 *
 * FIX 04/09 : l'email génère `?token=...` (QUERY param) alors que la page
 * le lisait via useParams (paramètre de CHEMIN, toujours undefined) —
 * le bouton d'activation ne pouvait jamais s'activer. On lit maintenant
 * les search params, avec repli sur les path params par robustesse.
 */
export default function ActivateAccountPage(): import("react").JSX.Element;
//# sourceMappingURL=ActivateAccountPage.d.ts.map