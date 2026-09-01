import * as React from "react";
import { type VariantProps } from "class-variance-authority";
declare const cardStyles: (props?: ({
    variant?: "default" | "inset" | "ghost" | "feature" | "glass" | null | undefined;
    interactive?: boolean | null | undefined;
    pad?: "none" | "sm" | "lg" | "md" | "xl" | null | undefined;
} & import("class-variance-authority/types").ClassProp) | undefined) => string;
export interface CardProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof cardStyles> {
}
export declare const Card: React.ForwardRefExoticComponent<CardProps & React.RefAttributes<HTMLDivElement>>;
export {};
//# sourceMappingURL=Card.d.ts.map