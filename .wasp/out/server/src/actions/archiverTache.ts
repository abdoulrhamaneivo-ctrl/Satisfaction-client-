import { prisma } from 'wasp/server'

import { archiverTache } from '../../../../../src/server/actions'


export default async function (args, context) {
  return (archiverTache as any)(args, {
    ...context,
    entities: {
      TacheCorrective: prisma.tacheCorrective,
      Alerte: prisma.alerte,
      Guichet: prisma.guichet,
      Reponse: prisma.reponse,
      User: prisma.user,
      Agence: prisma.agence,
      Entreprise: prisma.entreprise,
    },
  })
}
