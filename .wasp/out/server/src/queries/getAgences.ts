import { prisma } from 'wasp/server'

import { getAgences } from '../../../../../src/server/queries'


export default async function (args, context) {
  return (getAgences as any)(args, {
    ...context,
    entities: {
      Agence: prisma.agence,
      User: prisma.user,
      Entreprise: prisma.entreprise,
    },
  })
}
