import { prisma } from 'wasp/server'

import { getAvisGroupes } from '../../../../../src/server/queries'


export default async function (args, context) {
  return (getAvisGroupes as any)(args, {
    ...context,
    entities: {
      Reponse: prisma.reponse,
      Critere: prisma.critere,
      Guichet: prisma.guichet,
      Service: prisma.service,
      Agence: prisma.agence,
      User: prisma.user,
      Entreprise: prisma.entreprise,
    },
  })
}
