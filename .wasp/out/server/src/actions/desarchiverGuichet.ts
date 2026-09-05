import { prisma } from 'wasp/server'

import { desarchiverGuichet } from '../../../../../src/server/actions'


export default async function (args, context) {
  return (desarchiverGuichet as any)(args, {
    ...context,
    entities: {
      Guichet: prisma.guichet,
      User: prisma.user,
      Agence: prisma.agence,
      Entreprise: prisma.entreprise,
    },
  })
}
