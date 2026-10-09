/** Masque localement les coordonnées usuelles avant toute requête externe. */
export function anonymiserTextePourAnalyse(texte) {
    const borne = texte.normalize('NFKC').trim().slice(0, 1000);
    return borne
        .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/giu, '[courriel masqué]')
        .replace(/\b(?:https?:\/\/|www\.)[^\s<>]+/giu, '[lien masqué]')
        .replace(/(?:\+?\d[\d\s().-]{6,}\d)/gu, (candidate) => {
        const digits = candidate.replace(/\D/g, '').length;
        return digits >= 8 && digits <= 15 ? '[téléphone masqué]' : candidate;
    })
        .trim();
}
//# sourceMappingURL=dataMinimization.js.map