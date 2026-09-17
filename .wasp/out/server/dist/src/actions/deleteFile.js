import { prisma } from 'wasp/server';
import { deleteFile } from '../../../../../src/file-upload/operations';
export default async function (args, context) {
    return deleteFile(args, {
        ...context,
        entities: {
            User: prisma.user,
            File: prisma.file,
        },
    });
}
//# sourceMappingURL=deleteFile.js.map