import { prisma } from 'wasp/server'

import { getRadarStats } from '../../../../../src/server/queries'


export default async function (args, context) {
  return (getRadarStats as any)(args, {
    ...context,
    entities: {
      User: prisma.user,
      Guichet: prisma.guichet,
      AffectationGuichet: prisma.affectationGuichet,
      Reponse: prisma.reponse,
      Alerte: prisma.alerte,
      TacheCorrective: prisma.tacheCorrective,
      Agence: prisma.agence,
      Entreprise: prisma.entreprise,
    },
  })
}
