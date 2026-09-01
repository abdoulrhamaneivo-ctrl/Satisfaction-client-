import { prisma } from 'wasp/server'

import { getServices } from '../../../../../src/server/queries'


export default async function (args, context) {
  return (getServices as any)(args, {
    ...context,
    entities: {
      Service: prisma.service,
      User: prisma.user,
      Entreprise: prisma.entreprise,
    },
  })
}
