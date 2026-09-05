import { prisma } from 'wasp/server'

import { duplicateCritere } from '../../../../../src/server/actions'


export default async function (args, context) {
  return (duplicateCritere as any)(args, {
    ...context,
    entities: {
      Critere: prisma.critere,
      AgenceCritere: prisma.agenceCritere,
      CritereService: prisma.critereService,
      Agence: prisma.agence,
      Service: prisma.service,
      User: prisma.user,
      Entreprise: prisma.entreprise,
    },
  })
}
