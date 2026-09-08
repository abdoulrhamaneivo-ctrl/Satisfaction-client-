import { prisma } from 'wasp/server'

import { appliquerSuggestion } from '../../../../../src/server/planning'


export default async function (args, context) {
  return (appliquerSuggestion as any)(args, {
    ...context,
    entities: {
      AffectationGuichet: prisma.affectationGuichet,
      Guichet: prisma.guichet,
      User: prisma.user,
      Agence: prisma.agence,
      Entreprise: prisma.entreprise,
    },
  })
}
