import { prisma } from 'wasp/server'

import { upsertObjectif } from '../../../../../src/server/actions'


export default async function (args, context) {
  return (upsertObjectif as any)(args, {
    ...context,
    entities: {
      Objectif: prisma.objectif,
      Agence: prisma.agence,
      Critere: prisma.critere,
      User: prisma.user,
      Entreprise: prisma.entreprise,
    },
  })
}
