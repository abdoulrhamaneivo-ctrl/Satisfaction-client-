import { prisma } from 'wasp/server'

import { getGuichets } from '../../../../../src/server/queries'


export default async function (args, context) {
  return (getGuichets as any)(args, {
    ...context,
    entities: {
      Guichet: prisma.guichet,
      User: prisma.user,
      Service: prisma.service,
      Agence: prisma.agence,
      Entreprise: prisma.entreprise,
    },
  })
}
