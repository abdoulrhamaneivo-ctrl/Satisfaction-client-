import { prisma } from 'wasp/server'

import { getContactRappel } from '../../../../../src/server/queries'


export default async function (args, context) {
  return (getContactRappel as any)(args, {
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
