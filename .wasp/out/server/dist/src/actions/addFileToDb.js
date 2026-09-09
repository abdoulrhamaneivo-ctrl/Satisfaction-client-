import { prisma } from 'wasp/server';
import { addFileToDb } from '../../../../../src/file-upload/operations';
export default async function (args, context) {
    return addFileToDb(args, {
        ...context,
        entities: {
            User: prisma.user,
            File: prisma.file,
        },
    });
}
//# sourceMappingURL=addFileToDb.js.map