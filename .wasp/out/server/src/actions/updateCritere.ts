import { prisma } from 'wasp/server'

import { updateCritere } from '../../../../../src/server/actions'


export default async function (args, context) {
  return (updateCritere as any)(args, {
    ...context,
    entities: {
      Critere: prisma.critere,
      User: prisma.user,
      Entreprise: prisma.entreprise,
    },
  })
}
