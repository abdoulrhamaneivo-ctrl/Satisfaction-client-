import { prisma } from 'wasp/server'

import { desarchiverAgence } from '../../../../../src/server/actions'


export default async function (args, context) {
  return (desarchiverAgence as any)(args, {
    ...context,
    entities: {
      Agence: prisma.agence,
      User: prisma.user,
    },
  })
}
