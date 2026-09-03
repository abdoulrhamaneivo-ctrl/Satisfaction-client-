// src/server/audit.ts
// ============================================================================
// Journal d'audit SaaS (Doc 11 §8) — helper UNIQUE d'écriture AuditLog.
// Toute action sensible passe ici : acteur, action, ressource, IP, UA.
// Les secrets (mots de passe, tokens) ne sont JAMAIS journalisés.
// ============================================================================
/**
 * Écrit une ligne d'audit. Fire-and-forget sûr : un échec d'écriture d'audit
 * est loggué mais ne casse JAMAIS l'opération métier en cours (l'audit ne
 * doit pas rendre la plateforme indisponible). Fire-and-forget = ne pas
 * attendre la promesse dans les actions critiques.
 */
export async function journaliser({ context, action, resource, resource_id = null, entreprise_id = null, details = undefined, }) {
    try {
        const user = context?.user;
        if (!user?.id)
            return; // pas d'acteur identifiable (routes publiques) — pas d'audit
        const req = context?.req ?? context?.request;
        const ip = req?.headers?.['x-forwarded-for']?.split(',')[0]?.trim() ||
            req?.socket?.remoteAddress ||
            null;
        const userAgent = req?.headers?.['user-agent']?.slice(0, 300) || null;
        await context.entities.AuditLog.create({
            data: {
                actor_id: user.id,
                actor_role: user.platformRole && user.platformRole !== 'NONE' ? user.platformRole : (user.role ?? null),
                action,
                resource,
                resource_id: resource_id != null ? String(resource_id) : null,
                entreprise_id: entreprise_id ?? user.id_entreprise ?? null,
                details: details ?? undefined,
                ip,
                user_agent: userAgent,
            },
        });
    }
    catch (e) {
        console.warn('[AUDIT] Échec écriture audit (non bloquant):', e?.message);
    }
}
/** Version fire-and-forget pour les chemins critiques (perf QR). */
export function journaliserAsync(args) {
    void journaliser(args);
}
//# sourceMappingURL=audit.js.map