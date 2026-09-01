import { prisma } from 'wasp/server'

import { changePassword } from '../../../../../src/user/accountsActions'


export default async function (args, context) {
  return (changePassword as any)(args, {
    ...context,
    entities: {
      User: prisma.user,
    },
  })
}
