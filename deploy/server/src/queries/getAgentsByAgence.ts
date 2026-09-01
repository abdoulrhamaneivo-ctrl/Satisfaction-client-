import { prisma } from 'wasp/server'

import { getAgentsByAgence } from '../../../../../src/server/queries'


export default async function (args, context) {
  return (getAgentsByAgence as any)(args, {
    ...context,
    entities: {
      User: prisma.user,
      Agence: prisma.agence,
      Entreprise: prisma.entreprise,
    },
  })
}
