import { prisma } from 'wasp/server'

import { removeCritereFromService } from '../../../../../src/server/actions'


export default async function (args, context) {
  return (removeCritereFromService as any)(args, {
    ...context,
    entities: {
      CritereService: prisma.critereService,
      Critere: prisma.critere,
      Service: prisma.service,
      User: prisma.user,
      Entreprise: prisma.entreprise,
    },
  })
}
