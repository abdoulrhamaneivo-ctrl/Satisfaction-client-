import { PrismaClient } from '@prisma/client';
export declare function backfillScoresReponse(prisma: PrismaClient): Promise<{
    traites: number;
    remplis: number;
    ignoresNonValences: number;
}>;
