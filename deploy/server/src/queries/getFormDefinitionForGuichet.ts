import { prisma } from 'wasp/server'

import { getFormDefinitionForGuichet } from '../../../../../src/server/queries'


export default async function (args, context) {
  return (getFormDefinitionForGuichet as any)(args, {
    ...context,
    entities: {
      Guichet: prisma.guichet,
      AgenceCritere: prisma.agenceCritere,
      Critere: prisma.critere,
      Service: prisma.service,
      CritereService: prisma.critereService,
      Entreprise: prisma.entreprise,
      BrandingConfig: prisma.brandingConfig,
    },
  })
}
