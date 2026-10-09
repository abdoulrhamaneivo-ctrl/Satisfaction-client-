import { type VariantProps } from "class-variance-authority";
import * as React from "react";
declare const buttonVariants: (props?: ({
    variant?: "default" | "link" | "outline" | "destructive" | "secondary" | "ghost" | "selected" | "outer" | "inner" | null | undefined;
    size?: "default" | "icon" | "sm" | "lg" | "iconLg" | null | undefined;
} & import("class-variance-authority/types").ClassProp) | undefined) => string;
declare function Button({ className, variant, size, asChild, ...props }: React.ComponentProps<"button"> & VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
}): React.JSX.Element;
export { Button, buttonVariants };
