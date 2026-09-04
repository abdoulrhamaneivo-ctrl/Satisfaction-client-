import { prisma } from 'wasp/server'

import { getRechercheGlobale } from '../../../../../src/server/queries'


export default async function (args, context) {
  return (getRechercheGlobale as any)(args, {
    ...context,
    entities: {
      Agence: prisma.agence,
      Guichet: prisma.guichet,
      User: prisma.user,
      Reponse: prisma.reponse,
      Entreprise: prisma.entreprise,
    },
  })
}
