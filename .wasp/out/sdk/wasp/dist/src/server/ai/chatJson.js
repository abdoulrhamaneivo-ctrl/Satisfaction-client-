// src/server/ai/chatJson.ts
// ============================================================================
// Plumbing JSON partagé des providers (vague 1, Phase G) : extraction
// robuste d'un objet JSON d'une réponse chat (fences, reasoning_content,
// repli accolades) + validation Zod typée. Les méthodes `analyserAvis`
// historiques gardent leur plumbing dédié (retry/429) — inchangé.
// ============================================================================
/** Extrait un objet JS d'un contenu chat (accepte fences ```json). */
export function extraireObjetJson(nom, content) {
    if (!content || !content.trim()) {
        throw new Error(`Réponse vide du modèle ${nom}.`);
    }
    let texte = content.trim();
    if (texte.startsWith('```')) {
        texte = texte.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
    }
    try {
        return JSON.parse(texte);
    }
    catch {
        const debut = texte.indexOf('{');
        const fin = texte.lastIndexOf('}');
        if (debut === -1 || fin <= debut) {
            throw new Error(`JSON malformé retourné par l'IA ${nom} (aucun objet détecté).`);
        }
        try {
            return JSON.parse(texte.slice(debut, fin + 1));
        }
        catch (err) {
            throw new Error(`JSON malformé retourné par l'IA ${nom}: ${err?.message}`);
        }
    }
}
/** Valide l'objet contre un schéma Zod (erreur lisible, extrait inclus). */
export function validerReponseJson(nom, schema, brut) {
    const parsed = schema.safeParse(brut);
    if (!parsed.success) {
        const extrait = JSON.stringify(brut)?.slice(0, 300) ?? '?';
        throw new Error(`Réponse IA ${nom} non conforme au schéma: ${parsed.error.issues.map((i) => i.path.join('.')).join(', ')} — extrait: ${extrait}`);
    }
    return parsed.data;
}
//# sourceMappingURL=chatJson.js.map