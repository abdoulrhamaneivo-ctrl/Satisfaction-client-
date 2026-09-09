import { prisma } from 'wasp/server';
import { demanderReinitialisation } from '../../../../../src/server/actions';
export default async function (args, context) {
    return demanderReinitialisation(args, {
        ...context,
        entities: {
            User: prisma.user,
            Invitation: prisma.invitation,
        },
    });
}
//# sourceMappingURL=demanderReinitialisation.js.map