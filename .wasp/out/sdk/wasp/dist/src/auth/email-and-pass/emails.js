// ============================================================================
// CORRECTIF LIENS EMAILS (03/09) : les liens d'authentification étaient
// construits avec config.clientUrl = WASP_WEB_CLIENT_URL. Cette variable
// pointait encore vers l'ancien domaine Railway (yeba-server.onrender.com,
// désormais mort → 404 « Not Found » pour l'utilisateur). Ce fichier est le
// SEUL endroit où Wasp 0.24 laisse personnaliser le contenu des emails
// d'auth : on y RÉÉCRIT le domaine des liens vers le domaine client actuel
// (yebaproject.onrender.com), quelle que soit la valeur de l'env var.
// Quand l'env var Render sera corrigée, cette garde reste inoffensive
// (même domaine).
// ============================================================================
const DOMAINE_CLIENT = 'https://yebaproject.onrender.com';
const DOMAINES_OBSOLETES = [
    'https://yeba-server.onrender.com',
    'http://yeba-server.onrender.com',
];
/** Remplace tout ancien domaine par le domaine client actuel. */
function repareLien(lien) {
    let resultat = lien;
    for (const ancien of DOMAINES_OBSOLETES) {
        if (resultat.startsWith(ancien)) {
            resultat = DOMAINE_CLIENT + resultat.slice(ancien.length);
            break;
        }
    }
    // Cas générique : lien relatif (commence par '/') → préfixer le domaine
    if (resultat.startsWith('/')) {
        resultat = DOMAINE_CLIENT + resultat;
    }
    return resultat;
}
export const getVerificationEmailContent = ({ verificationLink, }) => {
    const lien = repareLien(verificationLink);
    return {
        subject: "Vérifiez votre adresse e-mail",
        text: `Cliquez sur le lien ci-dessous pour vérifier votre adresse e-mail : ${lien}`,
        html: `
        <p>Cliquez sur le lien ci-dessous pour vérifier votre adresse e-mail</p>
        <a href="${lien}">Vérifier mon e-mail</a>
    `,
    };
};
export const getPasswordResetEmailContent = ({ passwordResetLink, }) => {
    const lien = repareLien(passwordResetLink);
    return {
        subject: "Réinitialisation de votre mot de passe",
        text: `Cliquez sur le lien ci-dessous pour réinitialiser votre mot de passe : ${lien}`,
        html: `
        <p>Cliquez sur le lien ci-dessous pour réinitialiser votre mot de passe</p>
        <a href="${lien}">Réinitialiser mon mot de passe</a>
    `,
    };
};
//# sourceMappingURL=emails.js.map