import { prisma } from 'wasp/server'

import { deleteObjectif } from '../../../../../src/server/actions'


export default async function (args, context) {
  return (deleteObjectif as any)(args, {
    ...context,
    entities: {
      Objectif: prisma.objectif,
      Agence: prisma.agence,
      User: prisma.user,
      Entreprise: prisma.entreprise,
    },
  })
}
