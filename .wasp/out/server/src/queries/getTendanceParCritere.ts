import { prisma } from 'wasp/server'

import { getTendanceParCritere } from '../../../../../src/server/queries'


export default async function (args, context) {
  return (getTendanceParCritere as any)(args, {
    ...context,
    entities: {
      Reponse: prisma.reponse,
      Critere: prisma.critere,
      OptionCritere: prisma.optionCritere,
      ReponseOption: prisma.reponseOption,
      User: prisma.user,
      Agence: prisma.agence,
      Entreprise: prisma.entreprise,
    },
  })
}
