import { prisma } from 'wasp/server'

import { getPlatformMe } from '../../../../../src/server/queriesPlatform'


export default async function (args, context) {
  return (getPlatformMe as any)(args, {
    ...context,
    entities: {
      User: prisma.user,
    },
  })
}
