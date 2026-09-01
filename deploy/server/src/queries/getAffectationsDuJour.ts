import { prisma } from 'wasp/server'

import { getAffectationsDuJour } from '../../../../../src/server/queries'


export default async function (args, context) {
  return (getAffectationsDuJour as any)(args, {
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
