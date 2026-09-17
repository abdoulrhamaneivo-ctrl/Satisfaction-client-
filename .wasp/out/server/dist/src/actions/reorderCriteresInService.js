import { prisma } from 'wasp/server';
import { reorderCriteresInService } from '../../../../../src/server/actions';
export default async function (args, context) {
    return reorderCriteresInService(args, {
        ...context,
        entities: {
            CritereService: prisma.critereService,
            Service: prisma.service,
            User: prisma.user,
            Entreprise: prisma.entreprise,
        },
    });
}
//# sourceMappingURL=reorderCriteresInService.js.map