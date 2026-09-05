import { prisma } from 'wasp/server'

import { archiverCritere } from '../../../../../src/server/actions'


export default async function (args, context) {
  return (archiverCritere as any)(args, {
    ...context,
    entities: {
      Critere: prisma.critere,
      User: prisma.user,
      Entreprise: prisma.entreprise,
    },
  })
}
