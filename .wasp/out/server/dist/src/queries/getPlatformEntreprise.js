import { prisma } from 'wasp/server';
import { getPlatformEntreprise } from '../../../../../src/server/queriesPlatform';
export default async function (args, context) {
    return getPlatformEntreprise(args, {
        ...context,
        entities: {
            Entreprise: prisma.entreprise,
            User: prisma.user,
            Agence: prisma.agence,
            Guichet: prisma.guichet,
            Reponse: prisma.reponse,
            Invitation: prisma.invitation,
            AuditLog: prisma.auditLog,
        },
    });
}
//# sourceMappingURL=getPlatformEntreprise.js.map