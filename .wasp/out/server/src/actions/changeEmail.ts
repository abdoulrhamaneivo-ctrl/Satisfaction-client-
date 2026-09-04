import { prisma } from 'wasp/server'

import { changeEmail } from '../../../../../src/user/accountsActions'


export default async function (args, context) {
  return (changeEmail as any)(args, {
    ...context,
    entities: {
      User: prisma.user,
    },
  })
}
