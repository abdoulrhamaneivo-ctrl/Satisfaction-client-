import { prisma } from 'wasp/server';
import { moveCritereToService } from '../../../../../src/server/actions';
export default async function (args, context) {
    return moveCritereToService(args, {
        ...context,
        entities: {
            CritereService: prisma.critereService,
            Critere: prisma.critere,
            Service: prisma.service,
            User: prisma.user,
            Entreprise: prisma.entreprise,
        },
    });
}
//# sourceMappingURL=moveCritereToService.js.map