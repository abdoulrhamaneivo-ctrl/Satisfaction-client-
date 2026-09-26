// src/server/audit.ts
// ============================================================================
// Journal d'audit SaaS (Doc 11 §8) — helper UNIQUE d'écriture AuditLog.
// Toute action sensible passe ici : acteur, action, ressource, IP, UA.
// Les secrets (mots de passe, tokens) ne sont JAMAIS journalisés.
// ============================================================================
import { extraireIp } from './rateLimit';
/**
 * Écrit une ligne d'audit. Fire-and-forget sûr : un échec d'écriture d'audit
 * est loggué mais ne casse JAMAIS l'opération métier en cours (l'audit ne
 * doit pas rendre la plateforme indisponible). Fire-and-forget = ne pas
 * attendre la promesse dans les actions critiques.
 * Pour les routes publiques (collecte), on logue avec actor_id = 'public'.
 */
export async function journaliser({ context, action, resource, resource_id = null, entreprise_id = null, details = undefined, }) {
    try {
        const user = context?.user;
        // Vague 5, P11-e : l'IP vient d'Express, qui applique la confiance
        // déclarée (`app.set('trust proxy', …)`), et non d'une lecture directe
        // de `x-forwarded-for`. Cette ligne était la troisième copie de la
        // même logique — et c'est celle qui écrivait dans les journaux une IP
        // que l'appelant pouvait choisir librement.
        const ipBrute = extraireIp(context);
        const ip = ipBrute === 'inconnue' ? null : ipBrute;
        const req = context?.req ?? context?.request;
        const userAgent = req?.headers?.['user-agent']?.slice(0, 300) || null;
        await context.entities.AuditLog.create({
            data: {
                actor_id: user?.id ?? 'public',
                actor_role: user?.platformRole && user?.platformRole !== 'NONE' ? user?.platformRole : (user?.role ?? null),
                action,
                resource,
                resource_id: resource_id != null ? String(resource_id) : null,
                entreprise_id: entreprise_id ?? user?.id_entreprise ?? null,
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
