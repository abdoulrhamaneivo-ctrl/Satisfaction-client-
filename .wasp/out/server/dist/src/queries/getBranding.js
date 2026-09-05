import { prisma } from 'wasp/server';
import { getBranding } from '../../../../../src/server/queries';
export default async function (args, context) {
    return getBranding(args, {
        ...context,
        entities: {
            BrandingConfig: prisma.brandingConfig,
            User: prisma.user,
            Entreprise: prisma.entreprise,
        },
    });
}
//# sourceMappingURL=getBranding.js.map