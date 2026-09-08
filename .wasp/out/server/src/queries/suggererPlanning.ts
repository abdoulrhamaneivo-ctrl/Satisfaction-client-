import { prisma } from 'wasp/server'

import { suggererPlanning } from '../../../../../src/server/planning'


export default async function (args, context) {
  return (suggererPlanning as any)(args, {
    ...context,
    entities: {
      AffectationGuichet: prisma.affectationGuichet,
      ModeleHoraire: prisma.modeleHoraire,
      Guichet: prisma.guichet,
      User: prisma.user,
      Agence: prisma.agence,
      Entreprise: prisma.entreprise,
    },
  })
}
