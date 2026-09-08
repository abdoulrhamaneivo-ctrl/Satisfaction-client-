import { prisma } from 'wasp/server'

import { getModelesHoraires } from '../../../../../src/server/planning'


export default async function (args, context) {
  return (getModelesHoraires as any)(args, {
    ...context,
    entities: {
      ModeleHoraire: prisma.modeleHoraire,
      Guichet: prisma.guichet,
      User: prisma.user,
      Agence: prisma.agence,
      Entreprise: prisma.entreprise,
    },
  })
}
