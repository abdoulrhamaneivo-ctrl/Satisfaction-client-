import * as React from "react";
import { type VariantProps } from "class-variance-authority";
declare const buttonStyles: (props?: ({
    intent?: "outline" | "secondary" | "ghost" | "primary" | "accent" | "danger" | null | undefined;
    size?: "icon" | "sm" | "lg" | "md" | null | undefined;
} & import("class-variance-authority/types").ClassProp) | undefined) => string;
export interface ButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "size">, VariantProps<typeof buttonStyles> {
    href?: string;
    to?: string;
    external?: boolean;
}
export declare const Button: React.ForwardRefExoticComponent<ButtonProps & React.RefAttributes<HTMLButtonElement>>;
export {};
