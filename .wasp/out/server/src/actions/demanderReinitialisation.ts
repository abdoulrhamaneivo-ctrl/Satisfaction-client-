import { prisma } from 'wasp/server'

import { demanderReinitialisation } from '../../../../../src/server/actions'


export default async function (args, context) {
  return (demanderReinitialisation as any)(args, {
    ...context,
    entities: {
      User: prisma.user,
      Invitation: prisma.invitation,
    },
  })
}
