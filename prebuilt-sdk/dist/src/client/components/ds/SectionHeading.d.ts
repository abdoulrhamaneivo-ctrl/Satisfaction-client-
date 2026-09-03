import * as React from "react";
export interface SectionHeadingProps {
    eyebrow?: string;
    title: React.ReactNode;
    accent?: React.ReactNode;
    body?: React.ReactNode;
    layout?: "center" | "split";
    align?: "left" | "center";
    size?: "sm" | "md" | "lg" | "xl";
    className?: string;
    bodyClassName?: string;
    eyebrowTone?: "accent" | "amber" | "positive" | "neutral";
}
export declare function SectionHeading({ eyebrow, title, accent, body, layout, align, size, className, bodyClassName, eyebrowTone, }: SectionHeadingProps): React.JSX.Element;
//# sourceMappingURL=SectionHeading.d.ts.map