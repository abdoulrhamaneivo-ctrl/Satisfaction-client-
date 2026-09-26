-- Domaines de valeurs en base (audit P14 j).
--
-- POURQUOI CE FICHIER EST ÉCRIT À LA MAIN
-- `prisma migrate diff` propose, pour chaque conversion String → enum :
--   ALTER TABLE "X" DROP COLUMN "y", ADD COLUMN "y" "Enum" DEFAULT …;
-- C'est une migration DESTRUCTRICE : elle vide les 14 colonnes converties.
-- Rendue ici sous la forme ALTER COLUMN … TYPE … USING, qui préserve les
-- valeurs. L'écart entre les deux est exactement le genre de piège que la
-- revue de migration doit voir : `migrate diff` est un point de départ, pas
-- une autorisation.
--
-- SÉCURITÉ DE LA CONVERSION
-- `USING "y"::text::"Enum"` refuse toute valeur hors domaine : l'ALTER
-- échoue et la transaction est annulée. Les contrôles préalables ci-dessous
-- ne font que rendre l'échec lisible, en nommant la table, la colonne et la
-- valeur fautive — sinon Postgres dit seulement « invalid input value ».
--
-- DOMAINES
-- Les valeurs viennent du code, pas des commentaires de schéma :
--   type_reponse   7 valeurs (SMILEY, OUI_NON, ECHELLE, QCM, CASES, TEXTE,
--                  NPS) — NPS est filtré en production par
--                  `moteurGlobal.ts:272`, l'oublier aurait retiré le NPS
--                  de tous les calculs ;
--   scoring_mode   9 valeurs ; `MAGIQUE` figurait dans un commentaire de
--                  schéma mais dans aucune liste du code : il est donc
--                  REFUSÉ, pas accepté ;
--   statut_tache   A_FAIRE, EN_COURS, TERMINEE ; `EN_COURS` est produit par
--                  `rapportMensuel.ts` et `relanceTache.ts` ;
--   ancien_statut  domaine distinct de `nouveau_statut` : `CREATION` n'est
--                  pas un statut de tâche, c'est l'absence de statut
--                  (tâche nouvellement créée).

--------------------------------------------------------------------------------
-- 1. Types
--------------------------------------------------------------------------------
CREATE TYPE "StatutIa"         AS ENUM ('PENDING', 'PROCESSING', 'DONE', 'FAILED');
CREATE TYPE "NiveauGravite"    AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
CREATE TYPE "RoleUtilisateur"  AS ENUM ('AGENT', 'CHEF_AGENCE', 'DIRECTION');
CREATE TYPE "StatutEntreprise" AS ENUM ('TRIAL', 'ACTIVE', 'SUSPENDED', 'CANCELLED');
CREATE TYPE "TypeReponse"      AS ENUM ('SMILEY', 'OUI_NON', 'ECHELLE', 'QCM', 'CASES', 'TEXTE', 'NPS');
CREATE TYPE "ScoringMode"      AS ENUM ('ORDINAL', 'BINARY', 'NUMERIC', 'SMILEY', 'NPS', 'CASES_CATEGORICAL', 'CASES_WEIGHTED', 'CES', 'FREE_TEXT');
CREATE TYPE "StatutTache"      AS ENUM ('A_FAIRE', 'EN_COURS', 'TERMINEE');
CREATE TYPE "StatutAvantTache" AS ENUM ('CREATION', 'A_FAIRE', 'EN_COURS', 'TERMINEE');
CREATE TYPE "StatutAlerte"     AS ENUM ('NOUVELLE', 'TRAITEE');
CREATE TYPE "TypeAlerte"       AS ENUM ('NOTE_CRITIQUE', 'SILENCE_EVALUATION', 'IA_INCOHERENCE_NOTE', 'IA_URGENCE');

--------------------------------------------------------------------------------
-- 2. Contrôle préalable, avant toute modification
--------------------------------------------------------------------------------
-- Volontairement fail-fast et non « on corrige en silence » : une valeur hors
-- domaine signale un bug de VALIDATION, pas une donnée à réinterpréter. La
-- migration s'arrête et nomme la valeur, pour qu'on aille corriger le code
-- qui l'a écrite — pas la donnée qui la signale.
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
            'Migration interrompue : %.% contient % ligne(s) hors domaine. Valeur(s) trouvee(s) : %. Domaine attendu : %.',
            p_table, p_column, n, hors, array_to_string(p_domain, ', ');
    END IF;
END;
$$ LANGUAGE plpgsql;

SELECT pg_temp.refuser_hors_domaine('User',                       'role',            ARRAY['AGENT','CHEF_AGENCE','DIRECTION']);
SELECT pg_temp.refuser_hors_domaine('Entreprise',                 'status',          ARRAY['TRIAL','ACTIVE','SUSPENDED','CANCELLED']);
SELECT pg_temp.refuser_hors_domaine('Critere',                    'type_reponse',    ARRAY['SMILEY','OUI_NON','ECHELLE','QCM','CASES','TEXTE','NPS']);
SELECT pg_temp.refuser_hors_domaine('Critere',                    'scoring_mode',    ARRAY['ORDINAL','BINARY','NUMERIC','SMILEY','NPS','CASES_CATEGORICAL','CASES_WEIGHTED','CES','FREE_TEXT']);
SELECT pg_temp.refuser_hors_domaine('AnalyseAvisIA',              'status',          ARRAY['PENDING','PROCESSING','DONE','FAILED']);
SELECT pg_temp.refuser_hors_domaine('AnalyseAvisIA',              'severite',        ARRAY['LOW','MEDIUM','HIGH','CRITICAL']);
SELECT pg_temp.refuser_hors_domaine('AnalyseAvisIA',              'urgence',         ARRAY['LOW','MEDIUM','HIGH','CRITICAL']);
SELECT pg_temp.refuser_hors_domaine('GlobalExperienceAnalysis',   'status',          ARRAY['PENDING','PROCESSING','DONE','FAILED']);
SELECT pg_temp.refuser_hors_domaine('Alerte',                     'statut_alerte',   ARRAY['NOUVELLE','TRAITEE']);
SELECT pg_temp.refuser_hors_domaine('Alerte',                     'type_alerte',     ARRAY['NOTE_CRITIQUE','SILENCE_EVALUATION','IA_INCOHERENCE_NOTE','IA_URGENCE']);
SELECT pg_temp.refuser_hors_domaine('TacheCorrective',            'statut_tache',    ARRAY['A_FAIRE','EN_COURS','TERMINEE']);
SELECT pg_temp.refuser_hors_domaine('TacheCorrectiveHistorique',  'ancien_statut',   ARRAY['CREATION','A_FAIRE','EN_COURS','TERMINEE']);
SELECT pg_temp.refuser_hors_domaine('TacheCorrectiveHistorique',  'nouveau_statut',  ARRAY['A_FAIRE','EN_COURS','TERMINEE']);

--------------------------------------------------------------------------------
-- 3. Conversion, valeurs préservées
--------------------------------------------------------------------------------
-- Les DEFAULT sont retirés AVANT le changement de type : un défaut textuel
-- ne se caste pas implicitement vers un enum
-- (`default for column "role" cannot be cast automatically`), et il est
-- reposé APRÈS, avec un cast explicite. Vérifié en transaction annulée.
ALTER TABLE "User"                     ALTER COLUMN "role"          DROP DEFAULT;
ALTER TABLE "Entreprise"               ALTER COLUMN "status"        DROP DEFAULT;
ALTER TABLE "Critere"                  ALTER COLUMN "type_reponse"  DROP DEFAULT;
ALTER TABLE "AnalyseAvisIA"            ALTER COLUMN "status"        DROP DEFAULT;
ALTER TABLE "GlobalExperienceAnalysis" ALTER COLUMN "status"        DROP DEFAULT;
ALTER TABLE "Alerte"                   ALTER COLUMN "statut_alerte" DROP DEFAULT;
ALTER TABLE "TacheCorrective"          ALTER COLUMN "statut_tache"  DROP DEFAULT;

-- `USING "col"::text::"Enum"` préserve les valeurs et refuse tout ce qui
-- n'appartient pas au domaine : en cas de valeur inattendue, l'ALTER échoue
-- et la transaction entière est annulée. Aucune donnée n'est réinterprétée.
ALTER TABLE "User"                     ALTER COLUMN "role"          TYPE "RoleUtilisateur"  USING "role"::text::"RoleUtilisateur";
ALTER TABLE "Entreprise"               ALTER COLUMN "status"        TYPE "StatutEntreprise" USING "status"::text::"StatutEntreprise";
ALTER TABLE "Critere"                  ALTER COLUMN "type_reponse"  TYPE "TypeReponse"      USING "type_reponse"::text::"TypeReponse";
ALTER TABLE "Critere"                  ALTER COLUMN "scoring_mode"  TYPE "ScoringMode"      USING "scoring_mode"::text::"ScoringMode";
ALTER TABLE "AnalyseAvisIA"            ALTER COLUMN "status"        TYPE "StatutIa"         USING "status"::text::"StatutIa";
ALTER TABLE "AnalyseAvisIA"            ALTER COLUMN "severite"      TYPE "NiveauGravite"    USING "severite"::text::"NiveauGravite";
ALTER TABLE "AnalyseAvisIA"            ALTER COLUMN "urgence"       TYPE "NiveauGravite"    USING "urgence"::text::"NiveauGravite";
ALTER TABLE "GlobalExperienceAnalysis" ALTER COLUMN "status"        TYPE "StatutIa"         USING "status"::text::"StatutIa";
ALTER TABLE "Alerte"                   ALTER COLUMN "statut_alerte" TYPE "StatutAlerte"     USING "statut_alerte"::text::"StatutAlerte";
ALTER TABLE "Alerte"                   ALTER COLUMN "type_alerte"   TYPE "TypeAlerte"       USING "type_alerte"::text::"TypeAlerte";
ALTER TABLE "TacheCorrective"          ALTER COLUMN "statut_tache"  TYPE "StatutTache"      USING "statut_tache"::text::"StatutTache";
ALTER TABLE "TacheCorrectiveHistorique" ALTER COLUMN "ancien_statut"  TYPE "StatutAvantTache" USING "ancien_statut"::text::"StatutAvantTache";
ALTER TABLE "TacheCorrectiveHistorique" ALTER COLUMN "nouveau_statut" TYPE "StatutTache"      USING "nouveau_statut"::text::"StatutTache";

ALTER TABLE "User"                     ALTER COLUMN "role"          SET DEFAULT 'AGENT'::"RoleUtilisateur";
ALTER TABLE "Entreprise"               ALTER COLUMN "status"        SET DEFAULT 'ACTIVE'::"StatutEntreprise";
ALTER TABLE "Critere"                  ALTER COLUMN "type_reponse"  SET DEFAULT 'SMILEY'::"TypeReponse";
ALTER TABLE "AnalyseAvisIA"            ALTER COLUMN "status"        SET DEFAULT 'PENDING'::"StatutIa";
ALTER TABLE "GlobalExperienceAnalysis" ALTER COLUMN "status"        SET DEFAULT 'PENDING'::"StatutIa";
ALTER TABLE "Alerte"                   ALTER COLUMN "statut_alerte" SET DEFAULT 'NOUVELLE'::"StatutAlerte";
ALTER TABLE "TacheCorrective"          ALTER COLUMN "statut_tache"  SET DEFAULT 'A_FAIRE'::"StatutTache";
