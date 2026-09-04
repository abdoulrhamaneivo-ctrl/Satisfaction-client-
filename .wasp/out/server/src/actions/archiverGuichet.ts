import { prisma } from 'wasp/server'

import { archiverGuichet } from '../../../../../src/server/actions'


export default async function (args, context) {
  return (archiverGuichet as any)(args, {
    ...context,
    entities: {
      Guichet: prisma.guichet,
      User: prisma.user,
      Agence: prisma.agence,
    },
  })
}
