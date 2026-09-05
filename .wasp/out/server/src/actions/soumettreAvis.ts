import { prisma } from 'wasp/server'

import { soumettreAvis } from '../../../../../src/server/actions'


export default async function (args, context) {
  return (soumettreAvis as any)(args, {
    ...context,
    entities: {
      Reponse: prisma.reponse,
      Critere: prisma.critere,
      AgenceCritere: prisma.agenceCritere,
      CritereService: prisma.critereService,
      Guichet: prisma.guichet,
      AffectationGuichet: prisma.affectationGuichet,
      Alerte: prisma.alerte,
      VoteAntiRejeu: prisma.voteAntiRejeu,
      Service: prisma.service,
      User: prisma.user,
      AnalyseAvisIA: prisma.analyseAvisIA,
      Canal: prisma.canal,
    },
  })
}
