import * as React from "react";
import { type VariantProps } from "class-variance-authority";
declare const badgeStyles: (props?: ({
    tone?: "navy" | "outline" | "warning" | "accent" | "danger" | "neutral" | "amber" | "positive" | null | undefined;
    size?: "sm" | "lg" | "md" | null | undefined;
    variant?: "solid" | "soft" | null | undefined;
} & import("class-variance-authority/types").ClassProp) | undefined) => string;
export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeStyles> {
}
export declare const Badge: React.ForwardRefExoticComponent<BadgeProps & React.RefAttributes<HTMLSpanElement>>;
/**
 * Eyebrow — A section-header label. "11px · tracking-widest · bold uppercase".
 * Signature Trovy DS pattern used above H1/H2 section headers.
 */
export declare function Eyebrow({ children, className, tone, }: {
    children: React.ReactNode;
    className?: string;
    tone?: "accent" | "amber" | "positive" | "neutral";
}): React.JSX.Element;
export {};
//# sourceMappingURL=Badge.d.ts.map