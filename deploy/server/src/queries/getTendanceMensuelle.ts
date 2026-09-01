import { prisma } from 'wasp/server'

import { getTendanceMensuelle } from '../../../../../src/server/queries'


export default async function (args, context) {
  return (getTendanceMensuelle as any)(args, {
    ...context,
    entities: {
      Reponse: prisma.reponse,
      User: prisma.user,
      Agence: prisma.agence,
      Entreprise: prisma.entreprise,
    },
  })
}
