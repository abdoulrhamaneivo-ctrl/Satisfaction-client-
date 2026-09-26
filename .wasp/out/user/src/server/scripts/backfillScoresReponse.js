// src/server/scripts/backfillScoresReponse.ts
// ============================================================================
// CONSOLIDATION POST-MIGRATION `20260926000000_critere_scores_reponse`.
//
// Remplit `Critere.scores_reponse` pour tous les QCM/CASES existants dont la
// colonne est encore NULL, via l'inférence lexicale FR
// (src/shared/scoringQCM.ts — même fonction que createCritere).
//
// - Idempotent : ne touche que les lignes NULL (relançable sans risque).
// - Critères non valencés (ex. CASES « motifs » : Accueil, Guichet 3) :
//   l'inférence rend null → la ligne est IGNORÉE (reste NULL = exclu des
//   moyennes, comportement historique conservé).
// - L'historique Reponse n'est PAS réécrit : les anciennes lignes QCM
//   portent le libellé choisi en clair dans `commentaire_texte`, donc les
//   lectures (soumissions.ts, dashboard) les réinterprètent déjà via le
//   mapping — aucune corruption rétroactive à craindre.
//
// Usage : `npx tsx src/server/scripts/backfillScoresReponse.ts`
// (ou import + appel `backfillScoresReponse(prisma)` depuis un job admin).
// ============================================================================
import { PrismaClient } from '@prisma/client';
import { parseOptionsCSV, construireScoresAStocker, } from '../../shared/scoringQCM';
export async function backfillScoresReponse(prisma) {
    const criteres = await prisma.critere.findMany({
        where: {
            type_reponse: { in: ['QCM', 'CASES'] },
            scores_reponse: null,
            options_reponse: { not: null },
        },
        select: { id: true, libelle_critere: true, options_reponse: true },
    });
    let remplis = 0;
    let ignoresNonValences = 0;
    for (const c of criteres) {
        const options = parseOptionsCSV(c.options_reponse);
        if (options.length < 2)
            continue;
        let scores = null;
        try {
            scores = construireScoresAStocker(c.options_reponse || '');
        }
        catch {
            scores = null;
        }
        if (!scores) {
            ignoresNonValences++;
            continue;
        }
        await prisma.critere.update({
            where: { id: c.id },
            data: { scores_reponse: scores },
        });
        remplis++;
    }
    return { traites: criteres.length, remplis, ignoresNonValences };
}
// Exécution directe (CLI) — importé comme module, rien ne s'exécute.
const lanceEnCLI = process.argv[1]?.endsWith('backfillScoresReponse.ts') ?? false;
if (lanceEnCLI) {
    const prisma = new PrismaClient();
    backfillScoresReponse(prisma)
        .then((r) => {
        console.log(`[backfillScoresReponse] traités=${r.traites} remplis=${r.remplis} non-valencés_ignorés=${r.ignoresNonValences}`);
    })
        .catch((e) => {
        console.error('[backfillScoresReponse] ÉCHEC :', e?.message ?? e);
        process.exitCode = 1;
    })
        .finally(() => {
        void prisma.$disconnect();
    });
}
