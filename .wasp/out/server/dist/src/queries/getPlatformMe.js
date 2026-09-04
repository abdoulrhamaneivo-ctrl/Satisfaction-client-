import { prisma } from 'wasp/server';
import { getPlatformMe } from '../../../../../src/server/queriesPlatform';
export default async function (args, context) {
    return getPlatformMe(args, {
        ...context,
        entities: {
            User: prisma.user,
        },
    });
}
//# sourceMappingURL=getPlatformMe.js.map