import { prisma } from 'wasp/server';
import { retirerAgencePilotee } from '../../../../../src/server/actions';
export default async function (args, context) {
    return retirerAgencePilotee(args, {
        ...context,
        entities: {
            User: prisma.user,
            Entreprise: prisma.entreprise,
        },
    });
}
//# sourceMappingURL=retirerAgencePilotee.js.map