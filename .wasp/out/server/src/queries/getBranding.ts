import { prisma } from 'wasp/server'

import { getBranding } from '../../../../../src/server/queries'


export default async function (args, context) {
  return (getBranding as any)(args, {
    ...context,
    entities: {
      BrandingConfig: prisma.brandingConfig,
      User: prisma.user,
      Entreprise: prisma.entreprise,
    },
  })
}
