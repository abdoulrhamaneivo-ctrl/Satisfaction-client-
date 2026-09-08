import { prisma } from 'wasp/server'

import { genererPlanning } from '../../../../../src/server/planning'


export default async function (args, context) {
  return (genererPlanning as any)(args, {
    ...context,
    entities: {
      ModeleHoraire: prisma.modeleHoraire,
      AffectationGuichet: prisma.affectationGuichet,
      Guichet: prisma.guichet,
      User: prisma.user,
      Agence: prisma.agence,
      Entreprise: prisma.entreprise,
    },
  })
}
