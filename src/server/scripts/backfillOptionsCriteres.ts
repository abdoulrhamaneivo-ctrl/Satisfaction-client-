// src/server/scripts/backfillOptionsCriteres.ts
// ============================================================================
// CONSOLIDATION POST-MIGRATION `20260927000200_scoring_option_critere`.
//
// Crée les lignes `OptionCritere` pour tous les critères QCM/CASES existants
// qui n'en ont pas encore, depuis `options_reponse` (CSV) + `scores_reponse`
// (CSV parallèle, si présent) :
// - ordre_affichage = position dans le CSV (0-based) ;
// - score = valeur du CSV parallèle (si cardinalité OK) sinon NULL ;
// - est_scorable = score non NULL ;
// - libelle_normalise via normaliserLibelle (même fonction que le moteur) ;
// - scoring_mode déduit si absent : CASES sans aucun score →
//   'CASES_CATEGORICAL', sinon NULL (moteur : déduit du type).
//
// - Idempotent : saute les critères ayant déjà des options (relançable).
// - Déduplique après normalisation : en cas de doublons
//   (« Très satisfait » / « tres satisfait »), garde la PREMIÈRE occurrence
//   et journalise les autres (contrainte unique sur libelle_normalise).
// - Ne touche JAMAIS aux Reponse existantes (historique intact).
//
// Usage : `npx tsx src/server/scripts/backfillOptionsCriteres.ts`
// ============================================================================
import { PrismaClient } from '@prisma/client';
import {
  parseOptionsCSV,
  parseScoresCSV,
  normaliserLibelle,
} from '../../shared/scoringQCM';

export async function backfillOptionsCriteres(
  client: PrismaClient,
): Promise<{ traites: number; optionsCreees: number; doublonsIgnores: number }> {
  const criteres = await client.critere.findMany({
    where: {
      type_reponse: { in: ['QCM', 'CASES'] },
      options_reponse: { not: null },
      options: { none: {} },
    },
    select: {
      id: true,
      libelle_critere: true,
      type_reponse: true,
      options_reponse: true,
      scores_reponse: true,
      scoring_mode: true,
    },
  });

  let optionsCreees = 0;
  let doublonsIgnores = 0;

  for (const c of criteres) {
    const libelles = parseOptionsCSV(c.options_reponse);
    if (libelles.length === 0) continue;
    const scores = parseScoresCSV(c.scores_reponse);

    const vus = new Set<string>();
    const lignes: {
      id_critere: number;
      libelle: string;
      libelle_normalise: string;
      ordre_affichage: number;
      actif: boolean;
      est_scorable: boolean;
      score: number | null;
    }[] = [];

    libelles.forEach((libelle, index) => {
      const normalise = normaliserLibelle(libelle);
      if (!normalise || vus.has(normalise)) {
        doublonsIgnores += 1;
        console.warn(
          `[backfill] critère ${c.id} (« ${c.libelle_critere} ») : doublon ignoré « ${libelle} »`,
        );
        return;
      }
      vus.add(normalise);
      const score =
        scores && scores.length === libelles.length ? scores[index] : null;
      lignes.push({
        id_critere: c.id,
        libelle,
        libelle_normalise: normalise,
        ordre_affichage: index,
        actif: true,
        est_scorable: score != null,
        score,
      });
    });

    if (lignes.length > 0) {
      await client.optionCritere.createMany({ data: lignes });
      optionsCreees += lignes.length;
    }

    // CASES sans aucun score → explicitement catégoriel (jamais noté).
    if (
      c.type_reponse === 'CASES' &&
      !c.scoring_mode &&
      lignes.length > 0 &&
      lignes.every((l) => l.score == null)
    ) {
      await client.critere.update({
        where: { id: c.id },
        data: { scoring_mode: 'CASES_CATEGORICAL' },
      });
    }
  }

  return { traites: criteres.length, optionsCreees, doublonsIgnores };
}

// Exécution directe (CLI) — importé comme module, rien ne s'exécute.
const lanceEnCLI = process.argv[1]?.endsWith('backfillOptionsCriteres.ts') ?? false;
if (lanceEnCLI) {
  const prisma = new PrismaClient();
  backfillOptionsCriteres(prisma)
    .then((r) => {
      console.log(
        `[backfillOptionsCriteres] traités=${r.traites} créées=${r.optionsCreees} doublons_ignorés=${r.doublonsIgnores}`,
      );
    })
    .catch((e) => {
      console.error('[backfillOptionsCriteres] ÉCHEC :', e?.message ?? e);
      process.exitCode = 1;
    })
    .finally(() => {
      void prisma.$disconnect();
    });
}
