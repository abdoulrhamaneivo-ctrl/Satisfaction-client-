import { prisma } from 'wasp/server';
import { completerSoumissionPublic } from '../../../../../src/server/actions';
export default async function (args, context) {
    return completerSoumissionPublic(args, {
        ...context,
        entities: {
            Reponse: prisma.reponse,
            Guichet: prisma.guichet,
            Agence: prisma.agence,
            VoteAntiRejeu: prisma.voteAntiRejeu,
            AnalyseAvisIA: prisma.analyseAvisIA,
            ContactRappel: prisma.contactRappel,
        },
    });
}
//# sourceMappingURL=completerSoumission.js.map