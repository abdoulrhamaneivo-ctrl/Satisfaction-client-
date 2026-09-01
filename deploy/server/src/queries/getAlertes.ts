import { prisma } from 'wasp/server'

import { getAlertes } from '../../../../../src/server/queries'


export default async function (args, context) {
  return (getAlertes as any)(args, {
    ...context,
    entities: {
      Alerte: prisma.alerte,
      Guichet: prisma.guichet,
      Reponse: prisma.reponse,
      User: prisma.user,
      Agence: prisma.agence,
      Entreprise: prisma.entreprise,
    },
  })
}
