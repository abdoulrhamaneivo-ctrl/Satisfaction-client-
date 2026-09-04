import type { WaspContext } from './middleware/rowLevelSecurity';
export type AuditAction = 'entreprise.create' | 'entreprise.suspend' | 'entreprise.reactivate' | 'entreprise.update_limits' | 'entreprise.update_infos' | 'user.invite' | 'user.suspend' | 'user.reactivate' | 'invitation.create' | 'invitation.used' | 'invitation.revoked' | 'superadmin.invite' | 'guichet.create' | 'guichet.archive' | 'agence.create' | 'agence.archive' | 'branding.update' | 'criteres.update' | 'login.failed' | 'password.reset_requested' | 'password.reset_done' | '2fa.setup' | '2fa.activate' | '2fa.verify';
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
export declare function journaliser({ context, action, resource, resource_id, entreprise_id, details, }: JournaliserArgs): Promise<void>;
/** Version fire-and-forget pour les chemins critiques (perf QR). */
export declare function journaliserAsync(args: JournaliserArgs): void;
//# sourceMappingURL=audit.d.ts.map