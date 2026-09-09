import { prisma } from 'wasp/server';
import { deleteModeleHoraire } from '../../../../../src/server/planning';
export default async function (args, context) {
    return deleteModeleHoraire(args, {
        ...context,
        entities: {
            ModeleHoraire: prisma.modeleHoraire,
            Agence: prisma.agence,
            Entreprise: prisma.entreprise,
        },
    });
}
//# sourceMappingURL=deleteModeleHoraire.js.map