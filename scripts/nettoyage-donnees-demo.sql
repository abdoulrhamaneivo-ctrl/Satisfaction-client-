-- scripts/nettoyage-donnees-demo.sql — exécuté le 2026-09-26, conservé pour audit.
--
-- Contexte : le seed historique a créé « Mon Entreprise » (id 1) avec 3
-- services, 4 critères, 1 agence et 1 compte, qui polluent l'entreprise
-- réelle « La poste de CI » (id 2). Ce script supprime ces lignes de test
-- et, dans la même transaction, configure correctement les rattachements :
--   B1 : Caisse 1 (id 1) → mêmes opérations que Caisse 2 (Retrait + Depot)
--   B2 : Retrait garde accueil+recommandation (11,12) ; Depot reçoit colis (4)
--
-- SÉCURITÉ : tout est dans UNE transaction. Les contrôles préalables lèvent
-- une exception à la moindre donnée inattendue (réponse sur les lignes
-- visées, alerte hors agence 2, etc.) → ROLLBACK complet, rien n'est
-- partiellement appliqué. Rejouable : chaque étape est conditionnelle
-- (NOT EXISTS / DELETE WHERE), un second passage ne change rien.

BEGIN;

--------------------------------------------------------------------------------
-- 0. Contrôles préalables : la moindre surprise annule TOUT
--------------------------------------------------------------------------------
DO $$
DECLARE
  n bigint;
BEGIN
  SELECT count(*) INTO n FROM "Reponse" r JOIN "Critere" c ON c.id = r.id_critere
   WHERE c.id_entreprise = 1;
  IF n > 0 THEN RAISE EXCEPTION 'ABANDON : % réponse(s) sur des critères ent1', n; END IF;

  SELECT count(*) INTO n FROM "Reponse" WHERE id_agence = 1;
  IF n > 0 THEN RAISE EXCEPTION 'ABANDON : % réponse(s) sur agence 1', n; END IF;

  SELECT count(*) INTO n FROM "Reponse" WHERE id_service IN (1, 2, 3);
  IF n > 0 THEN RAISE EXCEPTION 'ABANDON : % réponse(s) sur services ent1', n; END IF;

  SELECT count(*) INTO n FROM "Alerte" a JOIN "Guichet" g ON g.id = a.id_guichet_concerne
   WHERE g.id_agence <> 2;
  IF n > 0 THEN RAISE EXCEPTION 'ABANDON : % alerte(s) hors agence 2', n; END IF;

  SELECT count(*) INTO n FROM "Objectif" WHERE id_critere IN (1, 2, 3, 5);
  IF n > 0 THEN RAISE EXCEPTION 'ABANDON : % objectif(s) sur criteres ent1', n; END IF;

  SELECT count(*) INTO n FROM "OptionCritere" WHERE id_critere IN (1, 2, 3, 5);
  IF n > 0 THEN RAISE EXCEPTION 'ABANDON : % option(s) sur criteres ent1', n; END IF;
END $$;

--------------------------------------------------------------------------------
-- B1. Caisse 1 → Retrait (4) + Depot (5), comme Caisse 2
--------------------------------------------------------------------------------
-- A = id_guichet, B = id_service (vérifié sur les FK de _GuichetToService).
INSERT INTO "_GuichetToService" ("A", "B")
SELECT 1, s
FROM (VALUES (4), (5)) AS v(s)
WHERE NOT EXISTS (SELECT 1 FROM "_GuichetToService" WHERE "A" = 1 AND "B" = v.s);

--------------------------------------------------------------------------------
-- B2. Retrait garde 11+12 ; Depot reçoit 4 (état du colis)
--------------------------------------------------------------------------------
DELETE FROM "CritereService" WHERE id_service = 4 AND id_critere = 4;

INSERT INTO "CritereService" (id_critere, id_service, ordre)
SELECT 4, 5, 0
WHERE NOT EXISTS (SELECT 1 FROM "CritereService" WHERE id_critere = 4 AND id_service = 5);

--------------------------------------------------------------------------------
-- B3a. L'invitation 1 appartient à l'ent 2 et est utilisée : on la garde,
--      mais son émetteur (le compte seed) est réassigné à la DIRECTION réelle.
--------------------------------------------------------------------------------
UPDATE "Invitation" SET id_emetteur = '48f0f977-69b9-467d-a6c0-1d170e4f547a'
 WHERE id = 1 AND id_emetteur = '62dcde44-2408-489b-b0b2-a03858dc2a45';

--------------------------------------------------------------------------------
-- B3b. Journal du seed (25/09, 4 lignes) : supprimé, car actor_id est
--      NOT NULL + RESTRICT et ces lignes ne racontent que la démo.
--------------------------------------------------------------------------------
DELETE FROM "AuditLog"
 WHERE actor_id = '62dcde44-2408-489b-b0b2-a03858dc2a45'
   AND action IN ('2fa.setup', '2fa.activate', 'entreprise.create', 'invitation.create');

--------------------------------------------------------------------------------
-- B3c. Compte seed (la ligne Auth part en CASCADE).
--------------------------------------------------------------------------------
DELETE FROM "User" WHERE id = '62dcde44-2408-489b-b0b2-a03858dc2a45';

--------------------------------------------------------------------------------
-- B3d. Critères, services, agence, entreprise de démo.
--      (AgenceCritere + CritereService partent en CASCADE.)
--------------------------------------------------------------------------------
DELETE FROM "Critere" WHERE id IN (1, 2, 3, 5);
DELETE FROM "Service" WHERE id IN (1, 2, 3);
DELETE FROM "Agence"  WHERE id = 1;
DELETE FROM "Entreprise" WHERE id = 1;

--------------------------------------------------------------------------------
-- Vérification finale (visible dans la sortie)
--------------------------------------------------------------------------------
SELECT 'entreprises' AS objet, count(*) AS n FROM "Entreprise"
UNION ALL SELECT 'services', count(*) FROM "Service"
UNION ALL SELECT 'criteres', count(*) FROM "Critere"
UNION ALL SELECT 'agences', count(*) FROM "Agence"
UNION ALL SELECT 'Caisse1 -> services', count(*) FROM "_GuichetToService" WHERE "A" = 1
UNION ALL SELECT 'Retrait criteres', count(*) FROM "CritereService" WHERE id_service = 4
UNION ALL SELECT 'Depot criteres', count(*) FROM "CritereService" WHERE id_service = 5
UNION ALL SELECT 'reponses', count(*) FROM "Reponse";

COMMIT;
