// src/server/gabarits.ts
// ============================================================================
// Task 2 — Gabarits Express-30s / Qualité-45s.
//
// Pas de table Template : les gabarits sont des `Service` seedés avec leurs
// critères (1 critère = 1 seul service — contrainte actions.ts, chaque
// critère gabarit n'est rattaché qu'à SON service, jamais partagé).
// Convention « Autre (précisez) » : code_metier AUTRE_LIBRE, 1 max par
// critère, est_scorable=false, score=null, poids=0, jamais EXCLUSIF.
//
// Specs pures (testées verbatim dans gabarits.test.ts) + `seedGabarits`
// idempotent (skip si existent, upsert des liaisons).
// ============================================================================

import { normaliserLibelle } from '../shared/scoringQCM';

export type SpecOption = {
  libelle: string;
  est_scorable: boolean;
  score: number | null;
  poids: number | null;
  code_metier: string | null;
};

export type SpecCritere = {
  libelle_critere: string;
  description?: string | null;
  type_reponse: 'SMILEY' | 'QCM' | 'TEXTE' | 'NPS' | 'CASES';
  scoring_mode?: string | null;
  obligatoire: boolean;
  options: SpecOption[];
};

export type SpecService = {
  libelle_service: string;
  criteres: SpecCritere[];
};

/** Option catégorielle (jamais notée, stats de répartition uniquement). */
const categorielle = (libelle: string): SpecOption => ({
  libelle, est_scorable: false, score: null, poids: null, code_metier: null,
});

/** « Autre (précisez) » : saisie libre, convention Task 2. */
const autreLibre = (): SpecOption => ({
  libelle: 'Autre (précisez)', est_scorable: false, score: null, poids: 0,
  code_metier: 'AUTRE_LIBRE',
});

export const GABARIT_EXPRESS: SpecService = {
  libelle_service: 'Express-30s',
  criteres: [
    {
      libelle_critere: "Passage aujourd'hui",
      type_reponse: 'SMILEY', obligatoire: true, options: [],
    },
    {
      libelle_critere: 'Attente',
      type_reponse: 'QCM', obligatoire: true,
      options: [
        categorielle('Moins de 10 min'),
        categorielle('Entre 10 et 30 min'),
        categorielle('Plus de 30 min'),
      ],
    },
    {
      libelle_critere: 'Motif',
      type_reponse: 'QCM', obligatoire: true,
      options: [
        categorielle('Envoi / Retrait colis ou courrier'),
        categorielle('Services financiers / Mandat / Paiement'),
        categorielle('Boîte postale / Gestion de compte'),
        autreLibre(),
      ],
    },
    {
      libelle_critere: 'Commentaire ou suggestion',
      type_reponse: 'TEXTE', obligatoire: false, options: [],
    },
  ],
};

export const GABARIT_QUALITE: SpecService = {
  libelle_service: 'Qualité-45s',
  criteres: [
    {
      libelle_critere: "L'agent au guichet a-t-il répondu efficacement à votre demande ?",
      type_reponse: 'SMILEY', obligatoire: true, options: [],
    },
    {
      libelle_critere: 'Politesse et clarté',
      type_reponse: 'SMILEY', obligatoire: true, options: [],
    },
    {
      libelle_critere: 'Recommanderiez-vous',
      type_reponse: 'NPS', obligatoire: true, options: [],
    },
    {
      libelle_critere: 'Problème spécifique',
      type_reponse: 'CASES', scoring_mode: 'CASES_CATEGORICAL', obligatoire: true,
      options: [
        categorielle('Panne réseau / Système indisponible'),
        categorielle('Absence monnaie / liquidités'),
        categorielle('File mal organisée'),
        {
          libelle: 'Aucun problème', est_scorable: false, score: null, poids: 0,
          code_metier: 'EXCLUSIF',
        },
        autreLibre(),
      ],
    },
  ],
};

/**
 * Crée les 2 services + 8 critères + liaisons (CritereService avec ordre,
 * AgenceCritere). Idempotent : relançable sans doublon.
 *
 * Garde 1-critère=1-service : un critère préexistant déjà rattaché à un
 * AUTRE service n'est jamais re-rattaché (pas de contournement).
 */
export async function seedGabarits(
  prisma: any,
  idEntreprise: number,
  idAgence: number,
): Promise<void> {
  for (const spec of [GABARIT_EXPRESS, GABARIT_QUALITE]) {
    let service = await prisma.service.findFirst({
      where: { libelle_service: spec.libelle_service, id_entreprise: idEntreprise },
    });
    if (!service) {
      service = await prisma.service.create({
        data: { libelle_service: spec.libelle_service, id_entreprise: idEntreprise },
      });
    }

    let ordre = 0;
    for (const c of spec.criteres) {
      let critere = await prisma.critere.findFirst({
        where: { libelle_critere: c.libelle_critere, id_entreprise: idEntreprise },
      });
      if (!critere) {
        critere = await prisma.critere.create({
          data: {
            libelle_critere: c.libelle_critere,
            description: c.description ?? null,
            type_reponse: c.type_reponse,
            scoring_mode: c.scoring_mode ?? null,
            orientation: 'HIGHER_BETTER',
            obligatoire: c.obligatoire,
            options_reponse: c.options.length > 0
              ? c.options.map((o) => o.libelle).join(',')
              : null,
            scores_reponse: null,
            id_entreprise: idEntreprise,
          },
        });
        for (let i = 0; i < c.options.length; i++) {
          const o = c.options[i];
          await prisma.optionCritere.create({
            data: {
              id_critere: critere.id,
              libelle: o.libelle,
              libelle_normalise: normaliserLibelle(o.libelle),
              ordre_affichage: i,
              actif: true,
              est_scorable: o.est_scorable,
              score: o.score,
              score_provenance: null,
              poids: o.poids,
              code_metier: o.code_metier,
              valeur_metier: null,
            },
          });
        }
      }
      // Rattachement au service du gabarit — sauf si le critère appartient
      // déjà à un autre service (1 critère = 1 seul service, jamais forcé).
      const liens = await prisma.critereService.findMany({
        where: { id_critere: critere.id },
        select: { id_service: true },
      });
      const ailleurs = liens.some((l: any) => l.id_service !== service.id);
      if (!ailleurs) {
        await prisma.critereService.upsert({
          where: { id_critere_id_service: { id_critere: critere.id, id_service: service.id } },
          update: { ordre },
          create: { id_critere: critere.id, id_service: service.id, ordre },
        });
      }
      await prisma.agenceCritere.upsert({
        where: { id_agence_id_critere: { id_agence: idAgence, id_critere: critere.id } },
        update: {},
        create: { id_agence: idAgence, id_critere: critere.id },
      });
      ordre += 1;
    }
  }
}
