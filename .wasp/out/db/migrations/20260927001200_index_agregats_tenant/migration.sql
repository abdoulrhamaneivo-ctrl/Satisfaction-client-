-- Index manquants (audit §5, dette « Index »).
--
-- `Reponse` n'avait aucun index sur `id_critere`, `id_service`, `id_canal`,
-- `id_agent` : les agrégats par critère/service scannaient. `User`,
-- `Critere` et `Service` n'avaient aucun `@@index` sur `id_entreprise`
-- (supprimés en `20260714062828`, jamais remis) : les listings par tenant
-- scannaient. Les composites `(agence, période)` existaient déjà.
--
-- Noms strictement identiques à ceux que Prisma génère (`Table_colonne_idx`)
-- pour que `migrate diff` ne voie aucun drift. `IF NOT EXISTS` partout :
-- la migration est rejouable.
CREATE INDEX IF NOT EXISTS "Reponse_id_critere_idx"    ON "Reponse"("id_critere");
CREATE INDEX IF NOT EXISTS "Reponse_id_service_idx"    ON "Reponse"("id_service");
CREATE INDEX IF NOT EXISTS "Reponse_id_canal_idx"      ON "Reponse"("id_canal");
CREATE INDEX IF NOT EXISTS "Reponse_id_agent_idx"      ON "Reponse"("id_agent");
CREATE INDEX IF NOT EXISTS "User_id_entreprise_idx"    ON "User"("id_entreprise");
CREATE INDEX IF NOT EXISTS "Critere_id_entreprise_idx" ON "Critere"("id_entreprise");
CREATE INDEX IF NOT EXISTS "Service_id_entreprise_idx" ON "Service"("id_entreprise");
