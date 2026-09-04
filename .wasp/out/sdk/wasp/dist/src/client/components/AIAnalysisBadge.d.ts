import React from 'react';
export declare const THEMES_LABELS: Record<string, string>;
export type AIAnalysisProps = {
    analyse?: {
        status?: string;
        sentiment?: string | null;
        sentimentScore?: number | null;
        themes?: string | null;
        problemePrincipal?: string | null;
        urgence?: string | null;
        resume?: string | null;
        actionRecommandee?: string | null;
    } | null;
    className?: string;
};
export declare const AIAnalysisBadge: React.FC<AIAnalysisProps>;
//# sourceMappingURL=AIAnalysisBadge.d.ts.map