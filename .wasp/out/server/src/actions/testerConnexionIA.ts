import { prisma } from 'wasp/server'

import { testerConnexionIA } from '../../../../../src/server/actions'


export default async function (args, context) {
  return (testerConnexionIA as any)(args, {
    ...context,
    entities: {
      User: prisma.user,
      Entreprise: prisma.entreprise,
    },
  })
}
