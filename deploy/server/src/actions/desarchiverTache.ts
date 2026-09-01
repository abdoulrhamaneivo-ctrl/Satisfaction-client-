import { prisma } from 'wasp/server'

import { desarchiverTache } from '../../../../../src/server/actions'


export default async function (args, context) {
  return (desarchiverTache as any)(args, {
    ...context,
    entities: {
      TacheCorrective: prisma.tacheCorrective,
      Alerte: prisma.alerte,
      Guichet: prisma.guichet,
      Reponse: prisma.reponse,
      User: prisma.user,
      Agence: prisma.agence,
    },
  })
}
