import { prisma } from 'wasp/server';
import { getPlatformOverview } from '../../../../../src/server/queriesPlatform';
export default async function (args, context) {
    return getPlatformOverview(args, {
        ...context,
        entities: {
            Entreprise: prisma.entreprise,
            User: prisma.user,
            Reponse: prisma.reponse,
        },
    });
}
//# sourceMappingURL=getPlatformOverview.js.map