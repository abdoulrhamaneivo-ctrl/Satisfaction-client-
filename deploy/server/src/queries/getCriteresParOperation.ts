import { prisma } from 'wasp/server'

import { getCriteresParOperation } from '../../../../../src/server/queries'


export default async function (args, context) {
  return (getCriteresParOperation as any)(args, {
    ...context,
    entities: {
      Service: prisma.service,
      Critere: prisma.critere,
      CritereService: prisma.critereService,
      AgenceCritere: prisma.agenceCritere,
      User: prisma.user,
      Agence: prisma.agence,
      Entreprise: prisma.entreprise,
    },
  })
}
