import { prisma } from 'wasp/server'

import { deleteAgent } from '../../../../../src/server/actions'


export default async function (args, context) {
  return (deleteAgent as any)(args, {
    ...context,
    entities: {
      User: prisma.user,
      Agence: prisma.agence,
    },
  })
}
