import { prisma } from 'wasp/server';
import { createService } from '../../../../../src/server/actions';
export default async function (args, context) {
    return createService(args, {
        ...context,
        entities: {
            Service: prisma.service,
            User: prisma.user,
        },
    });
}
//# sourceMappingURL=createService.js.map