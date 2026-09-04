import { prisma } from 'wasp/server'

import { createService } from '../../../../../src/server/actions'


export default async function (args, context) {
  return (createService as any)(args, {
    ...context,
    entities: {
      Service: prisma.service,
      User: prisma.user,
    },
  })
}
