CREATE TABLE "ContactRappel" (
    "id" BIGSERIAL NOT NULL,
    "reponseId" BIGINT NOT NULL,
    "ciphertext" TEXT NOT NULL,
    "iv" VARCHAR(24) NOT NULL,
    "tag" VARCHAR(24) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContactRappel_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ContactRappel_reponseId_key" ON "ContactRappel"("reponseId");
CREATE INDEX "ContactRappel_expiresAt_idx" ON "ContactRappel"("expiresAt");

ALTER TABLE "ContactRappel"
ADD CONSTRAINT "ContactRappel_reponseId_fkey"
FOREIGN KEY ("reponseId") REFERENCES "Reponse"("id") ON DELETE CASCADE ON UPDATE CASCADE;
