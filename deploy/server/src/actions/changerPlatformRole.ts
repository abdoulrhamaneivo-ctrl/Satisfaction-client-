import { prisma } from 'wasp/server'

import { changerPlatformRole } from '../../../../../src/server/actionsPlatform'


export default async function (args, context) {
  return (changerPlatformRole as any)(args, {
    ...context,
    entities: {
      User: prisma.user,
      AuditLog: prisma.auditLog,
    },
  })
}
