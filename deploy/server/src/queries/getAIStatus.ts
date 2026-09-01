import { prisma } from 'wasp/server'

import { getAIStatus } from '../../../../../src/server/queries'


export default async function (args, context) {
  return (getAIStatus as any)(args, {
    ...context,
    entities: {
      AnalyseAvisIA: prisma.analyseAvisIA,
      Entreprise: prisma.entreprise,
    },
  })
}
