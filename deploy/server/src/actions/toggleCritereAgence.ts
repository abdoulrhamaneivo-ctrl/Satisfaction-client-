import { prisma } from 'wasp/server'

import { toggleCritereAgence } from '../../../../../src/server/actions'


export default async function (args, context) {
  return (toggleCritereAgence as any)(args, {
    ...context,
    entities: {
      AgenceCritere: prisma.agenceCritere,
      User: prisma.user,
      Agence: prisma.agence,
    },
  })
}
