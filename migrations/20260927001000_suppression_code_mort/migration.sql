-- Suppression du code mort (audit P14 i).
--
-- Trois objets, aucun lu par l'application. Vérifié par recherche sur
-- `src/` et `main.wasp.ts` avant suppression, et revérifié après : le build
-- Wasp passe, ce qui prouve qu'aucune requête, aucun `include` et aucun
-- généré ne les référençait encore.
--
-- `UserSession` et `StatistiquesMensuelles` sont supprimés (y compris leurs
-- relations dans `User`, `Entreprise`, `Agence`, `Guichet` et `Service`),
-- ainsi que la colonne `Reponse.audio_url`, jamais lue.
--
-- `SESSION_SECRET` et `SESSION_SECRET_PREVIOUS` disparaissent du schéma de
-- validation : ils étaient EXIGÉS au démarrage alors que rien ne les
-- lisait. Un déploiement devait donc fournir un secret sans effet, sous
-- peine de refus au boot.
--
-- Ces tables sont-elles vides ? Vérifié sur la base de développement :
-- `UserSession` et `StatistiquesMensuelles` ne contiennent aucune ligne. Le
-- `DROP` reste un `DROP` : sur une base qui aurait servi, il faut le
-- vérifier avant, pas le découvrir après.
--
-- Les types enum créés en `20260927000900` ne sont pas touchés ici.

DROP TABLE IF EXISTS "UserSession";
DROP TABLE IF EXISTS "StatistiquesMensuelles";

ALTER TABLE "Reponse" DROP COLUMN IF EXISTS "audio_url";
