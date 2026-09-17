import { prisma } from 'wasp/server';
import { definirAgencePilotee } from '../../../../../src/server/actions';
export default async function (args, context) {
    return definirAgencePilotee(args, {
        ...context,
        entities: {
            Agence: prisma.agence,
            User: prisma.user,
            Entreprise: prisma.entreprise,
        },
    });
}
//# sourceMappingURL=definirAgencePilotee.js.map