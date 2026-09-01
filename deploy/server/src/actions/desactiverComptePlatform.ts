import { prisma } from 'wasp/server'

import { desactiverComptePlatform } from '../../../../../src/server/actionsPlatform'


export default async function (args, context) {
  return (desactiverComptePlatform as any)(args, {
    ...context,
    entities: {
      User: prisma.user,
      AuditLog: prisma.auditLog,
    },
  })
}
