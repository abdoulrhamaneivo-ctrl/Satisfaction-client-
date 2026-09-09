import { prisma } from 'wasp/server';
import { getDownloadFileSignedURL } from '../../../../../src/file-upload/operations';
export default async function (args, context) {
    return getDownloadFileSignedURL(args, {
        ...context,
        entities: {
            User: prisma.user,
            File: prisma.file,
        },
    });
}
//# sourceMappingURL=getDownloadFileSignedURL.js.map