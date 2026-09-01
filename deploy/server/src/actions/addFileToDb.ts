import { prisma } from 'wasp/server'

import { addFileToDb } from '../../../../../src/file-upload/operations'


export default async function (args, context) {
  return (addFileToDb as any)(args, {
    ...context,
    entities: {
      User: prisma.user,
      File: prisma.file,
    },
  })
}
