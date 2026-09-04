import { prisma } from 'wasp/server';
import { updateProfile } from '../../../../../src/user/accountsActions';
export default async function (args, context) {
    return updateProfile(args, {
        ...context,
        entities: {
            User: prisma.user,
        },
    });
}
//# sourceMappingURL=updateProfile.js.map