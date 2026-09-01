import { prisma } from 'wasp/server'

import { changerLimitesEntreprise } from '../../../../../src/server/actionsPlatform'


export default async function (args, context) {
  return (changerLimitesEntreprise as any)(args, {
    ...context,
    entities: {
      Entreprise: prisma.entreprise,
      AuditLog: prisma.auditLog,
    },
  })
}
