import { prisma } from 'wasp/server';
import { removeCritereFromService } from '../../../../../src/server/actions';
export default async function (args, context) {
    return removeCritereFromService(args, {
        ...context,
        entities: {
            CritereService: prisma.critereService,
            Critere: prisma.critere,
            Service: prisma.service,
            User: prisma.user,
        },
    });
}
//# sourceMappingURL=removeCritereFromService.js.map