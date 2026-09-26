-- Domaines de valeurs, seconde vague (audit P14 j, suite).
--
-- Convertit 10 colonnes String en enums, sans perdre une seule valeur :
-- `ALTER COLUMN … TYPE … USING`, jamais `DROP COLUMN` + `ADD COLUMN`
-- (voir `20260927000900` : le diff généré par Prisma est destructeur).
--
-- DOMAINES (tous extraits du code, vérifiés contre les données existantes)
--   User.platformRole              NONE, SUPER_ADMIN, SUPPORT
--   Entreprise.plan                STARTER, BUSINESS, ENTERPRISE
--   Critere.orientation            HIGHER_BETTER, LOWER_BETTER
--   Canal.type_canal               QR_WEB, USSD, IVR_VOCAL
--   AnalyseAvisIA.sentiment        POSITIVE, NEUTRAL, NEGATIVE, MIXED
--   AnalyseAvisIA.sentimentRetenu  POSITIVE, NEUTRAL, NEGATIVE, MIXED
--   AnalyseAvisIA.coherenceNote    NOTE_PLUS_HAUTE_QUE_TEXTE, NOTE_PLUS_BASSE_QUE_TEXTE
--   GlobalExperienceAnalysis.periode   SEMAINE, MOIS
--   GlobalExperienceAnalysis.confiance  FAIBLE, MOYENNE, ELEVEE
--   OptionCritere.score_provenance EXPLICIT, INFERRED, MIGRATED
--
-- NOTE sur `MIGRATED` : troisième valeur réelle, écrite uniquement par le
-- backfill historique (`backfillOptionsCriteres.ts`). Les lecteurs rabattent
-- tout ce qui n'est pas EXPLICIT sur INFERRED (`resolutionSoumission.ts`),
-- donc MIGRATED se comporte comme INFERRED en lecture. L'exclure casserait
-- le backfill ; la première version de cet enum l'excluait, et c'est la
-- compilation qui l'a rattrapé.
--
-- NOTE sur `sentimentRetenu` : même domaine que `sentiment` (le retenu « peut
-- différer du brut » mais reste un sentiment). Un seul enum, deux colonnes.
--
-- Les `DEFAULT` sont retirés AVANT le changement de type et reposés APRÈS
-- avec un cast explicite : un défaut textuel ne se convertit pas
-- implicitement vers un enum (erreur Postgres apprise sur la vague 1).

--------------------------------------------------------------------------------
-- 1. Types
--------------------------------------------------------------------------------
CREATE TYPE "PlatformRole"    AS ENUM ('NONE', 'SUPER_ADMIN', 'SUPPORT');
CREATE TYPE "PlanEntreprise"  AS ENUM ('STARTER', 'BUSINESS', 'ENTERPRISE');
CREATE TYPE "OrientationNote" AS ENUM ('HIGHER_BETTER', 'LOWER_BETTER');
CREATE TYPE "TypeCanal"       AS ENUM ('QR_WEB', 'USSD', 'IVR_VOCAL');
CREATE TYPE "SentimentAvis"   AS ENUM ('POSITIVE', 'NEUTRAL', 'NEGATIVE', 'MIXED');
CREATE TYPE "PeriodeAnalyse"  AS ENUM ('SEMAINE', 'MOIS');
CREATE TYPE "NiveauConfiance" AS ENUM ('FAIBLE', 'MOYENNE', 'ELEVEE');
CREATE TYPE "ProvenanceScore" AS ENUM ('EXPLICIT', 'INFERRED', 'MIGRATED');
CREATE TYPE "CoherenceNote"   AS ENUM ('NOTE_PLUS_HAUTE_QUE_TEXTE', 'NOTE_PLUS_BASSE_QUE_TEXTE');

--------------------------------------------------------------------------------
-- 2. Contrôle préalable, avant toute modification
--------------------------------------------------------------------------------
-- Fail-fast volontaire : une valeur hors domaine signale un bug de
-- VALIDATION, pas une donnée à réinterpréter. La migration s'arrête et nomme
-- la valeur, pour qu'on corrige le code qui l'a écrite — pas la donnée qui
-- la signale. (Même fonction qu'en `20260927000900`, recopiée pour que
-- chaque migration reste autoporteuse.)
CREATE OR REPLACE FUNCTION pg_temp.refuser_hors_domaine(
    p_table text, p_column text, p_domain text[]
) RETURNS void AS $$
DECLARE
    hors text;
    n    bigint;
BEGIN
    IF to_regclass(format('public.%I', p_table)) IS NULL THEN
        RETURN;                                   -- table absente : rien à vérifier
    END IF;

    EXECUTE format(
        'SELECT string_agg(DISTINCT %1$I::text, '', ''), count(*)
           FROM public.%2$I
          WHERE %1$I IS NOT NULL
            AND NOT (%1$I::text = ANY($1))',
        p_column, p_table
    ) INTO hors, n USING p_domain;

    IF n > 0 THEN
        RAISE EXCEPTION
            'Migration interrompue : %.% contient % ligne(s) hors domaine. Valeur(s) trouvée(s) : %. Domaine attendu : %.',
            p_table, p_column, n, hors, array_to_string(p_domain, ', ');
    END IF;
END;
$$ LANGUAGE plpgsql;

SELECT pg_temp.refuser_hors_domaine('User',                     'platformRole',      ARRAY['NONE','SUPER_ADMIN','SUPPORT']);
SELECT pg_temp.refuser_hors_domaine('Entreprise',               'plan',                ARRAY['STARTER','BUSINESS','ENTERPRISE']);
SELECT pg_temp.refuser_hors_domaine('Critere',                  'orientation',         ARRAY['HIGHER_BETTER','LOWER_BETTER']);
SELECT pg_temp.refuser_hors_domaine('Canal',                    'type_canal',          ARRAY['QR_WEB','USSD','IVR_VOCAL']);
SELECT pg_temp.refuser_hors_domaine('AnalyseAvisIA',            'sentiment',           ARRAY['POSITIVE','NEUTRAL','NEGATIVE','MIXED']);
SELECT pg_temp.refuser_hors_domaine('AnalyseAvisIA',            'sentimentRetenu',   ARRAY['POSITIVE','NEUTRAL','NEGATIVE','MIXED']);
SELECT pg_temp.refuser_hors_domaine('AnalyseAvisIA',            'coherenceNote',     ARRAY['NOTE_PLUS_HAUTE_QUE_TEXTE','NOTE_PLUS_BASSE_QUE_TEXTE']);
SELECT pg_temp.refuser_hors_domaine('GlobalExperienceAnalysis', 'periode',             ARRAY['SEMAINE','MOIS']);
SELECT pg_temp.refuser_hors_domaine('GlobalExperienceAnalysis', 'confiance',           ARRAY['FAIBLE','MOYENNE','ELEVEE']);
SELECT pg_temp.refuser_hors_domaine('OptionCritere',            'score_provenance',    ARRAY['EXPLICIT','INFERRED','MIGRATED']);

--------------------------------------------------------------------------------
-- 3. Conversion, valeurs préservées
--------------------------------------------------------------------------------
ALTER TABLE "User"       ALTER COLUMN "platformRole" DROP DEFAULT;
ALTER TABLE "Entreprise" ALTER COLUMN "plan"         DROP DEFAULT;
ALTER TABLE "Critere"    ALTER COLUMN "orientation"  DROP DEFAULT;

ALTER TABLE "User"       ALTER COLUMN "platformRole" TYPE "PlatformRole"   USING "platformRole"::text::"PlatformRole";
ALTER TABLE "Entreprise" ALTER COLUMN "plan"         TYPE "PlanEntreprise" USING "plan"::text::"PlanEntreprise";
ALTER TABLE "Critere"    ALTER COLUMN "orientation"  TYPE "OrientationNote" USING "orientation"::text::"OrientationNote";
ALTER TABLE "Canal"      ALTER COLUMN "type_canal"   TYPE "TypeCanal"      USING "type_canal"::text::"TypeCanal";
ALTER TABLE "AnalyseAvisIA" ALTER COLUMN "sentiment"       TYPE "SentimentAvis" USING "sentiment"::text::"SentimentAvis";
ALTER TABLE "AnalyseAvisIA" ALTER COLUMN "sentimentRetenu" TYPE "SentimentAvis" USING "sentimentRetenu"::text::"SentimentAvis";
ALTER TABLE "AnalyseAvisIA" ALTER COLUMN "coherenceNote"   TYPE "CoherenceNote" USING "coherenceNote"::text::"CoherenceNote";
ALTER TABLE "GlobalExperienceAnalysis" ALTER COLUMN "periode"   TYPE "PeriodeAnalyse" USING "periode"::text::"PeriodeAnalyse";
ALTER TABLE "GlobalExperienceAnalysis" ALTER COLUMN "confiance" TYPE "NiveauConfiance" USING "confiance"::text::"NiveauConfiance";
ALTER TABLE "OptionCritere" ALTER COLUMN "score_provenance" TYPE "ProvenanceScore" USING "score_provenance"::text::"ProvenanceScore";

ALTER TABLE "User"       ALTER COLUMN "platformRole" SET DEFAULT 'NONE'::"PlatformRole";
ALTER TABLE "Entreprise" ALTER COLUMN "plan"         SET DEFAULT 'STARTER'::"PlanEntreprise";
ALTER TABLE "Critere"    ALTER COLUMN "orientation"  SET DEFAULT 'HIGHER_BETTER'::"OrientationNote";
