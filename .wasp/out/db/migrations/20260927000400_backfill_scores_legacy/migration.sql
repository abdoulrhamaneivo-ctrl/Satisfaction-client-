-- Vague 1 Phase D : consolidation HONNÊTE de l'historique (lignes dont
-- score_source IS NULL uniquement). JAMAIS de réécriture de score_brut.
-- Règles :
-- - SMILEY / OUI_NON : normalise = (brut-1)*25, officiel = brut ;
-- - ECHELLE : normalise via min/max du critère, officiel = brut
--   (config illisible → NULL, marqué mais exclu) ;
-- - QCM / CASES / TEXTE : normalise = NULL, officiel = NULL (exclus des
--   moyennes — fini les 3 fantômes et les index positionnels ; le brut
--   historique est conservé tel quel comme trace) ;
-- - source = LEGACY_POSITIONAL partout (visible admin/audit).
-- Idempotent : seules les lignes score_source IS NULL sont touchées.

UPDATE "Reponse" r
SET score_officiel = r.score_brut,
    score_normalise = (r.score_brut - 1) * 25,
    score_source = 'LEGACY_POSITIONAL'
FROM "Critere" c
WHERE r.id_critere = c.id
  AND r.score_source IS NULL
  AND c.type_reponse IN ('SMILEY', 'OUI_NON')
  AND r.score_brut IS NOT NULL;

UPDATE "Reponse" r
SET score_officiel = r.score_brut,
    score_normalise = CASE
      WHEN minmax.maxv > minmax.minv
        THEN ((r.score_brut - minmax.minv)::double precision / (minmax.maxv - minmax.minv)) * 100
      ELSE NULL
    END,
    score_source = 'LEGACY_POSITIONAL'
FROM "Critere" c,
  LATERAL (
    SELECT
      NULLIF(split_part(COALESCE(c.options_reponse, '1,5'), ',', 1), '')::integer AS minv,
      NULLIF(split_part(COALESCE(c.options_reponse, '1,5'), ',', 2), '')::integer AS maxv
  ) AS minmax
WHERE r.id_critere = c.id
  AND r.score_source IS NULL
  AND c.type_reponse = 'ECHELLE'
  AND r.score_brut IS NOT NULL;

UPDATE "Reponse" r
SET score_officiel = NULL,
    score_normalise = NULL,
    score_source = 'LEGACY_POSITIONAL'
FROM "Critere" c
WHERE r.id_critere = c.id
  AND r.score_source IS NULL
  AND c.type_reponse IN ('QCM', 'CASES', 'TEXTE');
