import { prisma } from 'wasp/server';
import { changeEmail } from '../../../../../src/user/accountsActions';
export default async function (args, context) {
    return changeEmail(args, {
        ...context,
        entities: {
            User: prisma.user,
        },
    });
}
//# sourceMappingURL=changeEmail.js.map