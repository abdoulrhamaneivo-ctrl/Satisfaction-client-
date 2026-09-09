import { prisma } from 'wasp/server';
import { getAllFilesByUser } from '../../../../../src/file-upload/operations';
export default async function (args, context) {
    return getAllFilesByUser(args, {
        ...context,
        entities: {
            User: prisma.user,
            File: prisma.file,
        },
    });
}
//# sourceMappingURL=getAllFilesByUser.js.map