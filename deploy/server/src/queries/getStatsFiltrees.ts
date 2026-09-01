import { prisma } from 'wasp/server'

import { getStatsFiltrees } from '../../../../../src/server/queries'


export default async function (args, context) {
  return (getStatsFiltrees as any)(args, {
    ...context,
    entities: {
      Reponse: prisma.reponse,
      User: prisma.user,
      Agence: prisma.agence,
      Entreprise: prisma.entreprise,
    },
  })
}
