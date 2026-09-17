import React from 'react';
type ChartSkeletonVariant = 'bar' | 'radar' | 'area' | 'horizontalBar' | 'heatmap';
interface ChartSkeletonProps {
    variant?: ChartSkeletonVariant;
    subtitle?: string;
    className?: string;
    heightClass?: string;
    label?: string;
}
export declare function ChartSkeleton({ variant, subtitle, className, heightClass, label, }: ChartSkeletonProps): React.JSX.Element;
export declare const HistogrammeSatisfactionSkeleton: () => React.JSX.Element;
export declare const RadarQualiteSkeleton: () => React.JSX.Element;
export declare const TendanceMensuelleSkeleton: () => React.JSX.Element;
export declare const ClassementGuichetsSkeleton: () => React.JSX.Element;
export declare const ComparaisonAgentsSkeleton: () => React.JSX.Element;
export declare const HeatmapReponsesSkeleton: () => React.JSX.Element;
export declare const HistogrammeSatisfaction: ({ data }: {
    data: any[];
}) => React.JSX.Element;
export declare const RadarQualite: ({ data }: {
    data: any[];
}) => React.JSX.Element;
export declare const TendanceMensuelle: ({ data }: {
    data: any[];
}) => React.JSX.Element;
export declare const ClassementGuichets: ({ data }: {
    data: any[];
}) => React.JSX.Element;
export declare const ComparaisonAgents: ({ data }: {
    data: any[];
}) => React.JSX.Element;
export {};
