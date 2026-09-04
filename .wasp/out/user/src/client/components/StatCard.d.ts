import React from 'react';
import { type LucideIcon } from 'lucide-react';
type Accent = 'primary' | 'secondary' | 'success' | 'destructive';
interface StatCardProps {
    title: string;
    value: string;
    icon?: LucideIcon;
    accent?: Accent;
    /** e.g. "+12%" — positive shows up-trend, negative shows down-trend. */
    trend?: string;
    trendDirection?: 'up' | 'down';
    /** For staggered entrance animation. */
    index?: number;
}
export declare const StatCard: ({ title, value, icon: Icon, accent, trend, trendDirection, index, }: StatCardProps) => React.JSX.Element;
export {};
