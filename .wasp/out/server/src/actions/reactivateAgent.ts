import { prisma } from 'wasp/server'

import { reactivateAgent } from '../../../../../src/server/actions'


export default async function (args, context) {
  return (reactivateAgent as any)(args, {
    ...context,
    entities: {
      User: prisma.user,
      Agence: prisma.agence,
      Entreprise: prisma.entreprise,
    },
  })
}
