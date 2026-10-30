// ============================================================================
// Wasp construit les liens d'auth avec WASP_WEB_CLIENT_URL. On corrige ici
// les anciens domaines de déploiement vers le domaine configuré actuellement,
// afin qu'un transfert Render ne laisse pas les emails pointer vers l'ancien
// service.
// ============================================================================
const DOMAINE_CLIENT = (process.env.WASP_WEB_CLIENT_URL || process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/+$/, '');
const DOMAINES_OBSOLETES = [
    'https://yebaproject.onrender.com',
    'http://yebaproject.onrender.com',
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