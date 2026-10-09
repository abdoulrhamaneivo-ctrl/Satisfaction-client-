import { prisma } from 'wasp/server'

import { marquerContactRappelTraite } from '../../../../../src/server/actions'


export default async function (args, context) {
  return (marquerContactRappelTraite as any)(args, {
    ...context,
    entities: {
      ContactRappel: prisma.contactRappel,
      Reponse: prisma.reponse,
      User: prisma.user,
      Agence: prisma.agence,
      Entreprise: prisma.entreprise,
    },
  })
}
