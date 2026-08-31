// src/server/audit.ts
// ============================================================================
// Journal d'audit SaaS (Doc 11 §8) — helper UNIQUE d'écriture AuditLog.
// Toute action sensible passe ici : acteur, action, ressource, IP, UA.
// Les secrets (mots de passe, tokens) ne sont JAMAIS journalisés.
// ============================================================================

import type { WaspContext } from './middleware/rowLevelSecurity';

export type AuditAction =
  | 'entreprise.create'
  | 'entreprise.suspend'
  | 'entreprise.reactivate'
  | 'entreprise.update_limits'
  | 'entreprise.update_infos'
  | 'user.invite'
  | 'user.suspend'
  | 'user.reactivate'
  | 'invitation.create'
  | 'invitation.used'
  | 'invitation.revoked'
  | 'superadmin.invite'
  | 'guichet.create'
  | 'guichet.archive'
  | 'agence.create'
  | 'agence.archive'
  | 'branding.update'
  | 'criteres.update'
  | 'login.failed'
  | 'password.reset_requested'
  | 'password.reset_done';

export interface JournaliserArgs {
  context: WaspContext;
  action: AuditAction;
  resource: string;
  resource_id?: string | number | null;
  entreprise_id?: number | null;
  details?: Record<string, unknown>;
}

/**
 * Écrit une ligne d'audit. Fire-and-forget sûr : un échec d'écriture d'audit
 * est loggué mais ne casse JAMAIS l'opération métier en cours (l'audit ne
 * doit pas rendre la plateforme indisponible). Fire-and-forget = ne pas
 * attendre la promesse dans les actions critiques.
 */
export async function journaliser({
  context,
  action,
  resource,
  resource_id = null,
  entreprise_id = null,
  details = undefined,
}: JournaliserArgs): Promise<void> {
  try {
    const user = (context as any)?.user;
    if (!user?.id) return; // pas d'acteur identifiable (routes publiques) — pas d'audit

    const req = (context as any)?.req ?? (context as any)?.request;
    const ip =
      req?.headers?.['x-forwarded-for']?.split(',')[0]?.trim() ||
      req?.socket?.remoteAddress ||
      null;
    const userAgent = req?.headers?.['user-agent']?.slice(0, 300) || null;

    await (context as any).entities.AuditLog.create({
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
  } catch (e: any) {
    console.warn('[AUDIT] Échec écriture audit (non bloquant):', e?.message);
  }
}

/** Version fire-and-forget pour les chemins critiques (perf QR). */
export function journaliserAsync(args: JournaliserArgs): void {
  void journaliser(args);
}
