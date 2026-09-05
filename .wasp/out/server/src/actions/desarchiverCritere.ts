import { prisma } from 'wasp/server'

import { desarchiverCritere } from '../../../../../src/server/actions'


export default async function (args, context) {
  return (desarchiverCritere as any)(args, {
    ...context,
    entities: {
      Critere: prisma.critere,
      User: prisma.user,
      Entreprise: prisma.entreprise,
    },
  })
}
