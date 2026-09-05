import { prisma } from 'wasp/server'

import { updateAffectationGuichet } from '../../../../../src/server/actions'


export default async function (args, context) {
  return (updateAffectationGuichet as any)(args, {
    ...context,
    entities: {
      User: prisma.user,
      AffectationGuichet: prisma.affectationGuichet,
      Guichet: prisma.guichet,
      Agence: prisma.agence,
      Entreprise: prisma.entreprise,
    },
  })
}
