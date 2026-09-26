import { PrismaClient } from '@prisma/client';
export declare function backfillOptionsCriteres(client: PrismaClient): Promise<{
    traites: number;
    optionsCreees: number;
    doublonsIgnores: number;
}>;
