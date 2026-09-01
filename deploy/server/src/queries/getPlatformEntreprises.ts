import { prisma } from 'wasp/server'

import { getPlatformEntreprises } from '../../../../../src/server/queriesPlatform'


export default async function (args, context) {
  return (getPlatformEntreprises as any)(args, {
    ...context,
    entities: {
      Entreprise: prisma.entreprise,
      User: prisma.user,
    },
  })
}
