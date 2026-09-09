import { prisma } from 'wasp/server';
import { createFileUploadUrl } from '../../../../../src/file-upload/operations';
export default async function (args, context) {
    return createFileUploadUrl(args, {
        ...context,
        entities: {
            User: prisma.user,
            File: prisma.file,
        },
    });
}
//# sourceMappingURL=createFileUploadUrl.js.map