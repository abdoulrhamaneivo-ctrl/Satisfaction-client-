import { prisma } from 'wasp/server'

import { reactiverEntreprise } from '../../../../../src/server/actionsPlatform'


export default async function (args, context) {
  return (reactiverEntreprise as any)(args, {
    ...context,
    entities: {
      Entreprise: prisma.entreprise,
      AuditLog: prisma.auditLog,
    },
  })
}
