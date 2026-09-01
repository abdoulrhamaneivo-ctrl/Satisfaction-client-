import { prisma } from 'wasp/server'

import { activerCompte } from '../../../../../src/server/actionsPlatform'


export default async function (args, context) {
  return (activerCompte as any)(args, {
    ...context,
    entities: {
      Invitation: prisma.invitation,
      User: prisma.user,
      AuditLog: prisma.auditLog,
    },
  })
}
