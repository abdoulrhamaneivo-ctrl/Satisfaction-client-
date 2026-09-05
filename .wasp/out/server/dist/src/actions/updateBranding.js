import { prisma } from 'wasp/server';
import { updateBranding } from '../../../../../src/server/actions';
export default async function (args, context) {
    return updateBranding(args, {
        ...context,
        entities: {
            BrandingConfig: prisma.brandingConfig,
            User: prisma.user,
            Entreprise: prisma.entreprise,
            AuditLog: prisma.auditLog,
        },
    });
}
//# sourceMappingURL=updateBranding.js.map