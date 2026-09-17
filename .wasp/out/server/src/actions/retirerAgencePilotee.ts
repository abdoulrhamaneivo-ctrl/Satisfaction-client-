import { prisma } from 'wasp/server'

import { retirerAgencePilotee } from '../../../../../src/server/actions'


export default async function (args, context) {
  return (retirerAgencePilotee as any)(args, {
    ...context,
    entities: {
      User: prisma.user,
      Entreprise: prisma.entreprise,
    },
  })
}
