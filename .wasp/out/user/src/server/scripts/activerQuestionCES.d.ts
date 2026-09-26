import { PrismaClient } from '@prisma/client';
export type ResultatCES = {
    entreprise: string;
    cree: boolean;
    reactives: boolean;
    critereId: number | null;
    agencesLiees: number;
    servicesLies: number;
    message: string;
};
export declare function activerQuestionCES(client: PrismaClient, idEntreprise?: number): Promise<ResultatCES>;
