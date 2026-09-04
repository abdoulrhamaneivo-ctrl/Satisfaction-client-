import { prisma } from 'wasp/server'

import { updateProfile } from '../../../../../src/user/accountsActions'


export default async function (args, context) {
  return (updateProfile as any)(args, {
    ...context,
    entities: {
      User: prisma.user,
    },
  })
}
